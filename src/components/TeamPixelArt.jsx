import React from 'react';

export const TeamPixelArt = ({ teamId, className }) => {
  // Safety check: If the team isn't decided yet, don't try to load an image!
  if (!teamId) return null;

  return (
    <img 
      src={`/art/${teamId}.png`} 
      alt={`${teamId} Art`} 
      className={className}
      style={{
        imageRendering: 'pixelated' // Keeps your pixel art crisp even when compressed/resized!
      }}
      onError={(e) => {
        e.target.style.display = 'none'; // Hides the broken image icon if the art isn't uploaded yet
      }}
    />
  );
};