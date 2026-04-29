import React, { useState } from 'react';
import { X, LayoutGrid, Plus, Trash2, AlertTriangle } from 'lucide-react';

export const JoinModal = ({
  pendingJoinCode, setPendingJoinCode,
  pendingJoinName, setPendingJoinName,
  joinCodeError, setJoinCodeError,
  onJoinSubmit, onCreateLeague,
  onDeleteHostedLeague,
  hostedLeagues = [],
  activeLeagueId,
  user,
  onClose,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const leagueToDelete = hostedLeagues.find(l => l.id === confirmDeleteId);

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    onDeleteHostedLeague(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-4 border-emerald-600 relative max-h-[90vh] overflow-y-auto">
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

          {/* My Hosted Leagues — with delete */}
          {hostedLeagues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                My Hosted Leagues
              </h3>
              {hostedLeagues.map(l => {
                const isPrimary = l.id === user?.uid;
                const isActive = l.id === activeLeagueId;
                return (
                  <div key={l.id} className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                    isActive ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-slate-800 text-sm truncate">{l.name}</span>
                      {isPrimary && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Primary League</span>
                      )}
                    </div>
                    {/* Can't delete the primary league (user's own UID) */}
                    {!isPrimary && (
                      <button
                        onClick={() => setConfirmDeleteId(l.id)}
                        className="ml-3 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Delete this league"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
                id="join-invite-code"
                name="inviteCode"
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
                id="join-nickname"
                name="leagueNickname"
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

      {/* Delete confirmation overlay */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-4 border-red-600">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Delete League?</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Are you sure you want to delete <strong>"{leagueToDelete?.name}"</strong>? This removes it from your hosted list. The data in Firebase is not deleted — you can re-add it later via the invite link if needed.
                </p>
              </div>
              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
