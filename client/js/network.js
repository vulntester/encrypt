import { Storage } from './storage.js';

export class Network {
    constructor(myId, onMessageCallback) {
        this.myId = myId;
        this.onMessage = onMessageCallback;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:8080');
        this.ws.onopen = () => this.send({ type: 'register', from: this.myId });
        this.ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
        this.ws.onclose = () => setTimeout(() => this.connect(), 5000);
    }

    send(payload) {
        if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
    }

    // Step 1: Send the invite
    requestChat(to) { 
        this.send({ type: 'request', from: this.myId, to }); 
    }

    // Step 2: Recipient accepts and sends their PubKey
    acceptChat(to, pubKey) { 
        this.send({ type: 'accept', from: this.myId, to, pubKey }); 
    }

    // Step 3: Original sender sends their PubKey back
    finalizeHandshake(to, pubKey) { 
        this.send({ type: 'pubkey', from: this.myId, to, pubKey }); 
    }

    sendMessage(to, ciphertext) { 
        this.send({ type: 'message', from: this.myId, to, ciphertext }); 
    }
}