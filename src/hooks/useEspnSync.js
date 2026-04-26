import { useEffect, useRef } from 'react';
import { TEAMS_DATA } from '../config/data.js';

export const useEspnSync = (isViewer, settings, setMatches, saveState) => {
  // We use a ref to hold the latest saveState function to prevent infinite re-renders
  const saveStateRef = useRef(saveState);
  
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    if (isViewer || !settings.autoSync) return;
    let isMounted = true;

    const fetchESPN = async () => {
      try {
        // 🚨 HOW TO TEST LIVE 🚨
        // To test this today, swap the URL below to a live league like the Premier League:
        // 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard'
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
        
        if (!response.ok) return;
        
        const data = await response.json();
        const espnEvents = data.events || [];
        if (espnEvents.length === 0) return;

        setMatches(prevMatches => {
          let hasChanges = false;
          const nextMatches = prevMatches.map(m => {
            if (m.isPlayed) return m; // Preserve finished games so we don't accidentally reopen them

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
             // Save the new scores to Firebase immediately
            saveStateRef.current('matches', nextMatches);
            return nextMatches;
          }
          return prevMatches;
        });
      } catch (err) {
        console.warn("ESPN sync skipped (Network or API issue):", err);
      }
    };

    // Run it immediately on load
    fetchESPN(); 
    
    // Then run it every 5 minutes
    const intervalId = setInterval(fetchESPN, 300000); 
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isViewer, settings.autoSync, setMatches]);
};