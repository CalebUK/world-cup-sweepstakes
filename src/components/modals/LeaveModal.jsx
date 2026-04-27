import React from 'react';
import { LogOut } from 'lucide-react';

export const LeaveModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border-4 border-red-600">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
          <LogOut className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Leave League?</h3>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Are you sure you want to remove this league from your list? You can always rejoin later with the invite link.
          </p>
        </div>
        <div className="flex w-full gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-md"
          >
            Leave League
          </button>
        </div>
      </div>
    </div>
  </div>
);
