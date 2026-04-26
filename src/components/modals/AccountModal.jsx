import React from 'react';
import { X, User, Mail, CheckCircle } from 'lucide-react';

export const AccountModal = ({
  user, isAccountLinked, authEmail, setAuthEmail, authMessage, setAuthMessage, 
  setShowAccountModal, handleGoogleLogin, handleMagicLink, handleLogout
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md border-4 border-slate-200 relative">
        <button onClick={() => { setShowAccountModal(false); setAuthMessage(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
            {isAccountLinked && user?.photoURL ? (
               <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <User className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Your Account</h3>
            {!isAccountLinked && (
              <p className="text-sm text-slate-500 mt-1 font-medium px-2">
                You are currently playing as an <strong>Anonymous Guest</strong>. Link an account below to save your leagues and access them on any device!
              </p>
            )}
          </div>
        </div>

        {authMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-bold text-center ${
            authMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            authMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {authMessage.text}
          </div>
        )}

        {isAccountLinked ? (
          <div className="space-y-4 text-center mt-2">
            <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-black uppercase tracking-wider text-sm">Account Securely Linked</p>
                <p className="text-xs font-bold opacity-80 mt-1">{user.email || 'Via Social Provider'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline mt-4 px-4 py-2">
              Sign Out / Switch Account
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 pb-2">Link Social Account</h4>
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-black py-3.5 rounded-xl transition-all shadow-sm hover:shadow">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 border-t border-slate-200"></div>
              <span className="relative bg-white px-4 text-xs font-black text-slate-300 uppercase tracking-widest">OR</span>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Send Email Magic Link</h4>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="Enter your email address" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
                  />
                </div>
                <button onClick={handleMagicLink} disabled={!authEmail} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-md uppercase tracking-wider transition-all hover:-translate-y-0.5">
                  Send Link
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed px-4 mt-2">
                We'll send a secure link to your inbox. Click it to instantly link your devices. No passwords required!
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Admin Developer Tool:</p>
          <code className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded selection:bg-indigo-200 break-all">
            UID: {user?.uid || 'Loading...'}
          </code>
        </div>
      </div>
    </div>
  );
};