
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
import SnapToRegister from './SnapToRegister';
import UserEditModal from './UserEditModal';

const SessionLogsTable: React.FC = () => {
    const [logs, setLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog));
                setLogs(logsData);
                setLoading(false);
            }, () => setLoading(false));
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="p-4 flex justify-center"><Spinner /></div>;

    return (
        <Card className="h-full">
            <h3 className="text-lg font-bold mb-4 text-white">Recent System Activity</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Role</th>
                            <th className="px-4 py-2">Action</th>
                            <th className="px-4 py-2">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {logs.map(log => (
                            <tr key={log.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700">
                                <td className="px-4 py-2 font-medium text-white">{log.userName}</td>
                                <td className="px-4 py-2 capitalize">{log.userRole}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'login' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                        {log.action.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-4 py-2">{log.timestamp?.toDate().toLocaleTimeString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

// ... (OnlineUsersMonitor, AdminSettingsEditor, FlyerDesigner components remain unchanged)
const OnlineUsersMonitor: React.FC = () => {
    const onlineUsers = useAllOnlineUsers();

    return (
        <Card>
            <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Online Users ({onlineUsers.filter(u => u.state === 'online').length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {onlineUsers.filter(u => u.state === 'online').map(user => (
                    <div key={user.uid} className="bg-slate-700 p-3 rounded-lg flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white text-xs">
                            {(user.name || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400 truncate">{user.role} {user.class && `• ${user.class}`}</p>
                        </div>
                    </div>
                ))}
                {onlineUsers.filter(u => u.state === 'online').length === 0 && (
                    <p className="text-gray-500 col-span-full text-center py-4">No users currently online.</p>
                )}
            </div>
        </Card>
    );
};

const AdminSettingsEditor: React.FC<{ settings: SchoolSettings | null }> = ({ settings }) => {
    const { showToast } = useToast();
    const [schoolName, setSchoolName] = useState(settings?.schoolName || '');
    const [schoolMotto, setSchoolMotto] = useState(settings?.schoolMotto || '');
    const [academicYear, setAcademicYear] = useState(settings?.academicYear || '');
    const [currentTerm, setCurrentTerm] = useState(settings?.currentTerm || 1);
    const [isSaving, setIsSaving] = useState(false);
    
    // Sleep Mode State
    const [sleepModeEnabled, setSleepModeEnabled] = useState(settings?.sleepModeConfig?.enabled || false);
    const [sleepTime, setSleepTime] = useState(settings?.sleepModeConfig?.sleepTime || '21:00');
    const [wakeTime, setWakeTime] = useState(settings?.sleepModeConfig?.wakeTime || '05:00');

    useEffect(() => {
        if (settings) {
            setSchoolName(settings.schoolName);
            setSchoolMotto(settings.schoolMotto);
            setAcademicYear(settings.academicYear);
            setCurrentTerm(settings.currentTerm || 1);
            setSleepModeEnabled(settings.sleepModeConfig?.enabled || false);
            setSleepTime(settings.sleepModeConfig?.sleepTime || '21:00');
            setWakeTime(settings.sleepModeConfig?.wakeTime || '05:00');
        }
    }, [settings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.collection('schoolConfig').doc('settings').set({
                schoolName,
                schoolMotto,
                academicYear,
                currentTerm,
                sleepModeConfig: {
                    enabled: sleepModeEnabled,
                    sleepTime,
                    wakeTime
                }
            }, { merge: true });
            showToast("Settings updated successfully.", "success");
        } catch (error: any) {
            showToast("Failed to update settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <h4 className="font-bold text-lg mb-4 border-b border-slate-700 pb-2">General Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">School Name</label>
                            <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Motto</label>
                            <input type="text" value={schoolMotto} onChange={e => setSchoolMotto(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600" />
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-lg mb-4 border-b border-slate-700 pb-2">Academic Session</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Academic Year</label>
                            <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="e.g. 2024/2025" className="w-full p-2 bg-slate-800 rounded border border-slate-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Current Term</label>
                            <select value={currentTerm} onChange={e => setCurrentTerm(Number(e.target.value))} className="w-full p-2 bg-slate-800 rounded border border-slate-600">
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold text-lg mb-4 border-b border-slate-700 pb-2 flex items-center justify-between">
                        <span>Sleep Mode (Student Curfew)</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={sleepModeEnabled} onChange={e => setSleepModeEnabled(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </h4>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${sleepModeEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Sleep Time (Lock)</label>
                            <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Wake Time (Unlock)</label>
                            <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">When enabled, students cannot access the portal between these hours.</p>
                </div>

                <div className="pt-4">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

const FlyerDesigner: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    // ... (FlyerDesigner implementation remains unchanged)
    const { showToast } = useToast();
    const { schoolSettings } = useAuthentication();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetAudience, setTargetAudience] = useState<'all' | 'role' | 'selected'>('all');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);

    const handleRoleToggle = (role: UserRole) => {
        setTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const handlePublish = async () => {
        if (!title.trim() || !content.trim()) {
            showToast("Please add a title and content.", "error");
            return;
        }
        if (targetAudience === 'role' && targetRoles.length === 0) {
            showToast("Please select at least one role.", "error");
            return;
        }

        setIsPublishing(true);
        try {
            const flyerData: Omit<PublishedFlyer, 'id'> = {
                title,
                content,
                targetAudience,
                targetRoles: targetAudience === 'role' ? targetRoles : undefined,
                publisherId: userProfile.uid,
                publisherName: userProfile.name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
            };

            await db.collection('publishedFlyers').add(flyerData);
            showToast("Flyer published successfully!", "success");
            setTitle('');
            setContent('');
            setTargetRoles([]);
            setTargetAudience('all');
        } catch (err: any) {
            showToast(`Failed to publish: ${err.message}`, "error");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Card>
            <h3 className="text-lg font-bold mb-4 text-white">Create Announcement Flyer</h3>
            <div className="space-y-4">
                <input 
                    type="text" 
                    placeholder="Headline / Title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-600 focus:border-blue-500 outline-none text-lg font-bold"
                />
                
                <textarea 
                    placeholder="Write your announcement content here..." 
                    rows={6} 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-600 focus:border-blue-500 outline-none resize-none"
                />

                <div className="space-y-2">
                    <label className="block text-sm text-gray-400">Target Audience</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="audience" value="all" checked={targetAudience === 'all'} onChange={() => setTargetAudience('all')} className="text-blue-500" />
                            <span>Everyone</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="audience" value="role" checked={targetAudience === 'role'} onChange={() => setTargetAudience('role')} className="text-blue-500" />
                            <span>Specific Roles</span>
                        </label>
                    </div>
                </div>

                {targetAudience === 'role' && (
                    <div className="flex flex-wrap gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                        {['student', 'teacher', 'parent'].map(role => (
                            <label key={role} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={targetRoles.includes(role as UserRole)} 
                                    onChange={() => handleRoleToggle(role as UserRole)}
                                    className="rounded bg-slate-700 border-slate-500 text-blue-500"
                                />
                                <span className="capitalize">{role}s</span>
                            </label>
                        ))}
                    </div>
                )}

                <Button onClick={handlePublish} disabled={isPublishing} className="w-full shadow-lg shadow-purple-900/20">
                    {isPublishing ? 'Publishing...' : '📢 Publish to Notice Board'}
                </Button>
            </div>
        </Card>
    );
};

interface AdminViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings, subscriptionStatus } = useAuthentication();
    const { showToast } = useToast();
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
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Snap to Register State
    const [isSnapModalOpen, setIsSnapModalOpen] = useState(false);
    const [snapRole, setSnapRole] = useState<UserRole>('student');
    
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

    const handleEditUser = (user: UserProfile) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async (uid: string, data: Partial<UserProfile>) => {
        try {
            await db.collection('users').doc(uid).update(data);
            showToast("User updated successfully", "success");
            setIsEditModalOpen(false);
            setEditingUser(null);
        } catch (err: any) {
            showToast(`Error updating user: ${err.message}`, "error");
        }
    };

    // ... (bulk delete, role change, select all users logic - unchanged)
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
    
    const openSnapModal = (role: UserRole) => {
        setSnapRole(role);
        setIsSnapModalOpen(true);
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
            // ... (other cases unchanged)
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

                        {/* Bulk Registration Action Card */}
                        <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        📸 Bulk Registration
                                    </h3>
                                    <p className="text-sm text-indigo-200 mt-1">
                                        Instantly create accounts by scanning a class list.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button onClick={() => openSnapModal('student')}>Scan Students</Button>
                                    <Button variant="secondary" onClick={() => openSnapModal('teacher')}>Scan Teachers</Button>
                                    <Button variant="secondary" onClick={() => openSnapModal('parent')}>Scan Parents</Button>
                                </div>
                            </div>
                        </Card>

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
                                                                            {user.photoURL ? (
                                                                                <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                                                                    {(user.name || '?').charAt(0)}
                                                                                </div>
                                                                            )}
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
                                                                    <button 
                                                                        onClick={() => handleEditUser(user)}
                                                                        className="text-blue-400 hover:text-white text-xs font-medium px-3 py-1 rounded border border-slate-600 hover:bg-slate-700"
                                                                    >
                                                                        Edit
                                                                    </button>
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
            {isSnapModalOpen && (
                <SnapToRegister 
                    onClose={() => setIsSnapModalOpen(false)} 
                    roleToRegister={snapRole}
                    availableStudents={snapRole === 'parent' ? allUsers.filter(u => u.role === 'student') : undefined}
                />
            )}
            {isEditModalOpen && editingUser && (
                <UserEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={editingUser}
                    onSave={handleSaveUser}
                    allUsers={allUsers}
                    subjectsByClass={null}
                />
            )}
        </div>
    );
};

export default AdminView;
