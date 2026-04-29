import React from 'react';
import { Settings, Plus, Trash2, User, ShieldCheck, HelpCircle, ChevronDown } from 'lucide-react';

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
    <header className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white pt-10 pb-12 px-4 sm:px-6 lg:px-8 shadow-xl relative overflow-hidden">
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
          <button
            onClick={onOpenHelp}
            title="How does this work?"
            className="ml-auto sm:ml-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white p-1.5 rounded-lg transition-colors shrink-0"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </h1>

        {/* Controls bar — matches the tab bar: same bg, same border, same shadow, same padding */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100/50 p-1.5 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">

          {/* League dropdown — styled as a visible select with border and chevron */}
          <div className="relative flex-1 min-w-0">
            <select
              id="active-league-selector"
              name="activeLeague"
              aria-label="Select active league"
              value={activeLeagueId || ''}
              onChange={e => onSwitchLeague(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-900 font-black text-sm sm:text-base py-2.5 pl-3 pr-9 rounded-lg cursor-pointer focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-colors truncate"
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
            {/* Custom chevron arrow so it's obvious it's a dropdown */}
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Action buttons — same style as the tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] shrink-0">
            {isOwner && (
              <button
                onClick={onOpenSettings}
                className="shrink-0 flex-1 sm:flex-none py-2.5 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700 flex items-center justify-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:block">Admin</span>
              </button>
            )}
            {isViewer && (
              <button
                onClick={onOpenLeave}
                className="shrink-0 py-2.5 px-3 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all duration-200 bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"
                title="Remove this league"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onOpenJoin}
              className="shrink-0 flex-1 sm:flex-none py-2.5 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 bg-green-600 text-white hover:bg-green-500 shadow-md sm:scale-[1.02] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:block">Leagues</span>
            </button>
            <button
              onClick={onOpenAccount}
              className={`shrink-0 flex-1 sm:flex-none py-2.5 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isAccountLinked
                  ? 'bg-slate-50 text-emerald-700 hover:bg-green-50 hover:text-green-700'
                  : 'bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700'
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
