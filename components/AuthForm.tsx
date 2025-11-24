
import React, { useState, useEffect } from 'react';
import { firebaseAuth, db } from '../services/firebase';
import Button from './common/Button';
import { SchoolSettings } from '../types';

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = db.collection('schoolConfig').doc('settings');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          setSettings(docSnap.data() as SchoolSettings);
        }
      } catch (error) {
        console.error("Error fetching school settings:", error);
      }
    };
    fetchSettings();
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-0 bg-slate-950 relative overflow-hidden font-sans">
      {/* Professional Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
      
      <div className="w-full max-w-[1400px] min-h-[80vh] grid md:grid-cols-2 bg-slate-900/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800/50 overflow-hidden z-10 m-4 sm:m-8">
        
        {/* Brand Section (Left) */}
        <div className="hidden md:flex flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
          
          {/* Decorative Circles */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.499 5.221 69.17 69.17 0 0 0-2.692.813m-15.482 0a50.553 50.553 0 0 1 9.566-5.382m5.916 5.382a50.572 50.572 0 0 0 9.566-5.382" /></svg>
                </div>
                <span className="text-xl font-bold text-slate-200 tracking-wide">EDUTEC PLATFORM</span>
             </div>
             
             <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
                {settings?.schoolName || 'UTOPIA INTERNATIONAL'}
             </h1>
             <p className="text-lg text-slate-400 font-light leading-relaxed max-w-md border-l-2 border-blue-500/50 pl-4">
                {settings?.schoolMotto || 'Shaping the Future, One Student at a Time.'}
             </p>
          </div>
          
          <div className="relative z-10 mt-12">
             <div className="p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex -space-x-2">
                        {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800"></div>)}
                    </div>
                    <span className="text-sm text-slate-400">+2k Active Learners</span>
                </div>
                <p className="text-sm text-slate-300 italic">"Empowering the next generation with AI-driven education."</p>
             </div>
          </div>
          
          <div className="relative z-10 mt-auto pt-8 flex justify-between text-xs text-slate-600 font-mono uppercase tracking-widest">
              <span>v2.0.4 Stable</span>
              <span>Secure Connection</span>
          </div>
        </div>
        
        {/* Form Section (Right) */}
        <div className="p-8 sm:p-12 lg:p-20 flex flex-col justify-center relative bg-slate-950/50">
            <div className="max-w-md mx-auto w-full">
                <div className="mb-10 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Sign In' : 'Create Account'}</h2>
                    <p className="text-slate-400">Access your dashboard to continue learning.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>
                        </div>
                        <input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            placeholder="name@school.edu"
                        />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                        {isLogin && <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot?</button>}
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                        </div>
                        <input 
                            id="password" 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            placeholder="••••••••"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                            )}
                        </button>
                    </div>
                  </div>

                  {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2 items-start animate-shake">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                          <span>{error}</span>
                      </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full !py-3.5 text-base font-bold shadow-lg shadow-blue-600/20 rounded-xl">
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Processing...
                        </span>
                    ) : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <p className="text-slate-400 text-sm">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-bold text-blue-400 hover:text-blue-300 transition-colors hover:underline">
                      {isLogin ? 'Register Now' : 'Login'}
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
