// src/websocket/websocketServer.ts
import WebSocket, { WebSocketServer } from 'ws';

interface WebSocketClient {
  id: string;
  socket: WebSocket;
}

class WebSocketManager {
  private clients: WebSocketClient[] = [];
  private wss: WebSocketServer;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (socket: WebSocket) => {
      const clientId = `client-${Date.now()}`;
      console.log(`Client connected: ${clientId}`);
      this.clients.push({ id: clientId, socket });

      socket.on('message', (message: { toString: () => any; }) => {
        console.log(`Message from ${clientId}:`, message.toString());
      });

      socket.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.clients = this.clients.filter((client) => client.id !== clientId);
      });
    });
  }

  public broadcast(eventType: string, data: any) {
    const message = JSON.stringify({ eventType, data });
    this.clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    });
  }
}

export default WebSocketManager;
