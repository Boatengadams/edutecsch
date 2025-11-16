import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
// FIX: Import firebase for compat services like firestore.FieldValue
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, Notification, SchoolEvent, SchoolEventType, Timetable, AttendanceRecord, Group, Conversation } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import Button from './common/Button';
import AIAssistant from './AIAssistant';
import { ProgressDashboard } from './ProgressDashboard';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import ChangePasswordModal from './common/ChangePasswordModal';
import Toast from './common/Toast';
import PieChart from './common/charts/PieChart';
import LineChart from './common/charts/LineChart';
import MessagingView from './MessagingView';

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

const ParentView: React.FC<ParentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile } = useAuthentication();
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
            setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, [userProfile]);

  
  // Effect for parent-specific data (notifications, events, all submissions)
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
        <div className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card><div className="text-center"><p className="text-sm text-gray-400">Average Grade</p><p className="text-3xl font-bold text-blue-400">{dashboardStats.averageGrade}{dashboardStats.averageGrade !== 'N/A' && '%'}</p></div></Card>
                <Card><div className="text-center"><p className="text-sm text-gray-400">On-Time Rate</p><p className="text-3xl font-bold text-green-400">{dashboardStats.onTimeRate}{dashboardStats.onTimeRate !== 'N/A' && '%'}</p></div></Card>
                <Card><div className="text-center"><p className="text-sm text-gray-400">Pending Assignments</p><p className="text-3xl font-bold text-yellow-400">{dashboardStats.pendingCount}</p></div></Card>
            </div>
            {childsGroup && (
                <Card fullHeight={false}>
                    <h3 className="text-xl font-semibold mb-2">Group Project</h3>
                    <div className="p-3 bg-slate-700 rounded-lg">
                        <p className="font-bold">{childsGroup.assignmentTitle}</p>
                        <div className="flex justify-between items-center mt-2 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${childsGroup.isSubmitted ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                {childsGroup.isSubmitted ? 'Submitted' : 'In Progress'}
                            </span>
                            {childsGroup.grade && <span className="font-bold text-blue-400">Grade: {childsGroup.grade}</span>}
                        </div>
                        {childsGroup.feedback && <p className="text-xs italic text-gray-300 mt-2 bg-slate-800 p-2 rounded-md">"{childsGroup.feedback}"</p>}
                    </div>
                </Card>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Grade History (Last 10)</h3>
                    <div className="h-72">
                        <LineChart data={dashboardStats.gradeHistoryChartData.slice(-10)} />
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-center">Submission Timeliness</h3>
                    <div className="h-72">
                        <PieChart data={dashboardStats.timelinessChartData} />
                    </div>
                </Card>
            </div>
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
            {loadingTimetable ? <Spinner /> : timetable && selectedChildProfile?.class ? (
                <NotebookTimetable classId={selectedChildProfile.class} timetableData={timetable.timetableData} />
            ) : <p className="text-gray-400 text-center py-8">Timetable not available.</p>}
        </Card>
    );
    
    const renderProgress = () => selectedChildProfile ? <ProgressDashboard student={selectedChildProfile} isModal={false} /> : null;
    
    const renderAttendance = () => (
        <Card>
            <h3 className="text-xl font-semibold mb-4">Attendance Log for {selectedChildProfile?.name}</h3>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {attendanceRecords.length > 0 ? attendanceRecords.map(rec => {
                    const status = rec.records[selectedChildProfile!.uid];
                    const statusColor = status === 'Present' ? 'text-green-400' : status === 'Late' ? 'text-yellow-400' : 'text-red-400';
                    return (
                        <div key={rec.id} className={`p-3 bg-slate-700 rounded-md flex justify-between items-center`}>
                            <p className="font-semibold">{new Date(rec.date + 'T00:00:00').toLocaleDateString()}</p>
                            <p className={`font-bold ${statusColor}`}>{status}</p>
                        </div>
                    );
                }) : <p className="text-gray-400 text-center py-8">No attendance records found.</p>}
            </div>
        </Card>
    );
    
    const renderSettings = () => {
        // Omitting profile name change for parents to avoid complexity, focus on security.
        return (
            <Card>
                <h3 className="text-xl font-semibold mb-6">Settings</h3>
                <div className="space-y-8 max-w-md">
                    <div>
                        <h4 className="font-semibold text-lg">Account Security</h4>
                        <Button onClick={() => setShowChangePassword(true)} variant="secondary" className="mt-2">
                            Change Your Password
                        </Button>
                    </div>
                </div>
            </Card>
        );
    };


    const navItems = [
        { key: 'overview', label: "Child's Overview", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75Z" /></svg> },
        { key: 'messages', label: <span className="flex items-center justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm1.707 2.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414L10 10.586 3.707 7.293z" /></svg> },
        { key: 'notifications', label: 'Notifications', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.233.323 2.385.88 3.39V17a1 1 0 001.447.894L10 15.118l3.673 2.776A1 1 0 0015 17v-4.61c.557-1.005.88-2.214.88-3.39a6 6 0 00-6-6zM8 8a1 1 0 112 0v1a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> },
        { key: 'progress', label: 'Academic Progress', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg> },
        { key: 'attendance', label: 'Attendance', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
        { key: 'timetable', label: 'Timetable', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18" /></svg> },
        { key: 'settings', label: 'Settings', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-.95.542.057 1.007.56 1.066 1.11.06.541-.218 1.14-.644 1.527a4.953 4.953 0 0 1-2.072.827c-.541.06-.95.542-.95 1.11 0 .542.409 1.007.95 1.11a4.953 4.953 0 0 1 2.072.827c.426.387.704.986.644 1.527-.06.542-.524 1.053-1.066 1.11-.541.057-1.02-.352-1.11-.95a4.953 4.953 0 0 1-.95-2.072c-.057-.542-.56-1.007-1.11-.95-.542-.057-1.007-.56-1.066-1.11-.06-.541.218-1.14.644-1.527a4.953 4.953 0 0 1 2.072-.827c.541-.06.95-.542-.95-1.11 0 .542-.409-1.007-.95-1.11a4.953 4.953 0 0 1-2.072-.827c-.426-.387-.704-.986-.644-1.527.06-.542.524-1.053 1.066 1.11.541-.057 1.02.352 1.11-.95Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.98 3.94c.09-.542.56-1.007 1.11-.95.542.057 1.007.56 1.066 1.11.06.541-.218 1.14-.644 1.527a4.953 4.953 0 0 1-2.072.827c-.541.06-.95.542-.95 1.11 0 .542.409 1.007.95 1.11a4.953 4.953 0 0 1 2.072.827c.426.387.704.986.644 1.527-.06.542-.524 1.053-1.066 1.11-.541.057-1.02-.352-1.11-.95a4.953 4.953 0 0 1-.95-2.072c-.057-.542-.56-1.007-1.11-.95-.542-.057-1.007-.56-1.066-1.11-.06-.541.218-1.14.644-1.527a4.953 4.953 0 0 1 2.072-.827c.541-.06.95-.542-.95-1.11 0 .542-.409-1.007-.95-1.11a4.953 4.953 0 0 1-2.072-.827c-.426-.387-.704-.986-.644-1.527.06-.542.524-1.053 1.066 1.11.541-.057 1.02.352 1.11-.95Z" /></svg> }
    ];

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        }
        if (childrenProfiles.length === 0) {
            return (
                <Card>
                    <div className="text-center p-8">
                        <h2 className="text-xl font-bold mb-4">No Children Linked</h2>
                        <p className="text-gray-400">Your account is not yet linked to any students. Please contact the school administration to have your child's account linked to yours.</p>
                    </div>
                </Card>
            );
        }
        
        switch(activeTab) {
            case 'overview': return renderDashboard();
            case 'messages': return userProfile ? <MessagingView userProfile={userProfile} contacts={relevantTeachers} /> : null;
            case 'notifications': return renderNotifications();
            case 'progress': return renderProgress();
            case 'attendance': return renderAttendance();
            case 'timetable': return renderTimetable();
            case 'settings': return renderSettings();
            default: return renderDashboard();
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
                title="Parent Portal"
            />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                 {renderContent()}
            </main>
            <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
        </div>
    );
};

export default ParentView;
