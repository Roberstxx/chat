// src/services/wsClient.ts
export type WSMessage = { type: string; data: any };
type Handler = (msg: WSMessage) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private isOpen = false;
  private url = "";
  private helloToken?: string;

  connect(token?: string) {
    const url = (import.meta.env.VITE_WS_URL as string) || "ws://localhost:8765";
    this.url = url;
    this.helloToken = token;

    // Si ya hay uno abierto o conectando, ciérralo bien
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {}
    }

    this.isOpen = false;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.isOpen = true;
      console.log("[WS] connected:", url);

      // hello para sesión en server
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
      console.log("[WS] closed");
    };

    this.ws.onerror = (e) => {
      console.log("[WS] error:", e);
    };
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(type: string, data: any) {
    const payload = JSON.stringify({ type, data });

    // ✅ si ya está abierto, manda normal
    if (this.ws && this.isOpen) {
      this.ws.send(payload);
      return;
    }

    // ✅ si existe ws pero aún no abre, “encola” y manda cuando abra
    if (this.ws) {
      const wsRef = this.ws;

      const onOpen = () => {
        try {
          if (wsRef.readyState === WebSocket.OPEN) wsRef.send(payload);
        } catch {}
        wsRef.removeEventListener("open", onOpen);
      };

      wsRef.addEventListener("open", onOpen);
      console.log("[WS] queued until open:", type);
      return;
    }

    // ✅ si no hay ws, intenta reconectar y encolar
    console.log("[WS] no ws, reconnecting then queue:", type);
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
    try {
      this.ws?.close();
    } catch {}
  }
}

export const wsClient = new WSClient();
