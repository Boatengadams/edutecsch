
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
import { useOnlineStatus } from '../hooks/useOnlineStatus';

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
  const [groupMessageText, setGroupMessageText] = useState('');
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
              status: 'Submitted',
              answers: viewingAssignment.type === 'Objective' ? objectiveAnswers : undefined,
              parentUids: userProfile.parentUids || [],
          };

          await db.collection('submissions').add(submissionData);
          showToast('Assignment submitted successfully!', 'success');
          setViewingAssignment(null);
      } catch (err: any) {
          showToast(`Submission failed: ${err.message}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!studentGroup || !groupMessageText.trim() || !user || !userProfile) return;
      setIsSendingGroupMessage(true);
      try {
          await db.collection('groups').doc(studentGroup.id).collection('groupMessages').add({
              groupId: studentGroup.id,
              senderId: user.uid,
              senderName: userProfile.name,
              text: groupMessageText,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          setGroupMessageText('');
      } catch (err) {
          console.error(err);
      } finally {
          setIsSendingGroupMessage(false);
      }
  };

  if (!user || !userProfile) return <div className="flex h-screen justify-center items-center"><Spinner /></div>;

  const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">📊</span> },
      { key: 'assignments', label: 'Assignments', icon: <span className="text-xl">📝</span> },
      { key: 'live_lesson', label: <span className="flex items-center">Live Lesson {liveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-xl">🔴</span> },
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
              return (
                  <div className="space-y-6">
                      <h2 className="text-3xl font-bold">Hello, {userProfile.name}!</h2>
                      {publishedFlyers.length > 0 && (
                          <div className="flex gap-4 overflow-x-auto pb-4">
                              {publishedFlyers.map(flyer => (
                                  <div key={flyer.id} className="flex-shrink-0 w-64 bg-slate-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => setSelectedFlyer(flyer)}>
                                      <div className="aspect-video bg-slate-700">
                                          <img src={flyer.imageUrl} alt={flyer.title} className="w-full h-full object-cover"/>
                                      </div>
                                      <div className="p-2">
                                          <p className="font-bold truncate">{flyer.title}</p>
                                          <p className="text-xs text-gray-400">{flyer.createdAt.toDate().toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card>
                              <p className="text-sm text-gray-400">Pending Assignments</p>
                              <p className="text-3xl font-bold text-yellow-400">{assignments.filter(a => !submissions[a.id]).length}</p>
                          </Card>
                          <Card>
                              <p className="text-sm text-gray-400">Upcoming Live Class</p>
                              <p className="text-lg font-bold text-white">{liveLesson ? liveLesson.topic : 'No active classes'}</p>
                          </Card>
                          <Card>
                              <p className="text-sm text-gray-400">My XP</p>
                              <p className="text-3xl font-bold text-blue-400">{userProfile.xp || 0}</p>
                          </Card>
                      </div>
                  </div>
              );
          case 'assignments':
              return (
                  <div className="space-y-6">
                      <h2 className="text-3xl font-bold">Assignments</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {assignments.map(assignment => {
                              const sub = submissions[assignment.id];
                              return (
                                  <Card key={assignment.id}>
                                      <h3 className="text-xl font-bold truncate">{assignment.title}</h3>
                                      <p className="text-sm text-gray-400">{assignment.subject}</p>
                                      <div className="mt-4 flex justify-between items-center">
                                          <span className={`px-2 py-1 text-xs rounded-full ${sub ? (sub.status === 'Graded' ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500'}`}>
                                              {sub ? sub.status : 'Pending'}
                                          </span>
                                          <Button size="sm" onClick={() => handleAssignmentClick(assignment)}>
                                              {sub ? 'View' : 'Start'}
                                          </Button>
                                      </div>
                                  </Card>
                              );
                          })}
                          {assignments.length === 0 && <p className="col-span-full text-center text-gray-500">No assignments found.</p>}
                      </div>
                  </div>
              );
          case 'live_lesson':
              return liveLesson ? (
                  <StudentLiveClassroom lessonId={liveLesson.id} userProfile={userProfile} onClose={() => setLiveLesson(null)} />
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="text-6xl mb-4">📴</div>
                      <h2 className="text-2xl font-bold mb-2">No Live Lesson Active</h2>
                      <p className="text-gray-400">Your teacher hasn't started a live session yet.</p>
                  </div>
              );
          case 'group_work':
              return studentGroup ? (
                  <div className="h-full flex flex-col">
                      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                          <div>
                              <h2 className="text-xl font-bold">{studentGroup.name}</h2>
                              <p className="text-sm text-gray-400">{studentGroup.assignmentTitle}</p>
                          </div>
                          <div className="text-sm text-gray-300">
                              {studentGroup.members.map(m => m.name).join(', ')}
                          </div>
                      </div>
                      <div className="flex-grow overflow-y-auto p-4 space-y-4">
                          {groupMessages.map(msg => (
                              <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                  <span className="text-xs text-gray-500 mb-1">{msg.senderName}</span>
                                  <div className={`p-3 rounded-lg max-w-xs md:max-w-md ${msg.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-200'}`}>
                                      {msg.text}
                                  </div>
                              </div>
                          ))}
                          <div ref={groupMessagesEndRef} />
                      </div>
                      <form onSubmit={handleSendGroupMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                          <input type="text" value={groupMessageText} onChange={e => setGroupMessageText(e.target.value)} placeholder="Type a message..." className="flex-grow p-2 bg-slate-700 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <Button type="submit" disabled={isSendingGroupMessage}>Send</Button>
                      </form>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="text-6xl mb-4">👥</div>
                      <h2 className="text-2xl font-bold mb-2">No Group Assigned</h2>
                      <p className="text-gray-400">You haven't been added to any study groups yet.</p>
                  </div>
              );
          case 'study_mode':
              return <StudentStudyMode userProfile={userProfile} onExit={() => setActiveTab('dashboard')} assignments={assignments} submissions={submissions} learningMaterials={[]} />;
          case 'messages':
              return <MessagingView userProfile={userProfile} contacts={teachers} />;
          case 'profile':
              return <StudentProfile userProfile={userProfile} assignments={assignments} submissions={Object.values(submissions)} />;
          case 'timetable':
              return timetable ? <NotebookTimetable classId={userProfile.class || ''} timetableData={timetable.timetableData} /> : <p className="text-center p-8">No timetable available.</p>;
          case 'attendance':
              return (
                  <Card>
                      <h3 className="text-xl font-bold mb-4">Attendance History</h3>
                      <div className="space-y-2">
                          {attendanceRecords.map(rec => (
                              <div key={rec.id} className="flex justify-between p-3 bg-slate-700 rounded-md">
                                  <span>{new Date(rec.date).toLocaleDateString()}</span>
                                  <span className={rec.records[user.uid] === 'Present' ? 'text-green-400' : 'text-red-400'}>{rec.records[user.uid]}</span>
                              </div>
                          ))}
                          {attendanceRecords.length === 0 && <p className="text-gray-500">No records found.</p>}
                      </div>
                  </Card>
              );
          default:
              return <div>Select a tab</div>;
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
        title="Student Portal"
      />
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative">
        {renderContent()}
      </main>
      <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
      
      {viewingAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
              <Card className="w-full max-w-3xl h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                      <h2 className="text-2xl font-bold">{viewingAssignment.title}</h2>
                      <Button variant="secondary" onClick={() => setViewingAssignment(null)}>Close</Button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-2 space-y-4">
                      <div className="prose-styles prose-invert bg-slate-800 p-4 rounded-lg">
                          <p className="whitespace-pre-wrap">{viewingAssignment.description}</p>
                      </div>
                      {viewingAssignment.attachmentURL && (
                          <a href={viewingAssignment.attachmentURL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline block">Download Attachment: {viewingAssignment.attachmentName}</a>
                      )}
                      
                      {!submissions[viewingAssignment.id] ? (
                          <div className="mt-6 border-t border-slate-700 pt-4">
                              <h4 className="font-bold text-lg mb-2">Your Submission</h4>
                              {viewingAssignment.type === 'Objective' && viewingAssignment.quiz ? (
                                  <div className="space-y-4">
                                      {viewingAssignment.quiz.quiz.map((q, i) => (
                                          <div key={i} className="p-4 bg-slate-800 rounded-lg">
                                              <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                                              <div className="space-y-2">
                                                  {q.options.map(opt => (
                                                      <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                                                          <input type="radio" name={`q-${i}`} value={opt} checked={objectiveAnswers[i] === opt} onChange={() => setObjectiveAnswers(prev => ({ ...prev, [i]: opt }))} className="text-blue-500 focus:ring-blue-500" />
                                                          <span>{opt}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <textarea value={textSubmission} onChange={e => setTextSubmission(e.target.value)} placeholder="Type your answer here..." rows={6} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                      <div>
                                          <label className="block text-sm font-medium text-gray-300 mb-1">Attach File (Optional)</label>
                                          <input type="file" onChange={e => setFileSubmission(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
                                      </div>
                                  </div>
                              )}
                              <Button onClick={handleSubmitAssignment} disabled={isSubmitting} className="mt-4 w-full">
                                  {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                              </Button>
                          </div>
                      ) : (
                          <div className="mt-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                              <h4 className="font-bold text-green-400 mb-2">Submitted!</h4>
                              <p className="text-sm text-gray-300">Date: {submissions[viewingAssignment.id].submittedAt.toDate().toLocaleString()}</p>
                              {submissions[viewingAssignment.id].grade && (
                                  <div className="mt-2 pt-2 border-t border-green-500/30">
                                      <p><strong>Grade:</strong> {submissions[viewingAssignment.id].grade}</p>
                                      <p><strong>Feedback:</strong> {submissions[viewingAssignment.id].feedback}</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      )}

      {selectedFlyer && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center p-4 z-50" onClick={() => setSelectedFlyer(null)}>
              <div className="max-w-4xl w-full max-h-full overflow-auto relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedFlyer(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">&times;</button>
                  <img src={selectedFlyer.imageUrl} alt={selectedFlyer.title} className="w-full h-auto rounded-lg" />
                  <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                      <h2 className="text-2xl font-bold">{selectedFlyer.title}</h2>
                      <p className="text-gray-400 text-sm mt-1">Posted by {selectedFlyer.publisherName} on {selectedFlyer.createdAt.toDate().toLocaleDateString()}</p>
                  </div>
              </div>
          </div>
      )}
      
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};
