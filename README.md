# Chat Local (LAN) — Guía principal de uso

Aplicación de chat en tiempo real para red local con:
- Registro/login de usuarios
- Chats directos y grupales
- Mensajería en tiempo real por WebSocket
- Llamadas de audio/video (WebRTC + señalización por WS)
- Frontend en HTTPS y backend en WSS para permisos de cámara/micrófono

---

## 1) Qué puedes hacer (historias de usuario)

- Como usuario, puedo registrarme e iniciar sesión.
- Como usuario, puedo buscar a otro usuario por username y abrir chat directo.
- Como usuario, puedo crear grupos e invitar contactos.
- Como usuario, puedo enviar/recibir mensajes en tiempo real.
- Como usuario, puedo iniciar llamadas de audio/video (directas y grupales).
- Como usuario en móvil/tablet, puedo entrar por IP LAN del servidor.

---

## 2) Estructura esperada

```text
chat/
  README.md                 <- esta guía
  backend/
    README.md               <- guía técnica backend
    server.py
    db.py
    auth.py
    protocol.py
    requirements.txt
    .env                    <- local (no subir)
  frontend/
    README.md               <- guía técnica frontend
    package.json
    vite.config.ts
    tsconfig*.json
    src/
    .env                    <- local (no subir)
  certs/
    local.pem               <- local (no subir)
    local-key.pem           <- local (no subir)
```

---

## 3) Requisitos (PC servidor)

- Node.js 18+
- Python 3.11+
- MySQL (XAMPP o servidor local)
- mkcert (para certificados LAN)

Verifica:

```powershell
node -v
npm -v
python --version
```

---

## 4) Base de datos

1. Enciende MySQL.
2. Crea la BD `chatapp`.
3. Crea tablas usadas por el backend: `users`, `chats`, `chat_members`, `messages`.

---

## 5) Certificados HTTPS/WSS (obligatorio recomendado)

> Para WebRTC en red local, usa HTTPS/WSS para evitar bloqueos de cámara/micrófono.

En PowerShell (admin):

```powershell
choco install mkcert -y
mkcert -install
```

En la raíz del repo (`chat/`), genera cert para tu IP LAN (ejemplo `192.168.1.12`):

```powershell
mkdir certs
mkcert 192.168.1.12
move .\192.168.1.12.pem .\certs\local.pem
move .\192.168.1.12-key.pem .\certs\local-key.pem
```

---

## 6) Variables de entorno

### `backend/.env`

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

### `frontend/.env`

```env
VITE_WS_URL=wss://192.168.1.12:8765
```

Cambia la IP por tu IP LAN real.

---

## 7) Arranque paso a paso (sin errores)

### Paso A — Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

Debes ver algo como:

```text
WS server: wss://0.0.0.0:8765
```

### Paso B — Frontend build

```powershell
cd ..\frontend
npm install
npm run build
```

### Paso C — Servir frontend por HTTPS (SPA)

Recomendado usar `serve` por fallback de rutas:

```powershell
npm install -g serve
serve -s dist -l 8080 --ssl-cert ..\certs\local.pem --ssl-key ..\certs\local-key.pem
```

Acceso:

```text
https://<SERVER_IP>:8080/#/app
```

---

## 8) Probar desde otro dispositivo (móvil/tablet/PC)

1. Conecta dispositivo a la misma red Wi‑Fi/LAN.
2. Abre `https://<SERVER_IP>:8080/#/app`.
3. Acepta certificado local si el navegador lo solicita.
4. Permite cámara/micrófono cuando se pida.

---

## 9) Troubleshooting rápido

- **No conecta WS**: revisa `VITE_WS_URL`, backend activo y puerto `8765` abierto.
- **No entra cámara/micrófono**: usa HTTPS válido para tu IP, revisa permisos del navegador.
- **Rutas 404**: usa `serve -s dist` y URL con `#/app`.
- **Otro equipo no abre**: revisa firewall (TCP 8080 y 8765).

---

## 10) Qué NO subir a Git

No subir:
- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/.env`
- `frontend/.env`
- `certs/`

Sí subir:
- Código fuente
- `README.md`, `frontend/README.md`, `backend/README.md`
- `requirements.txt`, `package.json`, `package-lock.json`
