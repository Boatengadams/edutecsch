
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, storage, firebase } from '../services/firebase';
import type { Assignment, Submission, UserProfile, LiveLesson, Group, GroupMessage, Timetable, AttendanceRecord, Notification, Conversation, PublishedFlyer } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import Sidebar from './common/Sidebar';
import { useToast } from './common/Toast';
import StudentLiveClassroom from './StudentLiveClassroom';
import StudentStudyMode from './StudentStudyMode';
import StudentProfile from './StudentProfile';
import MessagingView from './MessagingView';
import AIAssistant from './AIAssistant';
import NotebookTimetable from './common/NotebookTimetable';
import ChangePasswordModal from './common/ChangePasswordModal';

interface StudentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile } = useAuthentication();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Data State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({}); // Keyed by assignmentId
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
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Group Chat State
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [newGroupMessage, setNewGroupMessage] = useState('');
  const groupMessagesEndRef = useRef<HTMLDivElement>(null);
  
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
            .where('status', 'in', ['active', 'starting'])
            .limit(1);
        unsubscribers.push(lessonQuery.onSnapshot(snap => {
            setLiveLesson(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as LiveLesson);
        }));
    }

    // 4. Group
    const groupQuery = db.collection('groups').where('memberUids', 'array-contains', user.uid).limit(1);
    unsubscribers.push(groupQuery.onSnapshot(snap => {
        if (!snap.empty) {
            const group = { id: snap.docs[0].id, ...snap.docs[0].data() } as Group;
            setStudentGroup(group);
            // Listen for messages if group exists
            const msgUnsub = db.collection('groups').doc(group.id).collection('groupMessages')
                .orderBy('createdAt', 'asc')
                .onSnapshot(msgSnap => {
                    setGroupMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMessage)));
                });
            unsubscribers.push(msgUnsub);
        } else {
            setStudentGroup(null);
            setGroupMessages([]);
        }
    }));
    
    // 5. Teachers (for messaging)
    if (userProfile.class) {
         const teacherQuery = db.collection('users')
            .where('role', '==', 'teacher')
            .where('classesTaught', 'array-contains', userProfile.class);
         
         // Also get class teacher separately or combining queries if possible, but simpler to just query teachers of the class
         unsubscribers.push(teacherQuery.onSnapshot(snap => {
             setTeachers(snap.docs.map(doc => doc.data() as UserProfile));
         }));
    }
    
    // 6. Unread Messages
    const convQuery = db.collection('conversations').where('participantUids', 'array-contains', user.uid);
    unsubscribers.push(convQuery.onSnapshot(snap => {
        let count = 0;
        snap.forEach(doc => {
            const data = doc.data() as Conversation;
            count += data.unreadCount?.[user.uid] || 0;
        });
        setUnreadMessages(count);
    }));
    
    // 7. Timetable
    if (userProfile.class) {
        unsubscribers.push(db.collection('timetables').doc(userProfile.class).onSnapshot(doc => {
             setTimetable(doc.exists ? doc.data() as Timetable : null);
        }));
    }
    
    // 8. Attendance
    const attQuery = db.collection('attendance')
        .where('studentUids', 'array-contains', user.uid)
        .orderBy('date', 'desc')
        .limit(20);
    unsubscribers.push(attQuery.onSnapshot(snap => {
        setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    }));
    
    // 9. Published Flyers (Updated to merge 'all', 'role', and 'selected' audiences) - REMOVED orderBy to fix index error
    const queries = [
        db.collection('publishedFlyers').where('targetAudience', '==', 'all'),
        db.collection('publishedFlyers').where('targetRoles', 'array-contains', 'student'),
        db.collection('publishedFlyers').where('targetAudience', '==', 'selected').where('targetUids', 'array-contains', user.uid)
    ];

    // A simple way to merge real-time updates is tricky with Firestore in one go without a complex client-side merge.
    // We'll attach separate listeners and merge the state.
    const unsubFlyers = queries.map(q => q.limit(10).onSnapshot(snap => {
        const flyers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublishedFlyer));
        
        setPublishedFlyers(prev => {
            // Merge new flyers with existing, removing duplicates by ID
            const all = [...prev, ...flyers];
            const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
            return unique.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()).slice(0, 20); // Keep top 20 recent
        });
    }));
    unsubscribers.push(...unsubFlyers);


    setLoading(false);
    return () => unsubscribers.forEach(u => u());
  }, [user, userProfile]);
  
  useEffect(() => {
      // Scroll group chat to bottom
      groupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);
  
  // AI Assistant Context
  useEffect(() => {
      const baseInstruction = "You are 'Edu', a friendly AI study buddy for a student. Help with homework concepts, explain topics simply, and organize study plans. Do not give direct answers to quizzes. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";
      let context = '';
      let prompts = ["Kofi, kyerɛ me Twi ase."];
      
      if (activeTab === 'assignments' && viewingAssignment) {
          context = `The student is looking at an assignment titled "${viewingAssignment.title}". Description: "${viewingAssignment.description}". Help them understand the requirements.`;
          prompts.push("Explain this assignment to me.");
          prompts.push("Give me a hint for question 1.");
      } else if (activeTab === 'dashboard') {
          context = "The student is on their dashboard. They have " + assignments.filter(a => !submissions[a.id]).length + " pending assignments.";
          prompts.push("What should I focus on today?");
      }
      
      setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
      setAiSuggestedPrompts(prompts);
  }, [activeTab, viewingAssignment, assignments, submissions]);

  const correctionAssignments = useMemo(() => {
    return assignments.filter(a => {
      const sub = submissions[a.id];
      return sub && sub.status === 'Graded' && a.type === 'Objective' && !sub.correction;
    }).filter(a => {
         const sub = submissions[a.id];
         // Simple check if score is less than total. Assuming quiz length = total for now.
         // A robust check would parse the grade.
         if (a.quiz && sub.grade) {
             const [score, total] = sub.grade.split('/').map(Number);
             return !isNaN(score) && !isNaN(total) && score < total;
         }
         return false;
    });
  }, [assignments, submissions]);


  const handleViewAssignment = (assignment: Assignment, mode: 'view' | 'correction' = 'view') => {
      setViewingAssignment(assignment);
      setTextSubmission('');
      setFileSubmission(null);
      setObjectiveAnswers({});
      
      // Pre-fill if submitted (Theory text)
      const sub = submissions[assignment.id];
      if (sub && sub.text) setTextSubmission(sub.text);
      
      // If Correction Mode
      if (mode === 'correction' && sub) {
         // Correction mode logic is handled in render
      }
      // Pre-fill answers if submitted (Objective)
      else if (sub && sub.answers) {
           const numericAnswers: Record<number, string> = {};
           Object.keys(sub.answers).forEach(k => numericAnswers[parseInt(k)] = sub.answers![k]);
           setObjectiveAnswers(numericAnswers);
      }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !userProfile || !viewingAssignment) return;
      
      const isCorrection = viewingAssignment.type === 'Objective' && submissions[viewingAssignment.id]?.status === 'Graded';

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
          
          // Convert Record<number, string> to Record<string, string> for Firestore
          const answersToSave: Record<string, string> = {};
          Object.keys(objectiveAnswers).forEach(k => answersToSave[k] = objectiveAnswers[parseInt(k)]);

          if (isCorrection) {
               // Correction Submission
               const subId = submissions[viewingAssignment.id].id;
               const wrongIndices = viewingAssignment.quiz?.quiz.map((q, i) => {
                    const originalAnswer = submissions[viewingAssignment.id].answers?.[i];
                    return originalAnswer !== q.correctAnswer ? i : -1;
               }).filter(i => i !== -1) || [];
               
               // Calculate correction grade based ONLY on the wrong questions
               let correctCorrectionCount = 0;
               wrongIndices.forEach(index => {
                   if (objectiveAnswers[index] === viewingAssignment.quiz?.quiz[index].correctAnswer) {
                       correctCorrectionCount++;
                   }
               });
               
               const correctionGrade = `${correctCorrectionCount} / ${wrongIndices.length}`;

               const correctionData: any = {
                   answers: answersToSave,
                   grade: correctionGrade,
                   feedback: `Correction completed. You got ${correctCorrectionCount} out of ${wrongIndices.length} corrected questions right.`,
                   submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
               };

               await db.collection('submissions').doc(subId).update({
                   correction: correctionData
               });
               showToast('Correction submitted successfully!', 'success');

          } else {
              // Normal Submission
              const submissionData: any = {
                assignmentId: viewingAssignment.id,
                studentId: user.uid,
                studentName: userProfile.name,
                teacherId: viewingAssignment.teacherId,
                classId: viewingAssignment.classId,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'Submitted',
                attachmentURL,
                attachmentName,
                parentUids: userProfile.parentUids || [],
            };
            
            if (viewingAssignment.type === 'Objective') {
                submissionData.answers = answersToSave;
            } else {
                submissionData.text = textSubmission;
            }
            
            // Check if updating or creating
            const existingId = submissions[viewingAssignment.id]?.id;
            if (existingId) {
                await db.collection('submissions').doc(existingId).update(submissionData);
            } else {
                await db.collection('submissions').add(submissionData);
            }
            showToast('Assignment submitted successfully!', 'success');
          }
          
          setViewingAssignment(null); // Go back to list
      } catch (err: any) {
          showToast(`Submission failed: ${err.message}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };
  
  const handleSendGroupMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newGroupMessage.trim() || !studentGroup || !user) return;
      
      try {
          await db.collection('groups').doc(studentGroup.id).collection('groupMessages').add({
              groupId: studentGroup.id,
              senderId: user.uid,
              senderName: userProfile.name,
              text: newGroupMessage.trim(),
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          setNewGroupMessage('');
      } catch (err) {
          console.error("Error sending group message", err);
      }
  };

  const handleGroupSubmit = async () => {
       if (!studentGroup || !textSubmission.trim()) return;
       try {
           await db.collection('groups').doc(studentGroup.id).update({
               isSubmitted: true,
               submission: {
                   content: textSubmission,
                   submittedBy: { uid: user!.uid, name: userProfile.name },
                   submittedAt: firebase.firestore.FieldValue.serverTimestamp()
               }
           });
           showToast('Group project submitted!', 'success');
       } catch (err) {
           console.error(err);
           showToast('Error submitting group project.', 'error');
       }
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">📊</span> },
    { key: 'assignments', label: 'Assignments', icon: <span className="text-xl">📝</span> },
    { key: 'live_lesson', label: <span className="flex items-center">Live Lesson {liveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-xl">🔴</span> },
    { key: 'groups', label: 'Group Work', icon: <span className="text-xl">👥</span> },
    { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{unreadMessages}</span>}</span>, icon: <span className="text-xl">💬</span> },
    { key: 'study_mode', label: 'Study Mode', icon: <span className="text-xl">📖</span> },
    { key: 'timetable', label: 'Timetable', icon: <span className="text-xl">🗓️</span> },
    { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
    { key: 'profile', label: 'My Profile', icon: <span className="text-xl">👤</span> },
  ];

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner/></div>;
      
      if (activeTab === 'study_mode') {
          return (
             <StudentStudyMode 
                onExit={() => setActiveTab('dashboard')} 
                userProfile={userProfile} 
                assignments={assignments} 
                submissions={submissions} 
                learningMaterials={[]} 
             />
          );
      }

      if (activeTab === 'live_lesson') {
          return liveLesson ? (
              <StudentLiveClassroom lessonId={liveLesson.id} userProfile={userProfile} onClose={() => setActiveTab('dashboard')} />
          ) : (
              <Card>
                  <div className="text-center py-12">
                      <h3 className="text-2xl font-bold text-gray-300">No Live Lesson Active</h3>
                      <p className="text-gray-500">Check back later when your teacher starts a session.</p>
                  </div>
              </Card>
          );
      }

      switch(activeTab) {
          case 'dashboard':
              return (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h2 className="text-3xl font-bold">Dashboard</h2>
                          <p className="text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <Card>
                               <p className="text-sm text-gray-400">Assignments Due</p>
                               <p className="text-3xl font-bold text-yellow-400">{assignments.filter(a => !submissions[a.id]).length}</p>
                           </Card>
                           <Card>
                               <p className="text-sm text-gray-400">My Level</p>
                               <p className="text-3xl font-bold text-blue-400">{userProfile.level || 1}</p>
                           </Card>
                           <Card>
                               <p className="text-sm text-gray-400">XP</p>
                               <p className="text-3xl font-bold text-green-400">{userProfile.xp || 0}</p>
                           </Card>
                      </div>

                      {publishedFlyers.length > 0 && (
                          <Card>
                              <h3 className="text-xl font-semibold mb-4">School Notice Board</h3>
                              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                  {publishedFlyers.map(flyer => (
                                      <button 
                                        key={flyer.id} 
                                        onClick={() => setSelectedFlyer(flyer)}
                                        className="flex-shrink-0 w-48 group relative rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-all"
                                      >
                                          <div className="aspect-[3/4] relative">
                                              <img src={flyer.imageUrl} alt={flyer.title} className="w-full h-full object-cover" />
                                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <span className="text-white text-sm font-bold">View Flyer</span>
                                              </div>
                                          </div>
                                          <div className="p-2 bg-slate-800 text-left">
                                              <p className="font-bold text-sm truncate text-slate-200">{flyer.title}</p>
                                              <p className="text-xs text-gray-500">{flyer.createdAt?.toDate().toLocaleDateString()}</p>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </Card>
                      )}

                      <Card>
                          <h3 className="text-xl font-semibold mb-4">Recent Announcements</h3>
                          <p className="text-gray-500 text-sm">No new announcements.</p>
                      </Card>
                  </div>
              );
          case 'assignments':
              return (
                  <div className="space-y-6">
                      <div className="flex border-b border-slate-700 mb-4">
                           <button 
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${!viewingAssignment ? 'border-blue-500 text-white' : 'border-transparent text-gray-400'}`}
                                onClick={() => setViewingAssignment(null)}
                            >
                                Assignments List
                            </button>
                             <button 
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${viewingAssignment ? 'border-blue-500 text-white' : 'border-transparent text-gray-400'}`}
                                disabled={!viewingAssignment}
                            >
                                {viewingAssignment ? 'Current Task' : 'No Selection'}
                            </button>
                            <button 
                                className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 ml-auto"
                                onClick={() => {
                                   // Logic to switch sub-tab if implemented
                                }}
                            >
                                Corrections ({correctionAssignments.length})
                            </button>
                      </div>
                      
                    {viewingAssignment ? (
                        <Card className="animate-fade-in-short">
                            <div className="flex justify-between items-start mb-4">
                                <button onClick={() => setViewingAssignment(null)} className="text-sm text-blue-400 hover:underline mb-2">&larr; Back to Assignments</button>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${submissions[viewingAssignment.id]?.status === 'Graded' ? 'bg-green-900 text-green-300' : submissions[viewingAssignment.id] ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                                    {submissions[viewingAssignment.id]?.status || 'Not Submitted'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">{viewingAssignment.title}</h2>
                            <p className="text-gray-400 text-sm mb-4">Due: {viewingAssignment.dueDate || 'No due date'}</p>
                            <div className="prose-styles prose-invert bg-slate-900/50 p-4 rounded-lg mb-6">
                                <p className="whitespace-pre-wrap">{viewingAssignment.description}</p>
                                {viewingAssignment.attachmentURL && (
                                     <div className="mt-4">
                                        <a href={viewingAssignment.attachmentURL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                                            View Attachment: {viewingAssignment.attachmentName}
                                        </a>
                                     </div>
                                )}
                            </div>

                            {submissions[viewingAssignment.id]?.status === 'Graded' && (
                                <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg whitespace-pre-wrap">
                                    <h4 className="font-bold text-green-400 mb-2">Feedback & Grade</h4>
                                    <p className="text-xl font-bold">{submissions[viewingAssignment.id].grade}</p>
                                    <p className="text-gray-300 mt-1">{submissions[viewingAssignment.id].feedback}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmitAssignment}>
                                {viewingAssignment.type === 'Theory' ? (
                                    <div className="space-y-4">
                                        <textarea 
                                            value={textSubmission}
                                            onChange={e => setTextSubmission(e.target.value)}
                                            placeholder="Type your answer here..."
                                            rows={8}
                                            className="w-full p-3 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-blue-500"
                                            disabled={!!submissions[viewingAssignment.id]}
                                        />
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Attach File (Optional)</label>
                                            <input type="file" onChange={e => setFileSubmission(e.target.files?.[0] || null)} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500" disabled={!!submissions[viewingAssignment.id]} />
                                        </div>
                                    </div>
                                ) : viewingAssignment.quiz ? (
                                    <div className="space-y-6">
                                        {viewingAssignment.quiz.quiz.map((q, index) => {
                                            const isGraded = submissions[viewingAssignment.id]?.status === 'Graded';
                                            const isCorrectionMode = isGraded && !submissions[viewingAssignment.id].correction; // Basic assumption
                                            const originalAnswer = submissions[viewingAssignment.id]?.answers?.[index];
                                            const wasCorrectOriginally = originalAnswer === q.correctAnswer;
                                            
                                            // In correction mode, hide correct questions
                                            if (isCorrectionMode && wasCorrectOriginally) {
                                                 return null; 
                                            }

                                            return (
                                            <div key={index} className={`p-5 rounded-xl border ${isCorrectionMode && !wasCorrectOriginally ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-800/50 border-slate-700'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="font-semibold text-slate-200 text-lg"><span className="text-slate-500 mr-2">{index + 1}.</span>{q.question}</p>
                                                    {isCorrectionMode && !wasCorrectOriginally && <span className="text-[10px] font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-500/20 uppercase tracking-wider">Missed</span>}
                                                </div>
                                                <div className="space-y-2 pl-4 border-l-2 border-slate-700">
                                                    {q.options.map(opt => {
                                                        const isSelected = objectiveAnswers[index] === opt;
                                                        const isLocked = isGraded && !isCorrectionMode; // Lock if graded and not correcting
                                                        const isCorrectOption = opt === q.correctAnswer;
                                                        
                                                        let containerClass = "flex items-center gap-3 p-3 rounded-lg transition-all border ";
                                                        let textClass = "font-medium flex-grow ";
                                                        let indicatorBorder = "";
                                                        let indicatorBg = "";

                                                        if (isGraded && !isCorrectionMode) {
                                                            containerClass += "cursor-default "; 
                                                            if (isCorrectOption) {
                                                                containerClass += "bg-green-500/10 border-green-500/50 ";
                                                                textClass += "text-green-200";
                                                                indicatorBorder = "border-green-500";
                                                                if (isSelected) indicatorBg = "bg-green-500"; 
                                                            } else if (isSelected) {
                                                                // Wrong answer selected
                                                                containerClass += "bg-red-500/10 border-red-500/50 ";
                                                                textClass += "text-red-200";
                                                                indicatorBorder = "border-red-500";
                                                                indicatorBg = "bg-red-500";
                                                            } else {
                                                                containerClass += "border-transparent opacity-50 ";
                                                                textClass += "text-slate-400";
                                                                indicatorBorder = "border-slate-600";
                                                            }
                                                        } else {
                                                            // Default or Correction Mode
                                                            containerClass += isLocked ? "cursor-default " : "cursor-pointer border-transparent ";
                                                            if (isSelected) {
                                                                 containerClass += "bg-blue-600/20 border-blue-500/50 ";
                                                                 textClass += "text-blue-100";
                                                                 indicatorBorder = "border-blue-400";
                                                                 indicatorBg = "bg-blue-400";
                                                            } else {
                                                                 containerClass += isLocked ? "" : "hover:bg-slate-700/50 ";
                                                                 textClass += "text-slate-300";
                                                                 indicatorBorder = "border-slate-500";
                                                            }
                                                        }

                                                        return (
                                                            <label key={opt} className={containerClass}>
                                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${indicatorBorder}`}>
                                                                    {(isSelected || (isGraded && !isCorrectionMode && isCorrectOption && !isSelected)) && (
                                                                         <div className={`w-2.5 h-2.5 rounded-full ${indicatorBg || (isCorrectOption && isGraded && !isCorrectionMode ? 'bg-green-500 opacity-50' : '')}`}></div>
                                                                    )}
                                                                </div>
                                                                <input type="radio" name={`q_${index}`} value={opt} checked={isSelected} onChange={e => !isLocked && setObjectiveAnswers(p => ({...p, [index]: e.target.value}))} className="hidden" disabled={isLocked} />
                                                                <span className={textClass}>{opt}</span>
                                                                
                                                                {isGraded && !isCorrectionMode && (
                                                                    <div className="ml-2 text-lg">
                                                                        {isSelected && isCorrectOption && "✅"}
                                                                        {isSelected && !isCorrectOption && "❌"}
                                                                        {!isSelected && isCorrectOption && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded whitespace-nowrap">Correct Answer</span>}
                                                                    </div>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                ) : null}
                                
                                {(!submissions[viewingAssignment.id] || (submissions[viewingAssignment.id].status === 'Graded' && viewingAssignment.type === 'Objective' && !submissions[viewingAssignment.id].correction && Object.keys(objectiveAnswers).length > 0)) && (
                                    <div className="mt-6 flex justify-end">
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Submitting...' : submissions[viewingAssignment.id] ? 'Submit Correction' : 'Submit Assignment'}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </Card>
                    ) : (
                        <>
                        {/* Normal Tabs */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
                             {/* Filter tabs could be here */}
                            {assignments.map(a => (
                                <Card key={a.id} onClick={() => handleViewAssignment(a)} className="cursor-pointer hover:border-blue-500 transition-colors group" fullHeight={false}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold group-hover:text-blue-400 transition-colors">{a.title}</h3>
                                        {submissions[a.id] ? (
                                            <span className={`text-xs px-2 py-0.5 rounded ${submissions[a.id].status === 'Graded' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>
                                                {submissions[a.id].status}
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded">To Do</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{a.description}</p>
                                    <p className="text-xs text-slate-500">Due: {a.dueDate || 'N/A'}</p>
                                </Card>
                            ))}
                            {assignments.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">No assignments yet.</p>}
                        </div>
                        
                        {/* Corrections Section - shown if any available */}
                        {correctionAssignments.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-slate-700">
                                <h3 className="text-xl font-bold mb-4 text-orange-400">Corrections Available</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {correctionAssignments.map(a => (
                                        <Card key={`corr-${a.id}`} onClick={() => handleViewAssignment(a, 'correction')} className="cursor-pointer border-orange-500/30 hover:border-orange-500 transition-colors group" fullHeight={false}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold group-hover:text-orange-400 transition-colors">{a.title}</h3>
                                                <span className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded">Correction</span>
                                            </div>
                                            <div className="text-sm text-gray-400 mt-2">
                                                Score: <span className="font-bold text-white">{submissions[a.id]?.grade}</span>
                                            </div>
                                            <Button size="sm" className="mt-4 w-full bg-orange-600 hover:bg-orange-500">Correct Now</Button>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}
                  </div>
              );
          case 'groups':
              return studentGroup ? (
                  <Card className="h-[calc(100vh-100px)] flex flex-col">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                          <h2 className="text-2xl font-bold">{studentGroup.name}</h2>
                          <span className="text-sm text-gray-400">{studentGroup.assignmentTitle}</span>
                      </div>
                      <div className="flex-grow overflow-y-auto space-y-4 p-2 mb-4">
                           {groupMessages.map(msg => (
                               <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                   <div className={`max-w-[80%] p-3 rounded-lg ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                       <p className="text-xs opacity-70 font-bold mb-1">{msg.senderName}</p>
                                       <p>{msg.text}</p>
                                   </div>
                               </div>
                           ))}
                           <div ref={groupMessagesEndRef} />
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-700">
                          <form onSubmit={handleSendGroupMessage} className="flex gap-2">
                              <input type="text" value={newGroupMessage} onChange={e => setNewGroupMessage(e.target.value)} placeholder="Type to group..." className="flex-grow p-2 bg-slate-800 border border-slate-600 rounded-md" />
                              <Button type="submit">Send</Button>
                          </form>
                          {!studentGroup.isSubmitted && (
                            <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                                <h4 className="font-bold mb-2">Submit Project</h4>
                                <textarea value={textSubmission} onChange={e => setTextSubmission(e.target.value)} placeholder="Enter final submission text here..." className="w-full p-2 bg-slate-900 rounded mb-2 h-20 text-sm"/>
                                <Button onClick={handleGroupSubmit} size="sm">Submit for Group</Button>
                            </div>
                          )}
                          {studentGroup.isSubmitted && (
                              <div className="mt-4 p-2 bg-green-900/20 border border-green-800 rounded text-center text-green-400 text-sm">
                                  Project Submitted. Grade: {studentGroup.grade || 'Pending'}
                              </div>
                          )}
                      </div>
                  </Card>
              ) : (
                  <Card>
                      <p className="text-center text-gray-400 py-12">You are not assigned to any group yet.</p>
                  </Card>
              );
          case 'messages':
              return <MessagingView userProfile={userProfile} contacts={teachers} />;
          case 'profile':
              return <StudentProfile userProfile={userProfile} assignments={assignments} submissions={Object.values(submissions)} />;
          case 'timetable':
              return (
                <Card>
                     <h3 className="text-2xl font-bold mb-6">Class Timetable</h3>
                     {timetable ? <NotebookTimetable classId={userProfile.class || ''} timetableData={timetable.timetableData} /> : <p className="text-gray-500 text-center">No timetable published.</p>}
                </Card>
              );
          case 'attendance':
              return (
                  <Card>
                      <h3 className="text-2xl font-bold mb-6">My Attendance</h3>
                      <div className="space-y-2">
                          {attendanceRecords.map(rec => (
                              <div key={rec.id} className="flex justify-between p-3 bg-slate-800 rounded border-l-4 border-slate-600">
                                  <span>{new Date(rec.date).toLocaleDateString()}</span>
                                  <span className={`font-bold ${rec.records[user.uid] === 'Present' ? 'text-green-400' : 'text-red-400'}`}>{rec.records[user.uid]}</span>
                              </div>
                          ))}
                          {attendanceRecords.length === 0 && <p className="text-gray-500">No attendance records found.</p>}
                      </div>
                  </Card>
              );
          default: return <div>Section under construction</div>;
      }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar 
        isExpanded={isSidebarExpanded}
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={() => setIsSidebarExpanded(false)}
        title="Student Portal"
      />
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {renderContent()}
      </main>
      
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
    </div>
  );
};

export default StudentView;
