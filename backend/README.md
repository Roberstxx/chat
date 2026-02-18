# KaapehChat Backend (Python + WebSocket)

El backend de KaapehChat gestiona autenticación, usuarios, conversaciones, persistencia de mensajes, presencia y señalización para llamadas WebRTC. Está diseñado para funcionar en tiempo real con un frontend React conectado por WebSocket.

## 1. Objetivo del backend

Este servicio centraliza toda la lógica de dominio:

- Registro y login de usuarios.
- Emisión y validación de JWT.
- Búsqueda de usuarios por username.
- Gestión de chats directos y grupales.
- Gestión de membresías en chats.
- Persistencia y distribución de mensajes.
- Señales de presencia (online/offline).
- Reenvío de eventos de señalización WebRTC.

## 2. Stack tecnológico

- Python 3.11+
- websockets
- mysql-connector-python
- bcrypt
- PyJWT
- python-dotenv

Instalación de dependencias:

```bash
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# Linux/macOS
# source .venv/bin/activate

pip install -r requirements.txt
```

## 3. Archivos clave y responsabilidades

- `server.py`: servidor WebSocket, enrutado de eventos y sesiones activas.
- `db.py`: acceso a MySQL y operaciones CRUD de usuarios/chats/mensajes.
- `auth.py`: hash de contraseñas y generación/verificación de JWT.
- `protocol.py`: formato de mensajes de entrada/salida en WS.
- `requirements.txt`: dependencias del backend.

## 4. Variables de entorno (`backend/.env`)

Ejemplo recomendado:

```env
MYSQL_DB=chatapp
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306

JWT_SECRET=cambia_esto_en_produccion

HOST=0.0.0.0
PORT=8765

# Si se dejan vacíos, el servidor funciona en ws://
# Si se configuran, levanta wss://
SSL_CERT=
SSL_KEY=

LOG_WS_DISCONNECTS=0
```

### Significado de cada variable

- `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`:
  credenciales/conexión a base de datos.
- `JWT_SECRET`:
  clave para firmar y validar tokens.
- `HOST`, `PORT`:
  interfaz y puerto del servidor WS.
- `SSL_CERT`, `SSL_KEY`:
  rutas a certificado y clave privada para WSS.
- `LOG_WS_DISCONNECTS`:
  activa logging de desconexiones para diagnóstico.

## 5. Modelo de datos esperado

El backend asume tablas para:

- `users`
- `chats`
- `chat_members`
- `messages`

Debes crearlas previamente en MySQL antes de iniciar el servidor.

## 6. Ejecución local

```bash
python server.py
```

Salida típica:

```text
WS server: ws://0.0.0.0:8765
```

Si `SSL_CERT` y `SSL_KEY` están configurados correctamente:

```text
WS server: wss://0.0.0.0:8765
```

## 7. Flujo interno de operación

1. Cliente abre conexión WebSocket.
2. Cliente envía evento de autenticación (`auth:login` o `auth:register`).
3. Backend valida datos, consulta DB y responde `auth:ok` o `auth:error`.
4. Cliente autenticado consulta chats y mensajes (`chat:list`, `message:list`).
5. Cuando un usuario envía `message:send`, el backend:
   - valida permisos/membresía,
   - persiste en DB,
   - reenvía a miembros conectados del chat.
6. Para llamadas, el backend no procesa multimedia: solo enruta eventos `rtc:signal`.

## 8. Eventos WebSocket soportados (resumen)

### Autenticación y sesión

- `auth:register`
- `auth:login`
- `hello`

### Chats y mensajes

- `chat:list`
- `chat:createDirect`
- `group:create`
- `group:invite`
- `room:join`
- `message:send`

### Presencia y llamadas

- `presence:update`
- `rtc:signal` (`offer`, `answer`, `ice`, `end`)

## 9. Modo LAN y producción

Para funcionamiento estable en múltiples PCs/móviles:

1. Usa IP fija o reserva DHCP para el servidor.
2. Abre puerto `8765` en firewall/router según corresponda.
3. Recomendado: habilitar WSS con certificado válido para el host/IP.
4. Asegura sincronización de hora del sistema (importante para JWT).

## 10. Checklist para ejecutar en cualquier PC sin problemas

- [ ] Python y pip instalados y actualizados.
- [ ] Entorno virtual creado y dependencias instaladas.
- [ ] MySQL ejecutándose y accesible.
- [ ] Base de datos `chatapp` y tablas creadas.
- [ ] Archivo `.env` completo y correcto.
- [ ] Puerto 8765 libre y permitido por firewall.
- [ ] Backend iniciado sin errores en consola.

## 11. Troubleshooting detallado

- **`Access denied for user`**
  - credenciales MySQL incorrectas en `.env`.
- **`Can't connect to MySQL server`**
  - MySQL apagado, host incorrecto o firewall bloqueando.
- **`Invalid token` / sesión no restaura**
  - `JWT_SECRET` distinto entre ejecuciones o token expirado.
- **Clientes no reciben mensajes**
  - usuario no unido al chat o desconectado del WS.
- **Llamadas no conectan**
  - revisar señalización WS y políticas de red/NAT/HTTPS.

## Autor

**KaapehChat**
