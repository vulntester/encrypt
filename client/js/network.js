/**
 * Network Module: Handles WebSocket lifecycle and packet routing.
 * No UI or Crypto logic allowed here.
 */
export class Network {
    constructor(myId, onMessageCallback) {
        this.myId = myId;
        this.onMessage = onMessageCallback;
        this.connect();
    }

    connect() {
        // In production, use wss:// for TLS
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.onopen = () => {
            console.log("Relay connected.");
            this.send({ type: 'register', from: this.myId });
        };

        this.ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                this.onMessage(data);
            } catch (err) {
                console.error("Malformed network packet received.");
            }
        };

        this.ws.onclose = () => {
            console.warn("Lost connection to relay. Retrying in 5s...");
            setTimeout(() => this.connect(), 5000);
        };
    }

    send(payload) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        } else {
            console.error("Network: Cannot send, socket closed.");
        }
    }

    // Handshake helpers
    requestChat(to) { this.send({ type: 'request', from: this.myId, to }); }
    
    acceptChat(to, pubKey) { this.send({ type: 'accept', from: this.myId, to, pubKey }); }
    
    finalizeHandshake(to, pubKey) { this.send({ type: 'pubkey', from: this.myId, to, pubKey }); }
    
    emitMessage(to, ciphertext) { this.send({ type: 'message', from: this.myId, to, ciphertext }); }
}