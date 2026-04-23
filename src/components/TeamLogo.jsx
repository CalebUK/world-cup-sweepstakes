import React, { useState } from 'react';

export const TeamLogo = ({ teamId, className }) => {
  const [hasError, setHasError] = useState(false);
  
  if (!teamId) return <div className={`bg-slate-100 rounded-full ${className}`} />;
  
  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-slate-200 text-slate-500 font-black text-[10px] rounded ${className}`}>
        {teamId}
      </div>
    );
  }
  
  return (
    <img 
      src={`/logos/${teamId}.svg`} 
      alt={teamId} 
      className={`object-contain drop-shadow-sm ${className}`} 
      onError={() => setHasError(true)} 
    />
  );
};