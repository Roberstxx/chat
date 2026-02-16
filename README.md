# Chat (Backend + Frontend)

Guía rápida para correr el proyecto como lo estás desplegando (backend WebSocket + frontend estático servido como app web).

## 1) Levantar Backend (WebSocket)

En **terminal 1**:

```bat
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

Debe mostrar:

```txt
WS server: ws://0.0.0.0:8765
```

---

## 2) Build y servir Frontend (recomendado con `serve`)

En **terminal 2**:

```bat
cd frontend
npm install
npm run build
npm install -g serve
serve -s dist -l 8080
```

Luego abre:

- `http://localhost:8080`
- o desde otro dispositivo en la red local: `http://IP_DEL_SERVER:8080`

> `serve -s` ya incluye fallback SPA, así que rutas como `/login` o `/app` no deben regresar 404.

---

## 3) Opción HTTPS para móvil (mkcert + http-server)

Si necesitas cámara/micrófono en móvil por red local, usa HTTPS.

Desde `frontend`:

```bat
cd frontend
npm run build
http-server dist -S -C ../certs/192.168.1.12.pem -K ../certs/192.168.1.12-key.pem -p 8080 -a 0.0.0.0 -P https://192.168.1.12:8080?
```

Notas:

- No ejecutes `cd frontend` dos veces (si ya estás en `chat\frontend`, te dará error de ruta).
- La opción `-P ...?` habilita fallback SPA para que `/login` y `/app` carguen `index.html`.
- Ajusta `192.168.1.12` a la IP real de tu PC servidor.

---

## Notas generales

- Backend WS: puerto `8765`.
- Frontend: puerto `8080`.
- En móvil, abre la IP local del PC servidor.
