import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase } from '../services/firebase';
import { GES_CLASSES, GES_SUBJECTS } from '../types';
import type { Assignment, Submission, UserProfile, GeneratedContent, LiveLesson, Group } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import Sidebar from './common/Sidebar';
import { TeacherLiveClassroom } from './TeacherLiveClassroom';
import BECEPastQuestionsView from './common/BECEPastQuestionsView';
import MessagingView from './MessagingView';
import TeacherAITools from './TeacherAITools';
import TeacherMyVoice from './TeacherMyVoice';
import TeacherStudentActivity from './TeacherStudentActivity';
import AdminTerminalReports from './AdminTerminalReports';
import Toast from './common/Toast';
import TeacherProgressDashboard from './TeacherProgressDashboard';

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
                dashboard: [
                    "Welcome to your Command Hub (🚀). Here you see a high-level overview of your active students, assigned classes, and pending alerts.",
                    "The Students Card (👨‍🎓) shows the total number of pupils across your assigned sections.",
                    "The Alerts Card (🧡) notifies you of new assignment submissions waiting for grading.",
                    "The 'Launch Test Class' button (🚀) allows you to start an immediate interactive session."
                ],
                my_students: [
                    "The My Students (👨‍🎓) tab lists every student in your jurisdiction.",
                    "Use the Student Cards to see individual progress, averages, and completion rates at a glance.",
                    "Click 'View Profile' on any card to see a deep dive into that student's academic history."
                ],
                assignments: [
                    "The Academic Tasks (📝) section is where you manage homework and tests.",
                    "Use '+ Create Assignment' to design new tasks. You can use the AI Generator to draft questions automatically.",
                    "Each task card shows its subject, class, and the current due date."
                ],
                live_lesson: [
                    "The Live Class (📡) tab is your immersive teaching environment.",
                    "Use the 'Board' to present content, and the 'Interaction' sub-tab to launch real-time polls.",
                    "The 'Roster' shows you exactly which students are currently connected and who has raised their hand."
                ]
            };

            const tabSteps = steps[activeTab];
            if (tabSteps) {
                let proceed = confirm(`Would you like a quick walkthrough of the ${activeTab.replace('_', ' ')}? (Cancel to Skip All)`);
                if (proceed) {
                    for (const step of tabSteps) {
                        if (!confirm(`${step}\n\n(OK for next, Cancel to Skip All)`)) break;
                    }
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
        
        const studentsQuery = isOmni 
            ? db.collection('users').where('role', '==', 'student')
            : (teacherClasses.length > 0 ? db.collection('users').where('class', 'in', teacherClasses).where('role', '==', 'student') : null);
            
        if (studentsQuery) {
            unsubscribers.push(studentsQuery.onSnapshot(snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile)), err => console.warn("Students listener error:", err.message)));
        }
        
        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active').onSnapshot(snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson), err => console.warn("LiveLessons listener error:", err.message)));
        
        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, userProfile, teacherClasses, isOmni]);

    const launchTestLesson = async () => {
        if (!user || !userProfile) return;
        try {
            const lessonRef = db.collection('liveLessons').doc();
            const demoPlan = [
                {
                    title: "Welcome to Edutec Live Classroom",
                    boardContent: "<h1>System Check: Active</h1><p>The interactive board is operational.</p><ul><li>Real-time Audio</li><li>Digital Whiteboard</li><li>AI Assistant Integration</li></ul>",
                    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
                    teacherScript: "Hello class! Welcome to our first digital live session. Can everyone see the board clearly?",
                    question: {
                        id: "demo_q1",
                        text: "Are you ready to begin the lesson?",
                        options: ["Yes, absolutely!", "I need a minute", "I have a question"],
                        correctAnswer: "Yes, absolutely!"
                    }
                },
                {
                    title: "The Architecture of Learning",
                    boardContent: "<h2>Our Digital Environment</h2><p>This classroom synchronizes all participants instantly across the Edutec secure network.</p>",
                    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
                    teacherScript: "Let's test the drawing tools. I'll highlight the key points on this slide.",
                    question: null
                }
            ];
            
            await lessonRef.set({
                id: lessonRef.id,
                teacherId: user.uid,
                teacherName: userProfile.name,
                classId: userProfile.class || teacherClasses[0] || 'JHS 3',
                subject: 'Integrated Science',
                topic: 'Demo Live Session',
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                currentStepIndex: 0,
                lessonPlan: demoPlan,
                currentBoardContent: demoPlan[0].boardContent,
                currentImageUrl: demoPlan[0].imageUrl,
                currentImageStyle: demoPlan[0].imageUrl ? 'cover' : 'contain',
                currentTeacherScript: demoPlan[0].teacherScript,
                currentQuestion: demoPlan[0].question,
                sourcePresentationId: 'demo-test',
                raisedHands: []
            });
            setToast({ message: "Test Live Classroom Launched!", type: 'success' });
            setActiveTab('live_lesson');
        } catch (e: any) {
            setToast({ message: `Launch failed: ${e.message}`, type: 'error' });
        }
    };

    const navItems = [
        { key: 'dashboard', label: 'Command Hub', icon: '🚀' },
        { key: 'my_students', label: 'My Students', icon: '👨‍🎓' },
        { key: 'assignments', label: 'Academic Tasks', icon: '📝' },
        { key: 'live_lesson', label: <span className="flex items-center">Live Class {activeLiveLesson && <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: '📡' },
        { key: 'ai_tools', label: 'AI Copilot', icon: '🤖' },
        { key: 'my_voice', label: 'My Voice', icon: '🎙️' },
        { key: 'bece_questions', label: 'BECE Library', icon: '📚' },
        { key: 'terminal_reports', label: 'Master Reports', icon: '📊' },
        { key: 'progress', label: 'Intelligence', icon: '📈' },
        { key: 'messages', label: `Messages`, icon: '💬' },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        
        if (userProfile?.status === 'pending' && !isOmni) {
            return (
                <div className="p-20 text-center animate-fade-in">
                    <div className="text-6xl mb-6">📝</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Staff Profile Verification</h2>
                    <p className="text-slate-400 max-w-md mx-auto italic">Your teaching credentials are being verified by school administrators. You will be able to manage your classes and create content shortly.</p>
                </div>
            );
        }

        const teacherName = (userProfile?.name || 'Architect').toUpperCase();

        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tight">Executive <span className="text-blue-500">Teacher</span></h1>
                                <p className="text-slate-400 mt-1 uppercase text-[10px] font-black tracking-widest">Logged: {teacherName} {isOmni && <span className="ml-2 text-blue-500 font-black">[MASTER ACCESS]</span>}</p>
                            </div>
                            {!activeLiveLesson && (
                                <Button onClick={launchTestLesson} className="shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-6 py-3 font-black text-xs uppercase tracking-widest">
                                    🚀 Launch Test Class
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="!bg-blue-900/10 border-blue-500/20 text-center"><p className="text-xs font-bold text-blue-400 uppercase">Active Students</p><p className="text-3xl font-black text-white">{students.length}</p></Card>
                            <Card className="!bg-purple-900/10 border-purple-500/20 text-center"><p className="text-xs font-bold text-purple-400 uppercase">Classes Accessible</p><p className="text-3xl font-black text-white">{teacherClasses.length}</p></Card>
                            <Card className="!bg-orange-900/10 border-orange-500/20 text-center"><p className="text-xs font-bold text-orange-400 uppercase">Alerts</p><p className="text-3xl font-black text-white">{submissions.filter(s => s.status === 'Submitted').length}</p></Card>
                        </div>
                        <TeacherStudentActivity teacherClasses={teacherClasses} />
                    </div>
                );
            case 'ai_tools': return <TeacherAITools students={students} userProfile={userProfile!} />;
            case 'my_voice': return <TeacherMyVoice userProfile={userProfile!} />;
            case 'bece_questions': return <BECEPastQuestionsView />;
            case 'live_lesson': return activeLiveLesson ? <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => setActiveTab('dashboard')} userProfile={userProfile!} setToast={setToast} /> : (
                <div className="flex flex-col items-center justify-center p-20 text-slate-500 italic h-full">
                    <span className="text-7xl mb-6 opacity-20">📡</span>
                    <h3 className="text-xl font-bold text-white mb-2 not-italic">No Active Classroom Signal</h3>
                    <p className="max-w-xs text-center mb-8">Ready to teach? You can launch a quick test session or go to your library to start a planned lesson.</p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setActiveTab('ai_tools')}>Go to Library</Button>
                        <Button onClick={launchTestLesson}>Launch Test Class 🚀</Button>
                    </div>
                </div>
            );
            case 'terminal_reports': return <AdminTerminalReports schoolSettings={schoolSettings} user={user} userProfile={userProfile} teacherMode allowedClasses={teacherClasses} allStudents={students} assignments={assignments} submissions={submissions} />;
            case 'progress': return <TeacherProgressDashboard students={students} assignments={assignments} submissions={submissions} teacherClasses={teacherClasses} />;
            case 'messages': return <MessagingView userProfile={userProfile!} contacts={students} />;
            default: return <div className="p-20 text-center text-slate-600 italic">This sector is online and operational.</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden h-full">
            <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Command Center" />
            <main className={`flex-1 overflow-y-auto bg-slate-950 ${activeTab === 'live_lesson' ? 'p-0' : 'p-6'}`}>{renderContent()}</main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default TeacherView;