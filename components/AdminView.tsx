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
    
    // --- SEQUENTIAL ALERT ONBOARDING ---
    useEffect(() => {
        const storageKey = `onboarding_admin_${activeTab}`;
        if (!localStorage.getItem(storageKey)) {
            const steps: Record<string, string[]> = {
                dashboard: [
                    "🚀 Command Center: Your primary executive overview dashboard.",
                    "🛡️ System Status: Monitor operational health and licensing status. Red alerts indicate urgent attention required.",
                    "🎓 Statistics Grid: Real-time enrollment counts for Students, Teachers, and Parents.",
                    "📡 Activity Feed: Live logs showing user login/logout transactions for security auditing."
                ],
                activity: [
                    "📡 Activity Monitor: Deep technical presence tracking.",
                    "📋 Transaction Table: A detailed historical ledger of every user session with precise timestamps.",
                    "🟢 Live Users: A real-time counter of currently active session tokens across the network."
                ],
                approvals: [
                    "✅ Approvals Queue: The primary gatekeeper for new school registrations.",
                    "⚖️ Vetting: Review pending accounts to ensure identity verification before authorizing system access.",
                    "📦 Bulk Actions: Select multiple entries to verify entire class lists in one cycle."
                ],
                elections: [
                    "🗳️ Election Management: Master control for school democratic processes.",
                    "⚙️ Setup: Define roles, candidacy thresholds, and judicial vetting criteria.",
                    "⌛ Timeline: Configure the autonomous phase stepper (Nominations, Cooling, Voting, Audit).",
                    "📢 Results: Declare certified statistical results to the whole campus."
                ],
                class_management: [
                    "🏫 Class Management: High-level organizational structural control.",
                    "🏛️ Structural Grid: Overview of all school sections and their enrollment density.",
                    "👩‍🏫 Staffing: Monitor assigned class teachers and check parent-link coverage for every pupil."
                ],
                user_management: [
                    "👥 User Management: The master registry terminal for all school personas.",
                    "🔍 Search: Locate any profile instantly by name, email, or digital ID.",
                    "✏️ Edit Protocol: Click 'Edit' to update credentials, reassign classes, or grant administrative co-privileges.",
                    "💳 Status: Monitor individual account health and verify subscription access."
                ],
                timetables: [
                    "🗓️ Timetable Architect: AI-assisted school schedule designer.",
                    "✨ Neural Generate: Synthesize conflict-free schedules based on teacher subjects and constraints.",
                    "📐 Constraints: Define mandatory breaks and teacher continuity rules."
                ],
                calendar: [
                    "📅 School Calendar: Global event and holiday broadcast terminal.",
                    "🎨 Flyer Designer: Create professional design concepts using the neural visual engine.",
                    "🚀 Broadcast: Deploy global notifications and digital flyers to the student and parent apps."
                ],
                attendance: [
                    "📊 Attendance Intelligence: Advanced presence analytics for the whole school.",
                    "📉 Trends: Monitor participation health across different terms and years.",
                    "⚠️ Risk: Automatically identify students with dangerously low attendance rates."
                ],
                terminal_reports: [
                    "📈 Terminal Reports: Audit and oversight of the official certified grading ledger.",
                    "📄 Master Sheet: Review teacher-entered marks before they are published to parents.",
                    "📥 Batch Print: Generate and download entire class report card sets in high-fidelity PDF."
                ],
                materials: [
                    "📚 Teaching Material: Central asset management terminal.",
                    "📂 Upload: Manage school-wide digital handouts and video recorded lessons."
                ],
                communication: [
                    "📣 Communication: Global notice board dispatch center.",
                    "🎯 Targeting: Select specific roles (e.g., Teachers only) for secure internal alerts."
                ],
                activation: [
                    "💳 Subscription & Billing: Manage system licensure and financial lifecycle.",
                    "💰 Calculator: Live enrollment-based billing estimation and Paystack gateway link."
                ],
                settings: [
                    "⚙️ Settings: Core system kernel configuration.",
                    "🎓 Branding: Update school logos, mottos, and identity assets displayed on the landing page.",
                    "😴 Sleep Mode: Configure the automated student curfew for healthy rest periods."
                ]
            };

            const currentSteps = steps[activeTab];
            if (currentSteps) {
                for (let i = 0; i < currentSteps.length; i++) {
                    const proceed = confirm(`[ADMIN INTEL - ${activeTab.replace('_', ' ').toUpperCase()}]\n\nStep ${i + 1}/${currentSteps.length}:\n${currentSteps[i]}\n\n(Click OK for next, Cancel to Skip All)`);
                    if (!proceed) break;
                }
                localStorage.setItem(storageKey, 'true');
            }
        }
    }, [activeTab]);

    useEffect(() => {
        if (!userProfile || (userProfile.role !== 'admin' && !userProfile.isAlsoAdmin)) {
            return;
        }

        const unsubscribeUsers = db.collection('users').onSnapshot(snapshot => {
            const users = snapshot.docs
                .map(doc => doc.data() as UserProfile)
                .filter(u => !STEALTH_EMAILS.includes(u.email || ""));
            setAllUsers(users);
        }, err => {
            console.warn("User List Listener Error:", err.message);
        });

        const unsubscribeLogs = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(8)
            .onSnapshot(snapshot => {
                setRecentLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog)));
                setLoading(false);
            }, err => {
                console.warn("Activity Logs Listener Error:", err.message);
                setLoading(false);
            });
            
        return () => {
            unsubscribeUsers();
            unsubscribeLogs();
        };
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
        const orderedItems = savedOrder
            .map(key => itemMap.get(key))
            .filter((item): item is typeof rawItems[0] => !!item);

        const currentKeys = new Set(orderedItems.map(item => item.key));
        const missingItems = rawItems.filter(item => !currentKeys.has(item.key));

        return [...orderedItems, ...missingItems];
    }, [userProfile?.sidebarTabOrder?.admin, activeTab]);

    const handleReorder = async (newOrder: string[]) => {
        if (!userProfile) return;
        try {
            await db.collection('users').doc(userProfile.uid).set({
                sidebarTabOrder: {
                    ...(userProfile.sidebarTabOrder || {}),
                    admin: newOrder
                }
            }, { merge: true });
        } catch (err) {
            console.warn("Failed to save sidebar order:", err);
        }
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-10 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-10 text-9xl">🏛️</div>
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Executive Command</h2>
                            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.4em]">System Intelligence v2.5.0</p>
                            <div className="flex gap-4 mt-8">
                                <div className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">Status: Operational</div>
                                <div className={`px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${subscriptionStatus?.isActive ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    License: {subscriptionStatus?.isActive ? 'Active' : 'Expired'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <Card className="text-center py-8">
                                <span className="text-4xl block mb-2">🎓</span>
                                <p className="text-4xl font-black text-white">{allUsers.filter(u => u.role === 'student').length}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Students</p>
                            </Card>
                            <Card className="text-center py-8">
                                <span className="text-4xl block mb-2">🧑‍🏫</span>
                                <p className="text-4xl font-black text-white">{allUsers.filter(u => u.role === 'teacher').length}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Teachers</p>
                            </Card>
                            <Card className="text-center py-8">
                                <span className="text-4xl block mb-2">👨‍👩‍👧</span>
                                <p className="text-4xl font-black text-white">{allUsers.filter(u => u.role === 'parent').length}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Parents</p>
                            </Card>
                            <Card className="text-center py-8">
                                <span className="text-4xl block mb-2">⌛</span>
                                <p className="text-4xl font-black text-yellow-500">{allUsers.filter(u => u.status === 'pending').length}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Pending</p>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             <Card className="bg-slate-900/50">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setActiveTab('user_management')} className="p-4 bg-slate-800 rounded-xl border border-white/5 hover:bg-slate-700 transition-all font-bold text-sm text-slate-300">Manage Users</button>
                                    <button onClick={() => setActiveTab('approvals')} className="p-4 bg-slate-800 rounded-xl border border-white/5 hover:bg-slate-700 transition-all font-bold text-sm text-slate-300">Review Pending</button>
                                    <button onClick={() => setActiveTab('timetables')} className="p-4 bg-slate-800 rounded-xl border border-white/5 hover:bg-slate-700 transition-all font-bold text-sm text-slate-300">Timetables</button>
                                    <button onClick={() => setActiveTab('communication')} className="p-4 bg-slate-800 rounded-xl border border-white/5 hover:bg-slate-700 transition-all font-bold text-sm text-slate-300">Post Notice</button>
                                </div>
                             </Card>
                             <Card className="bg-slate-900/50">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Recent System Activity</h3>
                                <div className="space-y-3">
                                    {recentLogs.map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-white/5 text-[11px]">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${log.action === 'login' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{(log.userName || '?').charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold text-white">{log.userName}</p>
                                                    <p className="text-slate-500 uppercase tracking-tighter">{log.userRole}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${log.action === 'login' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>{log.action}</span>
                                                <p className="text-slate-600 mt-1 font-mono">{log.timestamp?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </Card>
                        </div>
                    </div>
                );
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
            case 'activation': return (
                <div className="space-y-12">
                    <SystemActivation subscriptionStatus={subscriptionStatus} />
                    <SubscriptionCalculator allUsers={allUsers} />
                </div>
            );
            case 'settings': return <AdminSettings />;
            default: return <div className="p-10 text-center text-slate-600">Module offline. Select from navigation.</div>;
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
