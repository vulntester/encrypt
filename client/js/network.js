import { Storage } from './storage.js';

function resolveWebSocketUrl() {
    const explicitUrl =
        window.__WS_RELAY_URL ||
        document.querySelector('meta[name="ws-relay-url"]')?.content ||
        localStorage.getItem('ws_relay_url');

    if (explicitUrl) return explicitUrl;

    // Cloudflare Pages/Workers route: same host, /ws endpoint.
    if (typeof window !== 'undefined' && window.location?.hostname) {
        const isCloudflareHost =
            window.location.hostname.includes('pages.dev') ||
            window.location.hostname.includes('workers.dev');

        if (isCloudflareHost) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}/ws`;
        }
    }

    // Local development fallback for the Node relay.
    return 'ws://localhost:8080';
}

export class Network {
    constructor(myId, onMessageCallback) {
        this.myId = myId;
        this.onMessage = onMessageCallback;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(resolveWebSocketUrl());
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
