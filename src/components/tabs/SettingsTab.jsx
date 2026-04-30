import React, { useState } from 'react';
import { Users, Trash2, PlusCircle, Settings as SettingsIcon, Calculator, Clock, AlertTriangle, RotateCcw, Share2, CheckCircle, Copy, Trophy, ShieldAlert, Sparkles, Pencil } from 'lucide-react';
import { KNOCKOUT_STAGES, DEFAULT_SCORING } from '../../config/data.js';
import {
  getMaxMembers,
  MIN_PICKS_PER_CATEGORY,
  MAX_PICKS_PER_CATEGORY,
  DEFAULT_PICKS_PER_CATEGORY,
  FANTASY_MEMBER_CAPS,
} from '../../fantasy/fantasyLogic.js';

export const SettingsTab = ({ settings, updateSettings, members, handleAddMember, handleUpdateMember, handleDeleteMember, handleResetData, handleHardReset, userUid }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);

  const fantasyMode = !!settings.fantasyMode;

// Resolve the current member cap based on mode + picks/cat. Used to disable
  // the "Add Manager" button and to gate the picks/cat stepper so the commish
  // can't bump picks/cat into a value where the cap would be lower than the
  // current member count.
  const currentPicksPerCategory = settings.fantasyPicksPerCategory || DEFAULT_PICKS_PER_CATEGORY;
  const memberCap = getMaxMembers(fantasyMode, currentPicksPerCategory);

  // For the picks/cat stepper: if bumping ppc up would drop the cap below the
  // current member count, block the increase. The commish has to remove
  // members first.
  const nextPicksPerCategory = Math.min(MAX_PICKS_PER_CATEGORY, currentPicksPerCategory + 1);
  const capAtNextPpc = FANTASY_MEMBER_CAPS[nextPicksPerCategory] ?? memberCap;
  const cantIncreasePpc =
    currentPicksPerCategory >= MAX_PICKS_PER_CATEGORY ||
    members.length > capAtNextPpc;
  const cantDecreasePpc = currentPicksPerCategory <= MIN_PICKS_PER_CATEGORY;  

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
  const ScoreInput = ({ label, value, onChange, stageGroup, stage, field }) => {
    const num = parseInt(value) || 0;
    const fieldKey = stage ? `${stageGroup}-${stage}-${field}` : `${stageGroup}-${field}`;
    return (
      <div className="flex flex-col items-center gap-1 flex-1 min-w-[72px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center leading-tight">{label}</span>
        <div className="flex items-center w-full bg-slate-100 border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
          <button
            type="button"
            onPointerDown={e => e.preventDefault()}
            onClick={() => onChange(String(Math.max(0, num - 1)))}
            className="flex items-center justify-center w-9 h-9 shrink-0 text-slate-500 hover:text-white hover:bg-emerald-500 active:bg-emerald-600 transition-colors text-lg font-black select-none"
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <input
            id={`scoring-${fieldKey}`}
            name={`scoring-${fieldKey}`}
            aria-label={label}
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full min-w-0 text-center bg-transparent font-black text-slate-800 focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onPointerDown={e => e.preventDefault()}
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

      {/* ── League Identity ─────────────────────────────────────────────
          Sits at the top: league name input + share link */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <Pencil className="w-6 h-6 text-slate-500" /> League Identity
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="settings-league-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">League Name</label>
            <input
              id="settings-league-name"
              name="leagueName"
              type="text"
              value={settings.leagueName || ''}
              onChange={(e) => updateSettings({ leagueName: e.target.value })}
              placeholder="My Sweepstakes"
              maxLength={60}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2.5 font-black text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
            />
            <p className="text-xs text-slate-500 font-medium mt-1">Shown in the league dropdown and share link.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-slate-700 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-slate-500" /> Share Your League
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Send this link so others can view standings in real-time.
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm shrink-0 ${
                copySuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? 'Link Copied!' : 'Copy Viewer Link'}
            </button>
          </div>
        </div>
      </div>

      {/* ── League Options (the four toggles) ───────────────────────────
          Moved above Managers. Wooden Spoon and Kid Awards are
          sweepstakes-only and hide when fantasy mode is on. */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <SettingsIcon className="w-6 h-6 text-slate-500" /> League Options
        </h2>

        <div className="space-y-4">

          {/* Wooden Spoon — sweepstakes only */}
          {!fantasyMode && (
            <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
              <div>
                <span className="font-black text-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Wooden Spoon Award
                </span>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Give a special award to the manager who finishes last.</p>
              </div>
              <button
                onClick={() => updateSettings({ woodenSpoon: !settings.woodenSpoon })}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${settings.woodenSpoon ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${settings.woodenSpoon ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {/* Kid Awards — sweepstakes only */}
          {!fantasyMode && (
            <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-black text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-indigo-500" /> Kid Awards
                  </span>
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
                        id={`kid-awards-type-${opt}`}
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
          )}

          {/* Auto Sync — kept for both modes (match scores are still useful for fantasy stats) */}
          <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
            <div>
              <span className="font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" /> Auto-Sync Scores
              </span>
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
                <span className="font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> Fantasy Mode (Roto)
                </span>
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

            {/* Picks per category — only visible when fantasy mode is ON.
                Range is locked to MIN..MAX (3-6). The "+" button is also
                blocked if bumping it up would put the cap below current
                member count — the commish has to drop managers first. */}
            {settings.fantasyMode && (
              <div className="mt-4 pt-4 border-t border-purple-200 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-black text-slate-700 text-sm">
                      Picks per Category
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      How many teams each manager assigns to each of the 4 stats.
                      Range {MIN_PICKS_PER_CATEGORY}–{MAX_PICKS_PER_CATEGORY}, default {DEFAULT_PICKS_PER_CATEGORY}.
                    </p>
                  </div>
                  <div className="flex items-center bg-white border-2 border-purple-200 rounded-lg overflow-hidden shrink-0">
                    <button
                      type="button"
                      disabled={cantDecreasePpc}
                      onClick={() => updateSettings({
                        fantasyPicksPerCategory: Math.max(
                          MIN_PICKS_PER_CATEGORY,
                          currentPicksPerCategory - 1
                        )
                      })}
                      className="w-9 h-9 flex items-center justify-center text-purple-600 hover:bg-purple-100 transition-colors text-lg font-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label="Decrease picks per category"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-black text-purple-800 text-lg">
                      {currentPicksPerCategory}
                    </span>
                    <button
                      type="button"
                      disabled={cantIncreasePpc}
                      onClick={() => updateSettings({
                        fantasyPicksPerCategory: Math.min(
                          MAX_PICKS_PER_CATEGORY,
                          currentPicksPerCategory + 1
                        )
                      })}
                      className="w-9 h-9 flex items-center justify-center text-purple-600 hover:bg-purple-100 transition-colors text-lg font-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label="Increase picks per category"
                      title={
                        currentPicksPerCategory >= MAX_PICKS_PER_CATEGORY
                          ? `Maximum is ${MAX_PICKS_PER_CATEGORY}`
                          : members.length > capAtNextPpc
                            ? `Remove managers down to ${capAtNextPpc} first`
                            : ''
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Cap explainer — surfaces the current cap and why it might
                    be blocked from going up, so the commish isn't surprised. */}
                <div className="bg-white/70 border border-purple-200 rounded-lg p-2.5">
                  <p className="text-[11px] text-slate-600 font-medium leading-snug">
                    <span className="font-black text-purple-800">Manager cap at this setting: {memberCap}.</span>
                    {' '}Higher picks/category = lower cap (3 picks → 16 mgrs, 4 → 12, 5 or 6 → 8)
                    so each stat category has enough teams behind it to be meaningful.
                    {currentPicksPerCategory < MAX_PICKS_PER_CATEGORY && members.length > capAtNextPpc && (
                      <>
                        {' '}<span className="font-black text-rose-700">
                          To bump this to {nextPicksPerCategory}, drop managers to {capAtNextPpc} first.
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

      {/* ── Managers ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <Users className="w-6 h-6 text-slate-500" /> Managers
          <span className="ml-auto text-sm font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full normal-case tracking-normal">
            {members.length}
          </span>
        </h2>
        <div className="space-y-2 mb-4">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
              <input
                id={`member-name-${member.id}`}
                name={`member-name-${member.id}`}
                aria-label={`Manager ${member.name || 'unnamed'} display name`}
                type="text"
                value={member.name}
                onChange={e => handleUpdateMember(member.id, 'name', e.target.value)}
                className="flex-1 bg-transparent font-bold text-slate-800 focus:outline-none text-sm sm:text-base"
                placeholder="Manager name"
              />
              {!fantasyMode && (
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors shrink-0">
                  <input
                    id={`member-iskid-${member.id}`}
                    name={`member-iskid-${member.id}`}
                    type="checkbox"
                    checked={member.isKid}
                    onChange={e => handleUpdateMember(member.id, 'isKid', e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-500 rounded border-slate-300 focus:ring-indigo-400 cursor-pointer"
                  />
                  Kid
                </label>
              )}
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
          disabled={members.length >= memberCap}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            members.length >= memberCap && fantasyMode
              ? `Cap is ${memberCap} at ${currentPicksPerCategory} picks/category. Lower picks/category to raise the cap.`
              : ''
          }
        >
          <PlusCircle className="w-4 h-4" />
          {members.length >= memberCap
            ? `Manager Limit Reached (${memberCap})`
            : 'Add New Manager'}
        </button>
      </div>

      {/* ── Sweepstakes Rules ───────────────────────────────────────────
          Hidden entirely when fantasy mode is on (Roto doesn't use
          custom point scoring). */}
      {!fantasyMode && (
        <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
          <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
            <SettingsIcon className="w-6 h-6 text-slate-500" /> Sweepstakes Rules
          </h2>

          <div className="space-y-6">

            {/* Custom scoring */}
            <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
              <div>
                <span className="font-black text-slate-800 flex items-center gap-2 text-lg">
                  <Calculator className="w-5 h-5 text-indigo-600" /> Custom Scoring System
                </span>
                <p className="text-sm text-slate-500 font-medium mt-1">Define how many points managers receive based on their team's performance.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-black text-emerald-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Group Stage</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ScoreInput label="Win" stageGroup="group" field="win" value={activeScoring.group.win} onChange={(v) => handleScoringUpdate('group', null, 'win', v)} />
                  <ScoreInput label="Draw" stageGroup="group" field="draw" value={activeScoring.group.draw} onChange={(v) => handleScoringUpdate('group', null, 'draw', v)} />
                  <ScoreInput label="Loss" stageGroup="group" field="loss" value={activeScoring.group.loss} onChange={(v) => handleScoringUpdate('group', null, 'loss', v)} />
                  <ScoreInput label="Top of Group Bonus" stageGroup="group" field="topOfGroup" value={activeScoring.group.topOfGroup || 0} onChange={(v) => handleScoringUpdate('group', null, 'topOfGroup', v)} />
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
                          <ScoreInput label="Reg Win" stageGroup="ko" stage={stage.id} field="win" value={sData.win} onChange={(v) => handleScoringUpdate('ko', stage.id, 'win', v)} />
                          <ScoreInput label="Reg Loss" stageGroup="ko" stage={stage.id} field="loss" value={sData.loss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'loss', v)} />
                          {sData.etWin !== undefined && (
                            <ScoreInput label="ET Win" stageGroup="ko" stage={stage.id} field="etWin" value={sData.etWin} onChange={(v) => handleScoringUpdate('ko', stage.id, 'etWin', v)} />
                          )}
                          {sData.etLoss !== undefined && (
                            <ScoreInput label="ET Loss" stageGroup="ko" stage={stage.id} field="etLoss" value={sData.etLoss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'etLoss', v)} />
                          )}
                          {sData.penWin !== undefined && (
                            <ScoreInput label="Pen Win" stageGroup="ko" stage={stage.id} field="penWin" value={sData.penWin} onChange={(v) => handleScoringUpdate('ko', stage.id, 'penWin', v)} />
                          )}
                          {sData.penLoss !== undefined && (
                            <ScoreInput label="Pen Loss" stageGroup="ko" stage={stage.id} field="penLoss" value={sData.penLoss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'penLoss', v)} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Zone ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-red-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-red-700 mb-4 flex items-center gap-2 uppercase tracking-wide border-b-2 border-red-50 pb-4">
          <ShieldAlert className="w-6 h-6 text-red-500" /> Danger Zone
        </h2>
        <div className="flex flex-col gap-3">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset Match Data
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm font-bold text-amber-800 flex-1">Reset all match scores and eliminations? Your managers, team assignments, and settings will not be affected.</span>
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
