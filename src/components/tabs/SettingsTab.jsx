import React from 'react';
import { Settings, Calculator, Users, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_SCORING, KNOCKOUT_STAGES } from '../../config/data.js';

export const SettingsTab = ({ 
  settings, 
  updateSettings, 
  members, 
  handleAddMember, 
  handleUpdateMember, 
  handleDeleteMember 
}) => {
  const handleScoringUpdate = (stageGroup, stage, field, value) => {
    const numVal = parseInt(value) || 0;
    const currentScoring = settings.scoring || DEFAULT_SCORING;
    const updatedScoring = { ...currentScoring };
    
    if (stageGroup === 'group') {
      updatedScoring.group = { ...updatedScoring.group, [field]: numVal };
    } else if (stageGroup === 'bonus') {
      updatedScoring.bonus = { ...(updatedScoring.bonus || { perGoal: 0, cleanSheet: 0 }), [field]: numVal };
    } else {
      updatedScoring.ko = {
        ...updatedScoring.ko,
        [stage]: { ...updatedScoring.ko[stage], [field]: numVal }
      };
    }
    updateSettings({ scoring: updatedScoring });
  };

  const ScoreInput = ({ label, value, onChange }) => (
    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-1 flex-1 min-w-[70px] focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-full min-w-[20px] text-center bg-transparent font-black text-slate-800 focus:outline-none" />
    </div>
  );

  const activeScoring = settings.scoring || DEFAULT_SCORING;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      
      <div className="bg-white rounded-xl shadow-md border-2 border-green-100 p-6">
        <h2 className="text-xl font-black text-green-800 mb-6 flex items-center gap-2 uppercase tracking-wide border-b-2 border-green-50 pb-4">
          <Settings className="w-6 h-6 text-slate-500" /> Sweepstakes Rules
        </h2>
        
        <div className="space-y-6">

          <div className="flex flex-col gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200 hover:border-green-300 transition-colors">
             <div>
               <label className="font-black text-slate-800 flex items-center gap-2 text-lg">
                 <Calculator className="w-5 h-5 text-indigo-600" /> Custom Scoring System
               </label>
               <p className="text-sm text-slate-500 font-medium mt-1">Define exactly how many points your family members receive based on their team's performance.</p>
             </div>

             {/* Bonus Scoring */}
             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
               <h4 className="font-black text-green-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Bonus Points (All Matches)</h4>
               <div className="flex flex-wrap gap-3">
                 <ScoreInput label="Points Per Goal" value={activeScoring.bonus?.perGoal || 0} onChange={(v) => handleScoringUpdate('bonus', null, 'perGoal', v)} />
                 <ScoreInput label="Clean Sheet Points" value={activeScoring.bonus?.cleanSheet || 0} onChange={(v) => handleScoringUpdate('bonus', null, 'cleanSheet', v)} />
               </div>
             </div>

             {/* Group Stage Scoring */}
             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
               <h4 className="font-black text-green-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Group Stage</h4>
               <div className="flex flex-wrap gap-3">
                 <ScoreInput label="Win" value={activeScoring.group.win} onChange={(v) => handleScoringUpdate('group', null, 'win', v)} />
                 <ScoreInput label="Draw" value={activeScoring.group.draw} onChange={(v) => handleScoringUpdate('group', null, 'draw', v)} />
                 <ScoreInput label="Loss" value={activeScoring.group.loss} onChange={(v) => handleScoringUpdate('group', null, 'loss', v)} />
                 <ScoreInput label="Top of Group Bonus" value={activeScoring.group.topOfGroup || 0} onChange={(v) => handleScoringUpdate('group', null, 'topOfGroup', v)} />
               </div>
             </div>

             {/* Knockout Stage Scoring */}
             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
               <h4 className="font-black text-green-700 mb-3 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">Knockout Stages</h4>
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

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-green-300 transition-colors">
            <input 
              type="checkbox" 
              id="woodenSpoon" 
              checked={settings.woodenSpoon} 
              onChange={(e) => updateSettings({ woodenSpoon: e.target.checked })}
              className="mt-1 w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
            />
            <div>
              <label htmlFor="woodenSpoon" className="font-black text-slate-800 cursor-pointer text-lg">Wooden Spoon Prize</label>
              <p className="text-sm text-slate-500 font-medium mt-1">Awards a Wooden Spoon 🥄 to the manager in dead last.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-green-300 transition-colors">
            <input 
              type="checkbox" 
              id="kidAwards" 
              checked={settings.kidAwards} 
              onChange={(e) => updateSettings({ kidAwards: e.target.checked })}
              className="mt-1 w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
            />
            <div className="flex-1">
              <label htmlFor="kidAwards" className="font-black text-slate-800 cursor-pointer text-lg">Kids Leaderboard</label>
              <p className="text-sm text-slate-500 mb-4 font-medium mt-1">Show a separate awards podium just for the younger managers.</p>
              
              {settings.kidAwards && (
                <div className="ml-2 pl-4 border-l-4 border-green-200 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="kidAwardsType" 
                      checked={settings.kidAwardsType === 'top3'}
                      onChange={() => updateSettings({ kidAwardsType: 'top3' })}
                      className="text-green-600 focus:ring-green-500 w-4 h-4"
                    />
                    Top 3 Only
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="kidAwardsType" 
                      checked={settings.kidAwardsType === 'all'}
                      onChange={() => updateSettings({ kidAwardsType: 'all' })}
                      className="text-green-600 focus:ring-green-500 w-4 h-4"
                    />
                    Show All Kids
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-green-100 p-6">
        <div className="flex items-center justify-between mb-6 border-b-2 border-green-50 pb-4">
          <h2 className="text-xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
            <Users className="w-6 h-6 text-indigo-500" /> Manage Squad
          </h2>
          <button 
            onClick={handleAddMember}
            className="flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-2 px-4 rounded-lg transition-colors text-sm uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Add Manager
          </button>
        </div>

        <div className="space-y-3">
          {members.map((member, idx) => (
            <div key={member.id} className="flex items-center gap-4 p-3 bg-slate-50 border-2 border-slate-100 rounded-lg focus-within:border-green-300 focus-within:bg-white transition-colors">
              <div className="font-black text-slate-400 text-lg w-6">{idx + 1}.</div>
              
              <input 
                type="text" 
                value={member.name}
                onChange={(e) => handleUpdateMember(member.id, 'name', e.target.value)}
                className="flex-1 p-2 border-2 border-transparent bg-transparent rounded font-black text-slate-800 focus:outline-none focus:border-green-500 text-lg"
                placeholder="Manager Name"
              />

              <label className="flex items-center gap-2 cursor-pointer min-w-[100px] bg-white px-3 py-2 border border-slate-200 rounded-lg hover:border-green-300 transition-colors">
                <input 
                  type="checkbox" 
                  checked={member.isKid}
                  onChange={(e) => handleUpdateMember(member.id, 'isKid', e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500"
                />
                <span className="font-bold text-slate-700 uppercase text-xs tracking-wider">Kid Status</span>
              </label>

              <button 
                onClick={() => handleDeleteMember(member.id)}
                disabled={members.length <= 1}
                className={`p-2 rounded-lg transition-colors border-2 ${members.length <= 1 ? 'border-transparent text-slate-300 cursor-not-allowed' : 'border-transparent text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200'}`}
                title={members.length <= 1 ? "Cannot sack last manager" : "Sack Manager"}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};