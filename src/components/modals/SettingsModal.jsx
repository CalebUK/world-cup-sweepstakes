import React from 'react';
import { X, Settings } from 'lucide-react';
import { SettingsTab } from '../tabs/SettingsTab.jsx';

export const SettingsModal = ({
  settings,
  updateSettings,
  members,
  handleAddMember,
  handleUpdateMember,
  handleDeleteMember,
  handleResetData,
  handleHardReset,
  userUid,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-green-800 relative">
      <div className="sticky top-0 z-20 bg-white border-b-2 border-slate-100 p-4 flex justify-between items-center shadow-sm">
        <h2 className="text-xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
          <Settings className="w-6 h-6 text-slate-500" /> Sweepstakes Rules & Settings
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-2 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6">
        <SettingsTab
          settings={settings}
          updateSettings={updateSettings}
          members={members}
          handleAddMember={handleAddMember}
          handleUpdateMember={handleUpdateMember}
          handleDeleteMember={handleDeleteMember}
          handleResetData={handleResetData}
          handleHardReset={handleHardReset}
          userUid={userUid}
        />
      </div>
    </div>
  </div>
);
