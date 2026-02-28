export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route WebSocket upgrades to the Durable Object relay.
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected a WebSocket upgrade request.', { status: 426 });
      }

      const id = env.RELAY_ROOM.idFromName('global-room');
      const stub = env.RELAY_ROOM.get(id);
      return stub.fetch(request);
    }

    // Optional health endpoint for worker troubleshooting.
    if (url.pathname === '/health') {
      return Response.json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  },
};

export class RelayRoom {
  constructor() {
    this.clients = new Map();
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    let clientId = null;

    server.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        // Register this socket by user ID.
        if (data.type === 'register' && typeof data.from === 'string') {
          clientId = data.from;
          this.clients.set(clientId, server);
          return;
        }

        // Relay to recipient when online.
        if (typeof data.to === 'string') {
          const recipient = this.clients.get(data.to);
          if (recipient && recipient.readyState === 1) {
            recipient.send(JSON.stringify(data));
          }
        }
      } catch {
        // Ignore malformed payloads to avoid crashing the relay.
      }
    });

    const cleanup = () => {
      if (clientId) this.clients.delete(clientId);
    };

    server.addEventListener('close', cleanup);
    server.addEventListener('error', cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }
}
