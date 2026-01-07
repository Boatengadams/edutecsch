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
        // SECURITY GUARD: Only proceed if user is approved. Pending users don't have access to these collections.
        // We also check for OMNI status as they bypass the approval check in rules.
        if (!user || !userProfile || (userProfile.status !== 'approved' && !isOmni)) { 
            if (userProfile && userProfile.status === 'pending') setLoading(false);
            return; 
        }

        const unsubscribers: (() => void)[] = [];

        const handleErr = (name: string) => (err: any) => {
            if (err.code === 'permission-denied') {
                console.warn(`${name} access restricted. Profile status: ${userProfile?.status}`);
            } else {
                console.error(`${name} stream error:`, err.message);
            }
        };

        // Fetch assignments
        unsubscribers.push(db.collection('assignments').where('teacherId', '==', user.uid).onSnapshot(
            snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment))),
            handleErr("Assignments")
        ));

        // Fetch submissions
        unsubscribers.push(db.collection('submissions').where('teacherId', '==', user.uid).onSnapshot(
            snap => setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission))),
            handleErr("Submissions")
        ));
        
        // Fetch students
        const studentsQuery = isOmni 
            ? db.collection('users').where('role', '==', 'student')
            : (teacherClasses.length > 0 ? db.collection('users').where('class', 'in', teacherClasses).where('role', '==', 'student') : null);
            
        if (studentsQuery) {
            unsubscribers.push(studentsQuery.onSnapshot(
                snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile)),
                handleErr("Students")
            ));
        }
        
        // Fetch active lesson
        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active').onSnapshot(
            snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson),
            handleErr("LiveLessons")
        ));
        
        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user?.uid, userProfile?.status, teacherClasses, isOmni]);

    const navItems = [
        { key: 'dashboard', label: 'Command Hub', icon: '🚀' },
        { key: 'my_students', label: 'My Students', icon: '👨‍🎓' },
        { key: 'assignments', label: 'Academic Tasks', icon: '📝' },
        { key: 'live_lesson', label: <span className="flex items-center">Live Class {activeLiveLesson && <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: '📡' },
        { key: 'ai_tools', label: 'AI Copilot', icon: '🤖' },
        { key: 'my_voice', label: 'My Voice', icon: '🎙️' },
        { key: 'bece_questions', label: 'BECE Library', icon: '📚' },
        { key: 'elections', label: 'Elections', icon: '🗳️' },
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
            case 'elections': return <StudentElectionPortal userProfile={userProfile!} />;
            case 'live_lesson': return activeLiveLesson ? <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => setActiveTab('dashboard')} userProfile={userProfile!} setToast={setToast} /> : (
                <div className="flex flex-col items-center justify-center p-20 text-slate-500 italic h-full">
                    <span className="text-7xl mb-6 opacity-20">📡</span>
                    <h3 className="text-xl font-bold text-white mb-2 not-italic">No Active Classroom Signal</h3>
                    <p className="max-w-xs text-center mb-8">Ready to teach? You can launch a quick test session or go to your library to start a planned lesson.</p>
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
