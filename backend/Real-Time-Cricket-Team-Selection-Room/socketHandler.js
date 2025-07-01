function setupSocket(io, rooms) {
  io.on('connection', (socket) => {
    console.log(`🟢 Connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, username }) => {
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

      const user = { id: socket.id, username };
      rooms[roomId].users.push(user);
      rooms[roomId].selections[socket.id] = [];

      socket.join(roomId);
      io.to(roomId).emit('room-users', rooms[roomId].users);
    });

    socket.on('start-selection', (roomId) => {
      const room = rooms[roomId];
      if (!room || room.started) return;

      room.started = true;
      room.turnOrder = shuffleArray(room.users.map(u => u.id));
      room.currentTurnIndex = 0;

      io.to(roomId).emit('turn-order', {
        order: room.turnOrder.map(id => room.users.find(u => u.id === id)?.username),
      });

      startTurn(io, roomId, rooms);
    });

    socket.on('select-player', ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room || !room.started) return;

      const currentUserId = room.turnOrder[room.currentTurnIndex];
      if (socket.id !== currentUserId || !room.pool.includes(player)) return;

      room.selections[socket.id].push(player);
      room.pool = room.pool.filter(p => p !== player);
      io.to(roomId).emit('player-selected', { player, user: socket.id });

      moveToNextTurn(io, roomId, rooms);
    });

    socket.on('disconnect', () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        room.users = room.users.filter(u => u.id !== socket.id);
        delete room.selections[socket.id];
        room.turnOrder = room.turnOrder.filter(id => id !== socket.id);

        if (room.users.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('room-users', room.users);
        }
      }
    });
  });
}

function startTurn(io, roomId, rooms) {
  const room = rooms[roomId];
  if (!room) return;

  const userId = room.turnOrder[room.currentTurnIndex];
  const socket = io.sockets.sockets.get(userId);

  if (!socket) {
    autoSelect(io, roomId, rooms);
    return;
  }

  socket.emit('your-turn');

  setTimeout(() => {
    const stillUser = rooms[roomId]?.turnOrder[rooms[roomId]?.currentTurnIndex];
    if (stillUser === userId) autoSelect(io, roomId, rooms);
  }, 10000);
}

function autoSelect(io, roomId, rooms) {
  const room = rooms[roomId];
  if (!room) return;

  const userId = room.turnOrder[room.currentTurnIndex];
  const player = room.pool[Math.floor(Math.random() * room.pool.length)];

  if (player) {
    room.selections[userId].push(player);
    room.pool = room.pool.filter(p => p !== player);
    io.to(roomId).emit('auto-selected', { player, user: userId });
  }

  moveToNextTurn(io, roomId, rooms);
}

function moveToNextTurn(io, roomId, rooms) {
  const room = rooms[roomId];
  room.currentTurnIndex++;

  const allDone = Object.values(room.selections).every(sel => sel.length >= 5);
  if (allDone) {
    io.to(roomId).emit('selection-ended', { selections: room.selections });
  } else {
    startTurn(io, roomId, rooms);
  }
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function generatePlayerPool() {
  return [
    'Virat', 'Rohit', 'Dhoni', 'Bumrah', 'Jadeja', 'Gill',
    'Rahul', 'Pandya', 'Ashwin', 'Surya', 'Shami', 'Iyer'
  ];
}

module.exports = setupSocket;
