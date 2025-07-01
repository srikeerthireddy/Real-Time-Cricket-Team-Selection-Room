// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const setupSocket = require('./socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 3000;
app.use(express.json());

let rooms = {}; // Shared with socketHandler
setupSocket(io, rooms); // Pass rooms object

// Health Check
app.get("/", (req, res) => {
    res.send("Backend is working ✅");
});

// 🔁 1. Test Join Room
app.post("/test-join", (req, res) => {
    const { roomId, userName } = req.body;
    if (!rooms[roomId]) {
        rooms[roomId] = {
            users: [],
            pool: generatePlayerPool(),
            selections: {},
            turnOrder: [],
            currentTurnIndex: 0,
            started: false,
        };
    }
    const userId = `manual-${Date.now()}`;
    rooms[roomId].users.push({ id: userId, username: userName });
    rooms[roomId].selections[userId] = [];

    res.json({ message: `User ${userName} added to ${roomId}`, room: rooms[roomId] });
});

// 🎬 2. Test Start Selection
app.post("/test-start", (req, res) => {
    const { roomId } = req.body;
    const room = rooms[roomId];
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.started) return res.status(400).json({ error: "Selection already started" });

    room.started = true;
    room.turnOrder = shuffleArray(room.users.map(u => u.id));
    room.currentTurnIndex = 0;

    res.json({
        message: "Selection started",
        turnOrder: room.turnOrder.map(id => room.users.find(u => u.id === id)?.username),
    });
});

// 🏏 3. Test Select Player
app.post("/test-select", (req, res) => {
    const { roomId, userId, player } = req.body;
    const room = rooms[roomId];
    if (!room || !room.started) return res.status(400).json({ error: "Selection not started" });

    const currentUserId = room.turnOrder[room.currentTurnIndex];
    if (userId !== currentUserId) return res.status(403).json({ error: "Not your turn" });
    if (!room.pool.includes(player)) return res.status(400).json({ error: "Invalid player" });

    room.selections[userId].push(player);
    room.pool = room.pool.filter(p => p !== player);

    room.currentTurnIndex++;
    if (room.currentTurnIndex >= room.turnOrder.length) {
        room.currentTurnIndex = 0;
    }

    res.json({ message: `Player ${player} selected by ${userId}` });
});

// ⏱️ 4. Test Auto-Select
app.post("/test-auto", (req, res) => {
    const { roomId } = req.body;
    const room = rooms[roomId];
    if (!room) return res.status(404).json({ error: "Room not found" });

    const userId = room.turnOrder[room.currentTurnIndex];
    const autoPlayer = room.pool[0];
    if (!autoPlayer) return res.status(400).json({ error: "No players left" });

    room.selections[userId].push(autoPlayer);
    room.pool = room.pool.filter(p => p !== autoPlayer);

    room.currentTurnIndex++;
    if (room.currentTurnIndex >= room.turnOrder.length) {
        room.currentTurnIndex = 0;
    }

    res.json({ message: `Auto-selected ${autoPlayer} for ${userId}` });
});

// 🏁 5. Test Selection End Check
app.post("/test-end", (req, res) => {
    const { roomId } = req.body;
    const room = rooms[roomId];
    if (!room) return res.status(404).json({ error: "Room not found" });

    const allDone = Object.values(room.selections).every(sel => sel.length === 5);
    if (!allDone) return res.json({ message: "Selection not yet completed" });

    const result = {};
    for (const uid in room.selections) {
        const user = room.users.find(u => u.id === uid);
        result[user?.username || uid] = room.selections[uid];
    }

    res.json({ message: "Selection ended", results: result });
});

// Reuse shuffle & player pool
function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function generatePlayerPool() {
    return [
        'Virat', 'Rohit', 'Dhoni', 'Bumrah', 'Jadeja', 'Gill',
        'Rahul', 'Pandya', 'Ashwin', 'Surya', 'Shami', 'Iyer'
    ];
}

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
