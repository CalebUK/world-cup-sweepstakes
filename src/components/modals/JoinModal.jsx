import React from 'react';
import { X, LayoutGrid, Plus } from 'lucide-react';

export const JoinModal = ({
  pendingJoinCode,
  setPendingJoinCode,
  pendingJoinName,
  setPendingJoinName,
  joinCodeError,
  setJoinCodeError,
  onJoinSubmit,
  onCreateLeague,
  onClose,
}) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-4 border-emerald-600 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-100 p-1.5 rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3 mb-6 border-b-2 border-emerald-50 pb-4">
        <LayoutGrid className="w-8 h-8 text-emerald-600 bg-emerald-100 p-1.5 rounded-lg" />
        <h2 className="text-xl font-black text-emerald-800 uppercase tracking-widest">Manage Leagues</h2>
      </div>

      <div className="space-y-6">
        {/* Join section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
            Join a League
          </h3>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              League Invite Code (or URL)
            </label>
            <input
              type="text"
              placeholder="Paste link here"
              value={pendingJoinCode}
              onChange={e => { setPendingJoinCode(e.target.value); setJoinCodeError(''); }}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
            />
            {joinCodeError && (
              <p className="text-xs text-red-600 font-bold mt-1">{joinCodeError}</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Nickname for this League
            </label>
            <input
              type="text"
              placeholder="e.g. The Office Pool"
              value={pendingJoinName}
              onChange={e => setPendingJoinName(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={onJoinSubmit}
            disabled={!pendingJoinCode.trim() || !pendingJoinName.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-md uppercase tracking-widest transition-all disabled:opacity-50"
          >
            Add to My Leagues
          </button>
        </div>

        {/* Create section */}
        <div className="pt-4 border-t-2 border-slate-100">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Host Your Own</h3>
          <button
            onClick={onCreateLeague}
            className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create New Sweepstakes
          </button>
        </div>
      </div>
    </div>
  </div>
);
