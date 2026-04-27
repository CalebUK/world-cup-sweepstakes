import React from 'react';
import { Settings, Trophy, Plus, Trash2, User, ShieldCheck, HelpCircle } from 'lucide-react';

export const AppHeader = ({
  isViewer,
  isOwner,
  isAccountLinked,
  user,
  activeLeagueId,
  hostedLeagues,
  joinedLeagues,
  onSwitchLeague,
  onOpenSettings,
  onOpenLeave,
  onOpenJoin,
  onOpenAccount,
  onOpenHelp,
}) => {
  return (
    <header className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white pt-10 pb-8 px-4 sm:px-6 lg:px-8 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,#fff_40px,#fff_80px)] pointer-events-none transform -skew-x-12 scale-150" />

      {/* Constrain to same max-width as the tab bar below */}
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-4">

        {/* Title row */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase drop-shadow-md flex items-center gap-3 flex-wrap">
          <img
            src="/logos/world-cup.svg"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
            alt="World Cup Logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          World Cup 2026
          {isViewer ? (
            <span className="bg-amber-500 text-amber-950 text-[10px] sm:text-xs font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest shadow-md shrink-0">
              Viewer
            </span>
          ) : (
            <span className="bg-indigo-500 text-indigo-50 text-[10px] sm:text-xs font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest shadow-md shrink-0 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Commish
            </span>
          )}
          {/* Help button — re-opens the welcome modal */}
          <button
            onClick={onOpenHelp}
            title="How does this work?"
            className="ml-auto sm:ml-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white p-1.5 rounded-lg transition-colors shrink-0"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </h1>

        {/* Controls bar — same rounded-xl card style as the tab bar */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100/30 p-1.5 sm:p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 mt-2">

          {/* League selector */}
          <div className="flex items-center flex-1 min-w-0 gap-2 px-1">
            <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:block shrink-0">
              Active League:
            </span>
            <select
              value={activeLeagueId || ''}
              onChange={e => onSwitchLeague(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-slate-900 font-black text-sm sm:text-base py-2 pr-2 appearance-none cursor-pointer border-0 focus:ring-0 outline-none truncate"
            >
              {hostedLeagues.length > 0 && (
                <optgroup label="👑 My Hosted Leagues">
                  {hostedLeagues.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} {activeLeagueId === l.id && '(Commish)'}
                    </option>
                  ))}
                </optgroup>
              )}
              {joinedLeagues.length > 0 && (
                <optgroup label="👁️ Joined Leagues">
                  {joinedLeagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-slate-200 shrink-0" />

          {/* Action buttons — same style as tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] shrink-0">
            {isOwner && (
              <button
                onClick={onOpenSettings}
                className="shrink-0 py-2.5 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700 flex items-center gap-1.5 snap-start"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:block">Admin</span>
              </button>
            )}
            {isViewer && (
              <button
                onClick={onOpenLeave}
                className="shrink-0 py-2.5 px-3 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all bg-red-50 text-red-500 hover:bg-red-100 flex items-center gap-1.5 snap-start"
                title="Remove this league"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onOpenJoin}
              className="shrink-0 py-2.5 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5 snap-start"
            >
              <Plus className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:block">Leagues</span>
            </button>
            <button
              onClick={onOpenAccount}
              className={`shrink-0 py-2.5 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all flex items-center gap-1.5 snap-start ${
                isAccountLinked
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {isAccountLinked && user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="hidden sm:block">
                {isAccountLinked ? 'Linked' : 'Account'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
