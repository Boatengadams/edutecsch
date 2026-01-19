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
    // Check for restricted environment protocol
    const checkEnvironment = () => {
        try {
            localStorage.setItem('__auth_test__', '1');
            localStorage.removeItem('__auth_test__');
        } catch (e) {
            setIsRestrictedEnv(true);
        }
        const protocol = window.location.protocol;
        if (!['http:', 'https:', 'chrome-extension:'].includes(protocol)) {
            setIsRestrictedEnv(true);
        }
    };
    checkEnvironment();

    const docRef = db.collection('schoolConfig').doc('settings');
    const unsubscribe = docRef.onSnapshot(
      (docSnap) => {
        if (docSnap.exists) {
          setSettings(docSnap.data() as SchoolSettings);
        }
      },
      (error) => {
        console.warn("Settings sync pending...");
      }
    );
    
    // Capture redirect result
    firebaseAuth.getRedirectResult().then((result) => {
        if (result && result.user) {
            console.log("Authentication successful.");
        }
    }).catch((err) => {
        if (err.code !== 'auth/operation-not-supported-in-this-environment') {
            setError(err.message);
        }
    });

    return () => unsubscribe();
  }, []);

  const validateForm = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;

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
        case 'auth/invalid-credential': friendlyMessage = 'Invalid credentials provided.'; break;
        case 'auth/user-not-found': friendlyMessage = 'No account found with this email.'; break;
        case 'auth/wrong-password': friendlyMessage = 'Incorrect password.'; break;
        case 'auth/email-already-in-use': friendlyMessage = 'This email is already registered.'; break;
        case 'auth/weak-password': friendlyMessage = 'Password is too weak.'; break;
        case 'auth/invalid-email': friendlyMessage = 'Invalid email address.'; break;
        case 'auth/network-request-failed': friendlyMessage = 'Network error. Please check your connection.'; break;
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
          friendlyMessage = 'Sign-In is restricted in this frame. Open in a new tab.';
      }
      setError(friendlyMessage);
      setLoading(false);
    }
  };

  const handleBreakout = () => {
      window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
      
      <div className="w-full max-w-6xl h-full lg:min-h-[750px] grid grid-cols-1 lg:grid-cols-2 bg-slate-900/40 backdrop-blur-2xl lg:rounded-[2.5rem] shadow-2xl lg:border border-white/5 overflow-hidden z-10 m-0 sm:m-4">
        
        {/* Branding Panel (Left on Desktop, Top on Mobile) */}
        <div className="flex flex-col justify-between p-10 sm:p-12 lg:p-16 relative bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            
            <div className="relative z-10 space-y-12">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl p-2 overflow-hidden border border-slate-700/50">
                        {settings?.schoolLogoUrl ? (
                            <img src={settings.schoolLogoUrl} alt="School Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-4xl font-black text-blue-600">{(settings?.schoolName || 'E').charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] leading-none mb-1">Official Portal</p>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                            {settings?.schoolName || 'Edutec Schools'}
                        </h2>
                    </div>
                </div>

                <div className="space-y-6">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight uppercase">
                        Welcome to our<br/>
                        <span className="text-blue-500">Digital Campus</span>
                    </h1>
                    <div className="pt-4">
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Our Mission</p>
                         <p className="text-lg text-slate-300 font-medium max-w-md leading-relaxed border-l-2 border-blue-600 pl-6 italic">
                            "{settings?.schoolMotto || 'Excellence, Intelligence, and Global Leadership.'}"
                         </p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 hidden lg:block pt-12 mt-auto border-t border-white/5">
                <div className="flex items-center gap-6">
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500">U{i}</div>
                        ))}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">+2,400 Active Scholars</p>
                </div>
            </div>
        </div>
        
        {/* Auth Panel (Right) */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 bg-slate-950/50">
            <div className="max-w-md mx-auto w-full space-y-8">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-white tracking-tight uppercase">{isLogin ? 'Login' : 'Signup'}</h2>
                    <p className="text-slate-500 text-sm mt-1">Provide credentials to access your secure terminal.</p>
                </div>

                {isRestrictedEnv && (
                    <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center">
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-3">Protocol Restriction Detected</p>
                        <Button onClick={handleBreakout} size="sm" className="w-full uppercase text-[10px] tracking-widest font-black">
                           Open Native Portal
                        </Button>
                    </div>
                )}

                <div className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                className="w-full px-5 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all font-medium placeholder-slate-700"
                                placeholder="name@school.edu"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                                {isLogin && <button type="button" className="text-[10px] font-bold text-blue-500 hover:text-blue-400">Forgot?</button>}
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    className="w-full px-5 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all font-mono placeholder-slate-700"
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 p-1"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745A10.029 10.029 0 0 0 18 10c0-4.758-5.5-8-8-8a9.98 9.98 0 0 0-4.686 1.166L3.28 2.22ZM7.875 9.879a3 3 0 0 0 4.246 4.246l-4.246-4.246ZM10 5.996c-1.779 0-3.363.52-4.73 1.413L3.818 5.958A9.98 9.98 0 0 1 10 2a9.98 9.98 0 0 1 8 8c0 .52-.055 1.028-.16 1.518l-1.562-1.562A5.988 5.988 0 0 0 10 5.996Z" clipRule="evenodd" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-3 animate-shake">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full !py-4 text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-900/30 rounded-xl transition-all hover:scale-[1.01] active:scale-95">
                            {loading ? <Spinner /> : (isLogin ? 'Login' : 'Signup')}
                        </Button>
                    </form>

                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-slate-800"></div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Or continue with</span>
                        <div className="flex-1 h-px bg-slate-800"></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-4 py-4 px-8 bg-white hover:bg-slate-50 text-slate-900 font-bold uppercase text-[11px] tracking-widest rounded-xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" />
                        </svg>
                        {loading ? 'Authenticating...' : (isLogin ? 'Sign in with Google' : 'Sign up with Google')}
                    </button>
                </div>

                <div className="pt-8 border-t border-slate-900 text-center">
                    <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">
                        {isLogin ? "No active credential?" : 'Already registered?'}
                        <button onClick={() => setIsLogin(!isLogin)} className="ml-4 text-blue-500 hover:text-white transition-colors underline underline-offset-8 decoration-2 font-bold">
                        {isLogin ? 'Signup' : 'Login'}
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