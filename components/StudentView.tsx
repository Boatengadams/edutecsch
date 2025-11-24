
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase, storage } from '../services/firebase';
import type { UserProfile, Assignment, Submission, Notification, SchoolEvent, Timetable, AttendanceRecord, Group, GroupMessage, PublishedFlyer, LiveLesson, UserRole } from '../types';
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

interface StudentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile } = useAuthentication();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

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
  
  // Assignment View State
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [textSubmission, setTextSubmission] = useState('');
  const [fileSubmission, setFileSubmission] = useState<File | null>(null);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Group Chat State
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const groupMessagesEndRef = useRef<HTMLDivElement>(null);
  const [isSendingGroupMessage, setIsSendingGroupMessage] = useState(false);
  
  // AI Assistant
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !userProfile) return;
    setLoading(true);

    const unsubscribers: (() => void)[] = [];

    // 1. Assignments
    if (userProfile.class) {
        const assignQuery = db.collection('assignments')
            .where('classId', '==', userProfile.class)
            .orderBy('createdAt', 'desc');
        unsubscribers.push(assignQuery.onSnapshot(snap => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
            const now = new Date();
            // Filter out assignments scheduled for the future
            const visibleAssignments = fetched.filter(a => 
                !a.scheduledAt || a.scheduledAt.toDate() <= now
            );
            setAssignments(visibleAssignments);
        }));
    }

    // 2. Submissions
    const subQuery = db.collection('submissions').where('studentId', '==', user.uid);
    unsubscribers.push(subQuery.onSnapshot(snap => {
        const subs: Record<string, Submission> = {};
        snap.forEach(doc => {
            const data = doc.data() as Submission;
            subs[data.assignmentId] = { ...data, id: doc.id };
        });
        setSubmissions(subs);
    }));

    // 3. Live Lesson
    if (userProfile.class) {
        const lessonQuery = db.collection('liveLessons')
            .where('classId', '==', userProfile.class)
            .where('status', '==', 'active')
            .limit(1);
        unsubscribers.push(lessonQuery.onSnapshot(snap => {
            setLiveLesson(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as LiveLesson);
        }));
    }

    // 4. Group
    const groupQuery = db.collection('groups').where('memberUids', 'array-contains', user.uid).limit(1);
    unsubscribers.push(groupQuery.onSnapshot(snap => {
        if (!snap.empty) {
            const groupData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Group;
            setStudentGroup(groupData);
            // Subscribe to messages
            const msgQuery = db.collection('groups').doc(groupData.id).collection('groupMessages').orderBy('createdAt', 'asc');
            unsubscribers.push(msgQuery.onSnapshot(msgSnap => {
                setGroupMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMessage)));
            }));
        } else {
            setStudentGroup(null);
            setGroupMessages([]);
        }
    }));

    // 5. Unread Messages
    const convQuery = db.collection('conversations').where('participantUids', 'array-contains', user.uid);
    unsubscribers.push(convQuery.onSnapshot(snap => {
        let count = 0;
        snap.forEach(doc => {
            const conv = doc.data();
            count += conv.unreadCount?.[user.uid] || 0;
        });
        setUnreadMessages(count);
    }));

    // 6. Timetable
    if (userProfile.class) {
        unsubscribers.push(db.collection('timetables').doc(userProfile.class).onSnapshot(doc => {
            setTimetable(doc.exists ? doc.data() as Timetable : null);
        }));
    }

    // 7. Attendance
    const attQuery = db.collection('attendance').where('studentUids', 'array-contains', user.uid).orderBy('date', 'desc').limit(20);
    unsubscribers.push(attQuery.onSnapshot(snap => {
        setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    }));

    // 8. Flyers
    const flyerQueries = [
        db.collection('publishedFlyers').where('targetAudience', '==', 'all'),
        db.collection('publishedFlyers').where('targetRoles', 'array-contains', 'student'),
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

    // 9. Teachers (for messaging)
    if (userProfile.class) {
        const teacherQuery = db.collection('users').where('role', '==', 'teacher')
            .where('classesTaught', 'array-contains', userProfile.class);
        unsubscribers.push(teacherQuery.onSnapshot(snap => {
            setTeachers(snap.docs.map(d => d.data() as UserProfile));
        }));
    }

    setLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, userProfile]);

  useEffect(() => {
      groupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  useEffect(() => {
      // AI Context Logic
      const baseInstruction = "You are Edu, a helpful AI study buddy for a student. Your goal is to help them understand concepts, organize their study time, and answer questions about their subjects. Be encouraging and concise. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";
      let context = '';
      const prompts = ['Help me create a study plan.', 'Explain the concept of photosynthesis.'];

      switch (activeTab) {
          case 'assignments':
              context = `The student is viewing their assignments. They have ${assignments.length} assignments, with ${assignments.filter(a => !submissions[a.id]).length} pending.`;
              prompts.push('Summarize my pending assignments.');
              break;
          case 'group_work':
              context = studentGroup ? `The student is working on a group project: "${studentGroup.assignmentTitle}".` : "The student is not currently in a group.";
              prompts.push('How can we divide tasks for our group project?');
              break;
          default:
              context = "The student is on their dashboard.";
      }
      setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
      setAiSuggestedPrompts(prompts);
  }, [activeTab, assignments, submissions, studentGroup]);

  const handleAssignmentClick = (assignment: Assignment) => {
      setViewingAssignment(assignment);
      setTextSubmission('');
      setFileSubmission(null);
      setObjectiveAnswers({});
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

          // Auto-grading logic
          let status: 'Submitted' | 'Graded' = 'Submitted';
          let grade = undefined;
          let feedback = undefined;

          if (viewingAssignment.type === 'Objective' && viewingAssignment.quiz) {
              let correctCount = 0;
              const totalQuestions = viewingAssignment.quiz.quiz.length;
              
              viewingAssignment.quiz.quiz.forEach((q, index) => {
                  if (objectiveAnswers[index] === q.correctAnswer) {
                      correctCount++;
                  }
              });

              grade = `${correctCount}/${totalQuestions}`;
              status = 'Graded';
              
              const percentage = (correctCount / totalQuestions) * 100;
              
              if (percentage === 100) {
                  feedback = "Excellent work! 🌟";
              } else if (percentage >= 80) {
                  feedback = "Well done! 👏";
              } else if (percentage >= 50) {
                  feedback = "Good effort, keep it up! 👍";
              } else {
                  feedback = "Don't give up, please review the material. 💪";
              }
              
              if (percentage < 100) {
                  feedback += " Please do corrections for the wrong answers.";
              }
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
          showToast(status === 'Graded' ? `Assignment submitted and graded: ${grade}` : 'Assignment submitted successfully!', 'success');
          setViewingAssignment(null);
      } catch (err: any) {
          showToast(`Submission failed: ${err.message}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSendGroupMessage = async (messageContent: { text: string; image: File | null; audio: Blob | null }) => {
      if (!studentGroup || !user || !userProfile) return;
      setIsSendingGroupMessage(true);
      try {
          const messageData: any = {
              groupId: studentGroup.id,
              senderId: user.uid,
              senderName: userProfile.name,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          if (messageContent.text) messageData.text = messageContent.text;

          if (messageContent.image) {
              const storagePath = `groups/${studentGroup.id}/${Date.now()}_${messageContent.image.name}`;
              const storageRef = storage.ref(storagePath);
              await storageRef.put(messageContent.image);
              messageData.imageUrl = await storageRef.getDownloadURL();
          }

          if (messageContent.audio) {
              const storagePath = `groups/${studentGroup.id}/${Date.now()}_audio.webm`;
              const storageRef = storage.ref(storagePath);
              await storageRef.put(messageContent.audio);
              messageData.audioUrl = await storageRef.getDownloadURL();
          }

          await db.collection('groups').doc(studentGroup.id).collection('groupMessages').add(messageData);
      } catch (err) {
          console.error(err);
          showToast("Failed to send message.", "error");
      } finally {
          setIsSendingGroupMessage(false);
      }
  };

  if (!user || !userProfile) return <div className="flex h-screen justify-center items-center"><Spinner /></div>;

  const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">📊</span> },
      { key: 'assignments', label: 'Assignments', icon: <span className="text-xl">📝</span> },
      { key: 'live_lesson', label: <span className="flex items-center">Live Class {liveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-xl">🔴</span> },
      { key: 'group_work', label: 'Group Work', icon: <span className="text-xl">👥</span> },
      { key: 'study_mode', label: 'Study Mode', icon: <span className="text-xl">🧠</span> },
      { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <span className="text-xl">💬</span> },
      { key: 'profile', label: 'Profile', icon: <span className="text-xl">👤</span> },
      { key: 'timetable', label: 'Timetable', icon: <span className="text-xl">🗓️</span> },
      { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
  ];

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

      switch (activeTab) {
          case 'dashboard':
              const pendingCount = assignments.filter(a => !submissions[a.id]).length;
              return (
                  <div className="space-y-8">
                      {/* Futuristic Hero Section */}
                      <div className="relative bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-3xl p-8 border border-blue-500/30 overflow-hidden shadow-2xl">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                          
                          <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center">
                              <div>
                                  <p className="text-blue-300 font-mono text-xs tracking-widest mb-2">SYSTEM ONLINE // {new Date().toLocaleDateString().toUpperCase()}</p>
                                  <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight drop-shadow-lg">
                                      WELCOME, {userProfile.name.split(' ')[0].toUpperCase()}
                                  </h2>
                                  <p className="text-slate-300 mt-2 max-w-md">Your learning modules are synchronized. Ready to engage?</p>
                              </div>
                              <div className="mt-4 md:mt-0">
                                  <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-bold text-green-400 tracking-wider">STATUS: ACTIVE</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* HUD Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Pending Missions */}
                          <div className="relative group bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-yellow-400 text-6xl font-black">!</div>
                              <div className="relative z-10">
                                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Assignments</p>
                                  <p className="text-4xl font-black text-white mb-1">{pendingCount}</p>
                                  <p className="text-xs text-yellow-400 font-mono">{pendingCount > 0 ? 'ACTION REQUIRED' : 'ALL CLEAR'}</p>
                              </div>
                              <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 transition-all duration-500 w-0 group-hover:w-full"></div>
                          </div>

                          {/* Live Signal */}
                          <div className="relative group bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] overflow-hidden cursor-pointer" onClick={() => setActiveTab('live_lesson')}>
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-blue-400 text-6xl font-black">●</div>
                              <div className="relative z-10">
                                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Live Class</p>
                                  {liveLesson ? (
                                      <>
                                          <p className="text-2xl font-bold text-white mb-1 truncate">{liveLesson.topic}</p>
                                          <div className="flex items-center gap-2">
                                              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                              <p className="text-xs text-red-400 font-mono">SESSION ACTIVE</p>
                                          </div>
                                      </>
                                  ) : (
                                      <>
                                          <p className="text-2xl font-bold text-slate-500 mb-1">Offline</p>
                                          <p className="text-xs text-slate-600 font-mono">WAITING FOR SIGNAL...</p>
                                      </>
                                  )}
                              </div>
                              <div className={`absolute bottom-0 left-0 h-1 ${liveLesson ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-500 w-0 group-hover:w-full`}></div>
                          </div>

                          {/* XP Level */}
                          <div className="relative group bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-purple-400 text-6xl font-black">XP</div>
                              <div className="relative z-10">
                                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Experience Level</p>
                                  <p className="text-4xl font-black text-white mb-1">{userProfile.xp || 0}</p>
                                  <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                      <div className="bg-purple-500 h-full w-[45%] rounded-full"></div>
                                  </div>
                              </div>
                              <div className="absolute bottom-0 left-0 h-1 bg-purple-500 transition-all duration-500 w-0 group-hover:w-full"></div>
                          </div>
                      </div>

                      {/* Digital Feed (Notice Board) */}
                      {publishedFlyers.length > 0 && (
                          <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                      <span className="text-blue-500">◈</span> DIGITAL FEED
                                  </h3>
                              </div>
                              <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x">
                                  {publishedFlyers.map(flyer => (
                                      <div 
                                          key={flyer.id} 
                                          className="flex-shrink-0 w-72 bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 snap-center shadow-lg group"
                                          onClick={() => setSelectedFlyer(flyer)}
                                      >
                                          <div className="aspect-video bg-slate-900 relative">
                                              <img src={flyer.imageUrl} alt={flyer.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
                                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                                          </div>
                                          <div className="p-4 relative">
                                              <p className="font-bold truncate text-white text-lg">{flyer.title}</p>
                                              <div className="flex justify-between items-center mt-2 text-xs text-slate-400 font-mono">
                                                  <span>{flyer.createdAt.toDate().toLocaleDateString()}</span>
                                                  <span className="text-blue-400">READ_MORE &gt;</span>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              );
          case 'assignments':
              return (
                  <div className="space-y-6">
                      <div className="flex items-center justify-between">
                          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                              <span className="bg-blue-600 text-white text-lg p-2 rounded-lg shadow-lg shadow-blue-600/20">📝</span>
                              ASSIGNMENTS
                          </h2>
                          <div className="text-sm text-slate-400 font-mono hidden sm:block">
                              SYNCING... COMPLETED
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {assignments.map(assignment => {
                              const sub = submissions[assignment.id];
                              const status = sub ? sub.status : 'Pending';
                              let statusColor = 'yellow';
                              if (status === 'Submitted') statusColor = 'blue';
                              if (status === 'Graded') statusColor = 'green';

                              return (
                                  <div key={assignment.id} className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-0 hover:border-blue-500/50 transition-all duration-300 group flex flex-col h-full">
                                      {/* Card Header */}
                                      <div className="p-5 border-b border-slate-700/50 flex justify-between items-start relative overflow-hidden">
                                          <div className="absolute top-0 left-0 w-1 h-full bg-slate-600 group-hover:bg-blue-500 transition-colors"></div>
                                          <div className="relative z-10 max-w-[75%]">
                                              <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-300 transition-colors" title={assignment.title}>{assignment.title}</h3>
                                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">
                                                  {assignment.subject}
                                              </span>
                                          </div>
                                          {assignment.type === 'Objective' && (
                                              <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-lg font-mono border border-purple-500/30">
                                                  QUIZ
                                              </span>
                                          )}
                                      </div>

                                      {/* Card Body */}
                                      <div className="p-5 flex-grow">
                                          <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                                              {assignment.description}
                                          </p>
                                      </div>

                                      {/* Card Footer */}
                                      <div className="p-4 bg-slate-900/30 border-t border-slate-700/50 flex items-center justify-between">
                                          <div>
                                              <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-${statusColor}-400`}>
                                                  <span className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-500 ${status === 'Pending' ? 'animate-pulse' : ''}`}></span>
                                                  {status}
                                              </div>
                                              {assignment.dueDate && (
                                                  <p className="text-[10px] text-slate-500 font-mono mt-1">DUE: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                                              )}
                                          </div>
                                          <Button size="sm" onClick={() => handleAssignmentClick(assignment)} className={status === 'Graded' ? 'bg-green-600 hover:bg-green-500' : ''}>
                                              {sub ? 'View Details' : 'Start'}
                                          </Button>
                                      </div>
                                  </div>
                              );
                          })}
                          {assignments.length === 0 && (
                              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-20"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                  <p className="text-lg font-medium">All assignments completed.</p>
                                  <p className="text-sm">Stand by for further instructions.</p>
                              </div>
                          )}
                      </div>
                  </div>
              );
          case 'live_lesson':
              return liveLesson ? (
                  <StudentLiveClassroom lessonId={liveLesson.id} userProfile={userProfile} onClose={() => setLiveLesson(null)} />
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
                          <span className="text-4xl grayscale opacity-50">📡</span>
                      </div>
                      <h2 className="text-3xl font-black text-slate-300 mb-2 tracking-tight">SIGNAL LOST</h2>
                      <p className="text-slate-500 font-mono">NO ACTIVE TRANSMISSION DETECTED.</p>
                  </div>
              );
          case 'group_work':
              return studentGroup ? (
                  <div className="h-full flex flex-col bg-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden">
                      <div className="bg-slate-800/80 backdrop-blur p-4 border-b border-slate-700 flex justify-between items-center">
                          <div>
                              <h2 className="text-lg font-bold text-white">{studentGroup.name}</h2>
                              <p className="text-xs text-blue-400 font-mono uppercase tracking-wider">TASK: {studentGroup.assignmentTitle}</p>
                          </div>
                          <div className="flex -space-x-2">
                              {studentGroup.members.map((m, i) => (
                                  <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-white" title={m.name}>
                                      {m.name.charAt(0)}
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                          {groupMessages.map(msg => (
                              <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                  <span className="text-[10px] text-slate-500 mb-1 px-1">{msg.senderName}</span>
                                  <div className={`p-3 rounded-2xl max-w-xs md:max-w-md break-words ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                      {msg.imageUrl && <img src={msg.imageUrl} alt="Attachment" className="rounded-lg mb-2 max-w-full border border-white/10" />}
                                      {msg.audioUrl && <audio src={msg.audioUrl} controls className="max-w-full mb-1" />}
                                      {msg.text && <p className="text-sm">{msg.text}</p>}
                                  </div>
                              </div>
                          ))}
                          <div ref={groupMessagesEndRef} />
                      </div>
                      <ChatInput onSendMessage={handleSendGroupMessage} isSending={isSendingGroupMessage} />
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="text-6xl mb-4 opacity-50">🛡️</div>
                      <h2 className="text-2xl font-bold mb-2">No Group Assigned</h2>
                      <p className="text-slate-400">You have not been assigned to a group project yet.</p>
                  </div>
              );
          case 'study_mode':
              return <StudentStudyMode userProfile={userProfile} onExit={() => setActiveTab('dashboard')} assignments={assignments} submissions={submissions} learningMaterials={[]} />;
          case 'messages':
              return <MessagingView userProfile={userProfile} contacts={teachers} />;
          case 'profile':
              return <StudentProfile userProfile={userProfile} assignments={assignments} submissions={Object.values(submissions)} />;
          case 'timetable':
              return timetable ? <NotebookTimetable classId={userProfile.class || ''} timetableData={timetable.timetableData} /> : <p className="text-center p-8 text-slate-500">No schedule data available.</p>;
          case 'attendance':
              return (
                  <Card>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-blue-400">📅</span> Attendance Log</h3>
                      <div className="space-y-2">
                          {attendanceRecords.map(rec => (
                              <div key={rec.id} className="flex justify-between p-4 bg-slate-800/50 rounded-lg border-l-4 border-slate-700 hover:bg-slate-800 transition-colors">
                                  <span className="font-mono text-slate-300">{new Date(rec.date).toLocaleDateString()}</span>
                                  <span className={`font-bold px-3 py-1 rounded text-xs uppercase tracking-wider ${rec.records[user.uid] === 'Present' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{rec.records[user.uid]}</span>
                              </div>
                          ))}
                          {attendanceRecords.length === 0 && <p className="text-gray-500 italic">No records found.</p>}
                      </div>
                  </Card>
              );
          default:
              return <div>Select a tab</div>;
      }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <Sidebar 
        isExpanded={isSidebarExpanded}
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={() => setIsSidebarExpanded(false)}
        title="Student Portal"
      />
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative custom-scrollbar">
        {renderContent()}
      </main>
      <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
      
      {viewingAssignment && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-4 z-50">
              <Card className="w-full max-w-3xl h-[90vh] flex flex-col !bg-slate-800 !border-slate-600 shadow-2xl">
                  <div className="flex justify-between items-center mb-6 flex-shrink-0 pb-4 border-b border-slate-700">
                      <div>
                          <h2 className="text-2xl font-bold text-white">{viewingAssignment.title}</h2>
                          <p className="text-blue-400 text-xs font-mono mt-1 uppercase">Assignment Brief</p>
                      </div>
                      <Button variant="secondary" onClick={() => setViewingAssignment(null)}>Close</Button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-2 space-y-6 custom-scrollbar">
                      <div className="prose-styles prose-invert bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{viewingAssignment.description}</p>
                      </div>
                      {viewingAssignment.attachmentURL && (
                          <a href={viewingAssignment.attachmentURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-900/40 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Download Attachment: {viewingAssignment.attachmentName}
                          </a>
                      )}
                      
                      {!submissions[viewingAssignment.id] ? (
                          <div className="mt-8 border-t border-slate-700 pt-6">
                              <h4 className="font-bold text-lg mb-4 text-white flex items-center gap-2"><span className="text-green-400">◈</span> Submit Work</h4>
                              {viewingAssignment.type === 'Objective' && viewingAssignment.quiz ? (
                                  <div className="space-y-6">
                                      {viewingAssignment.quiz.quiz.map((q, i) => (
                                          <div key={i} className="p-6 bg-slate-900 rounded-xl border border-slate-700">
                                              <p className="font-medium mb-4 text-white text-lg"><span className="text-slate-500 mr-2">{i + 1}.</span> {q.question}</p>
                                              <div className="space-y-3">
                                                  {q.options.map(opt => (
                                                      <label key={opt} className="flex items-center space-x-3 cursor-pointer group">
                                                          <div className="relative flex items-center">
                                                              <input type="radio" name={`q-${i}`} value={opt} checked={objectiveAnswers[i] === opt} onChange={() => setObjectiveAnswers(prev => ({ ...prev, [i]: opt }))} className="peer sr-only" />
                                                              <div className="w-5 h-5 border-2 border-slate-500 rounded-full peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all"></div>
                                                          </div>
                                                          <span className="text-slate-300 group-hover:text-white transition-colors">{opt}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <textarea value={textSubmission} onChange={e => setTextSubmission(e.target.value)} placeholder="Enter your answer here..." rows={8} className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-slate-200 placeholder-slate-600" />
                                      <div>
                                          <label className="block text-sm font-medium text-slate-400 mb-2">Attach File (Optional)</label>
                                          <input type="file" onChange={e => setFileSubmission(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-slate-900 rounded-lg border border-slate-700" />
                                      </div>
                                  </div>
                              )}
                              <Button onClick={handleSubmitAssignment} disabled={isSubmitting} className="mt-6 w-full py-4 text-lg shadow-xl shadow-blue-600/20">
                                  {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                              </Button>
                          </div>
                      ) : (
                          <div className="mt-6 p-6 bg-green-900/20 border border-green-500/30 rounded-xl">
                              <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Submitted</h4>
                              <p className="text-sm text-slate-300 font-mono">Timestamp: {submissions[viewingAssignment.id].submittedAt.toDate().toLocaleString()}</p>
                              {submissions[viewingAssignment.id].grade && (
                                  <div className="mt-4 pt-4 border-t border-green-500/30">
                                      <p className="text-lg"><strong className="text-green-300">Score:</strong> {submissions[viewingAssignment.id].grade}</p>
                                      <div className="mt-2 p-3 bg-green-900/30 rounded-lg text-green-200 italic text-sm border border-green-500/20">
                                          "{submissions[viewingAssignment.id].feedback}"
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      )}

      {selectedFlyer && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-50" onClick={() => setSelectedFlyer(null)}>
              <div className="max-w-4xl w-full max-h-[90vh] overflow-auto relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedFlyer(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-white hover:text-black transition-colors z-10">&times;</button>
                  <img src={selectedFlyer.imageUrl} alt={selectedFlyer.title} className="w-full h-auto" />
                  <div className="p-6 bg-slate-800">
                      <h2 className="text-2xl font-bold text-white">{selectedFlyer.title}</h2>
                      <p className="text-slate-400 text-sm mt-1 font-mono">SOURCE: {selectedFlyer.publisherName} // {selectedFlyer.createdAt.toDate().toLocaleDateString()}</p>
                  </div>
              </div>
          </div>
      )}
      
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};
