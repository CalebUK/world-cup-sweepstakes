import React from 'react';
import { X, CheckCircle } from 'lucide-react';

export const WelcomeModal = ({ dontShowAgain, setDontShowAgain, handleCloseWelcome }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-4 border-emerald-600 relative flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-green-800 to-emerald-700 text-white p-4 sm:p-5 flex justify-between items-center shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#fff_20px,#fff_40px)] pointer-events-none transform -skew-x-12 scale-150"></div>
          <h2 className="text-lg sm:text-2xl font-black flex items-center gap-3 relative z-10">
            <img src="/logos/world-cup.svg" className="w-6 h-6 sm:w-8 sm:h-8" alt="" onError={(e) => e.target.style.display='none'} /> 
            World Cup Sweepstakes
          </h2>
          <button onClick={handleCloseWelcome} className="text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors relative z-10">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        
        <div className="p-4 sm:p-5 space-y-3 text-slate-700 overflow-y-auto">
          <p className="text-base sm:text-lg font-medium leading-relaxed">Welcome to a place to help to keep track of your World Cup Sweepstakes with your Friends, Family, Colleagues, or complete strangers!</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mt-2 space-y-2 sm:space-y-3">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm border-b border-slate-200 pb-2">How It Works:</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Participants:</strong> Head over to the Admin Settings to add all sweepstakes participants.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Teams:</strong> Once all teams have been drawn head to the Teams tab to assign everyone.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Live Scoring:</strong> You earn points every time your teams win, draw, score goals, or keep a clean sheet. Make sure to check the settings tab to customise your scoring.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Matches:</strong> As matches finish the groups and knockout tabs will automatically update and populate the routes for the winners.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Fantasy:</strong> If fantasy is more your style head over to the settings tab and toggle the option for Roto based scoring.</span></li>
            </ul>
          </div>
        </div>
        
        <div className="px-4 sm:px-5 pb-4 shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed text-center">
            If you are facing any issues feel free to email me at{' '}
            <a href="mailto:calebthill@gmail.com" className="font-bold underline hover:text-amber-900">
              worldcupsweepstakes2026@gmail.com
            </a>
            , but please be nice as this is very much a vibe coded learning experience hobby for me 😊
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer" />
            <span className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors select-none">Don't show this again</span>
          </label>
          <button onClick={handleCloseWelcome} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 uppercase tracking-wider">
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
};
