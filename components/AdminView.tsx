
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, storage, functions, firebase } from '../services/firebase';
import Sidebar from './common/Sidebar';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { AdminApprovalQueue } from './AdminApprovalQueue';
import AdminCreateUserForm from './AdminCreateUserForm';
import AdminCreateParentForm from './AdminCreateParentForm';
import TimetableManager from './TimetableManager';
import { useAllOnlineUsers } from '../hooks/useOnlineStatus';
import { UserProfile, UserActivityLog, SchoolSettings, GES_CLASSES, PublishedFlyer, UserRole, AttendanceRecord } from '../types';
import { useApproveUser } from '../hooks/useApproveUser';
import { useRejectUser } from '../hooks/useRejectUser';
import { useToast } from './common/Toast';
import AdminAttendanceDashboard from './AdminAttendanceDashboard';
import AdminTerminalReports from './AdminTerminalReports';
import AdminClassManagement from './AdminClassManagement';
import AdminCalendar from './AdminCalendar';
import AdminMaterials from './AdminMaterials';
import SystemActivation from './SystemActivation';
import ConfirmationModal from './common/ConfirmationModal';
import SubscriptionCalculator from './SubscriptionCalculator';

// --- SUB-COMPONENTS ---

const OnlineUsersMonitor: React.FC = () => {
    const onlineUsers = useAllOnlineUsers();
    const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

    const filteredUsers = onlineUsers.filter(u => {
        if (filter === 'online') return u.state === 'online';
        if (filter === 'offline') return u.state === 'offline';
        return true;
    });

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Active User Monitor
                </h3>
                <div className="flex gap-2 text-sm">
                    <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400'}`}>All</button>
                    <button onClick={() => setFilter('online')} className={`px-3 py-1 rounded-full ${filter === 'online' ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-400'}`}>Online</button>
                    <button onClick={() => setFilter('offline')} className={`px-3 py-1 rounded-full ${filter === 'offline' ? 'bg-gray-600 text-white' : 'bg-slate-700 text-gray-400'}`}>Offline</button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                {filteredUsers.map(user => (
                    <div key={user.uid} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.state === 'online' ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {(user.name || '?').charAt(0)}
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-semibold truncate text-white">{user.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400 capitalize">{user.role || 'User'} &bull; {user.class || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-block w-3 h-3 rounded-full ${user.state === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-500'}`}></span>
                            {user.state === 'offline' && (
                                <p className="text-[10px] text-gray-500 mt-1">{new Date(user.last_changed).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            )}
                        </div>
                    </div>
                ))}
                {filteredUsers.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No users found matching filter.</p>}
            </div>
        </Card>
    );
};

const SessionLogsTable: React.FC = () => {
    const [logs, setLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog)));
                setLoading(false);
            }, err => {
                console.error("Log fetch error:", err);
                setError("Failed to load logs. Missing index?");
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    if (loading) return <Spinner />;
    if (error) return <p className="text-red-400 text-sm text-center p-4">{error}</p>;

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Session Logs</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="bg-slate-800 border-b border-slate-700">
                                <td className="px-4 py-3">{log.timestamp?.toDate().toLocaleString()}</td>
                                <td className="px-4 py-3 font-medium text-white">{log.userName}</td>
                                <td className="px-4 py-3 capitalize">{log.userRole}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'login' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {log.action.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const AdminSettingsEditor: React.FC<{ settings: SchoolSettings | null }> = ({ settings }) => {
    const { showToast } = useToast();
    const [localSettings, setLocalSettings] = useState<SchoolSettings>(settings || { schoolName: '', schoolMotto: '', academicYear: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await db.collection('schoolConfig').doc('settings').set(localSettings, { merge: true });
            showToast('Settings updated successfully', 'success');
        } catch (e) {
            showToast('Failed to update settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">School Configuration</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">School Name</label>
                    <input type="text" value={localSettings.schoolName} onChange={e => setLocalSettings({...localSettings, schoolName: e.target.value})} className="w-full p-2 bg-slate-700 rounded-md mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Motto</label>
                    <input type="text" value={localSettings.schoolMotto} onChange={e => setLocalSettings({...localSettings, schoolMotto: e.target.value})} className="w-full p-2 bg-slate-700 rounded-md mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Academic Year</label>
                    <input type="text" value={localSettings.academicYear} onChange={e => setLocalSettings({...localSettings, academicYear: e.target.value})} className="w-full p-2 bg-slate-700 rounded-md mt-1" />
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <h4 className="font-bold text-sm mb-2">Sleep Mode</h4>
                    <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={localSettings.sleepModeConfig?.enabled || false} onChange={e => setLocalSettings({...localSettings, sleepModeConfig: { ...localSettings.sleepModeConfig!, enabled: e.target.checked }})} className="rounded bg-slate-800 border-slate-600" />
                            <span>Enable Sleep Mode</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400">Sleep Time</label>
                            <input type="time" value={localSettings.sleepModeConfig?.sleepTime || "21:00"} onChange={e => setLocalSettings({...localSettings, sleepModeConfig: { ...localSettings.sleepModeConfig!, sleepTime: e.target.value }})} className="w-full p-2 bg-slate-800 rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Wake Time</label>
                            <input type="time" value={localSettings.sleepModeConfig?.wakeTime || "05:00"} onChange={e => setLocalSettings({...localSettings, sleepModeConfig: { ...localSettings.sleepModeConfig!, wakeTime: e.target.value }})} className="w-full p-2 bg-slate-800 rounded-md mt-1" />
                        </div>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Configuration'}</Button>
            </div>
        </Card>
    );
};

const FlyerDesigner: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetAudience, setTargetAudience] = useState<'all' | 'role' | 'selected'>('all');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [publishing, setPublishing] = useState(false);

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            showToast("Title and content are required", "error");
            return;
        }
        setPublishing(true);
        try {
            const flyerData: Omit<PublishedFlyer, 'id'> = {
                title,
                content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                publisherId: userProfile.uid,
                publisherName: userProfile.name,
                targetAudience,
                targetRoles: targetAudience === 'role' ? targetRoles : undefined,
            };

            await db.collection('publishedFlyers').add(flyerData);

            // --- Send Notifications ---
            let recipientUids: string[] = [];

            if (targetAudience === 'all') {
                // Fetch all approved users
                const usersSnap = await db.collection('users').where('status', '==', 'approved').get();
                recipientUids = usersSnap.docs.map(doc => doc.id);
            } else if (targetAudience === 'role' && targetRoles.length > 0) {
                // Fetch users with specific roles
                const usersSnap = await db.collection('users')
                    .where('status', '==', 'approved')
                    .where('role', 'in', targetRoles)
                    .get();
                recipientUids = usersSnap.docs.map(doc => doc.id);
            }

            // Filter out the publisher
            recipientUids = recipientUids.filter(uid => uid !== userProfile.uid);

            if (recipientUids.length > 0) {
                const notificationMessage = `New Notice Posted: ${title}`;
                const BATCH_SIZE = 500;
                for (let i = 0; i < recipientUids.length; i += BATCH_SIZE) {
                    const batch = db.batch();
                    const chunk = recipientUids.slice(i, i + BATCH_SIZE);
                    chunk.forEach(uid => {
                        const ref = db.collection('notifications').doc();
                        batch.set(ref, {
                            userId: uid,
                            senderId: userProfile.uid,
                            senderName: userProfile.name,
                            message: notificationMessage,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            readBy: []
                        });
                    });
                    await batch.commit();
                }
            }
            // --------------------------

            showToast(`Notice published! Sent notifications to ${recipientUids.length} users.`, "success");
            setTitle('');
            setContent('');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, "error");
        } finally {
            setPublishing(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Digital Notice Board</h3>
            <form onSubmit={handlePublish} className="space-y-4">
                <input type="text" placeholder="Notice Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-700 rounded-md text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold placeholder-slate-400" />
                <textarea
                    placeholder="Write your announcement here..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={8}
                    className="w-full p-4 bg-slate-700 rounded-md text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none resize-y text-base placeholder-slate-400 leading-relaxed"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm block mb-1 text-gray-400">Target Audience</label>
                        <select value={targetAudience} onChange={e => setTargetAudience(e.target.value as any)} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="all">Everyone</option>
                            <option value="role">Specific Roles</option>
                        </select>
                    </div>
                    {targetAudience === 'role' && (
                        <div>
                            <label className="text-sm block mb-1 text-gray-400">Select Roles</label>
                            <div className="flex gap-4 p-2 bg-slate-700/50 rounded-md border border-slate-600">
                                {['student', 'teacher', 'parent'].map(role => (
                                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={targetRoles.includes(role as UserRole)} onChange={e => {
                                            if (e.target.checked) setTargetRoles([...targetRoles, role as UserRole]);
                                            else setTargetRoles(targetRoles.filter(r => r !== role));
                                        }} className="rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-500" />
                                        <span className="capitalize text-gray-200">{role}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <Button type="submit" disabled={publishing} className="w-full shadow-lg shadow-blue-600/20 py-3">
                    {publishing ? 'Publishing...' : 'Publish Notice'}
                </Button>
            </form>
        </Card>
    );
};

// --- MAIN ADMIN VIEW ---

interface AdminViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings, subscriptionStatus } = useAuthentication();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [viewingTimetableClassId, setViewingTimetableClassId] = useState<string | null>(null);
    
    // User Management State
    const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<UserRole | 'all'>('all');
    const [userClassFilter, setUserClassFilter] = useState<string>('all');
    const [bulkRoleTarget, setBulkRoleTarget] = useState<UserRole>('student');
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

    const [rejectUsers, { loading: deletingUsers }] = useRejectUser();
    const [approveUsers, { loading: updatingUsers }] = useApproveUser();
    const onlineUsersMap = useAllOnlineUsers(); // Get online statuses

    useEffect(() => {
        const unsubscribe = db.collection('users').onSnapshot(snapshot => {
            const users = snapshot.docs.map(doc => doc.data() as UserProfile);
            setAllUsers(users);
            setLoadingUsers(false);
        });
        return () => unsubscribe();
    }, []);
    
    // Fetch attendance for dashboard
    useEffect(() => {
        if (activeTab === 'attendance') {
            const unsubscribe = db.collection('attendance').orderBy('date', 'desc').limit(100).onSnapshot(snap => {
                setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch = (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
            const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
            const matchesClass = userClassFilter === 'all' || u.class === userClassFilter; // Only filters students by class usually
            return matchesSearch && matchesRole && matchesClass;
        });
    }, [allUsers, userSearchTerm, userRoleFilter, userClassFilter]);

    const handleBulkDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmBulkDelete = async () => {
        const usersToDelete = allUsers
            .filter(u => selectedUserUids.includes(u.uid))
            .map(u => ({ uid: u.uid, role: u.role }));
            
        await rejectUsers(usersToDelete);
        setSelectedUserUids([]);
        setIsDeleteModalOpen(false);
    };

    const handleBulkRoleChange = async () => {
        const usersToUpdate = selectedUserUids.map(uid => ({ uid, role: bulkRoleTarget }));
        await approveUsers(usersToUpdate);
        setSelectedUserUids([]);
    };

    const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserUids(filteredUsers.map(u => u.uid));
        } else {
            setSelectedUserUids([]);
        }
    };

    const navItems = [
        { key: 'dashboard', label: 'Command Center', icon: <span className="text-xl">🚀</span> },
        { key: 'activity_monitoring', label: 'Activity Monitor', icon: <span className="text-xl">📡</span> },
        { key: 'approvals', label: 'Approvals', icon: <span className="text-xl">✅</span> },
        { key: 'class_management', label: 'Class Management', icon: <span className="text-xl">🏫</span> },
        { key: 'user_management', label: 'User Management', icon: <span className="text-xl">👥</span> },
        { key: 'timetables', label: 'Timetables', icon: <span className="text-xl">🗓️</span> },
        { key: 'calendar', label: 'School Calendar', icon: <span className="text-xl">📅</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📊</span> },
        { key: 'terminal_reports', label: 'Terminal Reports', icon: <span className="text-xl">📈</span> },
        { key: 'teaching_materials', label: 'Teaching Material', icon: <span className="text-xl">📚</span> },
        { key: 'communication', label: 'Communication', icon: <span className="text-xl">📢</span> },
        { key: 'system_activation', label: 'System Activation', icon: <span className="text-xl">🔑</span> },
        { key: 'settings', label: 'Settings', icon: <span className="text-xl">⚙️</span> },
    ];

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        {/* Header with Gradient */}
                        <div className="relative bg-gradient-to-r from-indigo-900 to-purple-900 p-8 rounded-3xl overflow-hidden shadow-2xl border border-indigo-500/30">
                            <div className="relative z-10">
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">EXECUTIVE COMMAND</h2>
                                <p className="text-blue-200">System Overview & Administrative Controls</p>
                                <div className="flex gap-4 mt-6">
                                    <div className="bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                                        <span className="text-xs text-gray-400 uppercase font-bold">Status</span>
                                        <p className="text-green-400 font-mono font-bold">OPERATIONAL</p>
                                    </div>
                                    <div className="bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                                        <span className="text-xs text-gray-400 uppercase font-bold">License</span>
                                        <p className={`font-mono font-bold ${subscriptionStatus?.isActive ? 'text-blue-400' : 'text-red-400'}`}>
                                            {subscriptionStatus?.isActive ? 'ACTIVE' : 'EXPIRED'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="!bg-slate-800/80 text-center py-6">
                                <span className="text-3xl mb-2 block">🎓</span>
                                <p className="text-3xl font-bold text-white">{allUsers.filter(u => u.role === 'student').length}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Students</p>
                            </Card>
                            <Card className="!bg-slate-800/80 text-center py-6">
                                <span className="text-3xl mb-2 block">👩‍🏫</span>
                                <p className="text-3xl font-bold text-white">{allUsers.filter(u => u.role === 'teacher').length}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Teachers</p>
                            </Card>
                            <Card className="!bg-slate-800/80 text-center py-6">
                                <span className="text-3xl mb-2 block">👨‍👩‍👧</span>
                                <p className="text-3xl font-bold text-white">{allUsers.filter(u => u.role === 'parent').length}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Parents</p>
                            </Card>
                            <Card className="!bg-slate-800/80 text-center py-6">
                                <span className="text-3xl mb-2 block">⏳</span>
                                <p className="text-3xl font-bold text-yellow-400">{allUsers.filter(u => u.status === 'pending').length}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Pending</p>
                            </Card>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-lg font-bold mb-4 text-white">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button onClick={() => setActiveTab('user_management')} variant="secondary">Manage Users</Button>
                                    <Button onClick={() => setActiveTab('approvals')} variant="secondary">Review Pending</Button>
                                    <Button onClick={() => setActiveTab('timetables')} variant="secondary">Timetables</Button>
                                    <Button onClick={() => setActiveTab('communication')} variant="secondary">Post Notice</Button>
                                </div>
                            </Card>
                            <SessionLogsTable />
                        </div>
                    </div>
                );
            case 'activity_monitoring':
                return (
                    <div className="space-y-6">
                        <OnlineUsersMonitor />
                        <SessionLogsTable />
                    </div>
                );
            case 'approvals':
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Pending Approvals</h2>
                        <AdminApprovalQueue allUsers={allUsers} />
                    </div>
                );
            case 'class_management':
                return <AdminClassManagement allUsers={allUsers} />;
            case 'calendar':
                return <AdminCalendar />;
            case 'teaching_materials':
                return <AdminMaterials />;
            case 'user_management':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">User Management</h2>
                            <div className="flex gap-2">
                                {/* Hidden modals for creation can be toggled here if needed */}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Toolbar */}
                                <div className="flex flex-wrap gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <input 
                                        type="search" 
                                        placeholder="Search users..." 
                                        value={userSearchTerm}
                                        onChange={e => setUserSearchTerm(e.target.value)}
                                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm flex-grow"
                                    />
                                    <select 
                                        value={userRoleFilter} 
                                        onChange={e => setUserRoleFilter(e.target.value as any)}
                                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="student">Students</option>
                                        <option value="teacher">Teachers</option>
                                        <option value="parent">Parents</option>
                                        <option value="admin">Admins</option>
                                    </select>
                                    <select 
                                        value={userClassFilter} 
                                        onChange={e => setUserClassFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="all">All Classes</option>
                                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {/* Bulk Actions Bar */}
                                {selectedUserUids.length > 0 && (
                                    <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded-xl flex items-center justify-between animate-fade-in-short">
                                        <span className="text-blue-200 font-semibold ml-2">{selectedUserUids.length} users selected</span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                                                <select 
                                                    value={bulkRoleTarget}
                                                    onChange={e => setBulkRoleTarget(e.target.value as UserRole)}
                                                    className="bg-transparent text-sm border-none focus:ring-0 text-white"
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="teacher">Teacher</option>
                                                    <option value="parent">Parent</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <Button size="sm" onClick={handleBulkRoleChange} disabled={updatingUsers}>Change Role</Button>
                                            </div>
                                            <Button size="sm" variant="danger" onClick={handleBulkDeleteClick} disabled={deletingUsers}>
                                                {deletingUsers ? 'Deleting...' : 'Delete Users'}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* User Table */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
                                    <div className="min-w-[800px]">
                                        <table className="w-full text-left text-sm text-gray-400">
                                            <thead className="bg-slate-900 text-gray-200 uppercase text-xs">
                                                <tr>
                                                    <th className="p-4 w-4">
                                                        <input type="checkbox" onChange={handleSelectAllUsers} checked={selectedUserUids.length > 0 && selectedUserUids.length === filteredUsers.length} className="rounded bg-slate-700 border-slate-600" />
                                                    </th>
                                                    <th className="p-4">User</th>
                                                    <th className="p-4">Role</th>
                                                    <th className="p-4">Details</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {loadingUsers ? (
                                                    <tr><td colSpan={5} className="p-8 text-center"><Spinner/></td></tr>
                                                ) : filteredUsers.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-8 text-center">No users found.</td></tr>
                                                ) : (
                                                    filteredUsers.map(user => {
                                                        const isOnline = onlineUsersMap.find(u => u.uid === user.uid)?.state === 'online';
                                                        return (
                                                            <tr key={user.uid} className={`hover:bg-slate-700/50 ${selectedUserUids.includes(user.uid) ? 'bg-blue-900/10' : ''}`}>
                                                                <td className="p-4">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={selectedUserUids.includes(user.uid)}
                                                                        onChange={() => setSelectedUserUids(prev => prev.includes(user.uid) ? prev.filter(id => id !== user.uid) : [...prev, user.uid])}
                                                                        className="rounded bg-slate-700 border-slate-600"
                                                                    />
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="relative">
                                                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                                                                {(user.name || '?').charAt(0)}
                                                                            </div>
                                                                            {isOnline && <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></span>}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-white">{user.name}</p>
                                                                            <p className="text-xs">{user.email}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                                                        user.role === 'teacher' ? 'bg-blue-500/20 text-blue-400' :
                                                                        'bg-slate-700 text-slate-300'
                                                                    }`}>
                                                                        {user.role}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    {user.class && <span className="bg-slate-700 px-2 py-1 rounded text-xs mr-2">{user.class}</span>}
                                                                    {user.childUids && user.childUids.length > 0 && <span className="bg-slate-700 px-2 py-1 rounded text-xs">{user.childUids.length} Children</span>}
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <button className="text-blue-400 hover:text-white text-xs font-medium px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">Edit</button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Creation Forms */}
                            <div className="space-y-6">
                                <Card>
                                    <AdminCreateUserForm />
                                </Card>
                                <Card>
                                    <AdminCreateParentForm allStudents={allUsers.filter(u => u.role === 'student')} />
                                </Card>
                            </div>
                        </div>
                    </div>
                );
            case 'timetables':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">Timetables</h2>
                            <select value={viewingTimetableClassId || ''} onChange={e => setViewingTimetableClassId(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                                <option value="">Select Class to Manage</option>
                                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {viewingTimetableClassId ? (
                            <TimetableManager classId={viewingTimetableClassId} />
                        ) : (
                            <Card>
                                <div className="text-center py-16">
                                    <span className="text-6xl mb-4 block opacity-20">🗓️</span>
                                    <p className="text-xl text-gray-300">Select a class above to view, edit, or generate its timetable.</p>
                                    <p className="text-sm text-gray-500 mt-2">You can use AI to automatically create schedules based on the curriculum.</p>
                                </div>
                            </Card>
                        )}
                    </div>
                );
            case 'attendance':
                return <AdminAttendanceDashboard allUsers={allUsers} attendanceRecords={attendanceRecords} />;
            case 'terminal_reports':
                return <AdminTerminalReports schoolSettings={schoolSettings} user={user} />;
            case 'communication':
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Communication</h2>
                        <FlyerDesigner userProfile={userProfile!} />
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Settings</h2>
                        <AdminSettingsEditor settings={schoolSettings} />
                    </div>
                );
            case 'system_activation':
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">System Activation</h2>
                        <div className="grid grid-cols-1 gap-6">
                            <SystemActivation subscriptionStatus={subscriptionStatus} />
                            <SubscriptionCalculator allUsers={allUsers} />
                        </div>
                    </div>
                );
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            <Sidebar 
                isExpanded={isSidebarExpanded}
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={() => setIsSidebarExpanded(false)}
                title="Admin Portal"
            />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950 text-slate-200">
                {renderContent()}
            </main>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmBulkDelete}
                title="Confirm Bulk Deletion"
                message={`Are you sure you want to delete ${selectedUserUids.length} users? This action cannot be undone and will remove all their data immediately.`}
                isLoading={deletingUsers}
                confirmButtonText="Yes, Delete Users"
            />
        </div>
    );
};

export default AdminView;
