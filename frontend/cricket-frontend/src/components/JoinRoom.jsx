import React from 'react';

function JoinRoom({ roomId, setRoomId, username, setUsername, onJoin }) {
  return (
    <div>
      <h2>Join Room</h2>
      <input
        placeholder="Room ID"
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
      />
      <br />
      <input
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <br />
      <button onClick={onJoin}>Join Room</button>
    </div>
  );
}

export default JoinRoom;
