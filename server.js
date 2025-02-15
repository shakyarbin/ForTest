const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

const players = new Map();

server.on('connection', (ws) => {
    const playerId = generatePlayerId();
    
    // Store new player
    players.set(playerId, {
        id: playerId,
        steps: 0,
        progress: 0,
        lastUpdate: Date.now()
    });

    // Send initial players data
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        players: Array.from(players.values())
    }));

    // Broadcast new player to others
    broadcast({
        type: 'playerJoined',
        player: players.get(playerId)
    }, ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'updateSteps') {
            const player = players.get(playerId);
            if (player) {
                player.steps = data.steps;
                player.progress = data.progress;
                player.lastUpdate = Date.now();

                // Broadcast player update
                broadcast({
                    type: 'playerUpdate',
                    player: player
                });
            }
        }
    });

    ws.on('close', () => {
        players.delete(playerId);
        broadcast({
            type: 'playerLeft',
            playerId: playerId
        });
    });
});

function broadcast(message, exclude = null) {
    server.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
}

// Clean up inactive players
setInterval(() => {
    const now = Date.now();
    for (const [playerId, player] of players.entries()) {
        if (now - player.lastUpdate > 60000) { // Remove after 1 minute of inactivity
            players.delete(playerId);
            broadcast({
                type: 'playerLeft',
                playerId: playerId
            });
        }
    }
}, 30000); 