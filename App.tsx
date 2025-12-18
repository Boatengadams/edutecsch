
import React, { useState, useEffect, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useAuthentication, AuthenticationContext } from './hooks/useAuth';
import { firebaseAuth, db, firebase, rtdb } from './services/firebase';
import type { UserProfile, SchoolSettings, SubscriptionStatus, UserRole } from './types';
import 'firebase/compat/auth';
import AuthForm from './components/AuthForm';
import RoleSelector from './components/RoleSelector';
import TeacherView from './components/TeacherView';
import { StudentView } from './components/StudentView';
// FIX: Changed to default import for AdminView.
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
import { usePresence } from './hooks/usePresence';
import { ToastProvider } from './components/common/Toast';

const AuthenticationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Presence System
  usePresence(userProfile);

  useEffect(() => {
    const settingsDocRef = db.collection('schoolConfig').doc('settings');
    const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
        if (docSnap.exists) {
            setSchoolSettings(docSnap.data() as SchoolSettings);
        } else {
             setSchoolSettings({
                schoolName: "EDUTECSCH",
                schoolMotto: "Shaping the Future, One Student at a Time.",
                academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
            });
        }
    });
    
    const subDocRef = db.collection('schoolConfig').doc('subscription');
    const unsubscribeSubscription = subDocRef.onSnapshot(docSnap => {
        if (docSnap.exists) {
            const data = docSnap.data() as SubscriptionStatus;
            const now = Date.now();
            const trialExpired = data.trialEndsAt && data.trialEndsAt.toDate().getTime() < now;
            const subscriptionExpired = data.subscriptionEndsAt && data.subscriptionEndsAt.toDate().getTime() < now;

            if (data.isActive && (trialExpired && data.planType === 'trial') || subscriptionExpired) {
                 setSubscriptionStatus({ ...data, isActive: false });
                 subDocRef.update({ isActive: false });
            } else {
                setSubscriptionStatus(data);
            }
        } else {
            setSubscriptionStatus({ isActive: false, planType: null, trialEndsAt: null, subscriptionEndsAt: null });
        }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeSubscription();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        const unsubscribeSnapshot = userDocRef.onSnapshot(
          docSnap => {
            if (docSnap.exists) {
                setUserProfile(docSnap.data() as UserProfile);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
          },
          err => {
            // Suppress "Missing or insufficient permissions" error for cleaner console during registration flow
            // This happens when a user exists in Auth but not yet in Firestore (pending creation)
            if (err.code !== 'permission-denied' && !err.message.includes("Missing or insufficient permissions")) {
                console.error(`Error fetching user profile for UID ${firebaseUser.uid}:`, err.message);
            }
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
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [sleepH, sleepM] = config.sleepTime.split(':').map(Number);
    const [wakeH, wakeM] = config.wakeTime.split(':').map(Number);
    
    const sleepMinutes = sleepH * 60 + sleepM;
    const wakeMinutes = wakeH * 60 + wakeM;
    
    // Check if interval crosses midnight (e.g. 21:00 to 05:00)
    if (sleepMinutes > wakeMinutes) {
        return currentMinutes >= sleepMinutes || currentMinutes < wakeMinutes;
    } else {
        // Same day interval (e.g. 01:00 to 05:00)
        return currentMinutes >= sleepMinutes && currentMinutes < wakeMinutes;
    }
};

const AppContent: React.FC<{isSidebarExpanded: boolean; setIsSidebarExpanded: (isExpanded: boolean) => void;}> = ({isSidebarExpanded, setIsSidebarExpanded}) => {
    const { user, userProfile, loading, schoolSettings, subscriptionStatus } = useAuthentication();
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
    const SUPER_ADMIN_UID = "WsDstQ5ufSW49i0Pc5sJWWyDVk22";
    
    useEffect(() => {
        setActiveRoleOverride(null);
    }, [userProfile?.uid]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setShowGlobalSearch(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-8 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-widest uppercase mb-2">
                        {schoolSettings?.schoolName || 'EDUTECSCH'}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 tracking-[0.2em] animate-pulse">SYSTEM INITIALIZING</p>
                </div>
            </div>
        );
    }

    if (!user) return <AuthForm />;
    
    if (!subscriptionStatus?.isActive) {
        if (userProfile?.role === 'admin') {
            return <SystemActivation subscriptionStatus={subscriptionStatus} />;
        }
        return <SystemLocked />;
    }

    if (!userProfile) return <RoleSelector />;
    
    if (userProfile.status === 'pending' && userProfile.uid !== SUPER_ADMIN_UID) {
        return <PendingApproval />;
    }

    // Sleep Mode Check
    const primaryRole = userProfile.role;
    if (primaryRole === 'student' && schoolSettings?.sleepModeConfig?.enabled) {
        if (isSleepTime(schoolSettings.sleepModeConfig)) {
            return <SleepModeScreen wakeTime={schoolSettings.sleepModeConfig.wakeTime} />;
        }
    }

    const roleToRender = activeRoleOverride || userProfile.role;
    const canSwitch = (primaryRole === 'admin' && userProfile.isAlsoTeacher) || (primaryRole === 'teacher' && userProfile.isAlsoAdmin);

    const handleRoleSwitch = () => {
        if (activeRoleOverride) {
            setActiveRoleOverride(null);
        } else if (primaryRole === 'admin') {
            setActiveRoleOverride('teacher');
        } else if (primaryRole === 'teacher') {
            setActiveRoleOverride('admin');
        }
    };
    
    const handleSignOut = async () => {
        if (userProfile) {
             const logLogout = async () => {
                 try {
                    // 1. Log the logout activity to Firestore
                    await db.collection('userActivity').add({
                        userId: userProfile.uid,
                        userName: userProfile.name || 'Unknown User',
                        userRole: userProfile.role,
                        userClass: userProfile.class || userProfile.classTeacherOf || 'N/A',
                        action: 'logout',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // 2. Explicitly set presence to 'offline' in Realtime Database for immediate UI update
                    const userStatusDatabaseRef = rtdb.ref('/status/' + userProfile.uid);
                    await userStatusDatabaseRef.update({
                        state: 'offline',
                        last_changed: firebase.database.ServerValue.TIMESTAMP,
                    });
                 } catch (e) {
                    console.error("Error logging logout", e);
                 }
             };

             // Race condition: Try to log, but don't wait more than 1 second to ensure sign out happens
             const timeout = new Promise(resolve => setTimeout(resolve, 1000));
             await Promise.race([logLogout(), timeout]);
        }
        
        try {
            await firebaseAuth.signOut();
        } catch (error) {
            console.error("Sign out error", error);
        }
    };

    const Header = () => (
        <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/50 h-[70px] flex-shrink-0 no-print transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
                <button 
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} 
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                {schoolSettings?.schoolLogoUrl ? (
                    <img src={schoolSettings.schoolLogoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-lg" />
                ) : null}
                <h1 className="text-base md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 truncate tracking-tight">
                    {schoolSettings?.schoolName}
                </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                {canSwitch && (
                    <Button 
                        size="sm" 
                        onClick={handleRoleSwitch} 
                        variant="ghost" 
                        className="text-xs uppercase tracking-wider font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-2 sm:px-4"
                        title="Switch View"
                    >
                        <span className="hidden sm:inline">Switch View</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:hidden">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                    </Button>
                )}
                 <button onClick={() => setShowGlobalSearch(true)} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-all text-sm text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    <span className="hidden lg:inline">Search</span>
                    <kbd className="hidden lg:inline px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-900 rounded border border-slate-700 ml-2">⌘K</kbd>
                </button>
                <button onClick={() => setShowGlobalSearch(true)} className="md:hidden p-2 text-slate-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                </button>
                <NotificationsBell />
                <div className="h-8 w-px bg-slate-700 mx-1 hidden sm:block"></div>
                <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 sm:px-4">
                    <span className="hidden sm:inline">Sign Out</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:hidden"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                </Button>
            </div>
        </header>
    );
    
    const renderView = () => {
        switch (roleToRender) {
            case 'teacher': return <TeacherView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            case 'student': return <StudentView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            case 'admin': return <AdminView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            case 'parent': return <ParentView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            default: return <div className="flex items-center justify-center h-full text-slate-500">Role not recognized</div>;
        }
    }

    return (
        <div className="h-[100dvh] flex flex-col font-sans text-slate-200 bg-slate-950 overflow-hidden">
            <CursorFollower />
            <Header />
            <div className="flex-1 flex overflow-hidden relative z-10">
                {renderView()}
            </div>
            {showGlobalSearch && <GlobalSearch onClose={() => setShowGlobalSearch(false)} />}
        </div>
    );
}

export const App: React.FC = () => {
    // Sidebar default state logic - start collapsed on mobile
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);
    
    useEffect(() => {
        const handleResize = () => {
            // Automatically expand sidebar on large screens, collapse on small
            if (window.innerWidth >= 1024) {
                setIsSidebarExpanded(true);
            } else {
                setIsSidebarExpanded(false);
            }
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
