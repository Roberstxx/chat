import os
import asyncio
from typing import Any, Dict, Optional, Set

from dotenv import load_dotenv
import websockets

import db
import auth
import protocol

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8765"))

# --- sesiones ---
ws_to_user: Dict[websockets.WebSocketServerProtocol, str] = {}
user_to_ws: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}

# rooms por chatId (opcional, pero útil)
rooms: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}


def sanitize_user(u: dict) -> dict:
    return {
        "id": u.get("id"),
        "username": u.get("username"),
        "displayName": u.get("displayName"),
        "avatarUrl": u.get("avatarUrl"),
        "status": u.get("status", "offline"),
    }


async def send(ws, type_: str, data: dict):
    await ws.send(protocol.make(type_, data))


async def broadcast_to_chat(chat_id: str, type_: str, data: dict):
    # intenta por room si hay gente unida
    targets = rooms.get(chat_id)
    if targets:
        msg = protocol.make(type_, data)
        dead = []
        for w in list(targets):
            try:
                await w.send(msg)
            except:
                dead.append(w)
        for w in dead:
            targets.discard(w)
        return

    # fallback: manda a miembros conectados (aunque no estén "join")
    member_ids = db.list_user_ids_for_chat(chat_id)
    msg = protocol.make(type_, data)
    for uid in member_ids:
        for w in list(user_to_ws.get(uid, set())):
            try:
                await w.send(msg)
            except:
                pass




async def send_to_user(user_id: str, type_: str, data: dict):
    msg = protocol.make(type_, data)
    for w in list(user_to_ws.get(user_id, set())):
        try:
            await w.send(msg)
        except:
            pass
def bind_session(ws, user_id: str):
    ws_to_user[ws] = user_id
    user_to_ws.setdefault(user_id, set()).add(ws)


async def broadcast_presence(user_id: str, status: str):
    msg = protocol.make("presence:update", {"userId": user_id, "status": status})
    for uid in db.list_related_user_ids(user_id):
        for w in list(user_to_ws.get(uid, set())):
            try:
                await w.send(msg)
            except:
                pass


def require_auth(ws) -> Optional[str]:
    return ws_to_user.get(ws)


# ---------------- HANDLERS ----------------
async def handle_hello(ws, data):
    token = (data or {}).get("token")
    if not token:
        await send(ws, "error", {"message": "Falta token"})
        return

    try:
        payload = auth.verify_token(token)
        user_id = payload["sub"]
    except Exception:
        await send(ws, "error", {"message": "Token inválido"})
        return

    # guardar sesión
    bind_session(ws, user_id)
    db.set_user_status(user_id, "online")

    await send(ws, "hello:ok", {"userId": user_id})
    await broadcast_presence(user_id, "online")


async def handle_auth_register(ws, data):
    displayName = (data or {}).get("displayName", "").strip()
    username = (data or {}).get("username", "").strip().lower()
    email = (data or {}).get("email", "").strip().lower()
    password = (data or {}).get("password", "")

    if not displayName or not username or not password:
        await send(ws, "auth:error", {"message": "Faltan campos"})
        return

    # checks
    if db.get_user_by_username(username):
        await send(ws, "auth:error", {"message": "Username ya existe"})
        return
    if email and db.get_user_by_email(email):
        await send(ws, "auth:error", {"message": "Email ya existe"})
        return

    password_hash = auth.hash_password(password)
    u = db.create_user(username=username, displayName=displayName, email=email or None, password_hash=password_hash)

    token = auth.create_token(u["id"], u["username"])
    bind_session(ws, u["id"])
    db.set_user_status(u["id"], "online")

    await send(ws, "auth:ok", {"token": token, "user": sanitize_user({**u, "status": "online"})})
    await send(ws, "hello:ok", {"userId": u["id"]})


async def handle_auth_login(ws, data):
    usernameOrEmail = (data or {}).get("usernameOrEmail", "").strip().lower()
    password = (data or {}).get("password", "")

    if not usernameOrEmail or not password:
        await send(ws, "auth:error", {"message": "Faltan credenciales"})
        return

    u = None
    if "@" in usernameOrEmail:
        u = db.get_user_by_email(usernameOrEmail)
    if not u:
        u = db.get_user_by_username(usernameOrEmail)

    if not u:
        await send(ws, "auth:error", {"message": "Credenciales incorrectas"})
        return

    if not auth.verify_password(password, u["password_hash"]):
        await send(ws, "auth:error", {"message": "Credenciales incorrectas"})
        return

    token = auth.create_token(u["id"], u["username"])
    bind_session(ws, u["id"])
    db.set_user_status(u["id"], "online")

    await send(ws, "auth:ok", {"token": token, "user": sanitize_user({**u, "status": "online"})})
    await send(ws, "hello:ok", {"userId": u["id"]})


async def handle_chat_list(ws, user_id):
    chats = db.list_chats_for_user(user_id)
    await send(ws, "chat:list:ok", {"chats": chats})


async def handle_user_find_by_username(ws, user_id, data):
    username = (data or {}).get("username", "").strip().lower()
    if not username:
        await send(ws, "user:notFound", {"username": ""})
        return

    u = db.get_user_public_by_username(username)
    if not u:
        await send(ws, "user:notFound", {"username": username})
        return

    await send(ws, "user:found", {"user": u})


