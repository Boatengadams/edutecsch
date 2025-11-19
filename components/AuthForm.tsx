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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/50 overflow-hidden">
        
        {/* Brand Section */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
             <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 mb-4">
                {settings?.schoolName || 'UTOPIA INTERNATIONAL SCHOOL'}
             </h1>
             <p className="text-lg text-slate-300 font-light leading-relaxed">
                {settings?.schoolMotto || 'Shaping the Future, One Student at a Time.'}
             </p>
          </div>
          <div className="relative z-10 mt-12">
             <div className="flex gap-2 mb-4">
                 <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                 <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
             </div>
             <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-700/50 font-mono text-sm text-slate-400">
                <p className="mb-2 text-green-400">$ init_system...</p>
                <p className="mb-2">Loading modules...</p>
                <p className="typing-effect">Ready to transform learning.</p>
             </div>
          </div>
          <p className="relative z-10 text-xs text-slate-500 mt-8">&copy; {new Date().getFullYear()} EduTec Platform</p>
        </div>
        
        {/* Form Section */}
        <div className="p-8 sm:p-12 flex flex-col justify-center relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="animate-fade-in-short">
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
                <p className="text-slate-400 mb-8">{isLogin ? 'Enter your credentials to access your account.' : 'Create your account to join the platform.'}</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
                    <input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="password"  className="block text-sm font-medium text-slate-300">Password</label>
                    <div className="relative">
                        <input 
                            id="password" 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
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
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2 items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                          {error}
                      </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full py-3.5 text-lg shadow-xl shadow-blue-600/20">
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <p className="text-slate-400 text-sm">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                      {isLogin ? 'Sign Up' : 'Sign In'}
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