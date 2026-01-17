import React, { useState, useEffect } from 'react';
import { firebaseAuth, db, firebase } from '../services/firebase';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { SchoolSettings } from '../types';

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [isRestrictedEnv, setIsRestrictedEnv] = useState(false);

  useEffect(() => {
    // 1. Proactive Environment Check
    const checkEnvironment = () => {
        try {
            localStorage.setItem('__auth_test__', '1');
            localStorage.removeItem('__auth_test__');
        } catch (e) {
            console.warn("Environment detected as restricted (Storage access blocked).");
            setIsRestrictedEnv(true);
        }
        
        const protocol = window.location.protocol;
        if (!['http:', 'https:', 'chrome-extension:'].includes(protocol)) {
            setIsRestrictedEnv(true);
        }
    };
    checkEnvironment();

    // 2. Load School Settings
    const docRef = db.collection('schoolConfig').doc('settings');
    const unsubscribe = docRef.onSnapshot(
      (docSnap) => {
        if (docSnap.exists) {
          setSettings(docSnap.data() as SchoolSettings);
        }
      },
      (error) => {
        console.warn("Settings sync pending authorization...");
      }
    );
    
    // 3. Catch returning Redirect result
    firebaseAuth.getRedirectResult().then((result) => {
        if (result && result.user) {
            console.log("Redirect success captured.");
        }
    }).catch((err) => {
        if (err.code !== 'auth/operation-not-supported-in-this-environment') {
            console.error("Redirect Fault:", err.message);
        }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await firebaseAuth.signInWithEmailAndPassword(email, password);
      } else {
        await firebaseAuth.createUserWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      let friendlyMessage = 'An unexpected error occurred.';
      switch (err.code) {
        case 'auth/invalid-credential': friendlyMessage = 'Invalid credentials.'; break;
        case 'auth/user-not-found': friendlyMessage = 'Account not found.'; break;
        case 'auth/wrong-password': friendlyMessage = 'Incorrect password.'; break;
        case 'auth/email-already-in-use': friendlyMessage = 'Email already registered.'; break;
        case 'auth/weak-password': friendlyMessage = 'Password is too weak.'; break;
        case 'auth/invalid-email': friendlyMessage = 'Invalid email address.'; break;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      try {
          await firebaseAuth.signInWithPopup(provider);
      } catch (innerErr: any) {
          if (innerErr.code === 'auth/operation-not-supported-in-this-environment' || 
              innerErr.code === 'auth/popup-blocked') {
              console.warn("Popups restricted. Falling back to redirect...");
              await firebaseAuth.signInWithRedirect(provider);
          } else {
              throw innerErr;
          }
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      let friendlyMessage = 'Google authentication failed.';
      
      if (err.code === 'auth/popup-closed-by-user') {
          friendlyMessage = 'Sign-in window was closed.';
      } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
          friendlyMessage = 'Sign-In restricted. Use the "Open Direct Portal" below.';
      }
      
      setError(friendlyMessage);
      setLoading(false);
    }
  };

  const handleBreakout = () => {
      window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 z-50"></div>
      
      <div className="w-full max-w-[1200px] min-h-[100dvh] md:min-h-[80vh] grid grid-cols-1 md:grid-cols-2 bg-slate-900/40 backdrop-blur-3xl md:rounded-[4rem] shadow-[0_100px_100px_-50px_rgba(0,0,0,1)] border-x md:border border-slate-800/50 overflow-hidden z-10">
        
        {/* Left: Branding (Maintaining Desktop dominance on Mobile) */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:p-20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden min-h-[400px] md:min-h-0 border-b md:border-b-0 border-white/5">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.04]"></div>
          
          {/* Enhanced Decorative Glows */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-500/20 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-purple-500/10 rounded-full blur-[120px]"></div>

          <div className="relative z-10">
             <div className="flex items-center gap-4 mb-10 sm:mb-16">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 text-white font-black text-2xl ring-1 ring-white/20">E</div>
                <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-black text-white tracking-[0.4em] uppercase opacity-90 leading-none">Edutec</span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Unified Command</span>
                </div>
             </div>
             
             <h1 className="text-6xl sm:text-8xl md:text-9xl font-black text-white mb-6 leading-[0.8] tracking-tighter uppercase drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                {settings?.schoolName || 'EDUTEC'}
             </h1>
             
             <p className="text-base sm:text-xl text-slate-400 font-medium leading-relaxed max-w-sm border-l-4 border-blue-600 pl-8 italic opacity-90">
                {settings?.schoolMotto || 'Precision Intelligence for the next generation.'}
             </p>
          </div>

          <div className="relative z-10 mt-12 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase tracking-[0.5em] pt-8 border-t border-white/5">
              <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]"></span>
                  <span>Terminal Active</span>
              </div>
              <span className="opacity-40">v2.5.5-SECURE</span>
          </div>
        </div>
        
        {/* Right: Auth UI */}
        <div className="p-8 sm:p-12 md:p-20 flex flex-col justify-center bg-slate-950/60 relative border-l border-white/5">
            <div className="max-w-md mx-auto w-full">
                <div className="mb-12 sm:mb-20 text-center md:text-left">
                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-3 uppercase tracking-tighter leading-none">{isLogin ? 'Initialize' : 'Register'}</h2>
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                        <div className="h-1 w-8 bg-blue-600 rounded-full"></div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">SECURE ACCESS GATEWAY</p>
                    </div>
                </div>

                {isRestrictedEnv && (
                    <div className="mb-10 p-6 bg-blue-600/10 border border-blue-500/30 rounded-[3rem] animate-fade-in shadow-2xl text-center group hover:bg-blue-600/20 transition-all">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-4">IFrame Handshake Protocol Required</p>
                        <Button onClick={handleBreakout} variant="primary" className="w-full !py-5 text-[11px] font-black uppercase tracking-[0.3em] shadow-xl group-hover:scale-[1.02] transition-transform">
                           🚀 Launch Direct Terminal
                        </Button>
                        <p className="mt-4 text-[9px] text-slate-600 italic uppercase tracking-tighter">Bypasses frame storage restrictions</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-5 py-6 px-8 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase text-xs tracking-[0.3em] rounded-[2.5rem] transition-all shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] active:scale-95 mb-12 disabled:opacity-50"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" />
                    </svg>
                    {loading ? 'Authenticating...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-8 mb-12">
                    <div className="flex-1 h-px bg-slate-800"></div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.6em]">OR</span>
                    <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Identity (Email)</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="w-full px-8 py-5 bg-slate-900 border border-slate-800 rounded-3xl text-white outline-none focus:ring-2 ring-blue-600/40 transition-all font-medium text-base placeholder-slate-700 shadow-inner"
                        placeholder="user@edutec.edu"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Secure Key</label>
                    <div className="relative group">
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full px-8 py-5 bg-slate-900 border border-slate-800 rounded-3xl text-white outline-none focus:ring-2 ring-blue-600/40 transition-all font-mono tracking-widest text-base placeholder-slate-700 shadow-inner"
                            placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-400 p-2 transition-colors">
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745A10.029 10.029 0 0 0 18 10c0-4.758-5.5-8-8-8a9.98 9.98 0 0 0-4.686 1.166L3.28 2.22ZM7.875 9.879a3 3 0 0 0 4.246 4.246l-4.246-4.246ZM10 5.996c-1.779 0-3.363.52-4.73 1.413L3.818 5.958A9.98 9.98 0 0 1 10 2a9.98 9.98 0 0 1 8 8c0 .52-.055 1.028-.16 1.518l-1.562-1.562A5.988 5.988 0 0 0 10 5.996Z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    </div>
                  </div>

                  {error && (
                      <div className="p-6 rounded-[2.5rem] bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-widest animate-shake shadow-2xl flex items-center gap-4">
                          <span className="text-2xl">⚠️</span> {error}
                      </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full !py-7 text-sm font-black uppercase tracking-[0.5em] shadow-[0_30px_70px_-10px_rgba(59,130,246,0.6)] rounded-[3rem] mt-4 active:scale-95 transition-all hover:scale-[1.02]">
                    {loading ? (
                        <div className="flex items-center gap-4">
                            <Spinner />
                            <span>Processing...</span>
                        </div>
                    ) : (isLogin ? 'Access System' : 'Deploy Credential')}
                  </Button>
                </form>

                <div className="mt-16 sm:mt-24 pt-12 border-t border-white/5 text-center">
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em]">
                    {isLogin ? "No active credential?" : 'Already in registry?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-4 font-black text-blue-600 hover:text-blue-400 transition-colors uppercase underline underline-offset-8 decoration-2">
                      {isLogin ? 'Register Profile' : 'Back to Login'}
                    </button>
                  </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;