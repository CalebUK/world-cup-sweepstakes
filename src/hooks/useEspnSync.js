import { useEffect, useRef } from 'react';
import { TEAMS_DATA } from '../config/data.js';

export const useEspnSync = (isSuperAdmin, settings, setMatches, saveState) => {
  const saveStateRef = useRef(saveState);
  
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    // SECURITY GATE: Only the Super Admin's browser is allowed to poll ESPN and write to the Global DB
    if (!isSuperAdmin || !settings.autoSync) return;
    let isMounted = true;

    const fetchESPN = async () => {
      try {
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
        
        if (!response.ok) return;
        
        const data = await response.json();
        const espnEvents = data.events || [];
        if (espnEvents.length === 0) return;

        setMatches(prevMatches => {
          let hasChanges = false;
          const nextMatches = prevMatches.map(m => {
            if (m.isPlayed) return m;

            const tA = TEAMS_DATA.find(t => t.id === m.teamA)?.name;
            const tB = TEAMS_DATA.find(t => t.id === m.teamB)?.name;
            if (!tA || !tB) return m;

            const event = espnEvents.find(e => {
              const compNames = e.competitions[0]?.competitors.map(c => c.team.name) || [];
              return compNames.includes(tA) && compNames.includes(tB);
            });

            if (event) {
              const compA = event.competitions[0].competitors.find(c => c.team.name === tA);
              const compB = event.competitions[0].competitors.find(c => c.team.name === tB);
              const isFinished = event.status.type.completed;

              if (compA && compB && (m.scoreA !== compA.score || m.scoreB !== compB.score || m.isPlayed !== isFinished)) {
                hasChanges = true;
                return { ...m, scoreA: compA.score, scoreB: compB.score, isPlayed: isFinished };
              }
            }
            return m;
          });

          if (hasChanges && isMounted) {
            saveStateRef.current('matches', nextMatches);
            return nextMatches;
          }
          return prevMatches;
        });
      } catch (err) {
        console.warn("ESPN sync skipped (Network or API issue):", err);
      }
    };

    fetchESPN(); 
    const intervalId = setInterval(fetchESPN, 300000); 
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isSuperAdmin, settings.autoSync, setMatches]);
};