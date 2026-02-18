# KaapehChat — Documentación general del proyecto

KaapehChat es una aplicación web de mensajería en tiempo real para redes locales (LAN) y entornos controlados. El proyecto está dividido en dos partes:

- **Frontend** (React + Vite): interfaz de usuario, chat, notificaciones y llamadas.
- **Backend** (Python + WebSocket): autenticación, persistencia en MySQL, presencia y señalización WebRTC.

Este README explica la arquitectura completa y el proceso de instalación/ejecución para que puedas levantar el sistema en cualquier PC sin fricción.

---

## 1. Funcionalidades principales

- Registro e inicio de sesión con usuario y contraseña.
- Chats directos entre dos personas.
- Chats grupales con creación de grupos e invitaciones.
- Mensajes en tiempo real.
- Presencia de usuarios conectados.
- Llamadas de audio y video usando WebRTC (señalización vía WebSocket).

---

## 2. Estructura del repositorio

```text
KaapehChat_python/
  README.md                # guía general (este archivo)
  backend/
    README.md              # documentación técnica del backend
    server.py
    db.py
    auth.py
    protocol.py
    requirements.txt
  frontend/
    README.md              # documentación técnica del frontend
    package.json
    vite.config.ts
    src/
```

---

## 3. Requisitos del sistema (servidor)

Instala lo siguiente en la PC donde correrás KaapehChat:

- **Python 3.11+**
- **Node.js 18+** (recomendado 20+)
- **npm 9+**
- **MySQL 8+** (o MariaDB compatible)

Comandos de verificación:

```bash
python --version
node -v
npm -v
```

---

## 4. Configuración de la base de datos

1. Inicia tu servidor MySQL.
2. Crea una base de datos llamada `chatapp`.
3. Crea las tablas requeridas por el backend (`users`, `chats`, `chat_members`, `messages`).

> Si ya tienes un script SQL propio, úsalo antes de iniciar el backend.

---

## 5. Configuración de entorno

### 5.1 Backend (`backend/.env`)

Crea el archivo `backend/.env` con este contenido base:

```env
MYSQL_DB=chatapp
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306

JWT_SECRET=super_secret_key_123

HOST=0.0.0.0
PORT=8765

# Para desarrollo local simple (sin TLS) puedes dejar vacío SSL_CERT/SSL_KEY
SSL_CERT=
SSL_KEY=

LOG_WS_DISCONNECTS=0
```

### 5.2 Frontend (`frontend/.env`)

Crea `frontend/.env`:

```env
VITE_WS_URL=ws://127.0.0.1:8765
```

Si vas a exponerlo por LAN con TLS, cambia a `wss://<IP_SERVIDOR>:8765`.

---

## 6. Instalación y ejecución (paso a paso)

## 6.1 Levantar backend

```bash
cd backend
python -m venv .venv
```

Activación del entorno virtual:

- **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- **Linux/macOS:**
  ```bash
  source .venv/bin/activate
  ```

Instala dependencias y ejecuta:

```bash
pip install -r requirements.txt
python server.py
```

Salida esperada:

```text
WS server: ws://0.0.0.0:8765
```

(o `wss://...` si usas certificados SSL válidos en variables de entorno).

## 6.2 Levantar frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre en navegador:

```text
http://localhost:8080
```

---

## 7. Ejecución en otra PC de la red

Para que otra computadora use KaapehChat:

1. Asegura conectividad en la misma red.
2. Abre puertos del servidor (por defecto **8080** frontend y **8765** backend).
3. En `frontend/.env`, define `VITE_WS_URL` con la IP real del servidor.
4. Reinicia frontend tras cambiar variables de entorno.

Ejemplo:

```env
VITE_WS_URL=ws://192.168.1.50:8765
```

---

## 8. Modo producción recomendado

1. Compila frontend:

```bash
cd frontend
npm run build
```

2. Sirve `frontend/dist` con servidor HTTP/HTTPS (Nginx, Caddy o `serve`).
3. Ejecuta backend como servicio (systemd, NSSM, PM2 + script Python, etc.).
4. Usa HTTPS/WSS para evitar problemas de permisos de cámara/micrófono en navegadores.

---

## 9. Solución de problemas rápida

- **No conecta al backend:** revisa `VITE_WS_URL`, IP, puerto y firewall.
- **Error de login/registro:** valida conexión a MySQL y variables `MYSQL_*`.
- **No aparecen mensajes:** confirma que backend está en ejecución y no hay error de DB.
- **No funciona video/audio:** usa HTTPS/WSS y concede permisos de micrófono/cámara.

---

## 10. Documentación adicional

- `frontend/README.md`: instalación, arquitectura y flujos del cliente.
- `backend/README.md`: arquitectura, protocolo WebSocket y operación del servidor.

---

## Autor

**KaapehChat**
