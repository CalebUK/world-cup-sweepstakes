import React, { useState } from 'react';
import { Users, Trash2, PlusCircle, Settings as SettingsIcon, Calculator, Clock, AlertTriangle, RotateCcw, Share2, CheckCircle, Copy, Trophy, ShieldAlert } from 'lucide-react';
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
        .catch(() => { /* silent fail if blocked */ });
    }
  };

  const confirmReset = () => {
    handleResetData();
    setShowResetConfirm(false);
  };

  const confirmHardReset = () => {
    if (handleHardReset) {
      handleHardReset();
    }
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
        [stage]: { ...updatedScoring.ko[stage], [field]: numVal }
      };
    }
    updateSettings({ scoring: updatedScoring });
  };

  const ScoreInput = ({ label, value, onChange }) => (
    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-1 flex-1 min-w-[70px] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-full min-w-[20px] text-center bg-transparent font-black text-slate-800 focus:outline-none" />
    </div>
  );

  const activeScoring = settings.scoring || DEFAULT_SCORING;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-8 relative">
      
      {/* SHARE LEAGUE BANNER */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl shadow-md border-2 border-blue-200 p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
          <Share2 className="w-32 h-32 text-blue-600" />
        </div>
        <h2 className="text-xl font-black text-blue-900 mb-2 flex items-center gap-2 uppercase tracking-wide relative z-10">
          <Share2 className="w-6 h-6 text-blue-600" /> Share Your League
        </h2>
        <p className="text-blue-800/80 font-medium mb-6 relative z-10 max-w-2xl">
          Invite your friends, family, or colleagues to join your sweepstakes! When they use this link, they will be added as <strong>Viewers</strong>. They can track the live standings and brackets, but they cannot edit scores or rules.
        </p>
        
        <button 
          onClick={handleCopyLink}
          className="relative z-10 flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 group"
        >
          {copySuccess ? <CheckCircle className="w-6 h-6 text-green-300" /> : <Copy className="w-6 h-6 group-hover:scale-110 transition-transform" />}
          {copySuccess ? 'Link Copied to Clipboard!' : 'Copy Invite Link'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6 overflow-hidden">
        <h2 className="text-xl font-black text-emerald-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <Trophy className="w-6 h-6 text-slate-500" /> League Identity
        </h2>
        <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">League Name</label>
            <input
                type="text"
                value={settings.leagueName || ''}
                onChange={(e) => updateSettings({ leagueName: e.target.value })}
                placeholder="e.g. Knoxville Family Sweepstakes"
                className="w-full font-black text-slate-800 text-lg bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 focus:ring-0 focus:border-emerald-500 focus:bg-white transition-colors"
            />
        </div>
      </div>

      {/* MEMBERS MANAGEMENT SECTION */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6 border-b-2 border-emerald-50 pb-4">
          <h2 className="text-xl font-black text-emerald-800 flex items-center gap-2 uppercase tracking-wide">
            <Users className="w-6 h-6 text-slate-500" /> Sweepstakes Managers
          </h2>
          <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-md">{members.length} Total</span>
        </div>
        
        <div className="space-y-4 bg-slate-50/50 p-2 sm:p-0 rounded-xl">
          {members.map((member, idx) => (
            <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-emerald-300">
              <div className="hidden sm:block font-black text-slate-400 text-lg w-6">{idx + 1}.</div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1 sm:hidden">Manager Name</label>
                <input 
                  type="text" 
                  value={member.name} 
                  onChange={(e) => handleUpdateMember(member.id, 'name', e.target.value)}
                  className={`w-full font-black text-slate-800 text-lg bg-slate-50 sm:bg-transparent border-2 rounded-lg px-3 py-2 sm:px-2 focus:ring-0 focus:bg-white sm:focus:bg-slate-50 transition-colors ${
                    {members.filter(m => m.name.trim() === member.name.trim() && m.id !== member.id).length > 0
                      <p className="text-[10px] text-amber-600 font-bold mt-1 ml-1">⚠️ Duplicate name</p>
                    )}
                      ? 'border-amber-400 focus:border-amber-500 bg-amber-50'
                      : 'border-slate-100 sm:border-transparent focus:border-emerald-500'
                  }`}
                  placeholder="e.g. Dad"
                />
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 pt-3 mt-1 sm:mt-0">
                <label className="flex items-center gap-2 cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 px-4 py-2.5 sm:px-3 sm:py-2 rounded-lg border border-emerald-100 sm:border-slate-200 sm:hover:border-emerald-300 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={member.isKid} 
                    onChange={(e) => handleUpdateMember(member.id, 'isKid', e.target.checked)}
                    className="w-5 h-5 sm:w-4 sm:h-4 text-emerald-600 rounded border-emerald-300 sm:border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-bold text-emerald-800 sm:text-slate-700 sm:uppercase sm:text-xs sm:tracking-wider text-sm">Kid</span>
                </label>
                <button 
                  onClick={() => handleDeleteMember(member.id)}
                  disabled={members.length <= 1}
                  className="text-red-400 hover:text-white bg-white hover:bg-red-500 border border-slate-200 hover:border-red-500 p-2.5 sm:p-2 rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-red-400 disabled:hover:border-slate-200 shadow-sm sm:shadow-none"
                  title="Remove Manager"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          <button 
  onClick={handleAddMember}
  disabled={members.length >= 24}
  className="w-full mt-4 py-4 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-emerald-300"
>
  <PlusCircle className="w-5 h-5" /> 
  {members.length >= 24 ? 'Manager Limit Reached (24)' : 'Add New Manager'}
</button>
        </div>
      </div>

      {/* SCORING & RULES SECTION */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <SettingsIcon className="w-6 h-6 text-slate-500" /> Sweepstakes Rules
        </h2>
        
        <div className="space-y-6">

          <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
             <div>
               <label className="font-black text-slate-800 flex items-center gap-2 text-lg">
                 <Calculator className="w-5 h-5 text-indigo-600" /> Custom Scoring System
               </label>
               <p className="text-sm text-slate-500 font-medium mt-1">Define exactly how many points your family members receive based on their team's performance.</p>
             </div>

             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
               <h4 className="font-black text-emerald-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Group Stage</h4>
               <div className="flex flex-wrap gap-3">
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
                       <div className="flex flex-wrap gap-2 flex-1">
                         <ScoreInput label="Reg Win" value={sData.win} onChange={(v) => handleScoringUpdate('ko', stage.id, 'win', v)} />
                         <ScoreInput label="Reg Loss" value={sData.loss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'loss', v)} />
                         <ScoreInput label="Pen Win" value={sData.penWin} onChange={(v) => handleScoringUpdate('ko', stage.id, 'penWin', v)} />
                         <ScoreInput label="Pen Loss" value={sData.penLoss} onChange={(v) => handleScoringUpdate('ko', stage.id, 'penLoss', v)} />
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
            <input 
              type="checkbox" 
              id="autoSync" 
              checked={settings.autoSync || false} 
              onChange={(e) => updateSettings({ autoSync: e.target.checked })}
              className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <label htmlFor="autoSync" className="font-black text-slate-800 cursor-pointer text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" /> Live ESPN Score Sync
              </label>
              <p className="text-sm text-slate-500 font-medium mt-1">
                <strong>ON:</strong> Scores are synced automatically from ESPN every 5 minutes — everyone in this league sees the same live data. Only the host account polls ESPN and writes the scores.<br/>
                <strong>OFF:</strong> You enter and manage scores manually yourself in the Matches tab.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
            <input 
              type="checkbox" 
              id="woodenSpoon" 
              checked={settings.woodenSpoon !== false} 
              onChange={(e) => updateSettings({ woodenSpoon: e.target.checked })}
              className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <label htmlFor="woodenSpoon" className="font-black text-slate-800 cursor-pointer text-lg">Wooden Spoon Prize</label>
              <p className="text-sm text-slate-500 font-medium mt-1">Awards a Wooden Spoon 🥄 to the manager in dead last.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
            <input 
              type="checkbox" 
              id="kidAwards" 
              checked={settings.kidAwards !== false} 
              onChange={(e) => updateSettings({ kidAwards: e.target.checked })}
              className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="flex-1">
              <label htmlFor="kidAwards" className="font-black text-slate-800 cursor-pointer text-lg">Kids Leaderboard</label>
              <p className="text-sm text-slate-500 mb-4 font-medium mt-1">Show a separate awards podium just for the younger managers.</p>
              
              {settings.kidAwards !== false && (
                <div className="ml-2 pl-4 border-l-4 border-emerald-200 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="radio" name="kidAwardsType" checked={settings.kidAwardsType === 'top3'} onChange={() => updateSettings({ kidAwardsType: 'top3' })} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer" />
                    Top 3 Only
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="radio" name="kidAwardsType" checked={settings.kidAwardsType === 'all'} onChange={() => updateSettings({ kidAwardsType: 'all' })} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer" />
                    Show All Kids
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* League Debug Info */}
       <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-4 sm:p-5">
         <h2 className="text-sm font-black text-slate-600 flex items-center gap-2 uppercase tracking-wide mb-3">
           🔧 Debug Info
         </h2>
         <div className="space-y-2">
           <div>
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firebase League ID</label>
             <code className="block text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg mt-1 break-all select-all font-mono">
               {userUid}
             </code>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">This is the Firestore document ID for this league. Use it to look up data directly in the Firebase Console.</p>
        </div>
      </div>
      
      {/* DANGER ZONE - MASTER DATA RESET */}
      <div className="bg-red-50 rounded-xl shadow-md border-2 border-red-200 p-4 sm:p-6 overflow-hidden">
        <h2 className="text-xl font-black text-red-800 flex items-center gap-2 uppercase tracking-wide border-b-2 border-red-100 pb-4 mb-4">
          <AlertTriangle className="w-6 h-6" /> Danger Zone
        </h2>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-red-800 text-sm uppercase tracking-wide">Reset League Data</h3>
              <p className="text-xs text-red-600 font-medium mt-1">Erase all scores and allocations in this league, but keep your managers.</p>
            </div>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 w-full sm:w-auto justify-center shrink-0"
            >
              <RotateCcw className="w-5 h-5" /> Reset Data
            </button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-red-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-red-500 text-sm uppercase tracking-wide flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Nuclear App Reset</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Is your app glitching? This will completely clear your browser's memory and un-join all leagues.</p>
            </div>
            <button 
              onClick={() => setShowHardResetConfirm(true)}
              className="bg-red-900 hover:bg-red-800 border border-red-700 text-white font-black px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 w-full sm:w-auto justify-center shrink-0"
            >
              Force Reset App
            </button>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border-4 border-red-600">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Reset All Data?</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">🚨 WARNING: This will permanently erase all match scores, team assignments, and custom rules for this league! You cannot undo this.</p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-4">
                <button onClick={confirmReset} className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-md">Yes, Reset Everything</button>
                <button onClick={() => setShowResetConfirm(false)} className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHardResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border-4 border-red-600 text-white">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-900/50 text-red-500 rounded-full flex items-center justify-center border border-red-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-red-500 uppercase tracking-wide">Nuclear Reset?</h3>
                <p className="text-sm text-slate-300 mt-2 font-medium">This will wipe your browser's local storage and force a hard refresh. You will need to rejoin your active leagues using their invite links.</p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-4">
                <button onClick={confirmHardReset} className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-md border border-red-500">Nuclear Clear & Reload</button>
                <button onClick={() => setShowHardResetConfirm(false)} className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-slate-600">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
