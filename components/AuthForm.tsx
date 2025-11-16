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
        // FIX: Replaced v9 syntax with v8 compat syntax
        const docRef = db.collection('schoolConfig').doc('settings');
        const docSnap = await docRef.get();
        // FIX: Changed exists() to exists for v8 compat.
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
        // FIX: Changed to v8 compat syntax.
        await firebaseAuth.signInWithEmailAndPassword(email, password);
      } else {
        // FIX: Changed to v8 compat syntax.
        await firebaseAuth.createUserWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      let friendlyMessage = 'An unexpected error occurred. Please try again.';
      switch (err.code) {
        case 'auth/invalid-credential':
          friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/user-not-found': // Deprecated, but good to handle
          friendlyMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password': // Deprecated, but good to handle
          friendlyMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          friendlyMessage = 'An account already exists with this email address. Please sign in.';
          break;
        case 'auth/weak-password':
          friendlyMessage = 'The password is too weak. It must be at least 6 characters long.';
          break;
        case 'auth/invalid-email':
          friendlyMessage = 'The email address is not valid. Please enter a valid email.';
          break;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="relative w-full max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden grid md:grid-cols-2 bg-slate-800">
        {/* Branding Side */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div>
             <h1 className="text-3xl font-bold">{settings?.schoolName || 'UTOPIA INTERNATIONAL SCHOOL'}</h1>
             <p className="mt-2 text-slate-300">{settings?.schoolMotto || 'Shaping the Future, One Student at a Time.'}</p>
          </div>
          <div className="mt-8 text-sm text-slate-400">
            &copy; {new Date().getFullYear()} EduTec. All rights reserved.
          </div>
        </div>
        
        {/* Form Side */}
        <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-center">
            <div key={isLogin ? 'login' : 'signup'} className="animate-fade-in-short">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-100 mb-6">{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 sr-only">Email Address</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                        </span>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email Address"
                               className="w-full pl-10 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="password"  className="block text-sm font-medium text-gray-300 sr-only">Password</label>
                     <div className="relative">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                         </span>
                        <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password"
                               className="w-full pl-10 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="flex items-center">
                      <input id="show-password" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                      <label htmlFor="show-password" className="ml-2 block text-sm text-gray-300">Show Password</label>
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <Button type="submit" disabled={loading} className="w-full !py-3">
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-400">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                  <button onClick={() => setIsLogin(!isLogin)} className="ml-1 font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:underline">
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
