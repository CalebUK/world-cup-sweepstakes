import React from 'react';
import { Users, Trash2, PlusCircle, Settings as SettingsIcon } from 'lucide-react';

export const SettingsTab = ({ settings, updateSettings, members, handleAddMember, handleUpdateMember, handleDeleteMember }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* General Rules */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-100 overflow-hidden">
        <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="font-black text-emerald-800 uppercase tracking-wide">General Rules</h3>
        </div>
        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={settings.woodenSpoon !== false} 
              onChange={(e) => updateSettings({ woodenSpoon: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Track Wooden Spoon (Last Place)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={settings.kidAwards !== false} 
              onChange={(e) => updateSettings({ kidAwards: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Separate Kids Leaderboard</span>
          </label>
        </div>
      </div>

      {/* Members Management - COMPLETELY RESPONSIVE FOR MOBILE */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <h3 className="font-black text-slate-800 uppercase tracking-wide">Sweepstakes Managers</h3>
          </div>
          <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{members.length} Total</span>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {members.map(member => (
            <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-emerald-300">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Manager Name</label>
                <input 
                  type="text" 
                  value={member.name} 
                  onChange={(e) => handleUpdateMember(member.id, 'name', e.target.value)}
                  className="w-full font-black text-slate-800 text-lg bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 focus:ring-0 focus:border-emerald-500 focus:bg-white transition-colors"
                  placeholder="e.g. Dad"
                />
              </div>
              
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:pt-5 border-t sm:border-t-0 border-slate-100 pt-3 mt-1 sm:mt-0">
                <label className="flex items-center gap-2 cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={member.isKid} 
                    onChange={(e) => handleUpdateMember(member.id, 'isKid', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-emerald-800 text-sm">Kid/Junior</span>
                </label>
                
                <button 
                  onClick={() => handleDeleteMember(member.id)}
                  disabled={members.length <= 1}
                  className="text-red-400 hover:text-white bg-white hover:bg-red-500 border border-slate-200 hover:border-red-500 p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-red-400 disabled:hover:border-slate-200 shadow-sm"
                  title="Remove Manager"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAddMember}
            className="w-full py-4 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add New Manager
          </button>
        </div>
      </div>

    </div>
  );
};