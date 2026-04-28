import React, { useState } from 'react';
import { Users, Trash2, PlusCircle, Settings as SettingsIcon, Calculator, Clock, AlertTriangle, RotateCcw, Share2, CheckCircle, Copy, Trophy, ShieldAlert, Sparkles } from 'lucide-react';
import { KNOCKOUT_STAGES, DEFAULT_SCORING } from '../../config/data.js';

export const SettingsTab = ({ settings, updateSettings, members, handleAddMember, handleUpdateMember, handleDeleteMember, handleResetData, handleHardReset, userUid }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);

  const handleCopyLink = () => {
    if (!userUid) return;
    const url = new URL(window.location.href);
    url.searchParams.set('host', userUid);
    const linkToCopy = url.toString();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(linkToCopy)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(() => {});
    }
  };

  const confirmReset = () => {
    handleResetData();
    setShowResetConfirm(false);
  };

  const confirmHardReset = () => {
    if (handleHardReset) handleHardReset();
  };

  const handleScoringUpdate = (stageGroup, stage, field, value) => {
    const numVal = parseInt(value) || 0;
    const currentScoring = settings.scoring || DEFAULT_SCORING;
    const updatedScoring = { ...currentScoring };
    if (stageGroup === 'group') {
      updatedScoring.group = { ...updatedScoring.group, [field]: numVal };
    } else {
      updatedScoring.ko = {
        ...updatedScoring.ko,
        [stage]: { ...updatedScoring.ko[stage], [field]: numVal },
      };
    }
    updateSettings({ scoring: updatedScoring });
  };

  // Mobile-friendly stepper: large − / + buttons flank the value.
  // Works perfectly on touch screens without needing native spinner arrows.
  const ScoreInput = ({ label, value, onChange }) => {
    const num = parseInt(value) || 0;
    return (
      <div className="flex flex-col items-center gap-1 flex-1 min-w-[72px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center leading-tight">{label}</span>
        <div className="flex items-center w-full bg-slate-100 border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
          <button
            type="button"
            onPointerDown={e => e.preventDefault()}  // prevent focus-shift on mobile
            onClick={() => onChange(String(Math.max(0, num - 1)))}
            className="flex items-center justify-center w-9 h-9 shrink-0 text-slate-500 hover:text-white hover:bg-emerald-500 active:bg-emerald-600 transition-colors text-lg font-black select-none"
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full min-w-0 text-center bg-transparent font-black text-slate-800 focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onPointerDown={e => e.preventDefault()}  // prevent focus-shift on mobile
            onClick={() => onChange(String(num + 1))}
            className="flex items-center justify-center w-9 h-9 shrink-0 text-slate-500 hover:text-white hover:bg-emerald-500 active:bg-emerald-600 transition-colors text-lg font-black select-none"
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  const activeScoring = settings.scoring || DEFAULT_SCORING;

  return (
    <div className="space-y-8">

      {/* ── Share League Link ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <Share2 className="w-6 h-6 text-slate-500" /> Share Your League
        </h2>
        <p className="text-sm text-slate-500 font-medium mb-4">Share this link so others can view your sweepstakes standings in real-time.</p>
        <button
          onClick={handleCopyLink}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-sm ${
            copySuccess
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
          }`}
        >
          {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copySuccess ? 'Link Copied!' : 'Copy Viewer Link'}
        </button>
      </div>

      {/* ── Managers ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <Users className="w-6 h-6 text-slate-500" /> Managers
        </h2>
        <div className="space-y-2 mb-4">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
              <input
                type="text"
                value={member.name}
                onChange={e => handleUpdateMember(member.id, 'name', e.target.value)}
                className="flex-1 bg-transparent font-bold text-slate-800 focus:outline-none text-sm sm:text-base"
                placeholder="Manager name"
              />
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={member.isKid}
                  onChange={e => handleUpdateMember(member.id, 'isKid', e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-500 rounded border-slate-300 focus:ring-indigo-400 cursor-pointer"
                />
                Kid
              </label>
              <button
                onClick={() => handleDeleteMember(member.id)}
                className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddMember}
          disabled={members.length >= 24}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusCircle className="w-4 h-4" />
          {members.length >= 24 ? 'Manager Limit Reached (24)' : 'Add New Manager'}
        </button>
      </div>

      {/* ── Scoring & Rules ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <SettingsIcon className="w-6 h-6 text-slate-500" /> Sweepstakes Rules
        </h2>

        <div className="space-y-6">

          {/* Custom scoring */}
          <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
            <div>
              <label className="font-black text-slate-800 flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5 text-indigo-600" /> Custom Scoring System
              </label>
              <p className="text-sm text-slate-500 font-medium mt-1">Define how many points managers receive based on their team's performance.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="font-black text-emerald-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Group Stage</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ScoreInput label="Win" value={activeScoring.group.win} onChange={(v) => handleScoringUpdate('group', null, 'win', v)} />
                <ScoreInput label="Draw" value={activeScoring.group.draw} onChange={(v) => handleScoringUpdate('group', null, 'draw', v)} />
                <ScoreInput label="Loss" value={activeScoring.group.loss} onChange={(v) => handleScoringUpdate('group', null, 'loss', v)} />
                <ScoreInput label="Top of Group Bonus" value={activeScoring.group.topOfGroup || 0} onChange={(v) => handleScoringUpdate('group', null, 'topOfGroup', v)} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="font-black text-emerald-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Knockout Stages</h4>
              <div className="space-y-3">
                {KNOCKOUT_STAGES.map(stage => {
                  const sData = activeScoring.ko[stage.id];
                  return (
                    <div key={stage.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <span className="w-16 font-black text-sm text-slate-700 uppercase tracking-widest">{stage.id}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <ScoreInput label="Reg Win" value={sData.win} onChange={(v) => handleScoringUpdate('ko', stage.id, 'win', v)} />
                        <ScoreInput label="Reg Loss" value={sData.loss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'loss', v)} />
                        {sData.etWin !== undefined && (
                          <ScoreInput label="ET Win" value={sData.etWin} onChange={(v) => handleScoringUpdate('ko', stage.id, 'etWin', v)} />
                        )}
                        {sData.etLoss !== undefined && (
                          <ScoreInput label="ET Loss" value={sData.etLoss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'etLoss', v)} />
                        )}
                        {sData.penWin !== undefined && (
                          <ScoreInput label="Pen Win" value={sData.penWin} onChange={(v) => handleScoringUpdate('ko', stage.id, 'penWin', v)} />
                        )}
                        {sData.penLoss !== undefined && (
                          <ScoreInput label="Pen Loss" value={sData.penLoss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'penLoss', v)} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Wooden Spoon */}
          <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
            <div>
              <label className="font-black text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Wooden Spoon Award
              </label>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Give a special award to the manager who finishes last.</p>
            </div>
            <button
              onClick={() => updateSettings({ woodenSpoon: !settings.woodenSpoon })}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${settings.woodenSpoon ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${settings.woodenSpoon ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Kid Awards */}
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="font-black text-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-indigo-500" /> Kid Awards
                </label>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Separate leaderboard for managers marked as kids.</p>
              </div>
              <button
                onClick={() => updateSettings({ kidAwards: !settings.kidAwards })}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${settings.kidAwards ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${settings.kidAwards ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.kidAwards && (
              <div className="flex gap-3 pt-1 border-t border-slate-200">
                {['all', 'kids_only'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600 hover:text-emerald-700 transition-colors">
                    <input
                      type="radio"
                      name="kidAwardsType"
                      value={opt}
                      checked={(settings.kidAwardsType || 'all') === opt}
                      onChange={() => updateSettings({ kidAwardsType: opt })}
                      className="text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    {opt === 'all' ? 'Show all managers' : 'Kids only leaderboard'}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Auto Sync */}
          <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
            <div>
              <label className="font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" /> Auto-Sync Scores
              </label>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Automatically pull live scores from ESPN. Disables manual score editing.</p>
            </div>
            <button
              onClick={() => updateSettings({ autoSync: !settings.autoSync })}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${settings.autoSync ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${settings.autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Fantasy Mode (Roto) */}
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 hover:border-purple-400 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> Fantasy Mode (Roto)
                </label>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  Switches this league from Sweepstakes to a 4-stat Rotisserie format
                  (Goals, Shots on Target, Cards, Goals Allowed). Replaces the Standings
                  and Teams tabs. The commish runs a random draft, then assigns stats
                  to managers offline.
                </p>
                {settings.fantasyMode && (
                  <p className="text-xs text-purple-700 font-bold mt-2 italic">
                    Fantasy mode is on — Standings and Teams tabs now show Roto.
                  </p>
                )}
              </div>
              <button
                onClick={() => updateSettings({ fantasyMode: !settings.fantasyMode })}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 mt-1 ${settings.fantasyMode ? 'bg-purple-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${settings.fantasyMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Picks per category — only visible when fantasy mode is ON */}
            {settings.fantasyMode && (
              <div className="mt-4 pt-4 border-t border-purple-200 flex items-center justify-between gap-4">
                <div>
                  <label className="font-black text-slate-700 text-sm">
                    Picks per Category
                  </label>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    How many teams each manager assigns to each of the 4 stats. Default 5.
                  </p>
                </div>
                <div className="flex items-center bg-white border-2 border-purple-200 rounded-lg overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => updateSettings({
                      fantasyPicksPerCategory: Math.max(1, (settings.fantasyPicksPerCategory || 5) - 1)
                    })}
                    className="w-9 h-9 flex items-center justify-center text-purple-600 hover:bg-purple-100 transition-colors text-lg font-black"
                    aria-label="Decrease picks per category"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-black text-purple-800 text-lg">
                    {settings.fantasyPicksPerCategory || 5}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateSettings({
                      fantasyPicksPerCategory: Math.min(48, (settings.fantasyPicksPerCategory || 5) + 1)
                    })}
                    className="w-9 h-9 flex items-center justify-center text-purple-600 hover:bg-purple-100 transition-colors text-lg font-black"
                    aria-label="Increase picks per category"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-red-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-red-700 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-red-50 pb-4">
          <ShieldAlert className="w-6 h-6 text-red-400" /> Danger Zone
        </h2>
        <div className="space-y-3">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset All Scores
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm font-bold text-amber-800 flex-1">This will reset all match scores to 0 and clear the knockout bracket. Your managers, team assignments, and settings will not be affected.</span>
              <button onClick={confirmReset} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-lg uppercase tracking-wider transition-colors">Yes, Reset</button>
              <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs rounded-lg uppercase tracking-wider transition-colors">Cancel</button>
            </div>
          )}
          {handleHardReset && (
            !showHardResetConfirm ? (
              <button
                onClick={() => setShowHardResetConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Delete This League
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="text-sm font-bold text-red-800 flex-1">Permanently delete this league and all its data?</span>
                <button onClick={confirmHardReset} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-lg uppercase tracking-wider transition-colors">Yes, Delete</button>
                <button onClick={() => setShowHardResetConfirm(false)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs rounded-lg uppercase tracking-wider transition-colors">Cancel</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Developer Info ────────────────────────────────────────────── */}
      {userUid && (
        <div className="mt-2 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Admin Developer Tool:</p>
          <code className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded selection:bg-indigo-200 break-all">
            UID: {userUid}
          </code>
        </div>
      )}

    </div>
  );
};
