// src/services/websocketClient.ts

export type WsEnvelope<T = any> = {
  eventType: string;
  data: T;
};

export type WsHandlers = {
  onConnected?: () => void;
  onDisconnected?: () => void;

  onBatchSyncStarted?: (data: any) => void;
  onBatchSyncComplete?: (data: any) => void;

  onSyncStarted?: (data: any) => void;
  onSyncStep?: (data: any) => void;
  onSyncComplete?: (data: any) => void;

  onServiceSynced?: (data: any) => void;

  // fallback
  onUnknownEvent?: (eventType: string, data: any) => void;
};

let ws: WebSocket | null = null;

export const connectWebsocket = (wsUrl: string, handlers: WsHandlers = {}) => {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("✅ WS connected:", wsUrl);
    handlers.onConnected?.();
  };

  ws.onclose = () => {
    console.log("❌ WS disconnected");
    handlers.onDisconnected?.();
  };

  ws.onerror = (e) => {
    console.log("❌ WS error:", e);
  };

  ws.onmessage = (evt) => {
    let msg: WsEnvelope;
    try {
      msg = JSON.parse(evt.data);
    } catch (e) {
      console.log("WS non-json message:", evt.data);
      return;
    }

    const { eventType, data } = msg;

    // Debug:
    // console.log("Message from server:", msg);

    switch (eventType) {
      case "BATCH_SYNC_STARTED":
        handlers.onBatchSyncStarted?.(data);
        return;

      case "BATCH_SYNC_COMPLETE":
        handlers.onBatchSyncComplete?.(data);
        return;

      case "SYNC_STARTED":
        handlers.onSyncStarted?.(data);
        return;

      case "SYNC_STEP":
        handlers.onSyncStep?.(data);
        return;

      case "SYNC_COMPLETE":
        handlers.onSyncComplete?.(data);
        return;

      case "SERVICE_SYNCED":
        handlers.onServiceSynced?.(data);
        return;

      default:
        console.warn("Unknown event type:", eventType, data);
        handlers.onUnknownEvent?.(eventType, data);
        return;
    }
  };

  return ws;
};

export const disconnectWebsocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

export default {
  connectWebsocket,
  disconnectWebsocket,
};
