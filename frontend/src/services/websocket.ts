/**
 * WebSocket service with reconnection, typed events, and message queue.
 * TODO: Connect to your Python WebSocket backend.
 */

import { WsEvent } from '@/types';

type WsHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private handlers: Map<string, Set<WsHandler>> = new Map();
  private queue: Array<{ event: WsEvent; payload: any }> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private connected = false;

  connect(url: string) {
    this.url = url;
    this._connect();
  }

  private _connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.connected = true;
        this.reconnectDelay = 2000;
        this._flushQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const { event: evName, data } = JSON.parse(event.data);
          this._emit(evName, data);
        } catch (e) {
          console.error('[WS] Parse error', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.connected = false;
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error', err);
      };
    } catch (e) {
      console.error('[WS] Connection failed', e);
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this._connect();
    }, this.reconnectDelay);
  }

  private _flushQueue() {
    while (this.queue.length > 0) {
      const msg = this.queue.shift()!;
      this._send(msg.event, msg.payload);
    }
  }

  private _send(event: WsEvent, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data: payload }));
    }
  }

  send(event: WsEvent, payload: any = {}) {
    if (this.connected) {
      this._send(event, payload);
    } else {
      this.queue.push({ event, payload });
    }
  }

  on(event: string, handler: WsHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: WsHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private _emit(event: string, data: any) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  get isConnected() {
    return this.connected;
  }
}

export const wsService = new WebSocketService();
