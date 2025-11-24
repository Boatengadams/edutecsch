
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, functions, storage, firebase, rtdb } from '../services/firebase';
import { 
    UserProfile, UserRole, SchoolEvent, SchoolEventType, SchoolEventAudience, EVENT_TYPES, EVENT_AUDIENCE, GES_CLASSES, TeachingMaterial, Timetable, TimetableData, TimetablePeriod, SubjectsByClass, GES_STANDARD_CURRICULUM, AttendanceRecord, AttendanceStatus, SchoolSettings, GES_SUBJECTS, Presentation, Notification, TerminalReport, ReportSummary, TerminalReportMark, ActivationToken, PublishedFlyer, UserActivityLog 
} from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useAuthentication } from '../hooks/useAuth';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import AIAssistant from './AIAssistant';
import ChangePasswordModal from './common/ChangePasswordModal';
import { useToast } from './common/Toast';
import UserEditModal from './UserEditModal';
import PieChart from './common/charts/PieChart';
import BarChart from './common/charts/BarChart';
import { useCreateUser } from '../hooks/useCreateUser';
import SnapToRegister from './SnapToRegister';
import { AdminApprovalQueue } from './AdminApprovalQueue';
import ConfirmationModal from './common/ConfirmationModal';
import { useRejectUser } from '../hooks/useRejectUser';
import AdminCreateUserForm from './AdminCreateUserForm';
import AdminCreateParentForm from './AdminCreateParentForm';
import AdminAttendanceDashboard from './AdminAttendanceDashboard';
import SystemActivation from './SystemActivation';
import MessagingView from './MessagingView';
import html2canvas from 'html2canvas';
import { useOnlineStatus, useAllOnlineUsers } from '../hooks/useOnlineStatus';

// --- Helper Components Definitions ---

