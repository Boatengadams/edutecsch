import React, { useState, useEffect } from 'react';
import { firebaseAuth, db, firebase } from '../services/firebase';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { SchoolSettings } from '../types';

// Official Edutec Default Logo for when DB is unconfigured
const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/5968/5968213.png"; 

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
      setError('Google authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
      
      <div className="w-full max-w-6xl h-full lg:min-h-[750px] grid grid-cols-1 lg:grid-cols-2 bg-slate-900/40 backdrop-blur-2xl lg:rounded-[2.5rem] shadow-2xl lg:border border-white/5 overflow-hidden z-10 m-0 sm:m-4">
        
        <div className="flex flex-col justify-between p-10 sm:p-12 lg:p-16 relative bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            
            <div className="relative z-10 space-y-12">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl p-3 overflow-hidden border border-slate-700/50">
                        <img 
                            src={settings?.schoolLogoUrl || DEFAULT_LOGO} 
                            alt="School Logo" 
                            className="w-full h-full object-contain" 
                        />
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
        
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 bg-slate-950/50">
            <div className="max-w-md mx-auto w-full space-y-8">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-white tracking-tight uppercase">{isLogin ? 'Login' : 'Signup'}</h2>
                    <p className="text-slate-500 text-sm mt-1">Provide credentials to access your secure terminal.</p>
                </div>

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

                    {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold animate-shake">⚠️ {error}</div>}

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
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    {loading ? 'Authenticating...' : 'Google Auth'}
                </button>

                <div className="pt-8 border-t border-slate-900 text-center">
                    <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">
                        {isLogin ? "No account?" : 'Registered?'}
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