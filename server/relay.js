const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Ephemeral map: 'username#DDDD' -> WebSocket instance
const clients = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Register client route
            if (data.type === 'register') {
                ws.id = data.from;
                clients.set(ws.id, ws);
                return;
            }

            // Relay message to recipient
            if (data.to && clients.has(data.to)) {
                clients.get(data.to).send(JSON.stringify(data));
            }
        } catch (e) {
            console.error('Relay error or malformed data');
        }
    });

    ws.on('close', () => {
        if (ws.id) clients.delete(ws.id);
    });
});
console.log('Blind relay running on ws://localhost:8080');