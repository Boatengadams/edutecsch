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
        const storageKey = `onboarding_alert_teacher_${activeTab}`;
        if (!localStorage.getItem(storageKey)) {
            const messages: Record<string, string> = {
                dashboard: "🚀 Command Hub: Your executive overview.\n\n• Statistics Cards: Show active students, accessible classes, and pending submission alerts.\n• Launch Test Class: Starts an immediate synchronized interactive session.\n• Activity Feed: Monitors real-time student engagement logs.",
                my_students: "👨‍🎓 My Students: Central registry of your assigned learners.\n\n• Student Cards: Display individual averages and assignment completion rates.\n• View Profile: Opens deep academic analytics and personal portfolio.\n• Add Student/Parent: Manual account deployment tools.",
                assignments: "📝 Academic Tasks: Homework and assessment manager.\n\n• Create Assignment: Manual builder or AI quiz generator.\n• Task Cards: Detail subject links, due dates, and submission types (Theory/Objective).\n• Action Icons: Edit or terminate existing task protocols.",
                attendance: "📅 Attendance: Official daily roll call terminal.\n\n• Class Selector: Switch between your assigned sections.\n• Date Picker: Historical or current logging.\n• Status Radios: Mark 'Present', 'Absent', or 'Late' for each student.",
                live_lesson: "📡 Live Class: Real-time immersive classroom.\n\n• The Board: Central visual presentation stage.\n• Toolbox: Whiteboard, Laser Pointer, and Eraser controls.\n• Roster: Live student presence and 'Raise Hand' notification center.",
                library: "📚 Resource Library: Your teaching asset vault.\n\n• Slide Decks: Manage AI-generated presentations.\n• Video Lessons: Repository for pre-recorded instructional content.\n• Generate Button: Synthesis gateway for new content.",
                group_work: "👥 Group Work: Orchestrate student collaborations.\n\n• Form Group: Select members and define project topics.\n• Status Tracker: Monitor team submission lifecycle in real-time.",
                ai_tools: "🤖 AI Copilot: Suite of neural teaching assistants.\n\n• Lesson Designer: Curates curriculum plans.\n• Quiz Master: Synthesizes assessment batteries.\n• Report Assistant: Drafts professional terminal remarks.",
                terminal_reports: "📊 Master Reports: Official grading terminal.\n\n• Data Entry: Input terminal exam scores.\n• Auto-fill: Sync class assignment grades with the final ledger.\n• Print Mode: Generate high-fidelity report cards.",
                progress: "📈 Intelligence: Longitudinal academic analytics.\n\n• Distributions: Statistical spread of class grades.\n• Trends: Longitudinal mastery tracking across subjects.",
                messages: "💬 Messages: Secure internal transmission matrix.\n\n• Contact List: Searchable student and staff registry.\n• Chat Input: Send text, imagery, or voice transmissions."
            };

            const msg = messages[activeTab];
            if (msg) {
                alert(msg);
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

        const handleErr = (name: string) => (err: any) => {
            if (err.code === 'permission-denied') {
                console.warn(`${name} access restricted.`);
            } else {
                console.error(`${name} stream error:`, err.message);
            }
        };

        unsubscribers.push(db.collection('assignments').where('teacherId', '==', user.uid).onSnapshot(
            snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment))),
            handleErr("Assignments")
        ));

        unsubscribers.push(db.collection('submissions').where('teacherId', '==', user.uid).onSnapshot(
            snap => setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission))),
            handleErr("Submissions")
        ));
        
        const studentsQuery = isOmni 
            ? db.collection('users').where('role', '==', 'student')
            : (teacherClasses.length > 0 ? db.collection('users').where('class', 'in', teacherClasses).where('role', '==', 'student') : null);
            
        if (studentsQuery) {
            unsubscribers.push(studentsQuery.onSnapshot(
                snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile)),
                handleErr("Students")
            ));
        }
        
        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active').onSnapshot(
            snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson),
            handleErr("LiveLessons")
        ));
        
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

    const navItems = useMemo(() => {
        const rawItems = [
            { key: 'dashboard', label: 'Command Hub', icon: '🚀' },
            { key: 'my_students', label: 'My Students', icon: '👨‍🎓' },
            { key: 'assignments', label: 'Academic Tasks', icon: '📝' },
            { key: 'attendance', label: 'Attendance', icon: '📅' },
            { key: 'live_lesson', label: <span className="flex items-center">Live Class {activeLiveLesson && <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: '📡' },
            { key: 'library', label: 'Resource Library', icon: '📚' },
            { key: 'group_work', label: 'Group Work', icon: '👥' },
            { key: 'ai_tools', label: 'AI Copilot', icon: '🤖' },
            { key: 'my_voice', label: 'My Voice', icon: '🎙️' },
            { key: 'bece_questions', label: 'BECE Library', icon: '🎓' },
            { key: 'elections', label: 'Election Portal', icon: '🗳️' },
            { key: 'terminal_reports', label: 'Master Reports', icon: '📊' },
            { key: 'progress', label: 'Intelligence', icon: '📈' },
            { key: 'messages', label: `Messages`, icon: '💬' },
        ];

        const savedOrder = userProfile?.sidebarTabOrder?.teacher;
        if (!savedOrder) return rawItems;

        const itemMap = new Map(rawItems.map(item => [item.key, item]));
        const orderedItems = savedOrder
            .map(key => itemMap.get(key))
            .filter((item): item is typeof rawItems[0] => !!item);

        const currentKeys = new Set(orderedItems.map(item => item.key));
        const missingItems = rawItems.filter(item => !currentKeys.has(item.key));

        return [...orderedItems, ...missingItems];
    }, [activeLiveLesson, userProfile?.sidebarTabOrder?.teacher]);

    const handleReorder = async (newOrder: string[]) => {
        if (!userProfile) return;
        try {
            await db.collection('users').doc(userProfile.uid).set({
                sidebarTabOrder: {
                    ...(userProfile.sidebarTabOrder || {}),
                    teacher: newOrder
                }
            }, { merge: true });
        } catch (err) {
            console.warn("Failed to save sidebar order:", err);
        }
    };

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
            case 'my_students':
                return <TeacherStudentsList students={students} assignments={assignments} submissions={submissions} />;
            case 'assignments':
                return <TeacherAssignments user={user!} userProfile={userProfile!} teacherClasses={teacherClasses} />;
            case 'attendance':
                return <TeacherAttendance teacherClasses={teacherClasses} students={students} />;
            case 'library':
                return <TeacherLibrary user={user!} userProfile={userProfile!} teacherClasses={teacherClasses} onStartLiveLesson={() => setActiveTab('live_lesson')} />;
            case 'group_work':
                return <TeacherGroupWork teacherClasses={teacherClasses} students={students} />;
            case 'ai_tools': 
                return <TeacherAITools students={students} userProfile={userProfile!} />;
            case 'my_voice': 
                return <TeacherMyVoice userProfile={userProfile!} />;
            case 'bece_questions': 
                return <BECEPastQuestionsView />;
            case 'live_lesson': 
                return activeLiveLesson ? <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => setActiveTab('dashboard')} userProfile={userProfile!} setToast={setToast} /> : (
                <div className="flex flex-col items-center justify-center p-20 text-slate-500 italic h-full">
                    <span className="text-7xl mb-6 opacity-20">📡</span>
                    <h3 className="text-xl font-bold text-white mb-2 not-italic">No Active Classroom Signal</h3>
                    <p className="max-w-xs text-center mb-8">Ready to teach? You can launch a session from your Resource Library or start a dynamic plan.</p>
                    <Button onClick={() => setActiveTab('library')}>Go to Library</Button>
                </div>
            );
            case 'elections':
                return <StudentElectionPortal userProfile={userProfile!} />;
            case 'terminal_reports': 
                return <AdminTerminalReports schoolSettings={schoolSettings} user={user} userProfile={userProfile} teacherMode allowedClasses={teacherClasses} allStudents={students} assignments={assignments} submissions={submissions} />;
            case 'progress': 
                return <TeacherProgressDashboard students={students} assignments={assignments} submissions={submissions} teacherClasses={teacherClasses} />;
            case 'messages': 
                return <MessagingView userProfile={userProfile!} contacts={students} />;
            default: 
                return <div className="p-20 text-center text-slate-600 italic">This sector is online and operational.</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden h-full relative">
            <Sidebar 
                isExpanded={isSidebarExpanded} 
                navItems={navItems} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onClose={() => setIsSidebarExpanded(false)} 
                title="Command Center"
                onReorder={handleReorder}
            />
            <main className={`flex-1 overflow-y-auto bg-slate-950 ${activeTab === 'live_lesson' ? 'p-0' : 'p-6'}`}>{renderContent()}</main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default TeacherView;