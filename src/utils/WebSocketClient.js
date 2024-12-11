import { log } from "../utils/log.js";

class WebSocketClient {
  /**
   * @param {string} url
   */
  constructor(url) {
    this.client = new WebSocket(url);
    this.client.onerror = function (error) {
      log.error(error);
    };
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onOpen(f) {
    this.client.onopen = f;
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onClose(f) {
    this.client.onclose = f;
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onMessage(f) {
    this.client.onmessage = function (e) {
      f(e.data);
    };
  }

  /**
   * @param {string} message
   */
  sendMessage(message) {
    this.client.send(message);
  }

  close() {
    this.client.close();
  }
}

export default WebSocketClient;
