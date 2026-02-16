import os
import uuid
import time
from dotenv import load_dotenv
from mysql.connector.pooling import MySQLConnectionPool

load_dotenv()

_pool = MySQLConnectionPool(
    pool_name="chat_pool",
    pool_size=10,
    host=os.getenv("MYSQL_HOST", "127.0.0.1"),
    port=int(os.getenv("MYSQL_PORT", "3306")),
    user=os.getenv("MYSQL_USER", "root"),
    password=os.getenv("MYSQL_PASSWORD", ""),
    database=os.getenv("MYSQL_DB", "chatapp"),
    autocommit=True,
)

def conn():
    return _pool.get_connection()

# ---------------- USERS ----------------
def create_user(username: str, displayName: str, email: str | None, password_hash: str) -> dict:
    user_id = str(uuid.uuid4())
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            "INSERT INTO users (id, username, email, displayName, password_hash, status) "
            "VALUES (%s,%s,%s,%s,%s,'offline')",
            (user_id, username, email, displayName, password_hash),
        )
        return {
            "id": user_id,
            "username": username,
            "displayName": displayName,
            "email": email,
            "avatarUrl": None,
            "status": "offline",
        }
    finally:
        c.close()

def get_user_by_username(username: str) -> dict | None:
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE username=%s LIMIT 1", (username,))
        return cur.fetchone()
    finally:
        c.close()

# ✅ alias para que tu server no reviente
def find_user_by_username(username: str) -> dict | None:
    return get_user_by_username(username)

def get_user_by_email(email: str) -> dict | None:
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email=%s LIMIT 1", (email,))
        return cur.fetchone()
    finally:
        c.close()

def get_user_by_id(user_id: str) -> dict | None:
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE id=%s LIMIT 1", (user_id,))
        return cur.fetchone()
    finally:
        c.close()

def set_user_status(user_id: str, status: str):
    c = conn()
    try:
        cur = c.cursor()
        cur.execute("UPDATE users SET status=%s WHERE id=%s", (status, user_id))
    finally:
        c.close()

def get_user_public_by_username(username: str) -> dict | None:
    u = get_user_by_username(username)
    if not u:
        return None
    return {
        "id": u["id"],
        "username": u["username"],
        "displayName": u.get("displayName"),
        "avatarUrl": u.get("avatarUrl"),
        "status": u.get("status", "offline"),
    }

def get_user_public_by_id(user_id: str) -> dict | None:
    u = get_user_by_id(user_id)
    if not u:
        return None
    return {
        "id": u["id"],
        "username": u["username"],
        "displayName": u.get("displayName"),
        "avatarUrl": u.get("avatarUrl"),
        "status": u.get("status", "offline"),
    }

