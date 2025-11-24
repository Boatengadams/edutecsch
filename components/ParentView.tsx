
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
// FIX: Import firebase for compat services like firestore.FieldValue
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, Notification, SchoolEvent, SchoolEventType, Timetable, AttendanceRecord, Group, Conversation, PublishedFlyer } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import Button from './common/Button';
import AIAssistant from './AIAssistant';
import { ProgressDashboard } from './ProgressDashboard';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import ChangePasswordModal from './common/ChangePasswordModal';
import { useToast } from './common/Toast';
import PieChart from './common/charts/PieChart';
import LineChart from './common/charts/LineChart';
import MessagingView from './MessagingView';
import StudentProfile from './StudentProfile';

interface ParentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    const numericGrade = parseFloat(grade);
    if (!isNaN(numericGrade)) return numericGrade;

    const upperGrade = grade.toUpperCase();
    if (upperGrade.startsWith('A')) return 95;
    if (upperGrade.startsWith('B')) return 85;
    if (upperGrade.startsWith('C')) return 75;
    if (upperGrade.startsWith('D')) return 65;
    if (upperGrade.startsWith('F')) return 50;
    return null;
}

export const ParentView: React.FC<ParentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile } = useAuthentication();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for multi-child support
  const [childrenProfiles, setChildrenProfiles] = useState<UserProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [childsGroup, setChildsGroup] = useState<Group | null>(null);
  const [publishedFlyers, setPublishedFlyers] = useState<PublishedFlyer[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<PublishedFlyer | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(true);
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [relevantTeachers, setRelevantTeachers] = useState<UserProfile[]>([]);

  const selectedChildProfile = useMemo(() => childrenProfiles.find(c => c.uid === selectedChildId), [childrenProfiles, selectedChildId]);

  const submissions = useMemo(() => {
    const subsForChild = allSubmissions.filter(s => s.studentId === selectedChildId);
    return subsForChild.reduce((acc, sub) => {
        acc[sub.assignmentId] = sub;
        return acc;
    }, {} as Record<string, Submission>);
  }, [allSubmissions, selectedChildId]);

  // Effect to fetch all children profiles
  useEffect(() => {
    if (userProfile?.role === 'parent' && userProfile.childUids && userProfile.childUids.length > 0) {
        setLoading(true);
        const childPromises = userProfile.childUids.map(uid => db.collection('users').doc(uid).get());
        Promise.all(childPromises).then(docs => {
            const profiles = docs.map(doc => doc.data() as UserProfile).filter(Boolean);
            setChildrenProfiles(profiles);
            if (profiles.length > 0) {
                setSelectedChildId(profiles[0].uid);
            }
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching children profiles:", err);
            showToast("Failed to load children profiles.", "error");
            setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, [userProfile, showToast]);

  
  // Effect for parent-specific data (notifications, events, all submissions, flyers)
  useEffect(() => {
    if (!user || !userProfile) return;

    const unsubscribers: (() => void)[] = [];

    // Notifications
    const notifQuery = db.collection('notifications').where('userId', '==', user.uid);
    unsubscribers.push(notifQuery.onSnapshot(snapshot => {
        const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        setNotifications(fetchedNotifications.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, err => console.error("Error fetching notifications:", err)));

    // School Feed Events
    const eventQuery = db.collection('calendarEvents');
    unsubscribers.push(eventQuery.onSnapshot(snapshot => {
        const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent));
        const relevantEvents = fetchedEvents.filter(event => event.audience === 'All' || event.audience === 'Parents' || event.audience === 'Students');
        setEvents(relevantEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => console.error("Error fetching school calendar:", error)));
    
    // Submissions for all children
    const subQuery = db.collection('submissions').where('parentUids', 'array-contains', user.uid);
    unsubscribers.push(subQuery.onSnapshot(snapshot => {
        const fetchedSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setAllSubmissions(fetchedSubmissions);
    }, err => console.error("Error fetching submissions:", err)));

     // Published Flyers - REMOVED orderBy to fix index error
     const flyerQueries = [
        db.collection('publishedFlyers').where('targetAudience', '==', 'all'),
        db.collection('publishedFlyers').where('targetRoles', 'array-contains', 'parent'),
        db.collection('publishedFlyers').where('targetAudience', '==', 'selected').where('targetUids', 'array-contains', user.uid)
    ];
    const unsubFlyers = flyerQueries.map(q => q.limit(10).onSnapshot(snap => {
        const flyers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublishedFlyer));
        setPublishedFlyers(prev => {
            const all = [...prev, ...flyers];
            const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
            return unique.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()).slice(0, 20);
        });
    }));
    unsubscribers.push(...unsubFlyers);


    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, userProfile]);
  
  // Effect for child-specific data, runs when selectedChildId changes
  useEffect(() => {
    if (!selectedChildProfile || !selectedChildProfile.class || !user) {
        setAssignments([]);
        setTimetable(null);
        setAttendanceRecords([]);
        setChildsGroup(null);
        setLoadingTimetable(false);
        return;
    };
    
    const unsubscribers: (() => void)[] = [];

    // Assignments
    const assignQuery = db.collection('assignments').where('classId', '==', selectedChildProfile.class);
    unsubscribers.push(assignQuery.onSnapshot(snapshot => {
        const fetchedAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
        fetchedAssignments.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setAssignments(fetchedAssignments);
    }, err => console.error("Error fetching assignments for child:", err)));

    // Timetable
    setLoadingTimetable(true);
    unsubscribers.push(db.collection('timetables').doc(selectedChildProfile.class).onSnapshot(doc => {
        setTimetable(doc.exists ? doc.data() as Timetable : null);
        setLoadingTimetable(false);
    }, err => {
        console.error("Error fetching timetable for child:", err);
        setLoadingTimetable(false);
    }));

    // Attendance Records
    const attendanceQuery = db.collection('attendance')
        .where('parentUids', 'array-contains', user.uid)
        .limit(50);
    unsubscribers.push(attendanceQuery.onSnapshot(snap => {
        const allRecordsForParent = snap.docs.map(doc => doc.data() as AttendanceRecord);
        allRecordsForParent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recordsForSelectedChild = allRecordsForParent.filter(
            record => record.studentUids.includes(selectedChildProfile.uid)
        );
        setAttendanceRecords(recordsForSelectedChild);
    }, err => console.error("Error fetching attendance for child:", err)));

    // Group Project
    const groupQuery = db.collection('groups')
        .where('classId', '==', selectedChildProfile.class)
        .where('memberUids', 'array-contains', selectedChildProfile.uid)
        .limit(1);
    unsubscribers.push(groupQuery.onSnapshot(snap => {
        setChildsGroup(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as Group);
    }));


    return () => unsubscribers.forEach(unsub => unsub());

  }, [selectedChildProfile, user]);

    // Effect for AI Assistant context
    useEffect(() => {
        const baseInstruction = "You are Edu, an AI assistant for parents at UTOPIA INTERNATIONAL SCHOOL. Your role is to provide insights into the curriculum, offer learning support strategies, and clarify school policies. Maintain a professional, supportive, and informative tone. Do not disclose specific student performance data, but you can talk about trends and general progress. You can summarize the content on the parent's current page if asked. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";

        let context = '';
        let prompts: string[] = ["Kofi, kyerɛ me Twi ase."];
        if (selectedChildProfile) {
            switch (activeTab) {
                case 'overview':
                    const pendingCount = assignments.filter(a => !submissions[a.id]).length;
                    context = `The parent is on the main 'Overview' page for their child, ${selectedChildProfile.name}, who is in ${selectedChildProfile.class}. Their child has ${pendingCount} pending assignments.`;
                    prompts.push(`What are some good study habits for a ${selectedChildProfile.class} student?`);
                    break;
                case 'notifications':
                    context = `The parent is viewing the 'Notifications' page.`;
                    prompts.push("What are the most recent school-wide announcements?");
                    break;
                case 'timetable':
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    context = `The parent is viewing the 'Timetable' page for their child, ${selectedChildProfile.name} (${selectedChildProfile.class}). Today is ${today}.`;
                    prompts.push(`What homework might be expected for today's classes?`);
                    break;
                case 'progress':
                    const gradedCount = Object.values(submissions).filter(s => (s as Submission).status === 'Graded').length;
                    context = `The parent is on the 'Progress' dashboard for their child, ${selectedChildProfile.name}. They are viewing academic performance trends. Their child has ${gradedCount} graded assignments so far.`;
                    prompts.push("Explain my child's grade trend.");
                    prompts.push("How can I help my child improve in their lowest-scoring subjects?");
                    break;
                case 'attendance':
                    context = `The parent is viewing the attendance log for their child, ${selectedChildProfile.name}.`;
                    prompts.push("What is the school's policy on absences?");
                    break;
            }
        } else {
            context = "The parent's account is not yet linked to a student. They are viewing a limited dashboard.";
        }

        setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
        setAiSuggestedPrompts(aiSuggestedPrompts);

    }, [activeTab, selectedChildProfile, assignments, submissions, notifications]);

     // Fetch unread messages count
    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection('conversations')
            .where('participantUids', 'array-contains', user.uid)
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.forEach(doc => {
                    const conv = doc.data() as Conversation;
                    count += conv.unreadCount?.[user.uid] || 0;
                });
                setUnreadMessages(count);
            });
        return () => unsubscribe();
    }, [user]);

     // Fetch relevant teachers for all children
    useEffect(() => {
        if (childrenProfiles.length === 0) {
            setRelevantTeachers([]);
            return;
        };

        const childClassIds = Array.from(new Set(childrenProfiles.map(c => c.class).filter(Boolean))) as string[];
        if (childClassIds.length === 0) {
            setRelevantTeachers([]);
            return;
        };

        const unsubscribe = db.collection('users')
            .where('role', '==', 'teacher')
            .where('status', '==', 'approved')
            .onSnapshot(snapshot => {
                const allTeachers = snapshot.docs.map(doc => doc.data() as UserProfile);
                const teachersForParent = allTeachers.filter(teacher => {
                    const teachesOneOfTheChildren = childClassIds.some(classId =>
                        teacher.classTeacherOf === classId ||
                        teacher.classesTaught?.includes(classId)
                    );
                    return teachesOneOfTheChildren;
                });
                setRelevantTeachers(teachersForParent);
            });
        return () => unsubscribe();
    }, [childrenProfiles]);

    const dashboardStats = useMemo(() => {
        if (!selectedChildProfile) return { averageGrade: 'N/A', onTimeRate: 'N/A', pendingCount: 0, timelinessChartData: [], gradeHistoryChartData: [] };

        const gradedSubmissions = Object.values(submissions).filter((s: Submission) => s.status === 'Graded' && s.grade);
        const numericGrades = gradedSubmissions.map((s: Submission) => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
        const averageGrade = numericGrades.length > 0 ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1) : 'N/A';

        let onTime = 0, late = 0;
        const submissionMap = new Map(Object.values(submissions).map((s: Submission) => [s.assignmentId, s]));
        const relevantAssignments = assignments.filter(a => a.dueDate);
        relevantAssignments.forEach(a => {
            const sub = submissionMap.get(a.id);
            if (sub && a.dueDate && sub.submittedAt && typeof sub.submittedAt.toDate === 'function') {
                const dueDate = new Date(a.dueDate + 'T23:59:59');
                const submittedAt = sub.submittedAt.toDate();
                if (submittedAt <= dueDate) {
                    onTime++;
                } else {
                    late++;
                }
            }
        });
        const submittedCount = onTime + late;
        const missingCount = relevantAssignments.length - submittedCount;

        const onTimeRate = submittedCount > 0 ? Math.round((onTime / submittedCount) * 100) : 'N/A';
        
        const timelinessChartData = [
            { label: 'On Time', value: onTime, color: '#10b981' },
            { label: 'Late', value: late, color: '#f97316' },
            { label: 'Missing', value: missingCount, color: '#ef4444' },
        ];
        
        const assignmentMap = new Map(assignments.map(a => [a.id, a]));
        const gradeHistoryChartData = gradedSubmissions
            .map((sub: Submission) => ({ sub, assign: assignmentMap.get(sub.assignmentId) }))
            .filter((item): item is { sub: Submission; assign: Assignment } => !!item.assign)
            .sort((a, b) => a.assign.createdAt.toMillis() - b.assign.createdAt.toMillis())
            .map(item => ({
                label: item.assign.title,
                value: gradeToNumeric(item.sub.grade)!,
            }));

        return {
            averageGrade,
            onTimeRate,
            pendingCount: assignments.filter(a => !submissions[a.id]).length,
            timelinessChartData,
            gradeHistoryChartData,
        };
    }, [selectedChildProfile, assignments, submissions]);

    const renderDashboard = () => (
        <div className="space-y-8">
             {/* Overview Banner */}
             <div className="relative p-8 rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">{selectedChildProfile?.name}</h2>
                        <p className="text-blue-300 font-medium">{selectedChildProfile?.class}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block">Academic Standing</span>
                        <span className="text-lg font-bold text-green-400">Good Progress</span>
                    </div>
                </div>
             </div>

             {/* Stats Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Average Grade</p>
                    <p className="text-4xl font-bold text-blue-400">{dashboardStats.averageGrade}{dashboardStats.averageGrade !== 'N/A' && '%'}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-green-500/30 transition-all">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">On-Time Submission</p>
                    <p className="text-4xl font-bold text-green-400">{dashboardStats.onTimeRate}{dashboardStats.onTimeRate !== 'N/A' && '%'}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-yellow-500/30 transition-all">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pending Tasks</p>
                    <p className="text-4xl font-bold text-yellow-400">{dashboardStats.pendingCount}</p>
                </div>
            </div>

            {publishedFlyers.length > 0 && (
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                        <span className="text-blue-500">📢</span> School Notices
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                        {publishedFlyers.map(flyer => (
                            <button 
                                key={flyer.id} 
                                onClick={() => setSelectedFlyer(flyer)}
                                className="flex-shrink-0 w-56 group relative rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all shadow-lg"
                            >
                                <div className="aspect-[16/9] relative">
                                    <img src={flyer.imageUrl} alt={flyer.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80"></div>
                                    <div className="absolute bottom-0 left-0 p-3">
                                        <p className="font-bold text-sm truncate text-white">{flyer.title}</p>
                                        <p className="text-[10px] text-slate-400">{flyer.createdAt?.toDate().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Performance Trend</h3>
                    <div className="h-64">
                        <LineChart data={dashboardStats.gradeHistoryChartData.slice(-10)} />
                    </div>
                </div>
                <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200 text-center">Submission Habits</h3>
                    <div className="h-64">
                        <PieChart data={dashboardStats.timelinessChartData} />
                    </div>
                </div>
            </div>
            
            {childsGroup && (
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-10 text-6xl">🤝</div>
                    <h3 className="text-lg font-bold text-white mb-2 relative z-10">Active Group Project</h3>
                    <div className="relative z-10">
                        <p className="text-blue-300 font-semibold text-lg">{childsGroup.assignmentTitle}</p>
                        <div className="flex items-center gap-3 mt-3">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${childsGroup.isSubmitted ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {childsGroup.isSubmitted ? 'Submitted' : 'In Progress'}
                            </span>
                            {childsGroup.grade && <span className="text-sm font-bold text-slate-300">Grade: {childsGroup.grade}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    
    const renderNotifications = () => (
         <Card>
            <h3 className="text-xl font-semibold mb-4">Notifications & School Feed</h3>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {notifications.length > 0 && notifications.map(n => (
                    <div key={n.id} className={`p-3 rounded-md ${!n.readBy.includes(user?.uid || '') ? 'bg-sky-900/40' : 'bg-slate-700'}`}>
                        <p className="text-gray-300">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-2 text-right">- {n.senderName} on {n.createdAt.toDate().toLocaleDateString()}</p>
                    </div>
                ))}
                 {events.length > 0 && events.map(e => (
                    <div key={e.id} className="p-3 bg-slate-700/50 rounded-md border-l-4 border-slate-600">
                        <p className="font-semibold">{e.title} <span className="text-xs font-normal text-gray-400">({e.type})</span></p>
                        <p className="text-xs text-gray-400">{new Date(e.date + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                 ))}
                 {notifications.length === 0 && events.length === 0 && <p className="text-gray-400 text-center py-8">No notifications or events.</p>}
            </div>
        </Card>
    );

    const renderTimetable = () => (
         <Card>
            <h3 className="text-xl font-semibold mb-4">Timetable for {selectedChildProfile?.class}</h3>
            {loadingTimetable ? (
                <div className="flex justify-center items-center h-40"><Spinner /></div>
            ) : timetable ? (
                <NotebookTimetable classId={selectedChildProfile?.class || ''} timetableData={timetable.timetableData} />
            ) : (
                <p className="text-gray-400 text-center py-12">No timetable available for this class.</p>
            )}
        </Card>
    );

    const renderAttendance = () => (
        <Card>
            <h3 className="text-xl font-semibold mb-4">Attendance Record</h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {attendanceRecords.length > 0 ? attendanceRecords.map(rec => (
                    <div key={rec.id} className="flex justify-between items-center p-3 bg-slate-800 rounded border-l-4 border-slate-600">
                        <span>{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span className={`font-bold ${rec.records[selectedChildId!] === 'Present' ? 'text-green-400' : 'text-red-400'}`}>
                            {rec.records[selectedChildId!]}
                        </span>
                    </div>
                )) : <p className="text-gray-500 text-center py-8">No attendance records found.</p>}
            </div>
        </Card>
    );
    
    const renderContent = () => {
        if (loading) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;
        
        if (!selectedChildProfile) {
            return (
                <div className="flex-1 flex flex-col justify-center items-center p-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">No Student Linked</h2>
                    <p className="text-gray-400 mb-4">Your account is not currently linked to any student profiles. Please contact the school administration.</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview': return renderDashboard();
            case 'notifications': return renderNotifications();
            case 'timetable': return renderTimetable();
            case 'attendance': return renderAttendance();
            case 'progress': return <ProgressDashboard student={selectedChildProfile} isModal={false} onClose={() => {}} />;
            case 'messages': return <MessagingView userProfile={userProfile} contacts={relevantTeachers} />;
            case 'profile': return <StudentProfile userProfile={selectedChildProfile} assignments={assignments} submissions={allSubmissions.filter(s => s.studentId === selectedChildId)} />;
            default: return <div>Select a tab</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden">
             <Sidebar 
                isExpanded={isSidebarExpanded}
                navItems={[
                    { key: 'overview', label: 'Overview', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75Z" /></svg> },
                    { key: 'notifications', label: 'Notifications', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg> },
                    { key: 'timetable', label: 'Timetable', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg> },
                    { key: 'attendance', label: 'Attendance', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
                    { key: 'progress', label: 'Progress', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg> },
                    { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg> },
                    { key: 'profile', label: 'Student Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg> },
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={() => setIsSidebarExpanded(false)}
                title="Parent Portal"
            />
            <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
                {/* Child Selector Header if multiple children */}
                {childrenProfiles.length > 1 && (
                    <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 p-2 flex gap-2 overflow-x-auto">
                        {childrenProfiles.map(child => (
                            <button
                                key={child.uid}
                                onClick={() => setSelectedChildId(child.uid)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedChildId === child.uid ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                            >
                                {child.name}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                    {renderContent()}
                </div>
                
                <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
                {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
                
                {selectedFlyer && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center p-4 z-50" onClick={() => setSelectedFlyer(null)}>
                        <div className="max-w-4xl w-full max-h-full overflow-auto relative bg-slate-900 rounded-xl" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedFlyer(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">&times;</button>
                            <img src={selectedFlyer.imageUrl} alt={selectedFlyer.title} className="w-full h-auto" />
                            <div className="p-4 bg-slate-800 border-t border-slate-700">
                                <h2 className="text-2xl font-bold">{selectedFlyer.title}</h2>
                                <p className="text-sm text-gray-400">Posted by {selectedFlyer.publisherName} on {selectedFlyer.createdAt?.toDate().toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