const SessionLogsTable: React.FC = () => {
    const [logs, setLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .onSnapshot(snapshot => {
                setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog)));
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const uniqueUserIds = useMemo(() => {
        return Array.from(new Set(logs.map(log => log.userId)));
    }, [logs]);

    const userStatuses = useOnlineStatus(uniqueUserIds);

    if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Activity & Session Logs</h3>
                <div className="text-xs text-gray-400">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online
                    <span className="inline-block w-2 h-2 border border-gray-500 rounded-full ml-3 mr-1"></span> Offline
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">Class/Context</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => {
                            const isOnline = userStatuses[log.userId] === 'online';
                            return (
                                <tr key={log.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                        {log.timestamp?.toDate().toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                        <div className="relative flex h-2.5 w-2.5">
                                            {isOnline ? (
                                                <>
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                </>
                                            ) : (
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 border border-gray-500"></span>
                                            )}
                                        </div>
                                        {log.userName}
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        {log.userRole}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'login' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {log.action.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.userClass}
                                    </td>
                                </tr>
                            );
                        })}
                        {logs.length === 0 && (
                             <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No session logs available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

const OnlineUsersMonitor: React.FC = () => {
    const onlineUsers = useAllOnlineUsers();

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold">Active Users Monitor</h3>
                    <p className="text-sm text-gray-400">Real-time view of users currently logged in.</p>
                </div>
                <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/30 px-3 py-1 rounded-full">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-green-400 font-bold">{onlineUsers.length} Online</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {onlineUsers.map(user => (
                    <div key={user.uid} className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {user.name ? user.name.charAt(0) : '?'}
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-white">{user.name || 'Unknown User'}</p>
                                <p className="text-xs text-gray-400 capitalize">{user.role || 'User'} &bull; {user.class || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="text-xs text-green-400 font-mono">
                            {new Date(user.last_changed).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                ))}
                {onlineUsers.length === 0 && (
                    <p className="col-span-full text-center text-gray-500 py-10">No users currently online.</p>
                )}
            </div>
        </Card>
    );
};

const AdminSettingsEditor: React.FC = () => {
    const { schoolSettings } = useAuthentication();
    const { showToast } = useToast();
    const [formData, setFormData] = useState<SchoolSettings>({
        schoolName: '',
        schoolMotto: '',
        academicYear: '',
        currentTerm: 1,
        sleepModeConfig: { enabled: false, sleepTime: '21:00', wakeTime: '05:00' }
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (schoolSettings) {
            setFormData({
                ...schoolSettings,
                sleepModeConfig: schoolSettings.sleepModeConfig || { enabled: false, sleepTime: '21:00', wakeTime: '05:00' }
            });
        }
    }, [schoolSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSleepModeChange = (field: keyof SchoolSettings['sleepModeConfig'], value: any) => {
        setFormData(prev => ({
            ...prev,
            sleepModeConfig: {
                ...prev.sleepModeConfig!,
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await db.collection('schoolConfig').doc('settings').set(formData, { merge: true });
            showToast('System settings updated successfully!', 'success');
        } catch (err: any) {
            console.error("Error updating settings:", err);
            showToast(`Error updating settings: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">System Configuration</h2>
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-t-4 border-blue-500">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><span>🏫</span> General Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">School Name</label>
                            <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">School Motto</label>
                            <input type="text" name="schoolMotto" value={formData.schoolMotto} onChange={handleChange} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>
                </Card>

                <Card className="border-t-4 border-green-500">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><span>📅</span> Academic Session</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Current Academic Year</label>
                            <input type="text" name="academicYear" value={formData.academicYear} onChange={handleChange} placeholder="e.g. 2024-2025" className="w-full p-2 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-green-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Current Term</label>
                            <select name="currentTerm" value={formData.currentTerm} onChange={handleChange} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-green-500 focus:outline-none">
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card className="border-t-4 border-purple-500 md:col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2"><span>🌙</span> Digital Wellbeing (Sleep Mode)</h3>
                            <p className="text-sm text-gray-400 mt-1">Automatically restrict student access to the platform during rest hours.</p>
                        </div>
                        <div className="flex items-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={formData.sleepModeConfig?.enabled} onChange={(e) => handleSleepModeChange('enabled', e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-300">{formData.sleepModeConfig?.enabled ? 'Enabled' : 'Disabled'}</span>
                            </label>
                        </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-6 transition-opacity duration-300 ${!formData.sleepModeConfig?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Sleep Time (Lock)</label>
                            <input type="time" value={formData.sleepModeConfig?.sleepTime} onChange={(e) => handleSleepModeChange('sleepTime', e.target.value)} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Wake Time (Unlock)</label>
                            <input type="time" value={formData.sleepModeConfig?.wakeTime} onChange={(e) => handleSleepModeChange('wakeTime', e.target.value)} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Added Missing Components ---

const FlyerDesigner: React.FC<{ onClose: () => void; allUsers: UserProfile[]; userProfile: UserProfile }> = ({ onClose, allUsers, userProfile }) => {
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [targetAudience, setTargetAudience] = useState<'all' | 'role' | 'selected'>('all');
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        if (!title || !file) {
            showToast("Please provide a title and an image.", 'error');
            return;
        }
        setIsPosting(true);
        try {
            const storageRef = storage.ref(`flyers/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const imageUrl = await storageRef.getDownloadURL();

            await db.collection('publishedFlyers').add({
                title,
                imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                publisherId: userProfile.uid,
                publisherName: userProfile.name,
                targetAudience,
                targetRoles: targetAudience === 'role' ? selectedRoles : null,
            });
            showToast("Flyer published successfully!", 'success');
            onClose();
        } catch (error: any) {
            showToast(`Failed to publish flyer: ${error.message}`, 'error');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Create Flyer</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="space-y-4">
                <input type="text" placeholder="Flyer Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700" />
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-400" />
                <select value={targetAudience} onChange={e => setTargetAudience(e.target.value as any)} className="w-full p-2 bg-slate-800 rounded-md border border-slate-700">
                    <option value="all">All Users</option>
                    <option value="role">Specific Roles</option>
                </select>
                {targetAudience === 'role' && (
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedRoles.includes('student')} onChange={() => setSelectedRoles(prev => prev.includes('student') ? prev.filter(r => r !== 'student') : [...prev, 'student'])} /> Students</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedRoles.includes('parent')} onChange={() => setSelectedRoles(prev => prev.includes('parent') ? prev.filter(r => r !== 'parent') : [...prev, 'parent'])} /> Parents</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedRoles.includes('teacher')} onChange={() => setSelectedRoles(prev => prev.includes('teacher') ? prev.filter(r => r !== 'teacher') : [...prev, 'teacher'])} /> Teachers</label>
                    </div>
                )}
                <Button onClick={handlePost} disabled={isPosting} className="w-full">{isPosting ? 'Publishing...' : 'Publish Flyer'}</Button>
            </div>
        </Card>
    );
};

const AdminTerminalReports: React.FC<{ allUsers: UserProfile[]; schoolSettings: SchoolSettings | null; userProfile: UserProfile | null }> = ({ allUsers, schoolSettings }) => {
    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Terminal Reports Overview</h3>
            <p className="text-gray-400">Use this section to view and print terminal reports for all classes.</p>
            {/* Simplified implementation for placeholder */}
            <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                <p className="text-center text-sm text-gray-500">Select a class to view reports (Implementation Pending)</p>
            </div>
        </Card>
    );
};

const ClassManagerModal: React.FC<{ classId: string; allUsers: UserProfile[]; onClose: () => void; onSave: () => void }> = ({ classId, allUsers, onClose }) => {
    const currentTeacher = allUsers.find(u => u.role === 'teacher' && u.classTeacherOf === classId);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Manage Class: {classId}</h3>
                <p className="mb-4">Current Teacher: <span className="text-blue-400">{currentTeacher?.name || 'None'}</span></p>
                <p className="text-sm text-gray-400 mb-6">To change the class teacher, edit the specific teacher's profile in 'User Management'.</p>
                <Button onClick={onClose} className="w-full">Close</Button>
            </Card>
        </div>
    );
};

// --- Main Admin View ---

export const AdminView: React.FC<{ isSidebarExpanded: boolean; setIsSidebarExpanded: (isExpanded: boolean) => void; }> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { userProfile, schoolSettings, subscriptionStatus } = useAuthentication();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showCreateUserForm, setShowCreateUserForm] = useState(false);
    const [showSnapRegister, setShowSnapRegister] = useState(false);
    const [roleToRegister, setRoleToRegister] = useState<UserRole>('student');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [managingClassId, setManagingClassId] = useState<string | null>(null);
    const [viewingTimetableClassId, setViewingTimetableClassId] = useState<string | null>(null);
    const [classTimetableData, setClassTimetableData] = useState<TimetableData | null>(null);
    const [showFlyerDesigner, setShowFlyerDesigner] = useState(false);

    // Fetch all users
    useEffect(() => {
        const unsubscribe = db.collection('users').onSnapshot(snapshot => {
            const users = snapshot.docs.map(doc => doc.data() as UserProfile);
            setAllUsers(users);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // Fetch all attendance
    useEffect(() => {
        if (activeTab === 'attendance') {
            const unsubscribe = db.collection('attendance').limit(100).onSnapshot(snapshot => {
                setAttendanceRecords(snapshot.docs.map(doc => doc.data() as AttendanceRecord));
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    // Fetch timetable when class selected
    useEffect(() => {
        if (activeTab === 'timetables' && viewingTimetableClassId) {
            const unsub = db.collection('timetables').doc(viewingTimetableClassId).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data() as Timetable;
                    setClassTimetableData(data.timetableData);
                } else {
                    setClassTimetableData(null);
                }
            });
            return () => unsub();
        }
    }, [activeTab, viewingTimetableClassId]);


    const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
        try {
            await db.collection('users').doc(uid).update(data);
            showToast('User updated successfully', 'success');
            setEditingUser(null);
        } catch (error: any) {
            showToast(`Error updating user: ${error.message}`, 'error');
        }
    };

    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">📊</span> },
        { key: 'online_monitor', label: 'Online Monitor', icon: <span className="text-xl">🟢</span> },
        { key: 'session_logs', label: 'Session Logs', icon: <span className="text-xl">📜</span> },
        { key: 'approval_queue', label: 'Approval Queue', icon: <span className="text-xl">✅</span> },
        { key: 'users', label: 'User Management', icon: <span className="text-xl">👥</span> },
        { key: 'classes', label: 'Class Management', icon: <span className="text-xl">🏫</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
        { key: 'timetables', label: 'Timetables', icon: <span className="text-xl">🗓️</span> },
        { key: 'calendar', label: 'School Calendar', icon: <span className="text-xl">📆</span> },
        { key: 'materials', label: 'Teaching Materials', icon: <span className="text-xl">📚</span> },
        { key: 'reports', label: 'Terminal Reports', icon: <span className="text-xl">📄</span> },
        { key: 'communication', label: 'Communication', icon: <span className="text-xl">💬</span> },
        { key: 'activation', label: 'System Activation', icon: <span className="text-xl">🔑</span> },
        { key: 'settings', label: 'Settings', icon: <span className="text-xl">⚙️</span> },
    ];
    
    const subjectsByClass: Record<string, string[]> = {};
    allUsers.filter(u => u.role === 'teacher').forEach(t => {
        if (t.subjectsByClass) {
            Object.entries(t.subjectsByClass).forEach(([cls, subs]) => {
                if (!subjectsByClass[cls]) subjectsByClass[cls] = [];
                if (Array.isArray(subs)) {
                     subs.forEach(s => { if (!subjectsByClass[cls].includes(s)) subjectsByClass[cls].push(s); });
                }
            });
        }
    });
    
    const contactsForMessaging = useMemo(() => allUsers.filter(u => u.uid !== userProfile?.uid && u.status === 'approved'), [allUsers, userProfile]);

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

        switch(activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-8">
                        {/* Executive Header */}
                        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">Executive Command Center</h2>
                                    <p className="text-slate-400">System Overview & Administrative Controls</p>
                                </div>
                                <div className="flex items-center gap-4 mt-4 md:mt-0">
                                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                                        <span className="block text-xs text-slate-500 uppercase tracking-wider font-bold">Status</span>
                                        <span className="block text-green-400 font-mono">OPERATIONAL</span>
                                    </div>
                                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                                        <span className="block text-xs text-slate-500 uppercase tracking-wider font-bold">License</span>
                                        <span className={`block font-mono ${subscriptionStatus?.isActive ? 'text-blue-400' : 'text-red-400'}`}>
                                            {subscriptionStatus?.isActive ? 'ACTIVE' : 'EXPIRED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Core Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students</span>
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-white group-hover:bg-blue-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" /></svg>
                                    </div>
                                </div>
                                <span className="text-3xl font-bold text-white">{allUsers.filter(u => u.role === 'student').length}</span>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teachers</span>
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-white group-hover:bg-purple-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.452.105.91.105 1.374 0 5.153-3.02 9.815-7.786 11.985a.53.53 0 0 1-.434 0C4.92 16.59 1.9 11.928 1.9 6.785c0-.463.036-.922.105-1.374a.5.5 0 0 1 .479-.425 11.947 11.947 0 0 0 7.177-2.75Z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                                <span className="text-3xl font-bold text-white">{allUsers.filter(u => u.role === 'teacher').length}</span>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-yellow-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending</span>
                                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 group-hover:text-white group-hover:bg-yellow-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                                <span className="text-3xl font-bold text-white">{allUsers.filter(u => u.status === 'pending').length}</span>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-green-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health</span>
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400 group-hover:text-white group-hover:bg-green-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V15a3 3 0 1 0 3 3V3.5A1.5 1.5 0 0 0 3.5 2Zm4.5 0A1.5 1.5 0 0 0 6.5 3.5V15a3 3 0 1 0 3 3V3.5A1.5 1.5 0 0 0 8 2Zm4.5 0A1.5 1.5 0 0 0 11 3.5V15a3 3 0 1 0 3 3V3.5A1.5 1.5 0 0 0 12.5 2Zm4.5 0A1.5 1.5 0 0 0 15.5 3.5V15a3 3 0 1 0 3 3V3.5A1.5 1.5 0 0 0 17 2Z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-green-400">99.9% Uptime</span>
                            </div>
                        </div>

                        {/* Quick Actions Panel */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                    User Administration
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setShowCreateUserForm(true)} className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:bg-blue-600 hover:border-blue-500 transition-all group text-left">
                                        <span className="block text-slate-300 font-bold group-hover:text-white mb-1">Create User</span>
                                        <span className="text-xs text-slate-500 group-hover:text-blue-200">Add single user manualy</span>
                                    </button>
                                    <button onClick={() => { setRoleToRegister('student'); setShowSnapRegister(true); }} className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:bg-purple-600 hover:border-purple-500 transition-all group text-left">
                                        <span className="block text-slate-300 font-bold group-hover:text-white mb-1">Snap Register</span>
                                        <span className="text-xs text-slate-500 group-hover:text-purple-200">Bulk add via photo</span>
                                    </button>
                                    <button onClick={() => setActiveTab('approval_queue')} className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:bg-yellow-600 hover:border-yellow-500 transition-all group text-left">
                                        <span className="block text-slate-300 font-bold group-hover:text-white mb-1">Review Queue</span>
                                        <span className="text-xs text-slate-500 group-hover:text-yellow-200">{allUsers.filter(u => u.status === 'pending').length} pending requests</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
                                    System Controls
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setActiveTab('online_monitor')} className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:bg-green-600 hover:border-green-500 transition-all group text-left">
                                        <span className="block text-slate-300 font-bold group-hover:text-white mb-1">Live Monitor</span>
                                        <span className="text-xs text-slate-500 group-hover:text-green-200">View active sessions</span>
                                    </button>
                                    <button onClick={() => setActiveTab('calendar')} className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:bg-orange-600 hover:border-orange-500 transition-all group text-left">
                                        <span className="block text-slate-300 font-bold group-hover:text-white mb-1">Event Planner</span>
                                        <span className="text-xs text-slate-500 group-hover:text-orange-200">Manage academic calendar</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'online_monitor':
                return <OnlineUsersMonitor />;
            case 'session_logs':
                return <SessionLogsTable />;
            case 'approval_queue':
                return (
                    <Card>
                        <h3 className="text-xl font-semibold mb-4">Pending User Approvals</h3>
                        <AdminApprovalQueue allUsers={allUsers} />
                    </Card>
                );
            case 'users':
                const usersList = allUsers.filter(u => u.status !== 'pending');
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">User Management</h2>
                            <div className="flex gap-2">
                                <Button onClick={() => setShowCreateUserForm(true)}>Create User</Button>
                                <Button variant="secondary" onClick={() => { setRoleToRegister('student'); setShowSnapRegister(true); }}>Snap Register</Button>
                            </div>
                        </div>
                        <Card>
                             <div className="overflow-x-auto">
                                 <table className="min-w-full text-sm text-left text-gray-400">
                                     <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                                         <tr>
                                             <th className="px-6 py-3">Name</th>
                                             <th className="px-6 py-3">Role</th>
                                             <th className="px-6 py-3">Email</th>
                                             <th className="px-6 py-3">Actions</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-700">
                                         {usersList.map(u => (
                                             <tr key={u.uid} className="hover:bg-slate-800">
                                                 <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                                                 <td className="px-6 py-4 capitalize">{u.role}</td>
                                                 <td className="px-6 py-4">{u.email}</td>
                                                 <td className="px-6 py-4">
                                                     <Button size="sm" variant="secondary" onClick={() => setEditingUser(u)}>Edit</Button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                        </Card>
                    </div>
                );
            case 'classes':
                return (
                     <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Class Management</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {GES_CLASSES.map(cls => {
                                const count = allUsers.filter(u => u.role === 'student' && u.class === cls).length;
                                const teacher = allUsers.find(u => u.role === 'teacher' && u.classTeacherOf === cls);
                                return (
                                    <button key={cls} onClick={() => setManagingClassId(cls)} className="bg-slate-800 hover:bg-slate-700 p-6 rounded-xl border border-slate-700 transition-all text-left group">
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 mb-2">{cls}</h3>
                                        <p className="text-sm text-gray-400">{count} Students</p>
                                        <p className="text-xs text-gray-500 mt-2">Teacher: {teacher?.name || 'Not Assigned'}</p>
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                );
            case 'attendance':
                return <AdminAttendanceDashboard allUsers={allUsers} attendanceRecords={attendanceRecords} />;
            case 'timetables':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">Timetables</h2>
                            <select value={viewingTimetableClassId || ''} onChange={e => setViewingTimetableClassId(e.target.value)} className="p-2 bg-slate-700 rounded-md">
                                <option value="">Select Class to View</option>
                                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {viewingTimetableClassId ? (
                            <Card>
                                {classTimetableData ? (
                                    <NotebookTimetable classId={viewingTimetableClassId} timetableData={classTimetableData} />
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400">No timetable found for {viewingTimetableClassId}.</p>
                                        <Button className="mt-4" disabled>Edit Timetable (Coming Soon)</Button>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card>
                                <p className="text-center text-gray-400 py-12">Select a class above to view its timetable.</p>
                            </Card>
                        )}
                    </div>
                );
            case 'calendar':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">School Calendar & Events</h2>
                             {!showFlyerDesigner && (
                                <div className="flex gap-2">
                                    <Button onClick={() => setShowFlyerDesigner(true)}>Open Flyer Designer</Button>
                                </div>
                             )}
                        </div>
                        {showFlyerDesigner ? (
                            <FlyerDesigner onClose={() => setShowFlyerDesigner(false)} allUsers={allUsers} userProfile={userProfile!} />
                        ) : (
                            <Card>
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📅</div>
                                    <p className="text-xl text-gray-300 mb-4">Manage upcoming school events and announcements.</p>
                                    <p className="text-sm text-gray-500">Use the Flyer Designer to create promotional materials.</p>
                                </div>
                            </Card>
                        )}
                    </div>
                );
            case 'materials':
                 return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Teaching Materials</h2>
                        <Card>
                            <p className="text-center text-gray-400 py-12">Repository for uploaded syllabi, textbooks, and resources.</p>
                        </Card>
                    </div>
                 );
            case 'reports':
                return <AdminTerminalReports allUsers={allUsers} schoolSettings={schoolSettings} userProfile={userProfile} />;
            case 'communication':
                return <MessagingView userProfile={userProfile!} contacts={contactsForMessaging} />;
            case 'activation':
                return <SystemActivation subscriptionStatus={subscriptionStatus} />;
            case 'settings':
                 return <AdminSettingsEditor />;
            default:
                return null;
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
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950">
                {renderContent()}
            </main>
            
            {/* Modals */}
            {showCreateUserForm && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-xl font-bold">Create User</h3>
                            <button onClick={() => setShowCreateUserForm(false)}>&times;</button>
                        </div>
                         <div className="space-y-4">
                            <AdminCreateUserForm />
                            <hr className="border-slate-700" />
                            <AdminCreateParentForm allStudents={allUsers.filter(u => u.role === 'student')} />
                         </div>
                    </Card>
                </div>
            )}
            {showSnapRegister && (
                <SnapToRegister 
                    onClose={() => setShowSnapRegister(false)}
                    roleToRegister={roleToRegister}
                />
            )}
             {editingUser && (
                <UserEditModal 
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleUpdateUser}
                    user={editingUser}
                    allUsers={allUsers}
                    subjectsByClass={subjectsByClass}
                />
            )}
            {managingClassId && (
                <ClassManagerModal 
                    classId={managingClassId}
                    allUsers={allUsers}
                    onClose={() => setManagingClassId(null)}
                    onSave={() => { /* Optional refresh logic */ }}
                />
            )}
        </div>
    );
};
