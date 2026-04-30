// src/fantasy/FantasyDraftModal.jsx
//
// Commish-only modal for running the Fantasy draft.
//
// Three states:
//   1. No draft yet → "Configure & Run Draft" view (member list + teams-per
//      input + Run button)
//   2. Draft preview (just rolled, not committed yet) → shows result, with
//      "Re-roll" and "Save This Draft" buttons
//   3. Draft already committed → shows current ownership read-only, with
//      a "Re-roll Draft" button that warns about losing picks + stats
//
// Styling matches existing modals (rounded-2xl, border-4, sticky header).

import React, { useState, useMemo } from 'react';
import { X, Sparkles, Dice5, Save, RotateCcw, AlertTriangle, Trophy } from 'lucide-react';
import { TEAMS_DATA } from '../config/data.js';
import { runFantasyDraft, FANTASY_STATS } from './fantasyLogic.js';

// Tiny helpers ──────────────────────────────────────────────────────────────

const teamById = (id) => TEAMS_DATA.find(t => t.id === id);

const TeamPill = ({ teamId }) => {
  const t = teamById(teamId);
  if (!t) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-purple-200 rounded-md text-xs font-bold text-slate-700 shadow-sm"
      title={`${t.name} (FIFA #${t.rank}, Group ${t.group})`}
    >
      <span className="text-[9px] font-black text-purple-500 uppercase tracking-wider">{t.id}</span>
      <span className="truncate max-w-[110px]">{t.name}</span>
    </span>
  );
};

// ───────────────────────────────────────────────────────────────────────────

