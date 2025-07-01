// 📁 backend/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSocket = require('./socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://real-time-cricket-team-selection-ro.vercel.app",
    methods: ['GET', 'POST'],
    credentials: true
  },
});


app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const rooms = {};

// Initialize socket handling
setupSocket(io, rooms);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: '✅ Real-time Cricket Team Selection Backend Running',
    activeRooms: Object.keys(rooms).length,
    timestamp: new Date().toISOString()
  });
});

// Create room endpoint
app.post('/api/create-room', (req, res) => {
  const roomId = generateRoomId();
  rooms[roomId] = {
    hostId: null,
    users: [],
    selections: {},
    turnOrder: [],
    currentTurnIndex: 0,
    started: false,
    pool: generatePlayerPool(),
    timer: null,
    createdAt: new Date().toISOString()
  };
  
  res.json({ roomId, message: 'Room created successfully' });
});

// Get room info endpoint
app.get('/api/room/:roomId', (req, res) => {
  const room = rooms[req.params.roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
 
  res.json({
    roomId: req.params.roomId,
    userCount: room.users.length,
    users: room.users.map(u => ({ username: u.username })), // Don't expose socket IDs
    started: room.started,
    poolSize: room.pool.length,
    createdAt: room.createdAt
  });
});

// Get all active rooms endpoint
app.get('/api/rooms', (req, res) => {
  const roomList = Object.keys(rooms).map(roomId => ({
    roomId,
    userCount: rooms[roomId].users.length,
    started: rooms[roomId].started,
    createdAt: rooms[roomId].createdAt
  }));
  
  res.json({ rooms: roomList, total: roomList.length });
});

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerPool() {
  return [
    'Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Jasprit Bumrah', 
    'Ravindra Jadeja', 'Shubman Gill', 'KL Rahul', 'Hardik Pandya',
    'Ravichandran Ashwin', 'Suryakumar Yadav', 'Mohammed Shami', 
    'Shreyas Iyer', 'Rishabh Pant', 'Yuzvendra Chahal', 'Bhuvneshwar Kumar',
    'Axar Patel', 'Ishan Kishan', 'Washington Sundar', 'Kuldeep Yadav',
    'Deepak Chahar', 'Prithvi Shaw', 'Sanju Samson', 'Umran Malik',
    'Arshdeep Singh', 'Tilak Varma', 'Mohammed Siraj', 'Shardul Thakur',
    'Dinesh Karthik', 'Deepak Hooda', 'Ruturaj Gaikwad'
  ];
}

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🎯 Socket.IO ready for connections`);
});