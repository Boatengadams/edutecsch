import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase, storage } from '../services/firebase';
import { UserProfile, Assignment, Submission, Notification, SchoolEvent, Timetable, AttendanceRecord, Group, GroupMessage, PublishedFlyer, LiveLesson, UserRole, TeachingMaterial, GES_SUBJECTS, GES_STANDARD_CURRICULUM, Correction, TerminalReport } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import Button from './common/Button';
import AIAssistant from './AIAssistant';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import ChangePasswordModal from './common/ChangePasswordModal';
import { useToast } from './common/Toast';
import MessagingView from './MessagingView';
import StudentProfile from './StudentProfile';
import StudentLiveClassroom from './StudentLiveClassroom';
import StudentStudyMode from './StudentStudyMode';
import ChatInput from './common/ChatInput';
import ScienceLab from './ScienceLab/ScienceLab';
import FlyerCard from './common/FlyerCard';
import StudentReportCard from './common/StudentReportCard';

const QUOTES = [
    "The expert in anything was once a beginner.",
    "Education is the passport to the future.",
    "Strive for progress, not perfection.",
    "Your attitude determines your direction.",
    "Dream big and dare to fail.",
    "Knowledge is power.",
    "Learn as if you were to live forever."
];

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

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

interface StudentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile, schoolSettings } = useAuthentication();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Data State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [liveLesson, setLiveLesson] = useState<LiveLesson | null>(null);
  const [studentGroup, setStudentGroup] = useState<Group | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [publishedFlyers, setPublishedFlyers] = useState<PublishedFlyer[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<PublishedFlyer | null>(null);
  const [terminalReports, setTerminalReports] = useState<TerminalReport[]>([]);
  const [viewingReport, setViewingReport] = useState<TerminalReport | null>(null);
  
  const [teachingMaterials, setTeachingMaterials] = useState<TeachingMaterial[]>([]);
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('All');

  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [textSubmission, setTextSubmission] = useState('');
  const [fileSubmission, setFileSubmission] = useState<File | null>(null);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [correctionText, setCorrectionText] = useState('');
  const [correctionAnswers, setCorrectionAnswers] = useState<Record<string, string>>({});
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [visibleExplanations, setVisibleExplanations] = useState<Record<string, boolean>>({});
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const groupMessagesEndRef = useRef<HTMLDivElement>(null);
  const [isSendingGroupMessage, setIsSendingGroupMessage] = useState(false);
  
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !userProfile) return;
    setLoading(true);

    const unsubscribers: (() => void)[] = [];

    if (userProfile.class) {
        unsubscribers.push(db.collection('assignments').where('classId', '==', userProfile.class).orderBy('createdAt', 'desc').onSnapshot(snap => {
            setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        }));
    }

    unsubscribers.push(db.collection('submissions').where('studentId', '==', user.uid).onSnapshot(snap => {
        const subs: Record<string, Submission> = {};
        snap.forEach(doc => {
            const data = doc.data() as Submission;
            subs[data.assignmentId] = { ...data, id: doc.id };
        });
        setSubmissions(subs);
    }));

    if (userProfile.class) {
        unsubscribers.push(db.collection('liveLessons').where('classId', '==', userProfile.class).where('status', '==', 'active').limit(1).onSnapshot(snap => {
            setLiveLesson(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as LiveLesson);
        }));
    }

    unsubscribers.push(db.collection('groups').where('memberUids', 'array-contains', user.uid).limit(1).onSnapshot(snap => {
        if (!snap.empty) setStudentGroup({ id: snap.docs[0].id, ...snap.docs[0].data() } as Group);
        else setStudentGroup(null);
    }));

    setLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, userProfile]);

  const handleAssignmentClick = (assignment: Assignment) => {
      setViewingAssignment(assignment);
      setTextSubmission('');
      setFileSubmission(null);
      setObjectiveAnswers({});
      setCorrectionText('');
      setCorrectionAnswers({});
      setCorrectionFile(null);
      setVisibleExplanations({});
  };

  const handleSubmitAssignment = async () => {
      if (!viewingAssignment || !user || !userProfile) return;
      setIsSubmitting(true);
      try {
          let attachmentURL = '';
          let attachmentName = '';

          if (fileSubmission) {
              const storagePath = `submissions/${viewingAssignment.id}/${user.uid}/${fileSubmission.name}`;
              const storageRef = storage.ref(storagePath);
              await storageRef.put(fileSubmission);
              attachmentURL = await storageRef.getDownloadURL();
              attachmentName = fileSubmission.name;
          }

          let status: 'Submitted' | 'Graded' = 'Submitted';
          let grade = undefined;
          let feedback = undefined;

          if (viewingAssignment.type === 'Objective' && viewingAssignment.quiz) {
              let correctCount = 0;
              viewingAssignment.quiz.quiz.forEach((q, index) => {
                  if (objectiveAnswers[index] === q.correctAnswer) correctCount++;
              });
              grade = `${correctCount}/${viewingAssignment.quiz.quiz.length}`;
              status = 'Graded';
              const percentage = (correctCount / viewingAssignment.quiz.quiz.length) * 100;
              feedback = percentage === 100 ? "Perfect! 🌟" : "Good effort. Please review corrections for mistakes.";
          }

          const submissionData: Omit<Submission, 'id'> = {
              assignmentId: viewingAssignment.id,
              studentId: user.uid,
              studentName: userProfile.name,
              teacherId: viewingAssignment.teacherId,
              classId: userProfile.class || '',
              text: textSubmission,
              attachmentURL,
              attachmentName,
              submittedAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
              status: status,
              answers: viewingAssignment.type === 'Objective' ? objectiveAnswers : undefined,
              grade: grade,
              feedback: feedback,
              parentUids: userProfile.parentUids || [],
          };

          await db.collection('submissions').add(submissionData);
          showToast(`Success! +50 XP earned.`, 'success');
          setViewingAssignment(null);
      } catch (err: any) {
          showToast(`Error: ${err.message}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSubmitCorrection = async (submissionId: string) => {
      if (!user) return;
      const isObjective = viewingAssignment?.type === 'Objective';
      
      if (!isObjective && !correctionText && !correctionFile) {
          showToast("Please enter details or attach a file.", "error");
          return;
      }
      if (isObjective && Object.keys(correctionAnswers).length === 0) {
           showToast("Re-attempt at least one wrong question.", "error");
           return;
      }

      setIsSubmittingCorrection(true);
      try {
          const correctionData: Correction = {
              // FIX: Now includes answers and text, correctly mapped to Correction interface in types.ts
              answers: isObjective ? correctionAnswers : {},
              grade: 'Resubmitted',
              feedback: 'Student Correction Submitted',
              text: correctionText,
              submittedAt: firebase.firestore.Timestamp.now(),
          };

          await db.collection('submissions').doc(submissionId).update({ 
              correction: correctionData,
              status: 'Submitted' 
          });
          
          showToast("Correction submitted successfully!", "success");
          setCorrectionText('');
          setCorrectionAnswers({});
      } catch (err: any) {
          showToast(`Failed: ${err.message}`, "error");
      } finally {
          setIsSubmittingCorrection(false);
      }
  };

  const getWrongQuestionIndices = () => {
      if (!viewingAssignment || !viewingAssignment.quiz || !submissions[viewingAssignment.id]) return [];
      const sub = submissions[viewingAssignment.id];
      if (!sub.answers) return [];
      return viewingAssignment.quiz.quiz
          .map((q, idx) => ({ q, idx }))
          .filter(({ q, idx }) => sub.answers?.[idx] !== q.correctAnswer)
          .map(({ idx }) => idx);
  };

  if (!user || !userProfile) return <div className="flex h-screen justify-center items-center"><Spinner /></div>;

  const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: '🚀' },
      { key: 'assignments', label: 'Assignments', icon: '📚' },
      { key: 'live_lesson', label: <span className="flex items-center">Live Class {liveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: '📡' },
      { key: 'science_lab', label: 'Virtual Lab', icon: '🧪' },
      { key: 'group_work', label: 'Group Work', icon: '🤝' },
      { key: 'study_mode', label: 'Study Mode', icon: '🧠' },
      { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: '💬' },
      { key: 'terminal_reports', label: 'Reports', icon: '📊' },
  ];

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
      switch (activeTab) {
          case 'dashboard':
              const pendingCount = assignments.filter(a => !submissions[a.id]).length;
              return (
                  <div className="space-y-8 animate-fade-in-up pb-10">
                      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                          <div>
                              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                  {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{userProfile.name.split(' ')[0]}</span>
                              </h1>
                              <p className="text-slate-400 mt-2 text-lg italic max-w-2xl">"{quote}"</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 flex flex-col justify-between min-h-[280px] group cursor-pointer hover:border-slate-700 transition-all shadow-2xl">
                              {liveLesson ? (
                                  <>
                                      <div className="relative z-10">
                                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider border border-red-500/20 animate-pulse">Live Now</span>
                                          <h2 className="text-3xl font-bold text-white mt-4 mb-2">{liveLesson.topic}</h2>
                                          <p className="text-slate-400">{liveLesson.subject}</p>
                                      </div>
                                      <Button onClick={() => setActiveTab('live_lesson')} className="mt-8 w-fit px-8 py-4 text-lg font-bold shadow-lg shadow-red-500/20 bg-gradient-to-r from-red-600 to-pink-600">Join Class 📡</Button>
                                  </>
                              ) : (
                                  <>
                                      <div className="relative z-10">
                                          <h2 className="text-3xl font-bold text-white mt-4 mb-2">Ready to learn?</h2>
                                          <p className="text-slate-400">Launch Study Mode to explore topics with your AI tutor.</p>
                                      </div>
                                      <Button onClick={() => setActiveTab('study_mode')} className="mt-8 w-fit px-8 py-4 text-lg font-bold shadow-lg shadow-blue-500/20">Launch Study Mode 🚀</Button>
                                  </>
                              )}
                          </div>
                          <div className="space-y-4">
                              <div onClick={() => setActiveTab('assignments')} className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer flex flex-col justify-between h-[130px]">
                                  <div className="flex justify-between items-start"><div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 text-xl">📝</div>{pendingCount > 0 && <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-1 rounded-md">{pendingCount} Due</span>}</div>
                                  <div><p className="text-2xl font-bold text-white">{pendingCount}</p><p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Tasks</p></div>
                              </div>
                              <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors flex flex-col justify-between h-[130px]">
                                  <div className="flex justify-between items-start"><div className="p-2 bg-green-500/10 rounded-lg text-green-400 text-xl">🏆</div></div>
                                  <div>
                                      <div className="flex justify-between items-end mb-1"><p className="text-2xl font-bold text-white">{userProfile.xp || 0}</p><p className="text-xs text-slate-500 mb-1">/ {(userProfile.level || 1) * 100} XP</p></div>
                                      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, ((userProfile.xp || 0) / ((userProfile.level || 1) * 100)) * 100)}%` }}></div></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              );
          case 'assignments':
              return (
                  <div className="space-y-6">
                      <h2 className="text-3xl font-black text-white flex items-center gap-3">📝 ASSIGNMENTS</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {assignments.map(assignment => {
                              const sub = submissions[assignment.id];
                              const status = sub ? sub.status : 'Pending';
                              return (
                                  <Card key={assignment.id} className="flex flex-col h-full group hover:border-blue-500/50 transition-all">
                                      <div className="flex justify-between items-start mb-4">
                                          <div>
                                              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 truncate">{assignment.title}</h3>
                                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300">{assignment.subject}</span>
                                          </div>
                                          {assignment.type === 'Objective' && <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded-lg border border-purple-500/30 font-black">QUIZ</span>}
                                      </div>
                                      <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-6">{assignment.description}</p>
                                      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                          <div className={`text-[10px] font-black uppercase tracking-widest ${status === 'Graded' ? 'text-green-400' : 'text-yellow-400'}`}>{status}</div>
                                          <Button size="sm" onClick={() => handleAssignmentClick(assignment)}>{sub ? 'Details' : 'Start'}</Button>
                                      </div>
                                  </Card>
                              );
                          })}
                      </div>
                  </div>
              );
          case 'live_lesson':
               return liveLesson ? <StudentLiveClassroom lessonId={liveLesson.id} userProfile={userProfile} onClose={() => setLiveLesson(null)} /> : <div className="flex flex-col items-center justify-center h-full text-center p-8"><h2 className="text-3xl font-black text-slate-300 mb-2 tracking-tight">SIGNAL LOST</h2><p className="text-slate-500 font-mono">NO ACTIVE TRANSMISSION DETECTED.</p></div>;
          default:
              return <div>Select a tab</div>;
      }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Student Portal" />
      <main className={`flex-1 overflow-y-auto relative custom-scrollbar ${['science_lab', 'study_mode', 'live_lesson'].includes(activeTab) ? 'p-0' : 'p-4 sm:p-6'}`}>
        {renderContent()}
      </main>
      <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
      
       {viewingAssignment && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex justify-center items-center p-4 z-[100]">
              <Card className="w-full max-w-4xl h-[90vh] flex flex-col !bg-slate-900 border-slate-700 shadow-3xl">
                  <div className="flex justify-between items-center mb-6 flex-shrink-0 pb-4 border-b border-white/5">
                      <div><h2 className="text-2xl font-black text-white uppercase tracking-tight">{viewingAssignment.title}</h2><p className="text-blue-400 text-[10px] font-mono mt-1 uppercase tracking-widest">Assignment Brief</p></div>
                      <Button variant="secondary" onClick={() => setViewingAssignment(null)}>Close</Button>
                  </div>
                  <div className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      <div className="p-6 bg-slate-950/50 rounded-2xl border border-white/5"><p className="whitespace-pre-wrap leading-relaxed text-slate-300">{viewingAssignment.description}</p></div>
                      
                      {!submissions[viewingAssignment.id] ? (
                          <div className="mt-8 space-y-6">
                              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-blue-500">◈ Submit Your Work</h4>
                              {viewingAssignment.type === 'Objective' && viewingAssignment.quiz ? (
                                  <div className="space-y-6">
                                      {viewingAssignment.quiz.quiz.map((q, i) => (
                                          <div key={i} className="p-6 bg-slate-800/40 rounded-2xl border border-white/5">
                                              <p className="font-bold mb-4 text-white"><span className="text-slate-500 mr-2">{i + 1}.</span> {q.question}</p>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  {q.options?.map(opt => (
                                                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${objectiveAnswers[i] === opt ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10'}`}>
                                                          <input type="radio" name={`q-${i}`} value={opt} checked={objectiveAnswers[i] === opt} onChange={() => setObjectiveAnswers(prev => ({ ...prev, [i]: opt }))} className="sr-only" />
                                                          <span className="text-sm">{opt}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <textarea value={textSubmission} onChange={e => setTextSubmission(e.target.value)} placeholder="Type your response here..." rows={8} className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-white outline-none focus:border-blue-500"/>
                                      <input type="file" onChange={e => setFileSubmission(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500"/>
                                  </div>
                              )}
                              <Button onClick={handleSubmitAssignment} disabled={isSubmitting} className="w-full py-4 text-lg font-black uppercase tracking-widest shadow-2xl shadow-blue-600/20">
                                  {isSubmitting ? 'Processing...' : 'Submit Final Work'}
                              </Button>
                          </div>
                      ) : (
                          <div className="space-y-8 animate-fade-in-up">
                              <div className="p-8 bg-green-600/10 border border-green-500/20 rounded-3xl relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">✅</div>
                                  <h4 className="font-black text-green-400 text-xs uppercase tracking-widest mb-4">Submission Accepted</h4>
                                  <p className="text-xs text-slate-400 font-mono mb-6">TS: {submissions[viewingAssignment.id].submittedAt?.toDate()?.toLocaleString()}</p>
                                  {submissions[viewingAssignment.id].grade && (
                                      <div className="flex items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-white/5">
                                          <div><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Teacher Score</p><p className="text-5xl font-black text-blue-400">{submissions[viewingAssignment.id].grade}</p></div>
                                          <div className="h-12 w-px bg-white/5"></div>
                                          <div><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Remarks</p><p className="text-slate-300 italic">"{submissions[viewingAssignment.id].feedback}"</p></div>
                                      </div>
                                  )}
                              </div>

                              {submissions[viewingAssignment.id].status === 'Graded' && (
                                  <div className="space-y-6">
                                      <h5 className="font-black text-xs uppercase tracking-[0.3em] text-purple-400 border-b border-white/5 pb-2">Academic Corrections</h5>
                                      {submissions[viewingAssignment.id].correction ? (
                                          <div className="p-6 bg-slate-800/40 rounded-2xl border border-blue-500/20">
                                              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-4">Correction Submitted on {submissions[viewingAssignment.id].correction?.submittedAt.toDate().toLocaleString()}</p>
                                              <p className="text-slate-300 text-sm italic">"{submissions[viewingAssignment.id].correction?.text}"</p>
                                          </div>
                                      ) : (
                                          <div className="space-y-6">
                                              {viewingAssignment.type === 'Objective' && viewingAssignment.quiz ? (
                                                  <div className="space-y-6">
                                                      <p className="text-sm text-amber-400 bg-amber-400/10 p-4 rounded-xl border border-amber-400/20 font-bold">Please correct the mistakes highlighted in red below.</p>
                                                      {getWrongQuestionIndices().map(idx => {
                                                          const q = viewingAssignment.quiz!.quiz[idx];
                                                          const isExpVisible = visibleExplanations[idx];
                                                          return (
                                                              <div key={idx} className="p-6 bg-slate-900 rounded-2xl border border-red-500/20 group">
                                                                  <div className="flex justify-between items-start mb-4">
                                                                      <p className="font-bold text-white"><span className="text-red-400 mr-2">Q{idx + 1}.</span> {q.question}</p>
                                                                      <button onClick={() => setVisibleExplanations(p => ({...p, [idx]: !isExpVisible}))} className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest underline decoration-dotted underline-offset-4">{isExpVisible ? 'Hide Guide' : 'Need help?'}</button>
                                                                  </div>
                                                                  {isExpVisible && <div className="mb-4 p-4 bg-blue-600/10 border-l-4 border-blue-500 rounded-lg text-xs text-blue-200 animate-fade-in-down"><strong>Study Note:</strong> {q.explanation || 'No specific explanation provided by teacher.'}</div>}
                                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                                                      {q.options?.map(opt => (
                                                                          <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${correctionAnswers[idx] === opt ? 'bg-green-600/20 border-green-500 text-white' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                                                                              <input type="radio" name={`correction-q-${idx}`} value={opt} checked={correctionAnswers[idx] === opt} onChange={() => setCorrectionAnswers(p => ({...p, [idx]: opt}))} className="sr-only" />
                                                                              <span className="text-xs">{opt}</span>
                                                                          </label>
                                                                      ))}
                                                                  </div>
                                                              </div>
                                                          );
                                                      })}
                                                  </div>
                                              ) : (
                                                  <div className="space-y-4">
                                                      <p className="text-sm text-slate-400">Explain your corrections or re-write the necessary parts here.</p>
                                                      <textarea value={correctionText} onChange={e => setCorrectionText(e.target.value)} placeholder="Type corrections..." rows={5} className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl text-white outline-none focus:border-blue-500"/>
                                                  </div>
                                              )}
                                              <Button onClick={() => handleSubmitCorrection(submissions[viewingAssignment.id].id)} disabled={isSubmittingCorrection} className="w-full py-4 bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest shadow-xl">
                                                  {isSubmittingCorrection ? 'Uploading...' : 'Submit Corrected Work'}
                                              </Button>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};