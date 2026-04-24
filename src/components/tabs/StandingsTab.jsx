import React from 'react';
import { Users, Trash2, PlusCircle, Settings as SettingsIcon, Globe, Calculator, Clock } from 'lucide-react';
import { TIMEZONES, KNOCKOUT_STAGES, DEFAULT_SCORING } from '../../config/data.js';

export const SettingsTab = ({ settings, updateSettings, members, handleAddMember, handleUpdateMember, handleDeleteMember }) => {
  
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';

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
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      
      {/* SCORING & RULES SECTION */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 sm:p-6">
        <h2 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-emerald-50 pb-4">
          <SettingsIcon className="w-6 h-6 text-slate-500" /> Sweepstakes Rules
        </h2>
        
        <div className="space-y-6">

          {/* Timezone Configuration */}
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
             <label className="font-black text-slate-800 cursor-pointer text-lg flex items-center gap-2">
               <Globe className="w-5 h-5 text-blue-600" /> Match Display Timezone
             </label>
             <p className="text-sm text-slate-500 font-medium -mt-1 mb-2">Select your local timezone so kick-off times align perfectly. Useful for family across the UK and US!</p>
             <select 
               value={settings.timezone || defaultTimezone}
               onChange={(e) => updateSettings({ timezone: e.target.value })}
               className="p-3 border-2 border-slate-300 rounded-lg font-bold text-slate-700 focus:border-emerald-500 focus:outline-none bg-white w-full max-w-md"
             >
               {TIMEZONES.map(tz => (
                 <option key={tz.id} value={tz.id}>{tz.label}</option>
               ))}
             </select>
          </div>

          {/* Custom Scoring Configuration */}
          <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
             <div>
               <label className="font-black text-slate-800 flex items-center gap-2 text-lg">
                 <Calculator className="w-5 h-5 text-indigo-600" /> Custom Scoring System
               </label>
               <p className="text-sm text-slate-500 font-medium mt-1">Define exactly how many points your family members receive based on their team's performance.</p>
             </div>

             {/* Group Stage Scoring */}
             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
               <h4 className="font-black text-emerald-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Group Stage</h4>
               <div className="flex flex-wrap gap-3">
                 <ScoreInput label="Win" value={activeScoring.group.win} onChange={(v) => handleScoringUpdate('group', null, 'win', v)} />
                 <ScoreInput label="Draw" value={activeScoring.group.draw} onChange={(v) => handleScoringUpdate('group', null, 'draw', v)} />
                 <ScoreInput label="Loss" value={activeScoring.group.loss} onChange={(v) => handleScoringUpdate('group', null, 'loss', v)} />
                 <ScoreInput label="Top of Group Bonus" value={activeScoring.group.topOfGroup || 0} onChange={(v) => handleScoringUpdate('group', null, 'topOfGroup', v)} />
               </div>
             </div>

             {/* Knockout Stage Scoring */}
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
                <Clock className="w-5 h-5 text-emerald-600" /> Auto-Sync ESPN Scores
              </label>
              <p className="text-sm text-slate-500 font-medium mt-1">Automatically checks for live goals in the background every 5 minutes while this page is open.</p>
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
                    <input 
                      type="radio" 
                      name="kidAwardsType" 
                      checked={settings.kidAwardsType === 'top3'}
                      onChange={() => updateSettings({ kidAwardsType: 'top3' })}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    Top 3 Only
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="kidAwardsType" 
                      checked={settings.kidAwardsType === 'all'}
                      onChange={() => updateSettings({ kidAwardsType: 'all' })}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    Show All Kids
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MEMBERS MANAGEMENT SECTION (Mobile-Friendly Layout) */}
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
                  className="w-full font-black text-slate-800 text-lg bg-slate-50 sm:bg-transparent border-2 border-slate-100 sm:border-transparent rounded-lg px-3 py-2 sm:px-2 focus:ring-0 focus:border-emerald-500 focus:bg-white sm:focus:bg-slate-50 transition-colors"
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
                  <span className="font-bold text-emerald-800 sm:text-slate-700 sm:uppercase sm:text-xs sm:tracking-wider text-sm">Kid/Junior</span>
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
            className="w-full mt-4 py-4 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add New Manager
          </button>
        </div>
      </div>

    </div>
  );
};