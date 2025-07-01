import React from 'react';

function PlayerPool({ playerPool, onSelect }) {
  return (
    <div>
      <h3>Available Players</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {playerPool.map(player => (
          <button key={player} onClick={() => onSelect(player)}>
            {player}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PlayerPool;
