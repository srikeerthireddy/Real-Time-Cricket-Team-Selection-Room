// 📁 backend/socketHandler.js
function setupSocket(io, rooms) {
  io.on('connection', (socket) => {
    console.log(`🟢 Connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, username }) => {
      if (!roomId || !username) {
        socket.emit('error', { message: 'Room ID and username are required' });
        return;
      }

      console.log(`User ${username} joining room ${roomId}`);
      
      // Check if room exists
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const room = rooms[roomId];
      
      // Check if username is already taken in this room
      const existingUser = room.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        socket.emit('error', { message: 'Username already taken in this room' });
        return;
      }

      // Check if user is already in the room (reconnection)
      const existingSocketUser = room.users.find(u => u.id === socket.id);
      if (!existingSocketUser) {
        const user = { id: socket.id, username: username.trim() };
        room.users.push(user);
        room.selections[socket.id] = [];
        
        // Set first user as host
        if (!room.hostId) {
          room.hostId = socket.id;
        }
      }

      socket.join(roomId);
      
      // Send updated room info to all users
      io.to(roomId).emit('room-users', room.users);
      
      // Send host info to the joining user
      socket.emit('host-status', { 
        isHost: socket.id === room.hostId,
        started: room.started 
      });

      // Send current game state to the joining user
      socket.emit('game-state', {
        turnOrder: room.started ? room.turnOrder.map(id => {
          const user = room.users.find(u => u.id === id);
          return user ? user.username : null;
        }).filter(Boolean) : [],
        currentTurnIndex: room.currentTurnIndex,
        pool: room.pool,
        selections: getSelectionsWithUsernames(room),
        started: room.started
      });

      console.log(`✅ User ${username} successfully joined room ${roomId}`);
    });

    socket.on('start-selection', ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (room.started) {
        socket.emit('error', { message: 'Selection already started' });
        return;
      }
      
      if (socket.id !== room.hostId) {
        socket.emit('error', { message: 'Only host can start the selection' });
        return;
      }

      // Need at least 2 users to start
      if (room.users.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      room.started = true;
      
      // Create turn order excluding the host
      const nonHostUsers = room.users.filter(u => u.id !== room.hostId);
      room.turnOrder = shuffleArray(nonHostUsers.map(u => u.id));
      room.currentTurnIndex = 0;

      console.log('Starting selection for room:', roomId);
      console.log('Turn order (excluding host):', room.turnOrder.map(id => {
        const user = room.users.find(u => u.id === id);
        return user ? user.username : 'Unknown';
      }));

      // Send turn order to all users
      const turnOrderUsernames = room.turnOrder.map(id => {
        const user = room.users.find(u => u.id === id);
        return user ? user.username : null;
      }).filter(Boolean);
      
      io.to(roomId).emit('turn-order', {
        order: turnOrderUsernames,
      });

      // Start the first turn
      setTimeout(() => {
        startTurn(io, roomId, rooms);
      }, 1000);
    });

    socket.on('select-player', ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room || !room.started) {
        socket.emit('error', { message: 'Room not found or selection not started' });
        return;
      }

      // Check if user is host (hosts can't select players)
      if (socket.id === room.hostId) {
        socket.emit('error', { message: 'Host cannot select players' });
        return;
      }

      const currentUserId = room.turnOrder[room.currentTurnIndex];
      if (socket.id !== currentUserId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      if (!room.pool.includes(player)) {
        socket.emit('error', { message: 'Player not available' });
        return;
      }

      console.log(`User ${socket.id} selected player ${player}`);

      // Clear the timer
      if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
      }

      // Add player to user's selection
      room.selections[socket.id].push(player);
      // Remove player from pool
      room.pool = room.pool.filter(p => p !== player);

      // Broadcast the selection
      const username = room.users.find(u => u.id === socket.id)?.username;
      io.to(roomId).emit('player-selected', { 
        player, 
        user: socket.id, 
        username,
        selections: getSelectionsWithUsernames(room),
        pool: room.pool
      });

      // Move to next turn
      moveToNextTurn(io, roomId, rooms);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Disconnected: ${socket.id}`);
      
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const userIndex = room.users.findIndex(u => u.id === socket.id);
        
        if (userIndex !== -1) {
          const disconnectedUser = room.users[userIndex];
          
          // Don't remove user immediately, just mark as disconnected
          // This allows for reconnection
          console.log(`User ${disconnectedUser.username} disconnected from room ${roomId}`);
          
          // Remove user from room after a delay (to allow reconnection)
          setTimeout(() => {
            const currentUserIndex = room.users.findIndex(u => u.id === socket.id);
            if (currentUserIndex !== -1) {
              // User didn't reconnect, remove them
              room.users.splice(currentUserIndex, 1);
              delete room.selections[socket.id];
              
              // Remove from turn order
              const turnIndex = room.turnOrder.indexOf(socket.id);
              if (turnIndex !== -1) {
                room.turnOrder.splice(turnIndex, 1);
                // Adjust current turn index if needed
                if (room.currentTurnIndex > turnIndex) {
                  room.currentTurnIndex--;
                } else if (room.currentTurnIndex >= room.turnOrder.length && room.turnOrder.length > 0) {
                  room.currentTurnIndex = 0;
                }
              }

              // If disconnected user was host, assign new host
              if (room.hostId === socket.id && room.users.length > 0) {
                room.hostId = room.users[0].id;
                io.to(room.hostId).emit('host-status', { isHost: true, started: room.started });
              }

              // Clean up empty rooms
              if (room.users.length === 0) {
                if (room.timer) clearTimeout(room.timer);
                delete rooms[roomId];
                console.log(`Room ${roomId} deleted - no users left`);
              } else {
                // Notify remaining users
                io.to(roomId).emit('room-users', room.users);
                
                // If game was in progress and it was disconnected user's turn, move to next
                if (room.started && room.turnOrder.length > 0 && room.currentTurnIndex < room.turnOrder.length) {
                  startTurn(io, roomId, rooms);
                }
              }
            }
          }, 30000); // 30 second grace period for reconnection
        }
      }
    });
  });
}

