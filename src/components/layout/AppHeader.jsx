import React from 'react';
import { Settings, Trophy, Plus, Trash2, User, ShieldCheck } from 'lucide-react';

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
}) => {
  return (
    <header className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white pt-10 pb-8 px-4 sm:px-6 lg:px-8 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,#fff_40px,#fff_80px)] pointer-events-none transform -skew-x-12 scale-150" />
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
        </h1>

        {/* Controls bar */}
        <div className="w-full bg-white/10 p-2 sm:p-2.5 rounded-xl border border-white/20 backdrop-blur-sm shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mt-2">

          {/* League selector */}
          <div className="flex items-center w-full md:w-auto flex-1 min-w-[250px]">
            <span className="text-xs font-bold text-green-200 uppercase tracking-widest pl-2 hidden lg:block shrink-0 mr-2">
              Active League:
            </span>
            <div className="relative w-full">
              <select
                value={activeLeagueId || ''}
                onChange={e => onSwitchLeague(e.target.value)}
                className="w-full bg-white/90 text-slate-900 font-black text-sm sm:text-base py-2.5 pl-9 pr-4 rounded-lg appearance-none cursor-pointer border-0 focus:ring-2 focus:ring-emerald-400 shadow-inner truncate"
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
              <Trophy className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-between md:justify-end w-full md:w-auto overflow-x-auto pb-1 md:pb-0 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {isOwner && (
              <button
                onClick={onOpenSettings}
                className="bg-white/90 hover:bg-white text-green-800 p-2.5 sm:px-4 rounded-lg shadow-sm transition-colors border border-green-200 flex items-center gap-2 shrink-0 snap-start"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden sm:block font-black text-sm uppercase tracking-wider">Admin</span>
              </button>
            )}
            {isViewer && (
              <button
                onClick={onOpenLeave}
                className="bg-red-500/90 hover:bg-red-500 text-white p-2.5 rounded-lg shadow-sm transition-colors border border-red-400 flex items-center justify-center shrink-0 snap-start"
                title="Remove this league"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onOpenJoin}
              className="bg-emerald-500 hover:bg-emerald-400 text-white p-2.5 sm:px-4 rounded-lg shadow-sm transition-colors border border-emerald-400 flex items-center gap-2 shrink-0 snap-start"
            >
              <Plus className="w-5 h-5 sm:hidden" />
              <span className="hidden sm:block font-black text-sm uppercase tracking-wider">Leagues</span>
            </button>
            <button
              onClick={onOpenAccount}
              className={`p-2.5 sm:px-4 rounded-lg shadow-sm transition-colors border flex items-center gap-2 shrink-0 snap-start ${
                isAccountLinked
                  ? 'bg-emerald-700/90 hover:bg-emerald-800 border-emerald-600'
                  : 'bg-slate-700/90 hover:bg-slate-800 border-slate-600'
              }`}
            >
              {isAccountLinked && user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-emerald-400 object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white sm:hidden" />
              )}
              <span className="hidden sm:block text-white font-black text-sm uppercase tracking-wider">
                {isAccountLinked ? 'Linked' : 'Account'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
