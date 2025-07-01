import React from 'react';

function TeamDisplay({ selections }) {
  return (
    <div>
      <h3>Final Teams</h3>
      {Object.entries(selections).map(([user, players]) => (
        <div key={user}>
          <strong>{user}:</strong> {players.join(', ')}
        </div>
      ))}
    </div>
  );
}

export default TeamDisplay;
