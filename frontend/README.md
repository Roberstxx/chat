# Frontend (React + Vite) — Guía técnica

Este frontend implementa UI de chat en tiempo real y señalización WebRTC sobre WebSocket.

## Stack

- React 18 + TypeScript
- Vite 5
- React Router
- Tailwind + shadcn/ui
- Vitest + Testing Library

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm test
```

## Configuración clave

### Alias `@`

- Definido en `vite.config.ts` y `vitest.config.ts` hacia `./src`.
- Debe coincidir con TypeScript:
  - `tsconfig.json` → `@/* -> src/*`
  - `tsconfig.app.json` → `@/* -> src/*`

### Variables de entorno

Archivo `frontend/.env`:

```env
VITE_WS_URL=wss://<SERVER_IP>:8765
```

> Si se omite, el cliente intenta resolver WS usando host actual + `:8765`.

## Flujo de red en frontend

1. `wsClient.connect(token)` abre WebSocket.
2. Se envía evento `hello` con JWT para restaurar sesión.
3. App escucha eventos de dominio (`chat:list:ok`, `message:receive`, `rtc:signal`, etc.).
4. Para llamadas, `CallOverlay` maneja peers WebRTC y usa WS solo para señalización (`offer/answer/ice/end`).

## Eventos WS usados por frontend

### Auth / sesión
- `auth:login`
- `auth:register`
- `auth:ok`
- `hello`
- `hello:ok`
- `auth:error`

### Chats / mensajes
- `chat:list`
- `chat:list:ok`
- `chat:createDirect`
- `chat:created`
- `group:create`
- `group:created`
- `group:invite`
- `message:send`
- `message:receive`
- `message:list:ok`

### Presencia / RTC
- `presence:update`
- `rtc:signal` (`offer`, `answer`, `ice`, `end`)

## Llamadas (resumen técnico)

- Modo directo y grupal con múltiples `RTCPeerConnection` por participante.
- Cola de ICE por peer para carreras de señalización.
- Intento de recuperación de llamada tras refresh usando `sessionStorage` (`activeCall`).
- Micrófono inicia silenciado por defecto (`track.enabled = false`).

## Build de producción (LAN)

```bash
npm run build
# recomendado servir con fallback SPA y HTTPS
serve -s dist -l 8080 --ssl-cert ../certs/local.pem --ssl-key ../certs/local-key.pem
```

## Problemas comunes

- **Error en imports `@/...`**: valida `tsconfig*.json` + `vite.config.ts`.
- **WS reconectando infinito**: revisa `VITE_WS_URL`, backend WSS y certificado/host.
- **WebRTC sin cámara/mic**: confirma HTTPS y permisos navegador.
