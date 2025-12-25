
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, storage, functions, firebase } from '../services/firebase';
import type { Assignment, Submission, UserProfile, GeneratedContent, LiveLesson, Group, Conversation, LiveLessonStep, TerminalReport, TerminalReportMark, AttendanceStatus } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import Sidebar from './common/Sidebar';
import AIAssistant from './AIAssistant';
import { useToast } from './common/Toast';
import { PresentationGenerator } from './PresentationGenerator';
import VideoGenerator from './VideoGenerator';
import AssignmentModal from './AssignmentModal';
import MessagingView from './MessagingView';
import BECEPastQuestionsView from './common/BECEPastQuestionsView';
import TeacherStudentActivity from './TeacherStudentActivity';
import TeacherProgressDashboard from './TeacherProgressDashboard';
import TeacherAITools from './TeacherAITools';
import TeacherMyVoice from './TeacherMyVoice';
import TeacherStudentCard from './TeacherStudentCard';
import { ProgressDashboard } from './ProgressDashboard';
import AdminTerminalReports from './AdminTerminalReports';
import { TeacherLiveClassroom } from './TeacherLiveClassroom';

const TeacherView: React.FC<{ isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void }> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings } = useAuthentication();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    // Data States
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [myLibraryContent, setMyLibraryContent] = useState<GeneratedContent[]>([]);
    const [activeLiveLesson, setActiveLiveLesson] = useState<LiveLesson | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [groups, setGroups] = useState<Group[]>([]);
    const [allTeachers, setAllTeachers] = useState<UserProfile[]>([]);

    // UI States
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Assignment | null>(null);
    const [isGrading, setIsGrading] = useState<string | null>(null); 
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showPresentationGenerator, setShowPresentationGenerator] = useState(false);
    const [showVideoGenerator, setShowVideoGenerator] = useState(false);
    const [viewingStudentProgress, setViewingStudentProgress] = useState<UserProfile | null>(null);
    const [aiSystemInstruction, setAiSystemInstruction] = useState('');
    const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);

    const handleSetToast = useCallback((t: { message: string, type: 'success' | 'error' } | null) => {
        if (t) showToast(t.message, t.type === 'success' ? 'success' : 'error');
    }, [showToast]);

    const teacherClasses = useMemo(() => {
        if (!userProfile) return [];
        return Array.from(new Set([
            ...(userProfile.classesTaught || []),
            ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : []),
        ])).sort();
    }, [userProfile]);

    useEffect(() => {
        if (!user || teacherClasses.length === 0) { setLoading(false); return; }
        const unsubscribers: (() => void)[] = [];

        unsubscribers.push(db.collection('assignments').where('teacherId', '==', user.uid).orderBy('createdAt', 'desc')
            .onSnapshot(snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)))));

        unsubscribers.push(db.collection('submissions').where('teacherId', '==', user.uid)
            .onSnapshot(snap => setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)))));

        unsubscribers.push(db.collection('users').where('class', 'in', teacherClasses).where('role', '==', 'student')
            .onSnapshot(snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u && u.uid))));
        
        unsubscribers.push(db.collection('generatedContent').where('collaboratorUids', 'array-contains', user.uid).orderBy('createdAt', 'desc')
            .onSnapshot(snap => setMyLibraryContent(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedContent)))));

        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active')
            .onSnapshot(snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson)));
        
        unsubscribers.push(db.collection('groups').where('teacherId', '==', user.uid)
            .onSnapshot(snap => setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)))));

        unsubscribers.push(db.collection('users').where('role', '==', 'teacher')
            .onSnapshot(snap => setAllTeachers(snap.docs.map(d => d.data() as UserProfile).filter(u => u && u.uid))));

        unsubscribers.push(db.collection('conversations').where('participantUids', 'array-contains', user.uid)
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.forEach(doc => count += (doc.data().unreadCount?.[user.uid] || 0));
                setUnreadMessages(count);
            }));

        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, userProfile, teacherClasses]);

    const handleAutoGradeAll = async (assignment: Assignment) => {
        if (assignment.type !== 'Objective' || !assignment.quiz) return;
        const subsToGrade = submissions.filter(s => s.assignmentId === assignment.id && s.status === 'Submitted');
        if (subsToGrade.length === 0) {
            showToast("No ungraded submissions found.", "info");
            return;
        }
        setIsSaving(true);
        try {
            const batch = db.batch();
            subsToGrade.forEach(sub => {
                let correctCount = 0;
                const quiz = assignment.quiz!.quiz;
                quiz.forEach((q, idx) => {
                    if (sub.answers?.[idx] === q.correctAnswer) correctCount++;
                });
                batch.update(db.collection('submissions').doc(sub.id), {
                    grade: `${correctCount} / ${quiz.length}`,
                    status: 'Graded',
                    feedback: 'Automatically graded by System.'
                });
            });
            await batch.commit();
            showToast(`Successfully graded ${subsToGrade.length} students.`, "success");
        } catch (e) {
            showToast("Auto-grading failed.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartGrading = (submission: Submission) => {
        setIsGrading(submission.id);
        const assignment = assignments.find(a => a.id === submission.assignmentId);
        if (assignment?.type === 'Objective' && assignment.quiz && submission.answers) {
            let correctCount = 0;
            assignment.quiz.quiz.forEach((q, index) => {
                if (submission.answers?.[index] === q.correctAnswer) correctCount++;
            });
            setGradeInput(`${correctCount} / ${assignment.quiz.quiz.length}`);
        } else {
            setGradeInput(submission.grade || '');
        }
        setFeedbackInput(submission.feedback || '');
    };

    const handleSaveGrade = async (submissionId: string) => {
        try {
            await db.collection('submissions').doc(submissionId).update({
                grade: gradeInput,
                feedback: feedbackInput,
                status: 'Graded'
            });
            showToast('Grade saved.', 'success');
            setIsGrading(null);
        } catch (err: any) {
            showToast('Save failed.', 'error');
        }
    };

    const handleStartLiveLesson = useCallback((content: GeneratedContent) => {
        setActiveLiveLesson({ id: 'preview', ...content } as any);
        setActiveTab('live_lesson');
    }, []);

    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">🚀</span> },
        { key: 'my_students', label: 'My Students', icon: <span className="text-xl">👩‍🎓</span> },
        { key: 'assignments', label: 'Assignments', icon: <span className="text-xl">📚</span> },
        { key: 'live_lesson', label: <span className="flex items-center">Live Class {activeLiveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-xl">📡</span> },
        { key: 'group_work', label: 'Group Work', icon: <span className="text-xl">🤝</span> },
        { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <span className="text-xl">💬</span> },
        { key: 'my_library', label: 'My Library', icon: <span className="text-xl">📁</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
        { key: 'progress', label: 'Progress', icon: <span className="text-xl">📈</span> },
        { key: 'terminal_reports', label: 'Reports', icon: <span className="text-xl">📊</span> },
        { key: 'past_questions', label: 'BECE Questions', icon: <span className="text-xl">📝</span> },
        { key: 'ai_tools', label: 'AI Tools', icon: <span className="text-xl">🤖</span> },
        { key: 'my_voice', label: 'My Voice', icon: <span className="text-xl">🎙️</span> },
    ];

    const renderContent = () => {
        if (loading) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;
        switch (activeTab) {
            case 'dashboard':
                const pendingCount = submissions.filter(s => s.status === 'Submitted').length;
                return (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tight">Teacher <span className="text-blue-500">Command Center</span></h1>
                                <p className="text-slate-400 mt-1">Welcome back, {userProfile?.name.toUpperCase()}. Ready to inspire?</p>
                            </div>
                            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Current Term <span className="text-blue-500 ml-2">{schoolSettings?.academicYear}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="!p-8 bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-blue-500/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 text-8xl opacity-10 group-hover:scale-110 transition-transform">🎓</div>
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Total Students</h3>
                                <p className="text-5xl font-black text-white">{students.length}</p>
                                <div className="mt-4 text-3xl">👨‍🎓</div>
                            </Card>
                            <Card className="!p-8 bg-gradient-to-br from-purple-900/40 to-purple-950/40 border-purple-500/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 text-8xl opacity-10 group-hover:scale-110 transition-transform">🏫</div>
                                <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2">Active Classes</h3>
                                <p className="text-5xl font-black text-white">{teacherClasses.length}</p>
                                <div className="mt-4 text-3xl">🏫</div>
                            </Card>
                            <Card className="!p-8 bg-gradient-to-br from-orange-900/40 to-orange-950/40 border-orange-500/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 text-8xl opacity-10 group-hover:scale-110 transition-transform">📝</div>
                                <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2">Pending Grading</h3>
                                <p className="text-5xl font-black text-white">{pendingCount}</p>
                                <div className="mt-4 text-3xl">📝</div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="flex flex-col">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">⌛ Upcoming Deadlines</h3>
                                <div className="flex-grow flex items-center justify-center text-slate-500 italic py-10">No upcoming deadlines.</div>
                            </Card>
                            <Card className="flex flex-col">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">📥 Recent Submissions</h3>
                                <div className="space-y-4">
                                    {submissions.slice(0, 3).map(sub => (
                                        <div key={sub.id} className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">{(sub.studentName || '?').charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold text-white">{sub.studentName}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-mono">Assignment</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setActiveTab('assignments')} className="px-4 py-1.5 rounded-lg bg-green-600/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20 hover:bg-green-500 hover:text-white transition-all">Ready to Grade</button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                        <TeacherStudentActivity teacherClasses={teacherClasses} />
                    </div>
                );
            case 'my_students':
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Student Roster</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {students.map(s => (
                                <TeacherStudentCard key={s.uid} student={s} classAssignments={assignments.filter(a => a.classId === s.class)} studentSubmissions={submissions.filter(sub => sub.studentId === s.uid)} onClick={() => setViewingStudentProgress(s)} onMessage={() => setActiveTab('messages')} />
                            ))}
                        </div>
                    </div>
                );
            case 'assignments':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Assignments</h2>
                            <Button onClick={() => { setEditingAssignment(null); setIsAssignmentModalOpen(true); }}>+ Create</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {assignments.map(a => (
                                <Card key={a.id} className="flex flex-col group hover:border-blue-500/50 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{a.title}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">{a.classId} • {a.subject}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingAssignment(a); setIsAssignmentModalOpen(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg></button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-3 mb-6">{a.description}</p>
                                    <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                                        <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Due: <span className="text-slate-400 ml-1">{a.dueDate || 'N/A'}</span></div>
                                        <button onClick={() => setViewingSubmissionsFor(a)} className="px-4 py-2 rounded-xl bg-slate-800 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">View Submissions ({submissions.filter(s => s.assignmentId === a.id).length})</button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            case 'live_lesson':
                return activeLiveLesson ? <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => setActiveTab('dashboard')} userProfile={userProfile!} setToast={handleSetToast} /> : <div className="text-center p-20"><Spinner /><p className="mt-4 text-slate-500">Redirecting to Library...</p></div>;
            case 'ai_tools':
                return <TeacherAITools students={students} userProfile={userProfile!} />;
            case 'my_voice':
                return <TeacherMyVoice userProfile={userProfile!} />;
            case 'progress':
                return <TeacherProgressDashboard students={students} assignments={assignments} submissions={submissions} teacherClasses={teacherClasses} />;
            case 'terminal_reports':
                return <AdminTerminalReports schoolSettings={schoolSettings} user={user} userProfile={userProfile} teacherMode={true} allowedClasses={teacherClasses} allStudents={students} assignments={assignments} submissions={submissions} groups={groups} />;
            case 'messages':
                return <MessagingView userProfile={userProfile!} contacts={[...students, ...allTeachers]} />;
            case 'past_questions':
                return <BECEPastQuestionsView />;
            case 'my_library':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Resource Library</h2>
                            <Button onClick={() => setShowPresentationGenerator(true)}>+ New Presentation</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myLibraryContent.map(content => (
                                <Card key={content.id} className="flex flex-col">
                                    <h3 className="text-xl font-bold truncate text-white">{content.topic}</h3>
                                    <p className="text-xs text-slate-400 uppercase mt-1 tracking-widest font-mono">{content.subject} • {content.classes.join(', ')}</p>
                                    <div className="mt-8 flex gap-2 flex-wrap">
                                        <Button size="sm" onClick={() => handleStartLiveLesson(content)}>Launch Live</Button>
                                        <Button size="sm" variant="secondary" onClick={() => { setShowVideoGenerator(true); }}>Create Video</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            default:
                return <div className="flex h-full items-center justify-center text-slate-600 font-mono">MODULE_NOT_LOADED_x404</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden bg-slate-950 selection:bg-blue-500/30">
            <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Command Center" />
            <main className="flex-1 p-6 sm:p-10 overflow-y-auto custom-scrollbar relative">
                {renderContent()}
            </main>
            <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {isAssignmentModalOpen && <AssignmentModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} assignment={editingAssignment} classes={teacherClasses} user={user!} userProfile={userProfile!} teacherSubjectsByClass={userProfile!.subjectsByClass} />}
            {showPresentationGenerator && <PresentationGenerator onClose={() => setShowPresentationGenerator(false)} classes={teacherClasses} subjectsByClass={userProfile!.subjectsByClass || {}} user={user} userProfile={userProfile} onStartLiveLesson={handleStartLiveLesson} setToast={handleSetToast} />}
            {showVideoGenerator && <VideoGenerator onClose={() => setShowVideoGenerator(false)} userProfile={userProfile!} allClasses={teacherClasses} subjectsByClass={userProfile!.subjectsByClass || {}} />}
            {viewingStudentProgress && <ProgressDashboard student={viewingStudentProgress} onClose={() => setViewingStudentProgress(null)} isModal={true} />}
            
            {viewingSubmissionsFor && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-[100]">
                    <Card className="w-full max-w-5xl h-[90vh] flex flex-col !bg-slate-900 border-slate-800 shadow-3xl">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Submissions: {viewingSubmissionsFor.title}</h3>
                                <p className="text-xs text-slate-400 font-mono uppercase mt-1">{viewingSubmissionsFor.type} • {submissions.filter(s => s.assignmentId === viewingSubmissionsFor.id).length} Entries</p>
                            </div>
                            <div className="flex gap-3">
                                {viewingSubmissionsFor.type === 'Objective' && (
                                    <Button size="sm" variant="secondary" onClick={() => handleAutoGradeAll(viewingSubmissionsFor)} disabled={isSaving} className="bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white">
                                        {isSaving ? <Spinner /> : '🤖 Bulk Auto-Grade'}
                                    </Button>
                                )}
                                <Button variant="secondary" onClick={() => setViewingSubmissionsFor(null)}>Close</Button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {submissions.filter(s => s.assignmentId === viewingSubmissionsFor.id).map(submission => (
                                <div key={submission.id} className="p-6 bg-slate-800/40 border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-black text-white">{(submission.studentName || '?').charAt(0)}</div>
                                            <div>
                                                <p className="text-lg font-black text-white">{submission.studentName}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-mono">{submission.submittedAt.toDate().toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${submission.status === 'Graded' ? 'bg-green-600/20 text-green-400 border border-green-500/20' : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/20'}`}>
                                                {submission.status}
                                            </span>
                                            {submission.grade && <p className="text-2xl font-black text-blue-400">{submission.grade}</p>}
                                        </div>
                                    </div>
                                    
                                    {isGrading === submission.id ? (
                                        <div className="mt-4 space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-blue-500/20 animate-fade-in-up">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Final Grade</label>
                                                    <input type="text" value={gradeInput} onChange={e => setGradeInput(e.target.value)} placeholder="e.g. 18 / 20" className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-white font-mono outline-none focus:border-blue-500"/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Constructive Feedback</label>
                                                <textarea value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} placeholder="Add remarks..." rows={3} className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500"/>
                                            </div>
                                            <div className="flex gap-2 justify-end pt-2">
                                                <Button size="sm" variant="ghost" onClick={() => setIsGrading(null)}>Cancel</Button>
                                                <Button size="sm" onClick={() => handleSaveGrade(submission.id)}>Submit Grade</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                                                 {viewingSubmissionsFor.type === 'Objective' && viewingSubmissionsFor.quiz ? (
                                                     <div className="space-y-3">
                                                         {viewingSubmissionsFor.quiz.quiz.map((q, idx) => {
                                                             const ans = submission.answers?.[idx];
                                                             const isCorrect = ans === q.correctAnswer;
                                                             return (
                                                                 <div key={idx} className={`p-3 rounded-lg flex items-center justify-between border ${isCorrect ? 'bg-green-600/5 border-green-500/20' : 'bg-red-600/5 border-red-500/20'}`}>
                                                                     <div className="flex gap-3 items-start">
                                                                         <span className="text-xs font-mono text-slate-600 pt-0.5">{idx+1}.</span>
                                                                         <div>
                                                                             <p className="text-xs text-slate-300 line-clamp-1">{q.question}</p>
                                                                             <p className={`text-[10px] font-black uppercase mt-1 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>ANS: {ans || 'NO RESPONSE'}</p>
                                                                         </div>
                                                                     </div>
                                                                     <span className="text-lg">{isCorrect ? '✅' : '❌'}</span>
                                                                 </div>
                                                             );
                                                         })}
                                                     </div>
                                                 ) : (
                                                     <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{submission.text || "No text provided."}</p>
                                                 )}
                                            </div>
                                            <div className="flex justify-between items-center gap-4">
                                                 {submission.attachmentURL ? (
                                                     <a href={submission.attachmentURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/5 rounded-xl hover:bg-slate-950 transition-colors group">
                                                         <span className="text-lg group-hover:scale-110 transition-transform">📄</span>
                                                         <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Download Evidence</span>
                                                     </a>
                                                 ) : <div className="h-10"></div>}
                                                 <Button size="sm" variant="secondary" onClick={() => handleStartGrading(submission)}>
                                                     {submission.status === 'Graded' ? 'Edit Grade' : 'Assign Score'}
                                                 </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default TeacherView;
