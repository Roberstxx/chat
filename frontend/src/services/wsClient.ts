// src/services/wsClient.ts
export type WSMessage = { type: string; data: any };
type Handler = (msg: WSMessage) => void;

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
    const fallbackHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const url = (import.meta.env.VITE_WS_URL as string) || `ws://${fallbackHost}:8765`;
    this.url = url;
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
