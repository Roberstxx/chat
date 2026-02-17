# Backend (Python WebSockets) — Guía técnica

Backend async para autenticación, chats, presencia y señalización WebRTC sobre WebSocket seguro (WSS).

## Stack

- Python 3.11+
- `websockets`
- `mysql-connector-python`
- `bcrypt`
- `PyJWT`
- `python-dotenv`

Instalación:

```bash
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
```

## Configuración (`backend/.env`)

```env
MYSQL_DB=chatapp
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306

JWT_SECRET=super_secret_key_123

HOST=0.0.0.0
PORT=8765

SSL_CERT=../certs/local.pem
SSL_KEY=../certs/local-key.pem

LOG_WS_DISCONNECTS=0
```

## Arranque

```bash
python server.py
```

Salida esperada:

```text
WS server: wss://0.0.0.0:8765
```

## Arquitectura interna

- `server.py`: loop principal WS, router por eventos, gestión de sesiones y presencia.
- `db.py`: acceso MySQL (usuarios, chats, membresías, mensajes).
- `auth.py`: hash/verify de password + JWT.
- `protocol.py`: parse/serialización de mensajes WS.

## Protocolo WS (eventos principales)

### Públicos
- `auth:login`
- `auth:register`
- `hello`

### Privados (requieren sesión)
- `chat:list`
- `chat:createDirect`
- `group:create`
- `group:invite`
- `user:findByUsername`
- `room:join`
- `message:send`
- `presence:update`
- `rtc:signal`

## Señalización RTC

`rtc:signal` soporta:
- `offer`
- `answer`
- `ice`
- `end`

Campos típicos:
- `chatId`
- `fromUserId`
- `toUserId` (opcional)
- `mode` (`audio`/`video`)
- `payload` (SDP o ICE)

Ruteo:
- Si viene `toUserId`, se envía dirigido.
- Si no viene, se difunde a miembros del chat (excepto emisor).

## Modelo de datos esperado

Tablas mínimas:
- `users`
- `chats`
- `chat_members`
- `messages`

## Consideraciones LAN / WSS

- Para móviles y WebRTC, usar WSS con certificado válido para la IP/host en uso.
- Si hay desconexiones intermitentes, habilitar `LOG_WS_DISCONNECTS=1` para diagnóstico.

## Diagnóstico rápido

- **No autentica**: revisa `JWT_SECRET` y reloj/sistema.
- **No conecta WS**: revisa `HOST/PORT`, firewall y rutas de `SSL_CERT`/`SSL_KEY`.
- **No persiste mensajes/chats**: revisa credenciales MySQL y existencia de tablas.
