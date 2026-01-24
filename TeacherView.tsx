import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from './hooks/useAuth';
import { db, firebase } from './services/firebase';
import { GES_CLASSES, GES_SUBJECTS } from './types';
import type { Assignment, Submission, UserProfile, GeneratedContent, LiveLesson, Group } from './types';
import Card from './components/common/Card';
import Button from './components/common/Button';
import Spinner from './components/common/Spinner';
import Sidebar from './components/common/Sidebar';
import { TeacherLiveClassroom } from './components/TeacherLiveClassroom';
import BECEPastQuestionsView from './components/common/BECEPastQuestionsView';
import MessagingView from './components/MessagingView';
import TeacherAITools from './components/TeacherAITools';
import TeacherMyVoice from './components/TeacherMyVoice';
import TeacherStudentActivity from './components/TeacherStudentActivity';
import AdminTerminalReports from './components/AdminTerminalReports';
import Toast from './components/common/Toast';
import TeacherProgressDashboard from './components/TeacherProgressDashboard';
import StudentElectionPortal from './components/elections/StudentElectionPortal';
import TeacherStudentsList from './components/TeacherStudentsList';
import TeacherAssignments from './components/TeacherAssignments';
import TeacherAttendance from './components/TeacherAttendance';
import TeacherLibrary from './components/TeacherLibrary';
import TeacherGroupWork from './components/TeacherGroupWork';
import { 
  RocketIcon, 
  GraduationIcon, 
  ClipboardIcon, 
  AttendanceIcon, 
  BroadcastIcon, 
  LibraryIcon, 
  UserMatrixIcon, 
  NeuralIcon, 
  MicIcon, 
  BallotIcon, 
  AnalyticsIcon, 
  ChatIcon 
} from './components/common/PremiumIcons';

const OMNI_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

