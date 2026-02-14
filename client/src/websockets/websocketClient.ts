// src/services/websocketClient.ts
export type WsEnvelope<T = any> = { eventType: string; data: T };

type Handler = (data: any) => void;

class WebsocketClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private handlers: Record<string, Set<Handler>> = {};
  private apiUrl: string | null = null;

  connect(apiUrl: string) {
    // כבר מחובר/מתחבר
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    this.apiUrl = apiUrl;
    const wsUrl = this.toWsUrl(apiUrl);

    this.isConnecting = true;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      console.log("✅ WS connected:", wsUrl);
      this.emitLocal("WS_CONNECTED", {});
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      console.log("❌ WS disconnected");
      this.emitLocal("WS_DISCONNECTED", {});
      this.ws = null;

      // אופציונלי: auto-reconnect
      // setTimeout(() => this.apiUrl && this.connect(this.apiUrl), 1500);
    };

    this.ws.onerror = (e) => {
      console.log("❌ WS error:", e);
    };

    this.ws.onmessage = (evt) => {
      let msg: WsEnvelope;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      const { eventType, data } = msg;
      this.emitLocal(eventType, data);
    };
  }

  disconnect() {
    if (this.ws) this.ws.close();
    this.ws = null;
    this.isConnecting = false;
  }

  on(eventType: string, handler: Handler) {
    if (!this.handlers[eventType]) this.handlers[eventType] = new Set();
    this.handlers[eventType].add(handler);

    // החזרה של unsubscribe
    return () => this.off(eventType, handler);
  }

  off(eventType: string, handler: Handler) {
    this.handlers[eventType]?.delete(handler);
  }

  private emitLocal(eventType: string, data: any) {
    const set = this.handlers[eventType];
    if (!set || set.size === 0) return;
    for (const h of set) {
      try { h(data); } catch (e) { console.error("WS handler error:", e); }
    }
  }

  private toWsUrl(apiUrl: string) {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/api\/?$/, "");
    return url.toString();
  }
}

// ✅ singleton
export const websocketClient = new WebsocketClient();
