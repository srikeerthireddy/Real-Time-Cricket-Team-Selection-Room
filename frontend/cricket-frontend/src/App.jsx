import React, { useState, useEffect } from 'react';
import socket from './socket';
import JoinRoom from './components/JoinRoom';
import PlayerPool from './components/PlayerPool';
import TeamDisplay from './components/TeamDisplay';

const DEFAULT_PLAYERS = [
  'Virat', 'Rohit', 'Dhoni', 'Bumrah', 'Jadeja', 'Gill',
  'Rahul', 'Pandya', 'Ashwin', 'Surya', 'Shami', 'Iyer'
];

function App() {
  const [roomId, setRoomId] = useState('room123');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [playerPool, setPlayerPool] = useState(DEFAULT_PLAYERS);
  const [turnOrder, setTurnOrder] = useState([]);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    socket.on('room-users', users => setUsers(users));
    socket.on('turn-order', ({ order }) => setTurnOrder(order));
    socket.on('your-turn', () => alert('🎯 Your turn to pick a player!'));

    socket.on('player-selected', ({ player }) => {
      setPlayerPool(prev => prev.filter(p => p !== player));
    });

    socket.on('auto-selected', ({ player }) => {
      setPlayerPool(prev => prev.filter(p => p !== player));
    });

    socket.on('selection-ended', ({ selections }) => {
      setSelections(selections);
    });
  }, []);

  const handleJoin = () => {
    if (!username || !roomId) return alert('Enter username and room ID');
    socket.emit('join-room', { roomId, username });
    setJoined(true);
  };

  const startSelection = () => {
    socket.emit('start-selection', roomId);
  };

  const selectPlayer = (player) => {
    socket.emit('select-player', { roomId, player });
  };

  return (
    <div className="p-4">
      {!joined ? (
        <JoinRoom
          roomId={roomId}
          setRoomId={setRoomId}
          username={username}
          setUsername={setUsername}
          onJoin={handleJoin}
        />
      ) : (
        <div>
          <h2>Room: {roomId}</h2>
          <p>👥 Users: {users.map(u => u.username).join(', ')}</p>
          <button onClick={startSelection}>Start Selection</button>
          <PlayerPool playerPool={playerPool} onSelect={selectPlayer} />
          {Object.keys(selections).length > 0 && (
            <TeamDisplay selections={selections} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