async def handle_chat_create_direct(ws, user_id, data):
    target_id = (data or {}).get("userId")
    if not target_id:
        await send(ws, "error", {"message": "Falta userId"})
        return
    if target_id == user_id:
        await send(ws, "error", {"message": "No puedes crear chat contigo mismo"})
        return

    # existe?
    existing = db.find_direct_chat_between(user_id, target_id)
    if existing:
        await send(ws, "chat:created", {"chat": existing, "autoSelect": True})
        return

    target = db.get_user_public_by_id(target_id)
    if not target:
        await send(ws, "error", {"message": "Usuario destino no existe"})
        return

    chat = db.create_direct_chat(user_id, target_id)
    await send(ws, "chat:created", {"chat": chat, "autoSelect": True})

    target_view = db.get_chat_for_user(chat["id"], target_id)
    if target_view:
        await send_to_user(target_id, "chat:created", {"chat": target_view, "autoSelect": False})


async def handle_group_create(ws, user_id, data):
    title = (data or {}).get("title", "").strip()
    description = (data or {}).get("description")
    if not title:
        await send(ws, "error", {"message": "Falta title"})
        return
    chat = db.create_group_chat(title=title, description=description, owner_id=user_id)
    await send(ws, "group:created", {"chat": chat})


async def handle_group_invite(ws, user_id, data):
    group_id = (data or {}).get("groupId")
    invite_user_id = (data or {}).get("userId")
    if not group_id or not invite_user_id:
        await send(ws, "error", {"message": "Faltan campos"})
        return

    # el invitador debe ser miembro
    if not db.user_is_member(group_id, user_id):
        await send(ws, "error", {"message": "No eres miembro del grupo"})
        return

    db.add_chat_member(group_id, invite_user_id, role="member")
    await send(ws, "group:invite:ok", {"groupId": group_id, "userId": invite_user_id})


async def handle_room_join(ws, user_id, data):
    chat_id = (data or {}).get("chatId")
    if not chat_id:
        return
    if not db.user_is_member(chat_id, user_id):
        await send(ws, "error", {"message": "No eres miembro de ese chat"})
        return
    rooms.setdefault(chat_id, set()).add(ws)
    await send(ws, "room:join:ok", {"chatId": chat_id})
    messages = db.list_messages(chat_id)
    await send(ws, "message:list:ok", {"chatId": chat_id, "messages": messages})


async def handle_presence_update(ws, user_id, data):
    status = (data or {}).get("status", "").strip().lower()
    if status not in {"online", "offline", "busy"}:
        await send(ws, "error", {"message": "Estado inválido"})
        return
    db.set_user_status(user_id, status)
    await broadcast_presence(user_id, status)


async def handle_message_send(ws, user_id, data):
    chat_id = (data or {}).get("chatId")
    kind = (data or {}).get("kind", "text")
    content = (data or {}).get("content", "")

    if not chat_id or not content:
        await send(ws, "error", {"message": "Faltan campos"})
        return
    if not db.user_is_member(chat_id, user_id):
        await send(ws, "error", {"message": "No eres miembro de ese chat"})
        return

    msg = db.save_message(chat_id=chat_id, sender_id=user_id, kind=kind, content=content)
    await broadcast_to_chat(chat_id, "message:receive", msg)


# ---------------- ROUTER ----------------
async def router(ws, msg: dict):
    t = msg.get("type")
    d = msg.get("data")

    # públicos
    if t == "auth:login":
        return await handle_auth_login(ws, d)
    if t == "auth:register":
        return await handle_auth_register(ws, d)
    if t == "hello":
        return await handle_hello(ws, d)

    # privados
    user_id = require_auth(ws)
    if not user_id:
        await send(ws, "error", {"message": "No autenticado"})
        return

    # chats / groups
    if t == "chat:list":
        return await handle_chat_list(ws, user_id)
    if t == "chat:createDirect":
        return await handle_chat_create_direct(ws, user_id, d)
    if t == "group:create":
        return await handle_group_create(ws, user_id, d)
    if t == "group:invite":
        return await handle_group_invite(ws, user_id, d)

    # user lookup
    if t == "user:findByUsername":
        return await handle_user_find_by_username(ws, user_id, d)

    # room join
    if t == "room:join":
        return await handle_room_join(ws, user_id, d)

    # messages
    if t == "message:send":
        return await handle_message_send(ws, user_id, d)
    if t == "presence:update":
        return await handle_presence_update(ws, user_id, d)

    await send(ws, "error", {"message": f"Evento no soportado: {t}"})


async def handler(ws):
    try:
        async for raw in ws:
            try:
                msg = protocol.parse(raw)
            except Exception as e:
                # Si el cliente ya cerró conexión, evita intentar enviarle errores
                if not ws.closed:
                    await send(ws, "error", {"message": str(e)})
                continue
            await router(ws, msg)
    except websockets.exceptions.ConnectionClosedOK:
        # cierre normal del cliente
        pass
    except (websockets.exceptions.ConnectionClosedError, ConnectionResetError) as e:
        # en Windows/LAN es común ver WinError 64 cuando cliente pierde red
        print(f"[WS] conexión cerrada abruptamente: {e}")
    finally:
        # cleanup
        uid = ws_to_user.pop(ws, None)
        if uid:
            sockets = user_to_ws.get(uid)
            if sockets:
                sockets.discard(ws)
                if not sockets:
                    user_to_ws.pop(uid, None)
                    db.set_user_status(uid, "offline")
                    await broadcast_presence(uid, "offline")
        # saca de rooms
        for s in rooms.values():
            s.discard(ws)


async def main():
    print(f"WS server: ws://{HOST}:{PORT}")
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
