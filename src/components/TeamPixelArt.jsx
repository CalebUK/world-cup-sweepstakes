import React, { useState } from 'react';

export const TeamPixelArt = ({ teamId, className }) => {
  const [hasError, setHasError] = useState(false);
  
  // If no team is assigned, or the art hasn't been drawn yet, safely render nothing!
  if (!teamId || hasError) return null;
  
  return (
    <img 
      src={`/art/${teamId}.png`} 
      alt={`${teamId} Pixel Art`} 
      // The imageRendering style is the secret sauce to keeping pixel art perfectly sharp!
      style={{ imageRendering: 'pixelated' }}
      className={`object-cover ${className}`} 
      onError={() => setHasError(true)} 
    />
  );
};