# Chat Local (LAN) --- React + WebSockets (Python) + MySQL + HTTPS/WSS

## 📌 Descripción General

Sistema de chat tipo WhatsApp/Discord que funciona en red local (LAN):

-   🔐 Login y registro con MySQL
-   💬 Chats directos y grupos
-   ⚡ Mensajes en tiempo real por WebSocket
-   🎥 Señalización WebRTC para llamadas
-   🔒 Frontend servido por HTTPS
-   🔐 Backend servido por WSS (SSL)

------------------------------------------------------------------------

# 🏗 Arquitectura

## Frontend

-   Vite + React + TypeScript
-   React Router
-   Conexión WSS
-   Variables en `frontend/.env`

## Backend

-   Python (asyncio)
-   websockets
-   mysql-connector-python
-   bcrypt
-   PyJWT
-   python-dotenv

## Base de Datos

MySQL con tablas: - users - chats - chat_members - messages

------------------------------------------------------------------------

# 📂 Estructura del Proyecto

    chat/
      backend/
        .venv/
        .env
        requirements.txt
        server.py
        db.py
        auth.py
        protocol.py

      frontend/
        .env
        package.json
        src/
        dist/

      certs/
        local.pem
        local-key.pem

------------------------------------------------------------------------

# 🧰 Requisitos

En PC servidor: - Node.js 18+ - Python 3.11+ - MySQL / XAMPP - mkcert

------------------------------------------------------------------------

# 🗄 Configuración MySQL

1.  Encender Apache y MySQL en XAMPP
2.  Crear base de datos `chatapp`
3.  Ejecutar script SQL de tablas

------------------------------------------------------------------------

# 🔐 Certificados SSL con mkcert

## Instalar mkcert

PowerShell como administrador:

    choco install mkcert -y
    mkcert -install

## Generar certificado

    mkcert 192.168.1.12
    move 192.168.1.12.pem certs\local.pem
    move 192.168.1.12-key.pem certs\local-key.pem

------------------------------------------------------------------------

# ⚙ Variables de Entorno

## backend/.env

    HOST=0.0.0.0
    PORT=8765

    MYSQL_DB=chatapp
    MYSQL_USER=root
    MYSQL_PASSWORD=
    MYSQL_HOST=127.0.0.1
    MYSQL_PORT=3306

    JWT_SECRET=super_secret_key_123

    SSL_CERT=../certs/local.pem
    SSL_KEY=../certs/local-key.pem

## frontend/.env

    VITE_WS_URL=wss://192.168.1.12:8765

------------------------------------------------------------------------

# 🚀 Primer Arranque (PC Servidor)

## Backend

    cd backend
    python -m venv .venv
    .\.venv\Scripts\activate
    pip install -r requirements.txt
    python server.py

## Frontend

    cd frontend
    npm install
    npm run build
    npm install -g http-server
    http-server dist -S -C ..\certs\local.pem -K ..\certs\local-key.pem -p 8080 -a 0.0.0.0 --proxy http://192.168.1.12:8080?

Abrir en navegador:

    https://192.168.1.12:8080

------------------------------------------------------------------------

# 🌐 Acceso desde otra PC en la misma red

Abrir:

    https://192.168.1.12:8080

------------------------------------------------------------------------

# 🔄 Flujo del Sistema

1.  Front abre WSS
2.  auth:login / auth:register
3.  Backend genera JWT
4.  hello con token
5.  chat:list
6.  message:send
7.  message:receive (broadcast)

------------------------------------------------------------------------

# 🛠 Troubleshooting

## Login no funciona

Verificar que: - Front use WSS - Backend esté en SSL

## 404 en /login

Usar flag proxy en http-server

## Error certificado

Verificar rutas correctas en certs/

## Otros no acceden

Abrir puertos 8080 y 8765 en firewall

------------------------------------------------------------------------

# 📦 Comandos Rápidos

Terminal 1:

    cd backend
    .\.venv\Scripts\activate
    python server.py

Terminal 2:

    cd frontend
    npm run build
    http-server dist -S -C ..\certs\local.pem -K ..\certs\local-key.pem -p 8080 -a 0.0.0.0 --proxy http://192.168.1.12:8080?

------------------------------------------------------------------------

# 📌 Reglas GitHub

-   No subir .env
-   No subir .venv
-   No subir node_modules
-   No subir certs

------------------------------------------------------------------------

# 👨‍💻 Nuevo Integrante

1.  Clonar repo
2.  Instalar dependencias
3.  Crear DB
4.  Generar certificados
5.  Configurar .env
6.  Ejecutar backend
7.  Build frontend
8.  Servir HTTPS
9.  Acceder por IP


- Backend WS: puerto `8765`.
- Frontend: puerto `8080`.
- En móvil, abre la IP local del PC servidor.