# ---------------- CHATS ----------------
def list_chats_for_user(user_id: str) -> list[dict]:
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
          SELECT ch.id, ch.type, ch.title, ch.description,
                 m.id AS lastMessageId,
                 m.chatId AS lastMessageChatId,
                 m.senderId AS lastMessageSenderId,
                 m.kind AS lastMessageKind,
                 m.content AS lastMessageContent,
                 m.createdAt AS lastMessageCreatedAt
          FROM chats ch
          JOIN chat_members cm ON cm.chatId = ch.id
          LEFT JOIN messages m ON m.id = (
            SELECT mm.id
            FROM messages mm
            WHERE mm.chatId = ch.id
            ORDER BY mm.createdAt DESC
            LIMIT 1
          )
          WHERE cm.userId = %s
          ORDER BY COALESCE(m.createdAt, UNIX_TIMESTAMP(ch.created_at) * 1000) DESC
        """, (user_id,))
        rows = cur.fetchall() or []
        chats = []
        for row in rows:
            chat = {
                "id": row["id"],
                "type": row["type"],
                "title": row["title"],
                "description": row["description"],
            }
            if row.get("lastMessageId"):
                chat["lastMessage"] = {
                    "id": row["lastMessageId"],
                    "chatId": row["lastMessageChatId"],
                    "senderId": row["lastMessageSenderId"],
                    "kind": row["lastMessageKind"],
                    "content": row["lastMessageContent"],
                    "createdAt": row["lastMessageCreatedAt"],
                }
            chats.append(chat)
        return chats
    finally:
        c.close()

def user_is_member(chat_id: str, user_id: str) -> bool:
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(
            "SELECT 1 FROM chat_members WHERE chatId=%s AND userId=%s LIMIT 1",
            (chat_id, user_id),
        )
        return cur.fetchone() is not None
    finally:
        c.close()



def list_related_user_ids(user_id: str) -> list[str]:
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(
            """
            SELECT DISTINCT cm2.userId
            FROM chat_members cm1
            JOIN chat_members cm2 ON cm2.chatId = cm1.chatId
            WHERE cm1.userId = %s
            """,
            (user_id,),
        )
        rows = cur.fetchall() or []
        return [r[0] for r in rows]
    finally:
        c.close()
def list_user_ids_for_chat(chat_id: str) -> list[str]:
    c = conn()
    try:
        cur = c.cursor()
        cur.execute("SELECT userId FROM chat_members WHERE chatId=%s", (chat_id,))
        rows = cur.fetchall() or []
        return [r[0] for r in rows]
    finally:
        c.close()

def add_chat_member(chat_id: str, user_id: str, role: str = "member"):
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(
            "INSERT IGNORE INTO chat_members (chatId, userId, role) VALUES (%s,%s,%s)",
            (chat_id, user_id, role),
        )
    finally:
        c.close()

def create_group_chat(title: str, description: str | None, owner_id: str) -> dict:
    chat_id = str(uuid.uuid4())
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(
            "INSERT INTO chats (id, type, title, description) VALUES (%s,'group',%s,%s)",
            (chat_id, title, description),
        )
        cur.execute(
            "INSERT INTO chat_members (chatId, userId, role) VALUES (%s,%s,'owner')",
            (chat_id, owner_id),
        )
        return {"id": chat_id, "type": "group", "title": title, "description": description}
    finally:
        c.close()

def find_direct_chat_between(a: str, b: str) -> dict | None:
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
          SELECT ch.id, ch.type, ch.title, ch.description
          FROM chats ch
          JOIN chat_members cm1 ON cm1.chatId = ch.id AND cm1.userId = %s
          JOIN chat_members cm2 ON cm2.chatId = ch.id AND cm2.userId = %s
          WHERE ch.type='direct'
          LIMIT 1
        """, (a, b))
        return cur.fetchone()
    finally:
        c.close()

def create_direct_chat(a: str, b: str, title: str) -> dict:
    chat_id = str(uuid.uuid4())
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(
            "INSERT INTO chats (id, type, title, description) VALUES (%s,'direct',%s,NULL)",
            (chat_id, title),
        )
        cur.execute("INSERT INTO chat_members (chatId, userId, role) VALUES (%s,%s,'member')", (chat_id, a))
        cur.execute("INSERT INTO chat_members (chatId, userId, role) VALUES (%s,%s,'member')", (chat_id, b))
        return {"id": chat_id, "type": "direct", "title": title, "description": None}
    finally:
        c.close()

# ---------------- MESSAGES ----------------
def save_message(chat_id: str, sender_id: str, kind: str, content: str) -> dict:
    msg_id = str(uuid.uuid4())
    created_ms = int(time.time() * 1000)
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(
            "INSERT INTO messages (id, chatId, senderId, kind, content, createdAt) VALUES (%s,%s,%s,%s,%s,%s)",
            (msg_id, chat_id, sender_id, kind, content, created_ms),
        )
        return {
            "id": msg_id,
            "chatId": chat_id,
            "senderId": sender_id,
            "kind": kind,
            "content": content,
            "createdAt": created_ms,
        }
    finally:
        c.close()


def list_messages(chat_id: str, limit: int = 150) -> list[dict]:
    c = conn()
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            """
            SELECT id, chatId, senderId, kind, content, createdAt
            FROM messages
            WHERE chatId=%s
            ORDER BY createdAt DESC
            LIMIT %s
            """,
            (chat_id, limit),
        )
        rows = cur.fetchall() or []
        rows.reverse()
        return rows
    finally:
        c.close()
