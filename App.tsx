import React, { useState, useEffect, ReactNode } from 'react';
import { useAuthentication, AuthenticationContext } from './hooks/useAuth';
import { firebaseAuth, db, firebase } from './services/firebase';
import type { UserProfile, SchoolSettings, SubscriptionStatus, UserRole } from './types';
import 'firebase/compat/auth';
import AuthForm from './components/AuthForm';
import RoleSelector from './components/RoleSelector';
import TeacherView from './TeacherView';
import { StudentView } from './components/StudentView';
import AdminView from './components/AdminView';
import { ParentView } from './components/ParentView';
import Spinner from './components/common/Spinner';
import Button from './components/common/Button';
import CursorFollower from './components/common/CursorFollower';
import NotificationsBell from './components/common/NotificationsBell';
import GlobalSearch from './components/common/GlobalSearch';
import PendingApproval from './components/PendingApproval';
import SystemActivation from './components/SystemActivation';
import SystemLocked from './components/SystemLocked';
import SleepModeScreen from './components/SleepModeScreen';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import { usePresence } from './hooks/usePresence';
import { ToastProvider } from './components/common/Toast';

const OMNI_USER_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];
const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/5968/5968213.png";

const AuthenticationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  usePresence(userProfile);

  useEffect(() => {
    const settingsDocRef = db.collection('schoolConfig').doc('settings');
    const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
        if (docSnap.exists) setSchoolSettings(docSnap.data() as SchoolSettings);
    }, (err) => {
        if (err.code !== 'permission-denied') console.warn("Config stream error:", err.message);
    });
    
    const subDocRef = db.collection('schoolConfig').doc('subscription');
    const unsubscribeSubscription = subDocRef.onSnapshot(docSnap => {
        if (docSnap.exists) setSubscriptionStatus(docSnap.data() as SubscriptionStatus);
    }, (err) => {
        if (err.code !== 'permission-denied') console.warn("Subscription stream error:", err.message);
    });

    return () => { unsubscribeSettings(); unsubscribeSubscription(); };
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        const unsubscribeSnapshot = userDocRef.onSnapshot(
          docSnap => {
            if (docSnap.exists) setUserProfile(docSnap.data() as UserProfile);
            else setUserProfile(null);
            setLoading(false);
          },
          err => {
            setUserProfile(null);
            setLoading(false);
          });
        return () => unsubscribeSnapshot();
      } else {
        setUserProfile(null);
        setLoading(false);
        return () => {};
      }
    });
    return () => unsubscribe();
  }, []);

  const value = { user, userProfile, schoolSettings, subscriptionStatus, loading };
  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
};

const isSleepTime = (config: SchoolSettings['sleepModeConfig']) => {
    if (!config || !config.enabled) return false;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = config.sleepTime.split(':').map(Number);
    const [wH, wM] = config.wakeTime.split(':').map(Number);
    const sleep = sH * 60 + sM;
    const wake = wH * 60 + wM;
    return sleep > wake ? (current >= sleep || current < wake) : (current >= sleep && current < wake);
};

const AppContent: React.FC<{isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void;}> = ({isSidebarExpanded, setIsSidebarExpanded}) => {
    const { user, userProfile, loading, schoolSettings, subscriptionStatus } = useAuthentication();
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        const saved = localStorage.getItem('edutec-theme');
        return (saved as 'dark' | 'light') || 'dark';
    });
    
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }
        localStorage.setItem('edutec-theme', theme);
    }, [theme]);

    const isOmniUser = OMNI_USER_EMAILS.includes(user?.email || "");

    if (window.location.pathname === '/payment-success') return <PaymentSuccessPage />;
    if (loading) return <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950"><Spinner /></div>;
    if (!user) return <AuthForm />;
    if (!userProfile) return <RoleSelector />;

    if (!isOmniUser) {
        if (!subscriptionStatus?.isActive) {
            if (userProfile?.role === 'admin') return <SystemActivation subscriptionStatus={subscriptionStatus} />;
            return <SystemLocked />;
        }
        if (userProfile?.status === 'pending') return <PendingApproval />;
        if (userProfile?.role === 'student' && isSleepTime(schoolSettings?.sleepModeConfig)) {
            return <SleepModeScreen wakeTime={schoolSettings!.sleepModeConfig!.wakeTime} />;
        }
    }

    const verifiedRole = (activeRoleOverride && isOmniUser) ? activeRoleOverride : userProfile.role;

    return (
        <div className="h-[100dvh] flex flex-col font-sans text-slate-200 dark:text-slate-200 light:text-slate-900 bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden w-full max-w-full">
            <CursorFollower />
            <header className="sticky top-0 z-20 flex items-center justify-between p-3 md:p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 h-auto md:h-[70px] flex-shrink-0 no-print w-full transition-all">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <div className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden border border-slate-200 dark:border-white/10 p-2">
                            <img 
                                src={schoolSettings?.schoolLogoUrl || DEFAULT_LOGO} 
                                alt="Logo" 
                                className="w-full h-full object-contain" 
                            />
                        </div>
                        <h1 className="text-xs md:text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 uppercase tracking-[0.1em] md:tracking-[0.2em] truncate">
                            {schoolSettings?.schoolName || 'EDUTEC SCHOOLS'}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    {isOmniUser && (
                        <button onClick={() => {
                            const roles: UserRole[] = ['admin', 'teacher', 'student', 'parent'];
                            setActiveRoleOverride(roles[(roles.indexOf(verifiedRole) + 1) % roles.length]);
                        }} className="hidden sm:block px-3 py-1.5 rounded-lg bg-purple-600/10 border border-purple-500/30 text-[10px] font-black uppercase text-purple-400">Role: {verifiedRole}</button>
                    )}
                    <NotificationsBell />
                    <Button size="sm" variant="ghost" onClick={() => firebaseAuth.signOut()} className="text-red-600 dark:text-red-400 px-2 py-1 md:px-3 md:py-1.5 text-xs hover:bg-red-900/10 transition-colors">Sign Out</Button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden relative z-10 w-full max-w-full">
                {verifiedRole === 'teacher' && <TeacherView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />}
                {verifiedRole === 'student' && <StudentView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />}
                {verifiedRole === 'admin' && <AdminView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />}
                {verifiedRole === 'parent' && <ParentView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />}
            </div>
            {showGlobalSearch && <GlobalSearch onClose={() => setShowGlobalSearch(false)} />}
        </div>
    );
}

export const App: React.FC = () => {
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);
    
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarExpanded(false);
            else setIsSidebarExpanded(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

  return (
    <AuthenticationProvider>
        <ToastProvider>
            <AppContent isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />
        </ToastProvider>
  </AuthenticationProvider>
  );
};