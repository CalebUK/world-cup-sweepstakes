import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Filter, ChevronDown, ChevronRight, Clock, MapPin, ArrowUp, Globe } from 'lucide-react';
import { TEAMS_DATA, KNOCKOUT_STAGES, TIMEZONES } from '../../config/data.js';
import { TeamLogo } from '../TeamLogo.jsx';
import { TeamPixelArt } from '../TeamPixelArt.jsx';

const MatchRow = ({ match, matches, isKnockout = false, localTimezone, isViewer, handleMatchUpdate, getOwnerName, eliminatedTeams }) => {
  const tA = TEAMS_DATA.find(t => t.id === match.teamA);
  const tB = TEAMS_DATA.find(t => t.id === match.teamB);

  // Short label used in the mobile corner badge and penalty codes
  // Falls back to the first word of the match label (e.g. "Winner" or "Runner-Up") if the team isn't decided yet
  const codeA = tA?.id || match.labelA?.split(' ')[0] || '?';
  const codeB = tB?.id || match.labelB?.split(' ')[0] || '?';

  let groupText = match.stage;
  if (match.stage === 'Group' && tA) {
    groupText = `Group ${tA.group}`;
  } else if (match.stage !== 'Group') {
    const koParts = match.id.split('_');
    if (koParts.length === 3) {
      groupText = `${match.stage} - Match ${parseInt(koParts[2], 10)}`;
    }
  }

  let dateFormatted = '';
  let timeFormatted = '';
  if (match.datetime) {
    const matchDateObj = new Date(match.datetime);
    try {
      dateFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: localTimezone, weekday: 'short', month: 'short', day: 'numeric'
      }).format(matchDateObj);
      timeFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: localTimezone, hour: 'numeric', minute: '2-digit'
      }).format(matchDateObj);
    } catch (e) {
      dateFormatted = matchDateObj.toLocaleDateString();
      timeFormatted = matchDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  const getEligibleTeams = (currentTeamId) => {
    if (match.stage === 'Group') return [];
    return TEAMS_DATA.filter(t => !eliminatedTeams[t.id] || t.id === currentTeamId);
  };

  const eligibleTeamsA = getEligibleTeams(match.teamA);
  const eligibleTeamsB = getEligibleTeams(match.teamB);

  return (
    <div className={`p-4 rounded-xl border-2 ${match.isPlayed ? 'border-green-700 bg-green-600' : 'border-emerald-500 bg-green-500'} shadow-md relative transition-all overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none opacity-40 flex justify-center items-center z-0">
        <div className="absolute top-0 bottom-0 w-1 bg-white"></div>
        <div className="w-24 h-24 border-4 border-white rounded-full"></div>
        <div className="absolute w-3 h-3 bg-white rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-32 border-4 border-l-0 border-white"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-32 border-4 border-r-0 border-white"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-16 border-2 border-l-0 border-white/50 bg-white/20"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-16 border-2 border-r-0 border-white/50 bg-white/20"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">

        {/* ── Team A ── */}
        <div className="w-full md:w-1/3 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-sm p-2 md:p-3 rounded-xl shadow-lg border border-emerald-100 flex items-center justify-between w-full relative overflow-hidden">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-0">
              <TeamPixelArt teamId={tA?.id} className="w-28 h-28" />
            </div>
            <div className="flex flex-col items-center justify-center bg-slate-50/90 border border-slate-100 rounded-md px-1.5 py-0.5 sm:px-3 sm:py-1 mr-2 sm:mr-3 shrink-0 relative z-10 shadow-sm">
              <span className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">FIFA</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 leading-tight">{tA?.rank || '-'}</span>
            </div>
            <div className="flex flex-col w-full relative z-10">
              {isKnockout && !isViewer ? (
                <select value={match.teamA} onChange={(e) => handleMatchUpdate(match.id, 'teamA', e.target.value)} className="p-1 border border-slate-200 rounded text-sm w-full font-bold text-slate-800 focus:border-emerald-500 focus:outline-none mb-1 shadow-sm bg-white cursor-pointer">
                  <option value="">-- {match.labelA || 'TBD'} --</option>
                  {eligibleTeamsA.map(t => <option key={t.id} value={t.id}>{t.id} - {t.name}</option>)}
                </select>
              ) : (
                <div className="font-black text-slate-800 text-left md:text-right text-base sm:text-lg truncate pr-2 drop-shadow-sm">{tA?.name || match.teamA || match.labelA || 'TBD'}</div>
              )}
              <div className="text-[10px] text-slate-500 text-left md:text-right uppercase tracking-wider font-bold">
                Manager: <span className="text-emerald-700">{getOwnerName(match.teamA)}</span>
              </div>
            </div>
            <TeamLogo teamId={tA?.id} className="w-8 h-8 sm:w-10 sm:h-10 ml-2 sm:ml-3 shrink-0 relative z-10 drop-shadow-md" />
          </div>
        </div>

        {/* ── Score + controls — original white card preserved ── */}
        <div className="flex flex-col items-center gap-2 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-2xl border-2 border-emerald-100 shadow-xl min-w-[180px]">
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{groupText}</div>
          {match.datetime && (
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex flex-col items-center gap-0.5 text-center">
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {dateFormatted} • {timeFormatted}</span>
              {match.location && (
                <span className="flex items-center justify-center gap-1 mt-0.5 text-slate-400/80 leading-tight">
                  <MapPin className="w-3 h-3 shrink-0 self-start mt-0.5" /> <span className="max-w-[160px] text-wrap text-center">{match.location}</span>
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {/* Team A code — only visible on mobile where stacking hides left/right context */}
            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded leading-none">{codeA}</span>
            {isViewer ? (
              <>
                <div className="w-12 h-12 flex items-center justify-center bg-slate-100 border-2 border-slate-200 rounded-lg font-black text-2xl text-slate-800 shadow-inner">{match.scoreA}</div>
                <span className="text-slate-300 font-black text-xl">-</span>
                <div className="w-12 h-12 flex items-center justify-center bg-slate-100 border-2 border-slate-200 rounded-lg font-black text-2xl text-slate-800 shadow-inner">{match.scoreB}</div>
              </>
            ) : (
              <>
                <input type="number" min="0" value={match.scoreA} onChange={(e) => handleMatchUpdate(match.id, 'scoreA', e.target.value)} className="w-12 h-12 text-center bg-slate-100 border-2 border-slate-200 rounded-lg font-black text-2xl text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-inner" />
                <span className="text-slate-300 font-black text-xl">-</span>
                <input type="number" min="0" value={match.scoreB} onChange={(e) => handleMatchUpdate(match.id, 'scoreB', e.target.value)} className="w-12 h-12 text-center bg-slate-100 border-2 border-slate-200 rounded-lg font-black text-2xl text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-inner" />
              </>
            )}
            {/* Team B code — only visible on mobile */}
            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded leading-none">{codeB}</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <label className={`flex items-center gap-2 text-sm font-bold text-slate-500 ${isViewer ? 'cursor-default' : 'cursor-pointer hover:text-emerald-600 transition-colors'}`}>
              <input type="checkbox" checked={match.isPlayed} onChange={(e) => !isViewer && handleMatchUpdate(match.id, 'isPlayed', e.target.checked)} disabled={isViewer} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-70 cursor-pointer" /> FT
            </label>
            {isKnockout && (
              <label className={`flex items-center gap-2 text-sm font-bold text-slate-500 ${isViewer ? 'cursor-default' : 'cursor-pointer hover:text-amber-600 transition-colors'}`}>
                <input type="checkbox" checked={match.isAET || false} onChange={(e) => !isViewer && handleMatchUpdate(match.id, 'isAET', e.target.checked)} disabled={isViewer} className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 disabled:opacity-70 cursor-pointer" /> AET
              </label>
            )}
          </div>
        </div>

        {/* ── Team B ── */}
        <div className="w-full md:w-1/3 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-sm p-2 md:p-3 rounded-xl shadow-lg border border-emerald-100 flex items-center justify-between w-full relative overflow-hidden">
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-0">
              <TeamPixelArt teamId={tB?.id} className="w-28 h-28" />
            </div>
            <TeamLogo teamId={tB?.id} className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3 shrink-0 relative z-10 drop-shadow-md" />
            <div className="flex flex-col w-full relative z-10">
              {isKnockout && !isViewer ? (
                <select value={match.teamB} onChange={(e) => handleMatchUpdate(match.id, 'teamB', e.target.value)} className="p-1 border border-slate-200 rounded text-sm w-full font-bold text-slate-800 focus:border-emerald-500 focus:outline-none mb-1 shadow-sm bg-white cursor-pointer">
                  <option value="">-- {match.labelB || 'TBD'} --</option>
                  {eligibleTeamsB.map(t => <option key={t.id} value={t.id}>{t.id} - {t.name}</option>)}
                </select>
              ) : (
                <div className="font-black text-slate-800 text-right md:text-left text-base sm:text-lg truncate pl-2 drop-shadow-sm">{tB?.name || match.teamB || match.labelB || 'TBD'}</div>
              )}
              <div className="text-[10px] text-slate-500 text-right md:text-left uppercase tracking-wider font-bold">
                Manager: <span className="text-emerald-700">{getOwnerName(match.teamB)}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-slate-50/90 border border-slate-100 rounded-md px-1.5 py-0.5 sm:px-3 sm:py-1 ml-2 sm:ml-3 shrink-0 relative z-10 shadow-sm">
              <span className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">FIFA</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 leading-tight">{tB?.rank || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Penalty Shootout — sits below the green card as its own white box ── */}
      {isKnockout && match.isAET && (
        <div className="relative z-10 mt-3 bg-white border-2 border-amber-200 rounded-xl px-5 py-4 shadow-md flex flex-col items-center gap-3 animate-fade-in">
          <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Penalty Shootout</span>
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Team A */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{codeA}</span>
              {isViewer ? (
                <div className="w-12 h-12 flex items-center justify-center bg-amber-50 border-2 border-amber-200 rounded-lg font-black text-2xl text-amber-800 shadow-inner">{match.penScoreA || '-'}</div>
              ) : (
                <input type="number" min="0" value={match.penScoreA || ''} onChange={(e) => handleMatchUpdate(match.id, 'penScoreA', e.target.value)} className="w-12 h-12 text-center bg-amber-50 border-2 border-amber-200 rounded-lg font-black text-2xl text-amber-800 focus:border-amber-500 focus:bg-white focus:outline-none transition-all shadow-inner" />
              )}
            </div>
            <span className="text-slate-300 font-black text-xl mt-4">-</span>
            {/* Team B */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{codeB}</span>
              {isViewer ? (
                <div className="w-12 h-12 flex items-center justify-center bg-amber-50 border-2 border-amber-200 rounded-lg font-black text-2xl text-amber-800 shadow-inner">{match.penScoreB || '-'}</div>
              ) : (
                <input type="number" min="0" value={match.penScoreB || ''} onChange={(e) => handleMatchUpdate(match.id, 'penScoreB', e.target.value)} className="w-12 h-12 text-center bg-amber-50 border-2 border-amber-200 rounded-lg font-black text-2xl text-amber-800 focus:border-amber-500 focus:bg-white focus:outline-none transition-all shadow-inner" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MatchesTab = ({ matches, localTimezone, setLocalTimezone, isViewer, handleMatchUpdate, getOwnerName, eliminatedTeams, handleRandomizeGroups }) => {
  const [matchFilter, setMatchFilter] = useState(() => {
    try { return localStorage.getItem('worldCupGroupFilter') || 'All'; } catch { return 'All'; }
  });

  const [showTopBtn, setShowTopBtn] = useState(false);

  const storageKey = 'worldCupMatchesUIState';
  const [uiState, setUiState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { group: true, ...JSON.parse(saved) };
    } catch (e) {}
    return { main: true, group: true, R32: false, R16: false, QF: false, SF: false, Final: false, sortFinishedBottom: false };
  });

  const updateUiState = (next) => {
    setUiState(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {}
  };

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const toggleMain = () => updateUiState({ ...uiState, main: !uiState.main });
  const toggleGroup = () => updateUiState({ ...uiState, group: !uiState.group });
  const toggleStage = (stageId) => updateUiState({ ...uiState, [stageId]: !uiState[stageId] });
  const toggleSortFinished = () => updateUiState({ ...uiState, sortFinishedBottom: !uiState.sortFinishedBottom });

  const sortMatches = (a, b) => {
    if (uiState.sortFinishedBottom) {
      if (a.isPlayed && !b.isPlayed) return 1;
      if (!a.isPlayed && b.isPlayed) return -1;
    }
    return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
  };

  let groupMatches = matches.filter(m => m.stage === 'Group');
  if (matchFilter !== 'All') {
    const selectedGroup = matchFilter.replace('Group ', '');
    groupMatches = groupMatches.filter(m => {
      const tA = TEAMS_DATA.find(t => t.id === m.teamA);
      return tA && tA.group === selectedGroup;
    });
  }
  groupMatches.sort(sortMatches);

  const knockoutMatches = matches.filter(m => m.stage !== 'Group');
  knockoutMatches.sort(sortMatches);

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {showTopBtn && (
        <button onClick={scrollToTop} className="fixed bottom-8 right-8 p-4 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-500 hover:-translate-y-1 transition-all z-50 group border-2 border-emerald-400" title="Jump to Top">
          <ArrowUp className="w-6 h-6 group-hover:animate-bounce" />
        </button>
      )}

      <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {!isViewer && (
            <button onClick={handleRandomizeGroups} className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-sm w-full sm:w-auto" title="Instantly sets all group games to FT with random scores!">
              🎲 Randomise Groups
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full md:w-auto">
          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Timezone:</span>
          <select
            value={localTimezone}
            onChange={(e) => {
              setLocalTimezone(e.target.value);
              try { localStorage.setItem('worldCupTimezone', e.target.value); } catch (err) {}
            }}
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
          >
            {TIMEZONES.map(tz => <option key={tz.id} value={tz.id}>{tz.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Knockout Matches ── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 overflow-hidden">
        <button onClick={toggleMain} className="w-full bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5 font-black flex items-center justify-between uppercase tracking-widest hover:from-slate-700 hover:to-slate-600 transition-colors">
          <span className="flex items-center gap-3"><Trophy className="w-6 h-6 text-yellow-400" /> Knockout Stage</span>
          {uiState.main ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
        </button>
        {uiState.main && (
          <div className="p-6 bg-slate-50/50">
            {knockoutMatches.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg border-2 border-dashed border-slate-200 text-slate-400 font-medium">No knockout matches scheduled yet.</div>
            ) : (
              <div className="space-y-4">
                {KNOCKOUT_STAGES.map(stageInfo => {
                  const stageMatches = knockoutMatches.filter(m => m.stage === stageInfo.id);
                  if (stageMatches.length === 0) return null;
                  return (
                    <div key={stageInfo.id} className="border-2 border-slate-200 rounded-xl overflow-hidden transition-all shadow-sm">
                      <button onClick={() => toggleStage(stageInfo.id)} className="w-full bg-white p-4 font-black text-slate-800 flex justify-between items-center hover:bg-green-50 hover:text-green-800 transition-colors uppercase tracking-wider">
                        <span className="flex items-center gap-3">{stageInfo.name} <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold">{stageMatches.length} Matches</span></span>
                        {uiState[stageInfo.id] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      </button>
                      {uiState[stageInfo.id] && (
                        <div className="p-4 space-y-4 bg-slate-50 border-t-2 border-slate-100">
                          {stageMatches.map(m => <MatchRow key={m.id} match={m} matches={matches} isKnockout={true} localTimezone={localTimezone} isViewer={isViewer} handleMatchUpdate={handleMatchUpdate} getOwnerName={getOwnerName} eliminatedTeams={eliminatedTeams} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Group Stage Matches ── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-green-100 overflow-hidden">
        <button onClick={toggleGroup} className="w-full bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 p-5 font-black flex items-center justify-between uppercase tracking-widest hover:from-green-100 hover:to-emerald-100 transition-colors border-b-2 border-green-100">
          <span className="flex items-center gap-3"><Calendar className="w-6 h-6 text-emerald-500" /> Group Stage Matches</span>
          {uiState.group ? <ChevronDown className="w-6 h-6 text-green-600" /> : <ChevronRight className="w-6 h-6 text-green-600" />}
        </button>
        {uiState.group && (
          <div className="p-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b-2 border-slate-100 pb-4 gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:justify-end">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select value={matchFilter} onChange={e => {
                    setMatchFilter(e.target.value);
                    try { localStorage.setItem('worldCupGroupFilter', e.target.value); } catch (err) {}
                  }} className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto">
                    <option value="All">All Groups</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => <option key={g} value={`Group ${g}`}>Group {g}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-500 cursor-pointer hover:text-emerald-600 transition-colors bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 w-full sm:w-auto">
                  <input type="checkbox" checked={uiState.sortFinishedBottom} onChange={toggleSortFinished} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" />
                  Finished to bottom
                </label>
              </div>
            </div>
            <div className="space-y-4">
              {groupMatches.map(m => <MatchRow key={m.id} match={m} matches={matches} localTimezone={localTimezone} isViewer={isViewer} handleMatchUpdate={handleMatchUpdate} getOwnerName={getOwnerName} eliminatedTeams={eliminatedTeams} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
