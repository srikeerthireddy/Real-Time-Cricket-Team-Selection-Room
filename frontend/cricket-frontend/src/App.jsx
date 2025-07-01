// 📁 frontend/src/App.jsx
import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Initialize socket connection
const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:3000");

function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [users, setUsers] = useState([]);
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
    setLoading(false); // Reset loading when we get room updates
    console.log('👥 Users updated:', userList);
  });

  // Handle host status
  socket.on('host-status', ({ isHost: hostStatus, started }) => {
    setIsHost(hostStatus);
    setGameStarted(started);
    setLoading(false); // Reset loading when we get host status
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
      setLoading(false); // Reset loading when game starts
      
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
    setLoading(false); // Reset loading when we get turn order
  });

  // Handle turn updates
  socket.on('turn-update', ({ currentUser, userId, seconds }) => {
    console.log('⏰ Turn update:', currentUser, 'User ID:', userId, 'Seconds:', seconds);
    setCurrentTurn(currentUser);
    setCurrentUserId(userId);
    setTimer(seconds);
    setMyTurn(userId === socket.id);
    setLoading(false); // Reset loading on turn updates
    
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

  // Handle errors
  socket.on('error', ({ message }) => {
    console.log('💥 Socket error:', message);
    setError(message);
    setLoading(false); // Reset loading on errors
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
    console.log(`✅ ${username} selected ${player}`);
  });

  socket.on('auto-selected', ({ player, user, username, selections: updatedSelections, pool }) => {
    setPlayerPool(pool);
    setSelections(updatedSelections);
    setMyTurn(false);
    setLoading(false);
    clearTimer();
    console.log(`🤖 Auto-selected ${player} for ${username}`);
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
    socket.off('host-status');
    socket.off('game-state');
    socket.off('turn-order');
    socket.off('turn-update');
    socket.off('your-turn');
    socket.off('player-selected');
    socket.off('auto-selected');
    socket.off('selection-ended');
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
          process.env.REACT_APP_BACKEND_URL || "http://localhost:3000"
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
    setError(""); // Clear any previous errors

    console.log("🚀 Emitting start-selection event");
    socket.emit("start-selection", { roomId }, (response) => {
      console.log("📨 start-selection callback:", response);
    });

    // Add timeout to reset loading if no response
    setTimeout(() => {
      console.log("⏰ Timeout reached, checking if still loading");
      if (loading) {
        console.log("❌ Still loading, resetting...");
        setLoading(false);
        setError("Failed to start game. Please try again.");
      }
    }, 10000); // 10 second timeout
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
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      // Show success message briefly
      const originalError = error;
      setError("Room ID copied to clipboard!");
      setTimeout(() => setError(originalError), 2000);
    });
  };

  // Get connection status indicator
  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case "connected":
        return <div className="connection-status connected">🟢 Connected</div>;
      case "connecting":
        return (
          <div className="connection-status connecting">🟡 Connecting...</div>
        );
      case "disconnected":
        return (
          <div className="connection-status disconnected">🔴 Disconnected</div>
        );
      case "error":
        return (
          <div className="connection-status error">❌ Connection Error</div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🏏 Cricket Team Selector</h1>
        {getConnectionIndicator()}
      </header>

      {error && (
        <div
          className={`message ${
            error.includes("copied") ? "success-message" : "error-message"
          }`}
        >
          {error.includes("copied") ? "✅" : "❌"} {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          <div className="loading-spinner"></div>⏳ Loading...
        </div>
      )}

      {!joined && (
        <div className="join-form">
          <div className="form-group">
            <label htmlFor="username">Your Name</label>
            <input
              id="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              disabled={loading}
              maxLength={20}
            />
          </div>

          <div className="room-actions">
            <button
              onClick={createRoom}
              className="btn btn-success btn-large"
              disabled={loading || !username.trim()}
            >
              🆕 Create New Room
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className="form-group">
              <label htmlFor="roomId">Room ID</label>
              <input
                id="roomId"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="input-field"
                disabled={loading}
                maxLength={8}
              />
            </div>
            <button
              onClick={() => handleJoin()}
              className="btn btn-primary btn-large"
              disabled={loading || !roomId.trim() || !username.trim()}
            >
              🚪 Join Room
            </button>
          </div>
        </div>
      )}

      {joined && (
        <div className="game-container">
          {/* Room Info */}
          <div className="room-info">
            <div className="room-header">
              <h2 className="room-title">Room: {roomId}</h2>
              <button
                onClick={copyRoomId}
                className="btn btn-copy"
                title="Copy Room ID"
              >
                📋
              </button>
            </div>

            {isHost && <div className="host-badge">👑 You are the host</div>}

            <div className="players-section">
              <h3 className="players-title">
                Players in Room ({users.length})
              </h3>
              <div className="players-grid">
                {users.map((user, idx) => (
                  <div
                    key={idx}
                    className={`player-card ${
                      user.id === socket.id ? "current-user" : ""
                    }`}
                  >
                    <span>{user.username}</span>
                    {user.id === socket.id && (
                      <span className="you-badge">You</span>
                    )}
                    {isHost &&
                      user.id === users.find((u) => u.id === socket.id)?.id && (
                        <span className="crown">👑</span>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Host Controls */}
          {isHost && !gameStarted && !results && (
            <div className="host-controls">
              {users.length >= 2 ? (
                <div className="start-section">
                  <p className="info-text">
                    Ready to start! Other players will select their teams.
                  </p>
                  <button
                    onClick={handleStart}
                    className="btn btn-success btn-large"
                    disabled={loading}
                  >
                    🎯 Start Team Selection
                  </button>
                </div>
              ) : (
                <div className="waiting-section">
                  <p className="info-text">
                    Need at least 2 players to start the selection process
                  </p>
                  <div className="share-room">
                    <p>
                      Share Room ID: <strong>{roomId}</strong>
                    </p>
                    <button onClick={copyRoomId} className="btn btn-small">
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Turn Order */}
          {turnOrder.length > 0 && !results && (
            <div className="turn-order-container">
              <h3 className="section-title">🔄 Selection Order</h3>
              <div className="turn-order-list">
                {turnOrder.map((name, i) => (
                  <div
                    key={i}
                    className={`turn-item ${
                      name === currentTurn ? "active" : ""
                    }`}
                  >
                    <span className="turn-number">{i + 1}</span>
                    <span className="turn-name">{name}</span>
                    {name === currentTurn && (
                      <span className="turn-indicator">⏰</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Turn & Timer */}
          {gameStarted && !results && currentTurn && (
            <div className="current-turn-container">
              <div className={`turn-status ${myTurn ? "my-turn" : ""}`}>
                <h3 className="turn-title">
                  {myTurn ? "🎯 Your Turn!" : `${currentTurn}'s Turn`}
                </h3>
                {timer > 0 && (
                  <div
                    className={`timer ${
                      timer <= 3 ? "urgent" : timer <= 5 ? "warning" : ""
                    }`}
                  >
                    <div className="timer-circle">
                      <span className="timer-number">{timer}</span>
                    </div>
                    <span className="timer-text">seconds left</span>
                  </div>
                )}
                {myTurn && (
                  <p className="instruction-text">
                    Choose a player for your team!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Player Pool */}
          {gameStarted && !results && playerPool.length > 0 && (
            <div className="player-pool-container">
              <h3 className="section-title">
                🏏 Available Players{" "}
                <span className="player-count">
                  ({playerPool.length} remaining)
                </span>
              </h3>
              <div className="player-pool-grid">
                {playerPool.map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectPlayer(player)}
                    className={`player-button ${
                      myTurn && !loading ? "selectable" : "disabled"
                    }`}
                    disabled={!myTurn || loading}
                  >
                    {player}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Selections */}
          {gameStarted && !results && Object.keys(selections).length > 0 && (
            <div className="selections-container">
              <h3 className="section-title">📋 Current Teams</h3>
              <div className="selections-grid">
                {Object.entries(selections).map(([username, players]) => (
                  <div key={username} className="selection-card">
                    <h4 className="team-owner">{username}'s Team</h4>
                    <div className="selected-players">
                      {players.length > 0 ? (
                        players.map((player, idx) => (
                          <span key={idx} className="selected-player">
                            {player}
                          </span>
                        ))
                      ) : (
                        <span className="no-players">
                          No players selected yet
                        </span>
                      )}
                    </div>
                    <div className="team-count">{players.length}/5 players</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="results-container">
              <h2 className="section-title">🏆 Final Teams</h2>
              <div className="results-grid">
                {Object.entries(results).map(([username, players]) => (
                  <div key={username} className="result-card">
                    <h3 className="team-owner-final">
                      {username}'s Final Team
                    </h3>
                    <div className="final-players">
                      {players.map((player, idx) => (
                        <div key={idx} className="final-player">
                          <span className="player-number">{idx + 1}.</span>
                          <span className="player-name">{player}</span>
                        </div>
                      ))}
                    </div>
                    <div className="team-stats">
                      Total Players: {players.length}
                    </div>
                  </div>
                ))}
              </div>

              <div className="game-actions">
                <button
                  onClick={resetGame}
                  className="btn btn-primary btn-large"
                >
                  🆕 Start New Game
                </button>
              </div>
            </div>
          )}

          {/* Waiting for Game */}
          {!isHost && !gameStarted && !results && (
            <div className="waiting-container">
              <div className="waiting-message">
                <h3>⏳ Waiting for host to start the game...</h3>
                <p>The host will begin team selection when ready.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="app-footer">
        <p>🏏 Cricket Team Selector - Real-time Multiplayer</p>
      </footer>
    </div>
  );
}

export default App;