function startTurn(io, roomId, rooms) {
  const room = rooms[roomId];
  if (!room || !room.started) {
    return;
  }

  // Check if selection is complete
  const allSelectionsComplete = room.turnOrder.every(userId => 
    room.selections[userId] && room.selections[userId].length >= 5
  );
  
  if (allSelectionsComplete || room.pool.length === 0) {
    // End the selection
    const results = getSelectionsWithUsernames(room);
    io.to(roomId).emit('selection-ended', { results });
    console.log('Selection ended for room:', roomId);
    
    // Reset room state
    room.started = false;
    room.currentTurnIndex = 0;
    room.turnOrder = [];
    return;
  }

  // Find next user who needs more players
  let attempts = 0;
  while (attempts < room.turnOrder.length) {
    if (room.currentTurnIndex >= room.turnOrder.length) {
      room.currentTurnIndex = 0;
    }

    const userId = room.turnOrder[room.currentTurnIndex];
    const user = room.users.find(u => u.id === userId);
    
    if (!user) {
      // User not found, skip to next
      room.currentTurnIndex++;
      attempts++;
      continue;
    }

    // Check if user needs more players
    const userSelections = room.selections[userId] || [];
    if (userSelections.length >= 5) {
      // User has enough players, move to next
      room.currentTurnIndex++;
      attempts++;
      continue;
    }

    // Found a user who needs more players
    console.log(`Starting turn for user: ${user.username}`);

    // Notify the current user it's their turn
    io.to(userId).emit('your-turn', { pool: room.pool });
    
    // Notify all users about the current turn and timer
    io.to(roomId).emit('turn-update', { 
      currentUser: user.username,
      userId: userId,
      seconds: 10 
    });

    // Set up auto-selection timer (10 seconds)
    room.timer = setTimeout(() => {
      // Check if it's still the same user's turn and room still exists
      if (rooms[roomId] && room.turnOrder[room.currentTurnIndex] === userId) {
        autoSelect(io, roomId, rooms);
      }
    }, 10000);

    return;
  }

  // If we get here, all users have 5 players
  const results = getSelectionsWithUsernames(room);
  io.to(roomId).emit('selection-ended', { results });
  console.log('Selection ended for room:', roomId);
  
  // Reset room state
  room.started = false;
  room.currentTurnIndex = 0;
  room.turnOrder = [];
}

function autoSelect(io, roomId, rooms) {
  const room = rooms[roomId];
  if (!room || room.pool.length === 0) {
    moveToNextTurn(io, roomId, rooms);
    return;
  }

  const userId = room.turnOrder[room.currentTurnIndex];
  const user = room.users.find(u => u.id === userId);
  
  if (!user) {
    moveToNextTurn(io, roomId, rooms);
    return;
  }
  
  // Randomly select a player
  const randomIndex = Math.floor(Math.random() * room.pool.length);
  const player = room.pool[randomIndex];

  console.log(`Auto-selecting ${player} for user ${user.username}`);

  // Ensure selections array exists
  if (!room.selections[userId]) {
    room.selections[userId] = [];
  }

  // Add player to user's selection
  room.selections[userId].push(player);
  // Remove player from pool
  room.pool = room.pool.filter(p => p !== player);

  // Broadcast the auto-selection
  io.to(roomId).emit('auto-selected', { 
    player, 
    user: userId, 
    username: user.username,
    selections: getSelectionsWithUsernames(room),
    pool: room.pool
  });

  moveToNextTurn(io, roomId, rooms);
}

function moveToNextTurn(io, roomId, rooms) {
  const room = rooms[roomId];
  if (!room) return;

  // Clear any existing timer
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  // Move to next player
  room.currentTurnIndex++;

  // Start next turn (this will handle completion check)
  setTimeout(() => {
    startTurn(io, roomId, rooms);
  }, 1000);
}

function getSelectionsWithUsernames(room) {
  const results = {};
  for (const userId in room.selections) {
    const user = room.users.find(u => u.id === userId);
    const username = user?.username || `User-${userId.slice(0, 6)}`;
    results[username] = room.selections[userId] || [];
  }
  return results;
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = setupSocket;