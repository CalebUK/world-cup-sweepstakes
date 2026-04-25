import React from 'react';

export const TeamPixelArt = ({ teamId, className }) => {
  return (
    <img 
      src={`/pixelart/${teamId}.png`} 
      alt={`${teamId} Art`} 
      className={className}
      loading="lazy"          // Tells the browser not to load images until you scroll to them!
      decoding="async"        // Stops heavy images from freezing the rest of the website
      style={{
        imageRendering: 'pixelated' // Keeps pixel art perfectly crisp even when compressed/resized
      }}
      onError={(e) => {
        e.target.style.display = 'none'; // Hides the broken image icon if the art isn't uploaded yet
      }}
    />
  );
};