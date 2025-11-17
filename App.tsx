import React, { useState, useEffect, ReactNode } from 'react';
import { useAuthentication, AuthenticationContext } from './hooks/useAuth';
import { firebaseAuth, db } from './services/firebase';
import type { UserProfile, SchoolSettings, SubscriptionStatus, UserRole } from './types';
// FIX: Use firebase from compat/app to get the User type
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import AuthForm from './components/AuthForm';
import RoleSelector from './components/RoleSelector';
// FIX: Changed import to a named import to match the export in TeacherView.tsx.
import { TeacherView } from './components/TeacherView';
// FIX: Changed to a default import as StudentView is now default exported.
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import ParentView from './components/ParentView';
import Spinner from './components/common/Spinner';
import Card from './components/common/Card';
import Button from './components/common/Button';
import CursorFollower from './components/common/CursorFollower';
import NotificationsBell from './components/common/NotificationsBell';
import GlobalSearch from './components/common/GlobalSearch';
import PendingApproval from './components/PendingApproval';
import SystemActivation from './components/SystemActivation';
import SystemLocked from './components/SystemLocked';

// Renamed from AuthProvider
const AuthenticationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsDocRef = db.collection('schoolConfig').doc('settings');
    const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
        if (docSnap.exists) {
            setSchoolSettings(docSnap.data() as SchoolSettings);
        } else {
             setSchoolSettings({
                schoolName: "UTOPIA INTERNATIONAL SCHOOL",
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
                 // Subscription has expired, deactivate the system client-side while waiting for server function
                 setSubscriptionStatus({ ...data, isActive: false });
                 // Also trigger a write to make it permanent if we have permissions (for admins)
                 // This is a fallback for a dedicated server-side cron job.
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
    // FIX: Changed onAuthStateChanged to be a method on firebaseAuth for v8 compat.
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
            console.error(`Error fetching user profile for UID ${firebaseUser.uid}:`, err.message);
            setUserProfile(null);
            setLoading(false);
          });
        return () => unsubscribeSnapshot();
      } else {
        setUserProfile(null);
        setLoading(false);
        return () => {}; // Return an empty function for cleanup
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

const AppContent: React.FC<{isSidebarExpanded: boolean; setIsSidebarExpanded: (isExpanded: boolean) => void;}> = ({isSidebarExpanded, setIsSidebarExpanded}) => {
    const { user, userProfile, loading, schoolSettings, subscriptionStatus } = useAuthentication();
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
    const SUPER_ADMIN_UID = "WsDstQ5ufSW49i0Pc5sJWWyDVk22"; // Hardcoded Super Admin UID for recovery
    
    // Reset role override if user profile changes (e.g., on logout/login)
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
            <div className="min-h-screen flex flex-col justify-center items-center">
                <Spinner />
                <p className="mt-4 text-lg">Loading EduTec Platform...</p>
            </div>
        );
    }

    if (!user) {
        return <AuthForm />;
    }
    
    // Check for system activation status first
    if (!subscriptionStatus?.isActive) {
        // If system is NOT active, only admin can see the activation screen
        if (userProfile?.role === 'admin') {
            return <SystemActivation subscriptionStatus={subscriptionStatus} />;
        }
        // All other users see a locked screen
        return <SystemLocked />;
    }


    if (!userProfile) {
        return <RoleSelector />;
    }
    
    // Allow the super admin to bypass the pending screen to access recovery tools.
    if (userProfile.status === 'pending' && userProfile.uid !== SUPER_ADMIN_UID) {
        return <PendingApproval />;
    }

    const roleToRender = activeRoleOverride || userProfile.role;
    const primaryRole = userProfile.role;
    const canSwitch = (primaryRole === 'admin' && userProfile.isAlsoTeacher) || (primaryRole === 'teacher' && userProfile.isAlsoAdmin);

    const handleRoleSwitch = () => {
        if (activeRoleOverride) {
            setActiveRoleOverride(null); // Switch back to primary
        } else if (primaryRole === 'admin') {
            setActiveRoleOverride('teacher');
        } else if (primaryRole === 'teacher') {
            setActiveRoleOverride('admin');
        }
    };

    const Header = () => (
        <header className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm h-[65px] flex-shrink-0 no-print">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h1 className="text-xl font-bold hidden sm:block">{schoolSettings?.schoolName}</h1>
            </div>
            <div className="flex items-center gap-4">
                {canSwitch && (
                    <Button size="sm" onClick={handleRoleSwitch} variant="secondary">
                        Switch to {activeRoleOverride ? primaryRole : (primaryRole === 'admin' ? 'Teacher' : 'Admin')} View
                    </Button>
                )}
                 <button onClick={() => setShowGlobalSearch(true)} className="hidden md:flex items-center gap-2 p-2 rounded-md hover:bg-slate-700 transition-colors text-sm text-gray-400 border border-slate-600">
                    Search... <kbd className="px-2 py-1 text-xs font-semibold text-gray-400 bg-slate-900 rounded-md border border-slate-700">⌘ K</kbd>
                </button>
                <NotificationsBell />
                <Button size="sm" variant="secondary" onClick={() => firebaseAuth.signOut()}>Sign Out</Button>
            </div>
        </header>
    );
    
    const renderView = () => {
        switch (roleToRender) {
            case 'teacher':
                return <TeacherView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            case 'student':
                return <StudentView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            case 'admin':
                return <AdminView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            case 'parent':
                return <ParentView isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />;
            default:
                return <p>Unknown role.</p>;
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 text-gray-100 flex flex-col">
            <CursorFollower />
            <Header />
            <div className="flex-1 flex overflow-hidden">
                {renderView()}
            </div>
            {showGlobalSearch && <GlobalSearch onClose={() => setShowGlobalSearch(false)} />}
        </div>
    );
}


export const App: React.FC = () => {
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);
    
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarExpanded(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

  return (
    <AuthenticationProvider>
      <AppContent isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />
    </AuthenticationProvider>
  );
};