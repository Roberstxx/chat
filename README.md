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

## 2) Build y servir Frontend

En **terminal 2**:

```bat
cd frontend
npm install
npm run build
npm install -g serve
serve -s dist -l 8080
```

Luego abre en el navegador:

- `http://localhost:8080`
- o desde otro dispositivo en la red local: `http://IP_DEL_SERVER:8080`

---

## Notas

- El backend escucha en el puerto `8765` para WebSocket.
- El frontend se sirve en `8080`.
- Si entras desde móvil, usa la IP local del PC servidor para el frontend.
