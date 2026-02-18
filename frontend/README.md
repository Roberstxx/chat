# KaapehChat Frontend (React + Vite)

Este frontend implementa la interfaz web de KaapehChat: autenticación, lista de conversaciones, chat en tiempo real y experiencia de llamadas de audio/video sobre WebRTC.

## 1. Tecnologías

- React 18 + TypeScript
- Vite 5
- React Router
- Tailwind CSS + componentes UI
- Vitest + Testing Library

## 2. Instalación

```bash
npm install
```

## 3. Variables de entorno

Crea `frontend/.env`:

```env
VITE_WS_URL=ws://127.0.0.1:8765
```

- En local usa `ws://`.
- En red con certificado TLS usa `wss://`.

## 4. Scripts disponibles

```bash
npm run dev         # servidor de desarrollo
npm run build       # build producción
npm run preview     # vista previa local de build
npm run test        # pruebas unitarias/integración
npm run lint        # lint de código
```

## 5. Flujo funcional del frontend

1. Usuario accede a login o registro.
2. Se envía evento de autenticación al backend vía WebSocket.
3. Al autenticar, el cliente obtiene token y datos de sesión.
4. Se cargan chats y mensajes históricos según la conversación activa.
5. El envío/recepción de mensajes ocurre en tiempo real por WS.
6. Para llamadas, el frontend usa `rtc:signal` para intercambio de oferta/respuesta/ICE.

## 6. Estructura de carpetas importante

```text
frontend/
  src/
    components/      # UI reutilizable y vistas de chat
    contexts/        # estado global de sesión/chats/calls
    pages/           # login, registro y layout principal
    lib/             # cliente WS y utilidades
    types/           # tipados TypeScript
```

## 7. Ejecución en red local

Para acceder desde otro equipo:

1. Ejecuta el frontend en modo dev o sirve la build.
2. Configura `VITE_WS_URL` con IP real del backend.
3. Verifica puertos abiertos y firewall.
4. Reinicia frontend después de cambios en `.env`.

## 8. Build y despliegue

```bash
npm run build
```

El resultado queda en `frontend/dist`. Puedes servirlo con cualquier servidor estático con soporte SPA.

## 9. Problemas comunes

- **Pantalla en blanco:** revisa consola del navegador y errores de build/lint.
- **No conecta WebSocket:** valida `VITE_WS_URL` y backend activo.
- **Error de permisos multimedia:** usar HTTPS/WSS y permisos del navegador.

## Autor

**KaapehChat**
