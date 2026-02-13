import { useToast } from "vue-toastification";
const toast = useToast();

class WebSocketClient {
  private socket: WebSocket | null = null;

  connect(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Message from server:', message);

      switch (message.eventType) {
        case 'SYNC_COMPLETE':
          console.log("sync complete!")
          this.handleSyncComplete(message.data);
          break;
        default:
          console.log('Unknown event type:', message.eventType);
      }
    };

    this.socket.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleSyncComplete(data: { serviceName: string; namespace: string; status: string; error?: string }) {
    console.log("in ze complit: " + JSON.stringify(data))
    if (data.status === 'success') {
      console.log("in ze suc")
      toast.success(`Service ${data.serviceName} synced successfully in namespace ${data.namespace}`);
    } else {
      toast.error(`Failed to sync service ${data.serviceName} in namespace ${data.namespace}: ${data.error}`);
    }

    // Optionally, trigger a UI refresh or state update here
  }
}

export default new WebSocketClient();
