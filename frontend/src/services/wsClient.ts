// src/services/wsClient.ts
export type WSMessage = { type: string; data: any };
type Handler = (msg: WSMessage) => void;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname);
}

function resolveWsUrl(configured: string): string {
  if (typeof window === "undefined") {
    return configured || "ws://localhost:8765";
  }

  const pageProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const pageHost = window.location.hostname;

  if (!configured) {
    return `${pageProtocol}//${pageHost}:8765`;
  }

  try {
    const parsed = new URL(configured);
    const configuredHost = parsed.hostname;
    const pageIsLocal = isLocalHost(pageHost);
    const configuredIsLocal = isLocalHost(configuredHost);

    // Evita romper cuando el frontend se abre con otro host (127/LAN/local)
    // que el configurado en .env (muy común con mkcert y pruebas en móvil).
    const shouldUsePageHost =
      pageHost !== configuredHost &&
      (pageIsLocal !== configuredIsLocal || pageIsLocal || configuredIsLocal);

    const finalHost = shouldUsePageHost ? pageHost : configuredHost;
    const finalProtocol = pageProtocol;
    const finalPort = parsed.port || "8765";

    return `${finalProtocol}//${finalHost}:${finalPort}`;
  } catch {
    return `${pageProtocol}//${pageHost}:8765`;
  }
}

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private isOpen = false;
  private url = "";
  private helloToken?: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelayMs = 1500;
  private readonly maxReconnectDelayMs = 10000;
  private manualClose = false;

  connect(token?: string) {
    const configured = (import.meta.env.VITE_WS_URL as string) || "";
    this.url = resolveWsUrl(configured);
    this.helloToken = token;
    this.manualClose = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    this.openSocket();
  }

  private openSocket() {
    this.isOpen = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.isOpen = true;
      this.reconnectDelayMs = 1500;
      console.log("[WS] connected:", this.url);

      if (this.helloToken) {
        this.send("hello", { token: this.helloToken });
      }
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg: WSMessage = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(msg));
      } catch {
        console.log("[WS] invalid message:", ev.data);
      }
    };

    this.ws.onclose = () => {
      this.isOpen = false;
      this.ws = null;
      console.log("[WS] closed");

      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (e) => {
      console.log("[WS] error:", e);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.url) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.maxReconnectDelayMs);
    }, this.reconnectDelayMs);

    console.log("[WS] reconnect scheduled in", this.reconnectDelayMs, "ms");
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(type: string, data: any) {
    const payload = JSON.stringify({ type, data });

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      this.ws.send(payload);
      return;
    }

    if (this.ws) {
      const wsRef = this.ws;
      const onOpen = () => {
        try {
          if (wsRef.readyState === WebSocket.OPEN) wsRef.send(payload);
        } catch {}
        wsRef.removeEventListener("open", onOpen);
      };

      wsRef.addEventListener("open", onOpen);
      return;
    }

    this.connect(this.helloToken);
    const wsRef = this.ws;
    if (wsRef) {
      const onOpen = () => {
        try {
          if (wsRef.readyState === WebSocket.OPEN) wsRef.send(payload);
        } catch {}
        wsRef.removeEventListener("open", onOpen);
      };
      wsRef.addEventListener("open", onOpen);
    }
  }

  close() {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.isOpen = false;
    try {
      this.ws?.close();
    } catch {}
  }
}

export const wsClient = new WSClient();