export const FantasyDraftModal = ({
  members,
  ownership,         // current committed ownership from Firestore
  draftMeta,         // current committed meta { teamsPerManager, draftedAt, groupCount } | null
  commitDraft,       // (newOwnership, newMeta) => Promise
  picksPerCategory = 5,
  onClose,
}) => {
  const hasCommittedDraft = draftMeta && Object.keys(ownership || {}).length > 0;

  const statCount = FANTASY_STATS.length;
  const recommendedTeams = picksPerCategory * statCount;

  // teamsPerManager input: defaults to existing meta or the recommended value
  const [teamsPerManager, setTeamsPerManager] = useState(
    draftMeta?.teamsPerManager || recommendedTeams
  );

  // Local preview ownership (not committed yet)
  const [previewOwnership, setPreviewOwnership] = useState(null);
  const [previewMeta, setPreviewMeta] = useState(null);
  const [confirmReroll, setConfirmReroll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Whether we're currently showing a preview (just rolled) vs the committed draft
  const showingPreview = previewOwnership !== null;
  const displayedOwnership = showingPreview ? previewOwnership : ownership;
  const displayedMeta      = showingPreview ? previewMeta      : draftMeta;

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleRunDraft = () => {
    setError('');
    try {
      const tpm = Math.max(1, Math.min(48, parseInt(teamsPerManager) || 10));
      const result = runFantasyDraft(members, tpm);
      setPreviewOwnership(result.ownership);
      setPreviewMeta({
        teamsPerManager: tpm,
        draftedAt: Date.now(),
        groupCount: result.groupCount,
      });
      setConfirmReroll(false);
    } catch (err) {
      setError(err.message || 'Draft failed. Please try again.');
    }
  };

  const handleSaveDraft = async () => {
    if (!previewOwnership || !previewMeta) return;
    setSaving(true);
    try {
      await commitDraft(previewOwnership, previewMeta);
      setPreviewOwnership(null);
      setPreviewMeta(null);
      setConfirmReroll(false);
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardPreview = () => {
    setPreviewOwnership(null);
    setPreviewMeta(null);
  };

  // ── Pre-flight checks ───────────────────────────────────────────────────

  const memberCount = members?.length || 0;
  const minMembers = 2;
  const tpmNumber = parseInt(teamsPerManager) || 0;
  const belowMinimum = tpmNumber > 0 && tpmNumber < recommendedTeams;
  const maxTeamsAllowed = useMemo(() => {
    if (memberCount === 0) return 0;
    const groupSize = memberCount;
    const groupCount = Math.floor(48 / groupSize);
    // Each pass through all groups gives one team per manager. We can do many
    // passes but each manager can never exceed the # of teams in any one group
    // they cycle through. Practical cap: groupCount × groupSize / memberCount
    // which simplifies to just groupCount, since each pass = 1 team per mgr.
    // But across multiple passes through the same group, no manager can have
    // more than (groupSize) teams from any one group — and there are
    // groupCount groups available. So absolute max picks = groupCount × groupSize
    // but constrained by groupSize per group → max = groupSize teams from
    // each of groupCount groups, but per-group limit is groupSize.
    // Simplest safe cap: groupCount × (groupSize - 0) but constrained by no
    // duplicate teams owned by same manager → cap = groupSize per group ×
    // groupCount groups = whole pool minus 1 (very generous).
    // For UX we cap at the smaller of: 48 - 1, or groupCount * groupSize - 1.
    // Realistically nobody picks > 20.
    return Math.min(48 - 1, groupCount * groupSize - 1);
  }, [memberCount]);

  const groupCountForDisplay = memberCount > 0 ? Math.floor(48 / memberCount) : 0;
  const teamsUsedByGroups = groupCountForDisplay * memberCount;
  const teamsLeftOut = 48 - teamsUsedByGroups;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-4 border-purple-600 relative">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white border-b-2 border-slate-100 p-4 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-black text-purple-800 flex items-center gap-2 uppercase tracking-wide">
            <Sparkles className="w-6 h-6 text-purple-500" /> Fantasy Draft
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Pre-flight info ──────────────────────────────────────── */}
          {memberCount < minMembers ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-900 text-sm uppercase tracking-wide">Not enough managers</p>
                <p className="text-sm text-amber-800 mt-1 font-medium">
                  You need at least {minMembers} managers to run a draft. Add managers in Settings, then return here.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Configuration ──────────────────────────────────── */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Managers</p>
                    <p className="text-2xl font-black text-slate-800">{memberCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ranked Groups</p>
                    <p className="text-2xl font-black text-slate-800">{groupCountForDisplay}</p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {teamsUsedByGroups} teams used · {teamsLeftOut} excluded
                    </p>
                  </div>

                  <div className="flex flex-col items-start">
                    <label 
                      htmlFor="draft-teams-per-manager"
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1"
                    >
                      Teams per Manager
                    </label>
                    <input
                      id="draft-teams-per-manager"
                      name="teamsPerManager"
                      aria-label="Teams per manager"
                      aria-describedby="draft-teams-per-manager-help"
                      type="number"
                      min="1"
                      max={maxTeamsAllowed}
                      value={teamsPerManager}
                      onChange={(e) => setTeamsPerManager(e.target.value)}
                      className={`w-24 p-2 bg-white border-2 rounded-lg font-black text-lg focus:outline-none transition-colors ${
                        belowMinimum
                          ? 'border-red-400 text-red-700 focus:border-red-500'
                          : 'border-purple-200 text-purple-800 focus:border-purple-500'
                      }`}
                    />
                    <p
                      id="draft-teams-per-manager-help"
                      className="text-[10px] text-slate-500 font-medium mt-1 max-w-[10rem] leading-tight"
                    >
                     Default {recommendedTeams} ({picksPerCategory} pick{picksPerCategory === 1 ? '' : 's'} × {statCount} stats)
                    </p>
                  </div>
                </div>

                {teamsLeftOut > 0 && (
                  <p className="text-xs text-slate-500 font-medium leading-snug">
                    Note: with {memberCount} managers, the bottom {teamsLeftOut} FIFA-ranked
                    {teamsLeftOut === 1 ? ' team is' : ' teams are'} excluded from the draft.
                  </p>
                )}
              </div>

              {/* ── Action buttons (top) ───────────────────────────── */}
              {belowMinimum && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-xs font-bold text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Each manager needs at least <strong>{recommendedTeams} teams</strong> to
                    fill {picksPerCategory} pick{picksPerCategory === 1 ? '' : 's'} across
                    all {statCount} stats. Drafting fewer will leave managers unable to
                    assign all their picks.
                  </span>
                </div>
              )}
              {!showingPreview && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRunDraft}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl shadow-md uppercase tracking-widest transition-all"
                  >
                    <Dice5 className="w-5 h-5" />
                    {hasCommittedDraft ? 'Re-roll Draft' : 'Run Draft'}
                  </button>
                </div>
              )}

              {showingPreview && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center">
                  <div className="flex-1 text-sm font-bold text-purple-800">
                    <span className="text-[10px] uppercase tracking-widest text-purple-500 block">Preview</span>
                    Don't like the picks? Re-roll. Once saved, this overwrites any previous draft.
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleRunDraft}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 text-purple-700 border-2 border-purple-300 font-black rounded-lg uppercase text-xs tracking-wider transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> Re-roll
                    </button>
                    <button
                      onClick={handleDiscardPreview}
                      className="flex-1 sm:flex-none py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-lg uppercase text-xs tracking-wider transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg uppercase text-xs tracking-wider transition-all disabled:opacity-50 shadow"
                    >
                      <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {/* ── Re-roll warning when committed draft exists ────── */}
              {hasCommittedDraft && !showingPreview && !confirmReroll && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-xs font-medium text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    A draft was already saved. Running a new draft will <strong>discard all current stat picks and match stats</strong> for this league.
                  </span>
                </div>
              )}

              {/* ── Ownership table ────────────────────────────────── */}
              {displayedOwnership && Object.keys(displayedOwnership).length > 0 ? (
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-purple-100 text-purple-800 px-4 py-2 flex items-center gap-2 border-b-2 border-purple-200">
                    <Trophy className="w-4 h-4" />
                    <span className="font-black uppercase text-xs tracking-widest">
                      {showingPreview ? 'Preview' : 'Current Draft'} ·
                      {' '}{displayedMeta?.teamsPerManager} teams each
                    </span>
                  </div>
                  <div className="divide-y-2 divide-slate-100">
                    {members.map(m => {
                      const teamIds = displayedOwnership[m.id] || [];
                      return (
                        <div 
                          key={m.id} 
                          id={`draft-manager-row-${m.id}`}
                          aria-label={`${m.name}: ${teamIds.length} drafted team${teamIds.length === 1 ? '' : 's'}`}
                          className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                        >
                          <div className="sm:w-32 shrink-0">
                            <div className="font-black text-slate-800 truncate">{m.name}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {teamIds.length} team{teamIds.length === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {teamIds.length === 0 ? (
                              <span className="text-xs italic text-slate-400 font-medium">No teams</span>
                            ) : (
                              teamIds.map((tid, idx) => <TeamPill key={`${tid}-${idx}`} teamId={tid} />)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500 font-medium">
                  No draft has been run yet. Click <strong>Run Draft</strong> above to randomly assign teams.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
