// 📁 frontend/src/App.jsx
import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Initialize socket connection
const socket = io("https://real-time-cricket-team-selection-room-bvmw.onrender.com");

function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [users, setUsers] = useState([]);
  const [disconnectedUsers, setDisconnectedUsers] = useState([]);
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [playerPool, setPlayerPool] = useState([]);
  const [selections, setSelections] = useState({});
  const [myTurn, setMyTurn] = useState(false);
  const [results, setResults] = useState(null);
  const [timer, setTimer] = useState(10);
  const [intervalId, setIntervalId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [roomClosed, setRoomClosed] = useState(false);

  // Clear timer function
  const clearTimer = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [intervalId]);

useEffect(() => {
  console.log('🔧 Setting up socket listeners');
  
  // Connection status handlers
  socket.on('connect', () => {
    setConnectionStatus('connected');
    console.log('✅ Connected to server, Socket ID:', socket.id);
  });

  socket.on('disconnect', () => {
    setConnectionStatus('disconnected');
    console.log('❌ Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    setConnectionStatus('error');
    console.log('💥 Connection error:', error);
  });

  // Handle room users update
  socket.on('room-users', (userList) => {
    setUsers(userList);
    setLoading(false);
    console.log('👥 Users updated:', userList);
  });

  // Handle disconnected users update
  socket.on('disconnected-users', (disconnectedUserList) => {
    setDisconnectedUsers(disconnectedUserList);
    console.log('👥 Disconnected users updated:', disconnectedUserList);
  });

  // Handle host status
  socket.on('host-status', ({ isHost: hostStatus, started }) => {
    setIsHost(hostStatus);
    setGameStarted(started);
    setLoading(false);
    console.log('👑 Host status:', hostStatus, 'Started:', started);
  });

  // Handle game state
  socket.on('game-state', ({ turnOrder: order, currentTurnIndex, pool, selections: gameSelections, started }) => {
    console.log('🎮 Game state received:', { order, currentTurnIndex, poolSize: pool?.length, started });
    
    if (started) {
      setTurnOrder(order);
      setPlayerPool(pool);
      setSelections(gameSelections);
      setGameStarted(true);
      setLoading(false);
      
      if (order.length > 0 && currentTurnIndex < order.length) {
        setCurrentTurn(order[currentTurnIndex]);
      }
    }
  });

  // Handle turn order announcement
  socket.on('turn-order', ({ order }) => {
    console.log('📋 Turn order received:', order);
    setTurnOrder(order);
    setGameStarted(true);
    setLoading(false);
  });

  // Handle turn updates
  socket.on('turn-update', ({ currentUser, userId, seconds }) => {
    console.log('⏰ Turn update:', currentUser, 'User ID:', userId, 'Seconds:', seconds);
    setCurrentTurn(currentUser);
    setCurrentUserId(userId);
    setTimer(seconds);
    setMyTurn(userId === socket.id);
    setLoading(false);
    
    // Clear any existing timer
    clearTimer();
    
    // Start countdown timer
    const id = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setIntervalId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setIntervalId(id);
  });

  // Handle play again event
  socket.on('play-again', () => {
    console.log('🔄 Play again initiated');
    setResults(null);
    setGameStarted(false);
    setTurnOrder([]);
    setCurrentTurn(null);
    setCurrentUserId(null);
    setPlayerPool([]);
    setSelections({});
    setMyTurn(false);
    setTimer(10);
    setLoading(false);
    clearTimer();
  });

  // Handle room closed event
  socket.on('room-closed', ({ message }) => {
    console.log('🚪 Room closed:', message);
    setRoomClosed(true);
    setError(message);
    clearTimer();
  });

  // Handle errors
  socket.on('error', ({ message }) => {
    console.log('💥 Socket error:', message);
    setError(message);
    setLoading(false);
    setTimeout(() => setError(''), 5000);
  });

  // Handle all other events (keep existing handlers)
  socket.on('your-turn', ({ pool }) => {
    setMyTurn(true);
    setPlayerPool(pool);
    setLoading(false);
    console.log('🎯 Your turn! Pool size:', pool.length);
  });

  socket.on('player-selected', ({ player, user, username, selections: updatedSelections, pool }) => {
    setPlayerPool(pool);
    setSelections(updatedSelections);
    setMyTurn(false);
    setLoading(false);
    clearTimer();
    console.log(`✅ ${username} selected ${player.name}`);
  });

  socket.on('auto-selected', ({ player, user, username, selections: updatedSelections, pool }) => {
    setPlayerPool(pool);
    setSelections(updatedSelections);
    setMyTurn(false);
    setLoading(false);
    clearTimer();
    console.log(`🤖 Auto-selected ${player.name} for ${username}`);
  });

  socket.on('selection-ended', ({ results: finalResults }) => {
    setResults(finalResults);
    setMyTurn(false);
    setGameStarted(false);
    setLoading(false);
    clearTimer();
    console.log('🏁 Selection ended:', finalResults);
  });

  // Cleanup function
  return () => {
    console.log('🧹 Cleaning up socket listeners');
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.off('room-users');
    socket.off('disconnected-users');
    socket.off('host-status');
    socket.off('game-state');
    socket.off('turn-order');
    socket.off('turn-update');
    socket.off('your-turn');
    socket.off('player-selected');
    socket.off('auto-selected');
    socket.off('selection-ended');
    socket.off('play-again');
    socket.off('room-closed');
    socket.off('error');
    clearTimer();
  };
}, [clearTimer]);

  const createRoom = async () => {
    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${
          "https://real-time-cricket-team-selection-room-bvmw.onrender.com"
        }/api/create-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setRoomId(data.roomId);
        handleJoin(data.roomId);
      } else {
        setError(data.error || "Failed to create room");
        setLoading(false);
      }
    } catch (err) {
      setError("Failed to create room. Please try again.");
      setLoading(false);
      console.error("Create room error:", err);
    }
  };

  const handleJoin = (targetRoomId = null) => {
    const roomToJoin = targetRoomId || roomId;

    if (!roomToJoin.trim() || !username.trim()) {
      setError("Please enter both Room ID and Username");
      return;
    }

    setLoading(true);
    setError("");
    setRoomClosed(false);
    socket.emit("join-room", {
      roomId: roomToJoin.trim().toUpperCase(),
      username: username.trim(),
    });
    setJoined(true);
    setRoomId(roomToJoin.trim().toUpperCase());
  };

  const handleStart = () => {
    console.log("🎯 handleStart called");
    console.log("Users length:", users.length);
    console.log("Room ID:", roomId);
    console.log("Socket connected:", socket.connected);
    console.log("Socket ID:", socket.id);

    if (users.length < 2) {
      setError("Need at least 2 players to start");
      return;
    }

    setLoading(true);
    setError("");

    console.log("🚀 Emitting start-selection event");
    socket.emit("start-selection", { roomId });

    // Add timeout to reset loading if no response
    setTimeout(() => {
      console.log("⏰ Timeout reached, checking if still loading");
      if (loading) {
        console.log("❌ Still loading, resetting...");
        setLoading(false);
        setError("Failed to start game. Please try again.");
      }
    }, 10000);
  };

  const handlePlayAgain = () => {
    if (isHost) {
      setLoading(true);
      socket.emit("play-again", { roomId });
    }
  };

  const handleExit = () => {
    if (isHost) {
      socket.emit("exit-room", { roomId });
      resetGame();
    }
  };

  const selectPlayer = (player) => {
    if (myTurn && !loading) {
      setLoading(true);
      socket.emit("select-player", { roomId, player });

      // Reset loading after a delay in case of no response
      setTimeout(() => {
        if (!results && !error) {
          setLoading(false);
        }
      }, 5000);
    }
  };

  const resetGame = () => {
    clearTimer();
    setJoined(false);
    setIsHost(false);
    setGameStarted(false);
    setUsers([]);
    setDisconnectedUsers([]);
    setTurnOrder([]);
    setCurrentTurn(null);
    setCurrentUserId(null);
    setPlayerPool([]);
    setSelections({});
    setMyTurn(false);
    setResults(null);
    setTimer(10);
    setError("");
    setLoading(false);
    setRoomId("");
    setUsername("");
    setRoomClosed(false);
  };

