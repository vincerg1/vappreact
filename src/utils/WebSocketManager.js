// WebSocketManager.js

class WebSocketManager {
    constructor(url) {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established.');
        // Realiza acciones adicionales cuando se abre la conexión.
      };
  
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        // Realiza acciones adicionales al recibir un mensaje.
      };
  
      this.socket.onclose = (event) => {
        if (event.wasClean) {
          console.log(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
        } else {
          console.error('WebSocket connection abruptly closed');
        }
        // Realiza acciones adicionales cuando se cierra la conexión.
      };
  
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Maneja errores de WebSocket.
      };
    }
  
    // Agrega métodos para enviar mensajes, realizar acciones, etc.
  }
  
  export default WebSocketManager;
  