const TeacherView: React.FC<{ isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void; }> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings } = useAuthentication();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
    const isOmni = useMemo(() => OMNI_EMAILS.includes(user?.email || ""), [user]);

    // Data states
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [activeLiveLesson, setActiveLiveLesson] = useState<LiveLesson | null>(null);
    const [loading, setLoading] = useState(true);

    const teacherClasses = useMemo(() => {
        if (isOmni) return GES_CLASSES;
        if (!userProfile) return [];
        return Array.from(new Set([...(userProfile.classesTaught || []), ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : [])])).sort();
    }, [userProfile, isOmni]);

    useEffect(() => {
        const storageKey = `onboarding_teacher_${activeTab}`;
        if (!localStorage.getItem(storageKey)) {
            const steps: Record<string, string[]> = {
                dashboard: ["🚀 Command Hub: Your executive operations center.", "📊 Statistics Cards: Monitor 'Active Students' in your jurisdiction.", "⚡ Launch Test Class: Instantly initialize a secure demo session."],
                my_students: ["👨‍🎓 Student Registry: Centralized learner database.", "🔍 View Profile: Access deep-dive analytics for any student."],
                assignments: ["📝 Academic Tasks: Manage the lifecycle of all homework.", "➕ Create Assignment: Deploy new tasks using the manual builder or AI Assistant."],
                live_lesson: ["📡 Live Class: High-fidelity immersive teaching environment.", "🖥️ The Board: Your primary presentation stage."],
                attendance: ["📅 Attendance: Official daily roll call terminal.", "📍 Selector: Toggle between classes and historical dates."],
                library: ["📚 Resource Library: Your teaching asset vault.", "📄 Slide Decks: Manage and launch pre-generated AI presentations."],
                ai_tools: ["🤖 AI Copilot: Neural teaching assistants powered by Gemini."],
                progress: ["📈 Intelligence: Longitudinal academic analytics and mastery tracking."],
                terminal_reports: ["📊 Master Reports: The official academic grading terminal."],
                messages: ["💬 Messages: Secure internal school transmission matrix."]
            };
            const currentSteps = steps[activeTab];
            if (currentSteps) {
                for (let i = 0; i < currentSteps.length; i++) {
                    const proceed = confirm(`[SYSTEM INTEL - ${activeTab.toUpperCase()}]\n\nTip ${i + 1}/${currentSteps.length}:\n${currentSteps[i]}\n\n(OK for next, Cancel to Skip)`);
                    if (!proceed) break;
                }
                localStorage.setItem(storageKey, 'true');
            }
        }
    }, [activeTab]);

    useEffect(() => {
        if (!user || !userProfile || (userProfile.status !== 'approved' && !isOmni)) { 
            if (userProfile && userProfile.status === 'pending') setLoading(false);
            return; 
        }
        const unsubscribers: (() => void)[] = [];
        unsubscribers.push(db.collection('assignments').where('teacherId', '==', user.uid).onSnapshot(snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment))), err => console.warn("Assignments listener error:", err.message)));
        unsubscribers.push(db.collection('submissions').where('teacherId', '==', user.uid).onSnapshot(snap => setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission))), err => console.warn("Submissions listener error:", err.message)));
        const studentsQuery = isOmni ? db.collection('users').where('role', '==', 'student') : (teacherClasses.length > 0 ? db.collection('users').where('class', 'in', teacherClasses).where('role', '==', 'student') : null);
        if (studentsQuery) unsubscribers.push(studentsQuery.onSnapshot(snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile)), err => console.warn("Students listener error:", err.message)));
        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active').onSnapshot(snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson), err => console.warn("LiveLessons listener error:", err.message)));
        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, userProfile, teacherClasses, isOmni]);

    const launchTestLesson = async () => {
        if (!user || !userProfile) return;
        try {
            const lessonRef = db.collection('liveLessons').doc();
            const demoPlan = [{ title: "Welcome to Edutec Live Classroom", boardContent: "<h1>System Check: Active</h1>", teacherScript: "Hello class!", question: null }];
            await lessonRef.set({ id: lessonRef.id, teacherId: user.uid, teacherName: userProfile.name, classId: userProfile.class || teacherClasses[0] || 'JHS 3', topic: 'Demo Live Session', status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp(), currentStepIndex: 0, lessonPlan: demoPlan, currentBoardContent: demoPlan[0].boardContent, raisedHands: [] });
            setToast({ message: "Test Classroom Launched!", type: 'success' });
            setActiveTab('live_lesson');
        } catch (e: any) { setToast({ message: `Launch failed: ${e.message}`, type: 'error' }); }
    };

    const navItems = useMemo(() => {
        const rawItems = [
            { key: 'dashboard', label: 'Command Hub', icon: <RocketIcon size={20} active={activeTab === 'dashboard'} /> },
            { key: 'my_students', label: 'My Students', icon: <GraduationIcon size={20} active={activeTab === 'my_students'} /> },
            { key: 'assignments', label: 'Academic Tasks', icon: <ClipboardIcon size={20} active={activeTab === 'assignments'} /> },
            { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon size={20} active={activeTab === 'attendance'} /> },
            { key: 'live_lesson', label: <span className="flex items-center">Live Class {activeLiveLesson && <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <BroadcastIcon size={20} active={activeTab === 'live_lesson'} /> },
            { key: 'library', label: 'Resource Library', icon: <LibraryIcon size={20} active={activeTab === 'library'} /> },
            { key: 'group_work', label: 'Group Work', icon: <UserMatrixIcon size={20} active={activeTab === 'group_work'} /> },
            { key: 'ai_tools', label: 'AI Copilot', icon: <NeuralIcon size={20} active={activeTab === 'ai_tools'} /> },
            { key: 'my_voice', label: 'My Voice', icon: <MicIcon size={20} active={activeTab === 'my_voice'} /> },
            { key: 'bece_questions', label: 'BECE Library', icon: <GraduationIcon size={20} active={activeTab === 'bece_questions'} /> },
            { key: 'elections', label: 'Election Portal', icon: <BallotIcon size={20} active={activeTab === 'elections'} /> },
            { key: 'terminal_reports', label: 'Master Reports', icon: <AnalyticsIcon size={20} active={activeTab === 'terminal_reports'} /> },
            { key: 'progress', label: 'Intelligence', icon: <AnalyticsIcon size={20} active={activeTab === 'progress'} /> },
            { key: 'messages', label: `Messages`, icon: <ChatIcon size={20} active={activeTab === 'messages'} /> },
        ];
        const savedOrder = userProfile?.sidebarTabOrder?.teacher;
        if (!savedOrder) return rawItems;
        const itemMap = new Map(rawItems.map(item => [item.key, item]));
        const orderedItems = savedOrder.map(key => itemMap.get(key)).filter((item): item is typeof rawItems[0] => !!item);
        const currentKeys = new Set(orderedItems.map(item => item.key));
        const missingItems = rawItems.filter(item => !currentKeys.has(item.key));
        return [...orderedItems, ...missingItems];
    }, [activeLiveLesson, userProfile?.sidebarTabOrder?.teacher, activeTab]);

    const handleReorder = async (newOrder: string[]) => {
        if (!userProfile) return;
        try { await db.collection('users').doc(userProfile.uid).set({ sidebarTabOrder: { ...(userProfile.sidebarTabOrder || {}), teacher: newOrder } }, { merge: true }); } 
        catch (err) { console.warn("Failed to save sidebar order:", err); }
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        if (userProfile?.status === 'pending' && !isOmni) return <div className="p-20 text-center animate-fade-in"><div className="text-6xl mb-6">📝</div><h2 className="text-2xl font-bold text-white mb-2">Staff Profile Verification</h2></div>;
        const teacherName = (userProfile?.name || 'Architect').toUpperCase();
        switch (activeTab) {
            case 'dashboard': return <div className="space-y-8 animate-fade-in-up"><div className="flex justify-between items-end"><div><h1 className="text-4xl font-black text-white dark:text-white tracking-tight">Executive <span className="text-blue-500">Teacher</span></h1><p className="text-slate-400 mt-1 uppercase text-[10px] font-black tracking-widest">Logged: {teacherName}</p></div>{!activeLiveLesson && <Button onClick={launchTestLesson} className="shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-6 py-3 font-black text-xs uppercase tracking-widest">🚀 Launch Test Class</Button>}</div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-200 dark:text-slate-200"><Card className="!bg-blue-900/10 border-blue-500/20 text-center"><p className="text-xs font-bold text-blue-400 uppercase">Active Students</p><p className="text-3xl font-black text-white">{students.length}</p></Card><Card className="!bg-purple-900/10 border-purple-500/20 text-center"><p className="text-xs font-bold text-purple-400 uppercase">Classes Accessible</p><p className="text-3xl font-black text-white">{teacherClasses.length}</p></Card><Card className="!bg-orange-900/10 border-orange-500/20 text-center"><p className="text-xs font-bold text-orange-400 uppercase">Alerts</p><p className="text-3xl font-black text-white">{submissions.filter(s => s.status === 'Submitted').length}</p></Card></div><TeacherStudentActivity teacherClasses={teacherClasses} /></div>;
            case 'my_students': return <TeacherStudentsList students={students} assignments={assignments} submissions={submissions} />;
            case 'assignments': return <TeacherAssignments user={user!} userProfile={userProfile!} teacherClasses={teacherClasses} />;
            case 'attendance': return <TeacherAttendance teacherClasses={teacherClasses} students={students} />;
            case 'library': return <TeacherLibrary user={user!} userProfile={userProfile!} teacherClasses={teacherClasses} onStartLiveLesson={() => setActiveTab('live_lesson')} />;
            case 'group_work': return <TeacherGroupWork teacherClasses={teacherClasses} students={students} />;
            case 'ai_tools': return <TeacherAITools students={students} userProfile={userProfile!} />;
            case 'my_voice': return <TeacherMyVoice userProfile={userProfile!} />;
            case 'bece_questions': return <BECEPastQuestionsView />;
            case 'live_lesson': return activeLiveLesson ? <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => setActiveTab('dashboard')} userProfile={userProfile!} setToast={setToast} /> : <div className="flex flex-col items-center justify-center p-20 text-slate-500 italic h-full"><span className="text-7xl mb-6 opacity-20">📡</span><h3 className="text-xl font-bold text-white mb-2 not-italic">No Active Classroom Signal</h3><Button onClick={() => setActiveTab('library')}>Go to Library</Button></div>;
            case 'elections': return <StudentElectionPortal userProfile={userProfile!} />;
            case 'terminal_reports': return <AdminTerminalReports schoolSettings={schoolSettings} user={user} userProfile={userProfile} teacherMode allowedClasses={teacherClasses} allStudents={students} assignments={assignments} submissions={submissions} />;
            case 'progress': return <TeacherProgressDashboard students={students} assignments={assignments} submissions={submissions} teacherClasses={teacherClasses} />;
            case 'messages': return <MessagingView userProfile={userProfile!} contacts={students} />;
            default: return <div className="p-20 text-center text-slate-600 italic">Sector Operational.</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden h-full relative">
            <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Command Center" onReorder={handleReorder} />
            <main className={`flex-1 overflow-y-auto bg-slate-950 dark:bg-slate-950 ${activeTab === 'live_lesson' ? 'p-0' : 'p-6'}`}>{renderContent()}</main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default TeacherView;