const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      const originalError = error;
      setError("Room ID copied to clipboard!");
      setTimeout(() => setError(originalError), 2000);
    });
  };

  if (roomClosed) {
    return (
      <div className="app">
        <div className="container">
          <div className="error-message">
            <h2>Room Closed</h2>
            <p>{error}</p>
            <button onClick={resetGame} className="btn-primary">
              Go Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="app">
        <div className="container">
          <h1>Cricket Team Selection</h1>
          <div className="form">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Enter Room ID to join"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              disabled={loading}
            />
            <div className="button-group">
              <button
                onClick={() => handleJoin()}
                disabled={loading || !roomId.trim() || !username.trim()}
                className="btn-secondary"
              >
                {loading ? "Joining..." : "Join Room"}
              </button>
              <button
                onClick={createRoom}
                disabled={loading || !username.trim()}
                className="btn-primary"
              >
                {loading ? "Creating..." : "Create Room"}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="connection-status">
              Status: <span className={`status ${connectionStatus}`}>
                {connectionStatus === 'connected' ? '🟢 Connected' :
                 connectionStatus === 'connecting' ? '🟡 Connecting...' :
                 connectionStatus === 'disconnected' ? '🔴 Disconnected' :
                 '❌ Connection Error'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="room-header">
          <h1>Room: {roomId}</h1>
          <button onClick={copyRoomId} className="copy-btn">
            📋 Copy Room ID
          </button>
          {isHost && (
            <span className="host-badge">👑 Host</span>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="users-section">
          <h3>Players ({users.length})</h3>
          <div className="users-list">
            {users.map((user) => (
              <div key={user.id} className="user-item">
                <span>{user.username}</span>
                {user.id === users.find(u => u.id === roomId)?.hostId && (
                  <span className="host-indicator">👑</span>
                )}
              </div>
            ))}
          </div>

          {disconnectedUsers.length > 0 && (
            <div className="disconnected-section">
              <h4>Disconnected Players ({disconnectedUsers.length})</h4>
              <div className="disconnected-list">
                {disconnectedUsers.map((user, index) => (
                  <div key={index} className="disconnected-user">
                    <span>{user.username}</span>
                    <span className="disconnected-indicator">🔴 Disconnected</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!gameStarted && !results && (
          <div className="pre-game">
            {isHost ? (
              <div className="host-controls">
                <p>You are the host. You can also play! Start the game when ready!</p>
                <button
                  onClick={handleStart}
                  disabled={loading || users.length < 2}
                  className="btn-primary"
                >
                  {loading ? "Starting..." : "Start Selection"}
                </button>
                {users.length < 2 && (
                  <p className="warning">Need at least 2 players to start</p>
                )}
              </div>
            ) : (
              <div className="waiting">
                <p>Waiting for host to start the game...</p>
                <div className="loading-spinner"></div>
              </div>
            )}
          </div>
        )}

        {gameStarted && !results && (
          <div className="game-section">
            <div className="turn-info">
              {turnOrder.length > 0 && (
                <div className="turn-order">
                  <h3>Turn Order:</h3>
                  <div className="turn-list">
                    {turnOrder.map((username, index) => (
                      <span 
                        key={index} 
                        className={`turn-item ${username === currentTurn ? 'current' : ''}`}
                      >
                        {username}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentTurn && (
                <div className="current-turn">
                  <h3>
                    {myTurn ? "Your Turn!" : `${currentTurn}'s Turn`}
                  </h3>
                  {timer > 0 && (
                    <div className="timer">
                      Time remaining: <span className="countdown">{timer}s</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Player selection - now available for all players including host */}
            {myTurn && playerPool.length > 0 && (
              <div className="player-selection">
                <h3>Select a Player:</h3>
                <div className="player-pool">
                  {playerPool.map((player, index) => (
                    <div 
                      key={index}
                      className={`player-card ${loading ? 'disabled' : ''}`}
                      onClick={() => selectPlayer(player)}
                    >
                      <img 
                        src={player.image} 
                        alt={player.name}
                        className="player-image"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x120?text=Player';
                        }}
                      />
                      <div className="player-name">{player.name}</div>
                      <div className="player-role">{player.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game progress view for non-turn players */}
            {!myTurn && (
              <div className="spectator-view">
                <h3>Game in Progress</h3>
                <p>Waiting for {currentTurn} to select...</p>
                <div className="available-players">
                  <h4>Available Players ({playerPool.length}):</h4>
                  <div className="player-grid">
                    {playerPool.slice(0, 10).map((player, index) => (
                      <div key={index} className="mini-player-card">
                        <img 
                          src={player.image} 
                          alt={player.name}
                          className="mini-player-image"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/60x70?text=Player';
                          }}
                        />
                        <div className="mini-player-name">{player.name}</div>
                      </div>
                    ))}
                    {playerPool.length > 10 && (
                      <div className="more-players">
                        +{playerPool.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Current selections display */}
            {Object.keys(selections).length > 0 && (
              <div className="selections-display">
                <h3>Current Selections:</h3>
                <div className="selections-grid">
                  {Object.entries(selections).map(([username, playerList]) => (
                    <div key={username} className="user-selection">
                      <h4>{username} ({playerList.length}/5)</h4>
                      <div className="selected-players">
                        {playerList.map((player, index) => (
                          <div key={index} className="selected-player">
                            <img 
                              src={player.image} 
                              alt={player.name}
                              className="selected-player-image"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/50x60?text=Player';
                              }}
                            />
                            <div className="selected-player-name">{player.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Processing...</p>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="results-section">
            <h2>🏆 Final Teams</h2>
            <div className="results-grid">
              {Object.entries(results).map(([username, team]) => (
                <div key={username} className="team-result">
                  <h3>{username}'s Team</h3>
                  <div className="final-team">
                    {team.map((player, index) => (
                      <div key={index} className="final-player">
                        <img 
                          src={player.image} 
                          alt={player.name}
                          className="final-player-image"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x95?text=Player';
                          }}
                        />
                        <div className="final-player-info">
                          <div className="final-player-name">{player.name}</div>
                          <div className="final-player-role">{player.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Host controls after game ends */}
            {isHost && (
              <div className="host-end-controls">
                <div className="button-group">
                  <button
                    onClick={handlePlayAgain}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "Starting..." : "🔄 Play Again"}
                  </button>
                  <button
                    onClick={handleExit}
                    className="btn-danger"
                  >
                    🚪 Exit Room
                  </button>
                </div>
              </div>
            )}

            {/* Non-host view after game ends */}
            {!isHost && (
              <div className="player-end-view">
                <p>Waiting for host to decide next action...</p>
                <div className="loading-spinner"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;