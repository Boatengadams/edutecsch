
// ... (imports remain same)
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

// ... (helpers QUOTES, getGreeting, gradeToNumeric, FeedItem types remain same)
interface StudentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

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

type FeedItem = 
    | { type: 'assignment', data: Assignment, date: Date }
    | { type: 'submission', data: Submission, date: Date }
    | { type: 'attendance', data: AttendanceRecord, date: Date }
    | { type: 'flyer', data: PublishedFlyer, date: Date };

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
  const [calculatedRanking, setCalculatedRanking] = useState<any>(null);
  const [reportClassSize, setReportClassSize] = useState(0);
  const [reportAttendance, setReportAttendance] = useState<{ present: number, total: number } | undefined>(undefined);
  
  // New State for Teaching Materials
  const [teachingMaterials, setTeachingMaterials] = useState<TeachingMaterial[]>([]);
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('All');

  // Assignment View State
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [textSubmission, setTextSubmission] = useState('');
  const [fileSubmission, setFileSubmission] = useState<File | null>(null);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Correction State
  const [correctionText, setCorrectionText] = useState('');
  const [correctionAnswers, setCorrectionAnswers] = useState<Record<string, string>>({});
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [visibleExplanations, setVisibleExplanations] = useState<Record<string, boolean>>({});
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

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
            return unique.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, 20);
        });
    }));
    unsubscribers.push(...unsubFlyers);
    
    // 9. Terminal Reports
    if (userProfile.class) {
        const reportsQuery = db.collection('terminalReports')
            .where('classId', '==', userProfile.class)
            .where('published', '==', true);
            
        unsubscribers.push(reportsQuery.onSnapshot(snap => {
             setTerminalReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TerminalReport)));
        }));
    }

    // 10. Teachers (for messaging)
    if (userProfile.class) {
        const teacherQuery = db.collection('users').where('role', '==', 'teacher')
            .where('classesTaught', 'array-contains', userProfile.class);
        unsubscribers.push(teacherQuery.onSnapshot(snap => {
            setTeachers(snap.docs.map(d => d.data() as UserProfile));
        }));
    }
    
    // 11. Teaching Materials (Fetch where target contains class OR 'All')
    // Since firestore can't do OR on array-contains easily, we fetch with one array-contains-any query
    if (userProfile.class) {
        const materialsQuery = db.collection('teachingMaterials')
            .where('targetClasses', 'array-contains-any', [userProfile.class, 'All'])
            .orderBy('createdAt', 'desc');
            
        unsubscribers.push(materialsQuery.onSnapshot(snap => {
            setTeachingMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingMaterial)));
        }));
    }

    setLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, userProfile]);

  // ... (existing effects for chat scrolling and AI context)
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
          case 'resources':
              context = "The student is browsing teaching materials and resources uploaded by teachers.";
              prompts.push('What are the key takeaways from the Science notes?');
              break;
          case 'science_lab':
              context = "The student is in the virtual Science Lab.";
              prompts.push('How do I use the microscope?');
              break;
          default:
              context = "The student is on their dashboard.";
      }
      setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
      setAiSuggestedPrompts(prompts);
  }, [activeTab, assignments, submissions, studentGroup]);

  // Determine available subjects based on the student's class from curriculum
  const availableSubjects = useMemo(() => {
      if (userProfile?.class && GES_STANDARD_CURRICULUM[userProfile.class]) {
          return GES_STANDARD_CURRICULUM[userProfile.class].sort();
      }
      return GES_SUBJECTS; // Fallback if class not found or undefined
  }, [userProfile?.class]);

  // ... (existing handlers handleAssignmentClick, handleSubmitAssignment, handleSubmitCorrection, handleSendGroupMessage) ...
  const handleAssignmentClick = (assignment: Assignment) => {
      setViewingAssignment(assignment);
      setTextSubmission('');
      setFileSubmission(null);
      setObjectiveAnswers({});
      // Reset correction inputs
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
          
          // AWARD POINTS
          const pointsEarned = 50; // Standard reward for submission
          const currentXP = userProfile.xp || 0;
          const newXP = currentXP + pointsEarned;
          const newLevel = Math.floor(newXP / 100) + 1; // Simple leveling
          
          await db.collection('users').doc(user.uid).update({
              xp: newXP,
              level: newLevel
          });

          showToast(status === 'Graded' ? `Assignment graded: ${grade}. +${pointsEarned} XP!` : `Assignment submitted! +${pointsEarned} XP!`, 'success');
          setViewingAssignment(null);
      } catch (err: any) {
          showToast(`Submission failed: ${err.message}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSubmitCorrection = async (submissionId: string) => {
      if (!user) return;
      
      const isObjective = viewingAssignment?.type === 'Objective';
      
      if (!isObjective && !correctionText && !correctionFile) {
          showToast("Please enter correction details or attach a file.", "error");
          return;
      }
      if (isObjective && Object.keys(correctionAnswers).length === 0) {
           showToast("Please re-attempt at least one wrong question.", "error");
           return;
      }

      setIsSubmittingCorrection(true);
      try {
          let attachmentURL: string | undefined;
          let attachmentName: string | undefined;

          if (correctionFile) {
              const storagePath = `corrections/${submissionId}/${user.uid}/${Date.now()}_${correctionFile.name}`;
              const storageRef = storage.ref(storagePath);
              await storageRef.put(correctionFile);
              attachmentURL = await storageRef.getDownloadURL();
              attachmentName = correctionFile.name;
          }

          const correctionData: Correction = {
              text: correctionText,
              reattemptedAnswers: isObjective ? correctionAnswers : undefined,
              submittedAt: firebase.firestore.Timestamp.now(),
              attachmentURL,
              attachmentName
          };

          await db.collection('submissions').doc(submissionId).update({
              correction: correctionData
          });

          showToast("Correction submitted successfully!", "success");
          // Clear inputs
          setCorrectionText('');
          setCorrectionAnswers({});
          setCorrectionFile(null);
          // No need to close explicitly if we want them to see the result, but typically we refresh view
      } catch (err: any) {
          showToast(`Correction failed: ${err.message}`, "error");
      } finally {
          setIsSubmittingCorrection(false);
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
  
  const handleViewReport = (report: TerminalReport) => {
      if (!user) return;
      // Calculate ranking client-side based on the full report
      const studentTotals: Record<string, { total: number, count: number }> = {};
      
      Object.values(report.subjects).forEach((subjectData: any) => {
          if (subjectData.marks) {
              Object.entries(subjectData.marks).forEach(([uid, mark]: [string, any]) => {
                  if (mark.overallTotal !== undefined) {
                      if (!studentTotals[uid]) studentTotals[uid] = { total: 0, count: 0 };
                      studentTotals[uid].total += (mark.overallTotal || 0);
                      studentTotals[uid].count += 1;
                  }
              });
          }
      });

      const sortedUids = Object.keys(studentTotals).sort((a, b) => studentTotals[b].total - studentTotals[a].total);
      const index = sortedUids.indexOf(user.uid);
      
      const myTotal = studentTotals[user.uid];
      if (myTotal) {
          setCalculatedRanking({
              position: index + 1,
              totalScore: myTotal.total,
              average: myTotal.count > 0 ? myTotal.total / myTotal.count : 0
          });
      } else {
          setCalculatedRanking(null);
      }
      
      setReportClassSize(sortedUids.length);
      
      // Calculate attendance for this student up to now (simple count)
      const present = attendanceRecords.filter(r => r.records[user.uid] === 'Present' || r.records[user.uid] === 'Late').length;
      setReportAttendance({ present, total: attendanceRecords.length });

      setViewingReport(report);
  };
  
  const filteredMaterials = useMemo(() => {
      if (materialSubjectFilter === 'All') {
          // If 'All' is selected, show materials that match ANY of the student's curriculum subjects
          // or have no subject specified.
          return teachingMaterials.filter(m => !m.subject || availableSubjects.includes(m.subject));
      }
      return teachingMaterials.filter(m => m.subject === materialSubjectFilter);
  }, [teachingMaterials, materialSubjectFilter, availableSubjects]);
  
  // Automatic download handler
    const handleDownloadMaterial = async (url: string, filename: string) => {
        try {
            showToast("Downloading...", 'success');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            showToast("Download failed. Opening in new tab.", 'error');
            window.open(url, '_blank');
        }
    };
    
    // Helper to get wrong questions for objective quizzes
    const getWrongQuestionIndices = () => {
        if (!viewingAssignment || !viewingAssignment.quiz || !submissions[viewingAssignment.id]) return [];
        const submission = submissions[viewingAssignment.id];
        if (!submission.answers) return [];
        
        return viewingAssignment.quiz.quiz
            .map((q, idx) => ({ q, idx }))
            .filter(({ q, idx }) => submission.answers?.[idx] !== q.correctAnswer)
            .map(({ idx }) => idx);
    };

    const toggleExplanation = (index: number) => {
        setVisibleExplanations(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };


  if (!user || !userProfile) return <div className="flex h-screen justify-center items-center"><Spinner /></div>;

  const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: '🚀' },
      { key: 'assignments', label: 'Assignments', icon: '📚' },
      { key: 'live_lesson', label: <span className="flex items-center">Live Class {liveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: '📡' },
      { key: 'science_lab', label: 'Virtual Lab', icon: '🧪' },
      { key: 'group_work', label: 'Group Work', icon: '🤝' },
      { key: 'study_mode', label: 'Study Mode', icon: '🧠' },
      { key: 'resources', label: 'Study Materials', icon: '📂' },
      { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: '💬' },
      { key: 'terminal_reports', label: 'Reports', icon: '📊' },
      { key: 'profile', label: 'Profile', icon: '👤' },
      { key: 'timetable', label: 'Timetable', icon: '🗓️' },
      { key: 'attendance', label: 'Attendance', icon: '📅' },
  ];

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

      switch (activeTab) {
          case 'dashboard':
              const pendingCount = assignments.filter(a => !submissions[a.id]).length;
              return (
                  // ... (existing dashboard content unchanged)
                  <div className="space-y-8 animate-fade-in-up pb-10">
                      {/* Welcome Header */}
                      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                          <div>
                              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-1">
                                  <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                  <span>•</span>
                                  <span>{schoolSettings?.currentTerm ? `Term ${schoolSettings.currentTerm}` : 'Academic Year'}</span>
                              </div>
                              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                  {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{userProfile.name.split(' ')[0]}</span>
                              </h1>
                              <p className="text-slate-400 mt-2 text-lg italic max-w-2xl">"{quote}"</p>
                          </div>
                          <div className="flex items-center gap-4">
                               <div className="text-right hidden md:block">
                                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Level</p>
                                  <p className="text-2xl font-black text-white">{userProfile.level || 1}</p>
                                </div>
                               <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
                                  {userProfile.level || 1}
                               </div>
                          </div>
                      </div>

                      {/* Hero / Action Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Main Focus Card */}
                          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 flex flex-col justify-between min-h-[280px] group cursor-pointer hover:border-slate-700 transition-all shadow-2xl">
                              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                              
                              {liveLesson ? (
                                  <>
                                      <div className="relative z-10">
                                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider border border-red-500/20 animate-pulse">
                                              <span className="w-2 h-2 rounded-full bg-red-500"></span> Live Now
                                          </span>
                                          <h2 className="text-3xl font-bold text-white mt-4 mb-2">{liveLesson.topic}</h2>
                                          <p className="text-slate-400">{liveLesson.subject}</p>
                                      </div>
                                      <div className="relative z-10 mt-8">
                                          <Button onClick={() => setActiveTab('live_lesson')} className="px-8 py-4 text-lg font-bold shadow-lg shadow-red-500/20 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500">
                                              Join Class 📡
                                          </Button>
                                      </div>
                                  </>
                              ) : (
                                  <>
                                      <div className="relative z-10">
                                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Study Time
                                          </span>
                                          <h2 className="text-3xl font-bold text-white mt-4 mb-2">Ready to learn something new?</h2>
                                          <p className="text-slate-400 max-w-md">Launch Study Mode to explore topics with your AI tutor.</p>
                                      </div>
                                      <div className="relative z-10 mt-8">
                                          <Button onClick={() => setActiveTab('study_mode')} className="px-8 py-4 text-lg font-bold shadow-lg shadow-blue-500/20">
                                              Launch Study Mode 🚀
                                          </Button>
                                      </div>
                                  </>
                              )}
                          </div>

                          {/* Status Column */}
                          <div className="space-y-4">
                              {/* Assignments Stat */}
                              <div onClick={() => setActiveTab('assignments')} className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer flex flex-col justify-between h-[130px]">
                                  <div className="flex justify-between items-start">
                                      <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 text-xl">📝</div>
                                      {pendingCount > 0 && <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-1 rounded-md">{pendingCount} Due</span>}
                                  </div>
                                  <div>
                                      <p className="text-2xl font-bold text-white">{pendingCount}</p>
                                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Tasks</p>
                                  </div>
                              </div>

                              {/* XP/Progress Stat */}
                              <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors flex flex-col justify-between h-[130px]">
                                  <div className="flex justify-between items-start">
                                      <div className="p-2 bg-green-500/10 rounded-lg text-green-400 text-xl">🏆</div>
                                  </div>
                                  <div>
                                      <div className="flex justify-between items-end mb-1">
                                          <p className="text-2xl font-bold text-white">{userProfile.xp || 0}</p>
                                          <p className="text-xs text-slate-500 mb-1">/ {(userProfile.level || 1) * 100} XP</p>
                                      </div>
                                      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                          <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, ((userProfile.xp || 0) / ((userProfile.level || 1) * 100)) * 100)}%` }}></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Quick Access Grid */}
                      <div>
                          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                              <span className="text-blue-500">⚡</span> Quick Access
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <button onClick={() => setActiveTab('science_lab')} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all group text-left relative overflow-hidden">
                                  <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                                  <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">🧪</span>
                                  <p className="font-bold text-slate-200">Science Lab</p>
                                  <p className="text-xs text-slate-500 mt-1">Virtual Experiments</p>
                              </button>
                              <button onClick={() => setActiveTab('group_work')} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all group text-left">
                                  <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">🤝</span>
                                  <p className="font-bold text-slate-200">Group Work</p>
                                  <p className="text-xs text-slate-500 mt-1">Collaborate</p>
                              </button>
                              <button onClick={() => setActiveTab('timetable')} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all group text-left">
                                  <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">🗓️</span>
                                  <p className="font-bold text-slate-200">Timetable</p>
                                  <p className="text-xs text-slate-500 mt-1">Check Schedule</p>
                              </button>
                              <button onClick={() => setActiveTab('messages')} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all group text-left relative">
                                  <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">💬</span>
                                  <p className="font-bold text-slate-200">Messages</p>
                                  <p className="text-xs text-slate-500 mt-1">Chat with Teachers</p>
                                  {unreadMessages > 0 && <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border border-slate-900"></span>}
                              </button>
                          </div>
                      </div>

                      {/* Notices Section (Horizontal Scroll) */}
                      {publishedFlyers.length > 0 && (
                          <div>
                              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                  <span className="text-purple-500">📢</span> School Board
                              </h3>
                              <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x">
                                  {publishedFlyers.map(flyer => (
                                      <div key={flyer.id} className="snap-center flex-shrink-0 w-80">
                                          <FlyerCard 
                                              data={flyer.content} // Pass the content string (or JSON string)
                                              onClick={() => setSelectedFlyer(flyer)}
                                          />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              );
          // ... (assignments, live_lesson, science_lab, group_work, study_mode, resources, messages, profile, timetable, attendance remain same)
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
                                      <div className="p-5 flex-grow">
                                          <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                                              {assignment.description}
                                          </p>
                                      </div>
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
                                  <span className="text-4xl mb-4 grayscale">🎉</span>
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
          case 'science_lab':
              return <ScienceLab userProfile={userProfile} />;
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
              return <StudentStudyMode 
                  userProfile={userProfile} 
                  onExit={() => setActiveTab('dashboard')} 
                  timetable={timetable} 
              />;
          case 'resources':
               return (
                   <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                           <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                              <span className="bg-indigo-600 text-white text-lg p-2 rounded-lg shadow-lg">📂</span>
                              Study Materials
                           </h2>
                           <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg">
                               <span className="text-xs text-slate-400 pl-2 font-bold">Filter Subject:</span>
                               <select 
                                   value={materialSubjectFilter} 
                                   onChange={e => setMaterialSubjectFilter(e.target.value)} 
                                   className="bg-transparent text-sm text-white font-bold outline-none cursor-pointer hover:text-blue-400 p-1 pr-4"
                               >
                                   <option value="All">All Subjects</option>
                                   {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {filteredMaterials.map(material => (
                               <Card key={material.id} className="flex flex-col !p-4 hover:border-indigo-500/50 transition-colors group" onClick={() => handleDownloadMaterial(material.aiFormattedContent, material.originalFileName)}>
                                   <div className="flex items-start justify-between mb-3">
                                       <div className="w-10 h-10 rounded-lg bg-indigo-900/30 flex items-center justify-center text-xl">
                                            {material.originalFileName.endsWith('.pdf') ? '📕' : 
                                             material.originalFileName.match(/\.(doc|docx)$/) ? '📝' : 
                                             material.originalFileName.match(/\.(jpg|png|jpeg)$/) ? '🖼️' : '📄'}
                                       </div>
                                       <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">
                                           {new Date(material.createdAt?.toDate()).toLocaleDateString()}
                                       </span>
                                   </div>
                                   
                                   <h4 className="font-bold text-white truncate mb-1" title={material.title}>{material.title}</h4>
                                   
                                   <div className="flex items-center gap-2 mb-4">
                                       <span className="text-xs text-slate-400 truncate max-w-[120px]">{material.originalFileName}</span>
                                       {material.subject && (
                                            <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                {material.subject}
                                            </span>
                                       )}
                                   </div>
                                   
                                   <div className="mt-auto pt-3 border-t border-slate-700/50">
                                       <p className="text-[10px] text-slate-500 mb-2">Uploaded by: {material.uploaderName}</p>
                                       <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadMaterial(material.aiFormattedContent, material.originalFileName);
                                            }}
                                            className="block w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-center rounded-lg text-xs font-bold text-white transition-colors shadow-lg shadow-indigo-900/20"
                                       >
                                           Download / View
                                       </button>
                                   </div>
                               </Card>
                           ))}
                           {filteredMaterials.length === 0 && (
                               <div className="col-span-full text-center py-20 text-slate-600">
                                   <span className="text-4xl mb-4 opacity-50 block">📭</span>
                                   <p>No study materials found for this subject.</p>
                               </div>
                           )}
                       </div>
                   </div>
               );
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
          case 'terminal_reports':
              if (viewingReport && calculatedRanking) {
                  return (
                    <div className="space-y-4">
                        <Button variant="secondary" onClick={() => setViewingReport(null)}>← Back to List</Button>
                        <div className="overflow-auto pb-8">
                             <StudentReportCard 
                                student={userProfile}
                                report={viewingReport}
                                schoolSettings={schoolSettings}
                                ranking={calculatedRanking}
                                classSize={reportClassSize}
                                attendance={reportAttendance}
                             />
                        </div>
                    </div>
                  );
              }
              return (
                  <Card>
                      <h3 className="text-xl font-bold mb-4">Terminal Reports</h3>
                      {terminalReports.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {terminalReports.map(report => (
                                  <button 
                                      key={report.id} 
                                      onClick={() => handleViewReport(report)}
                                      className="p-6 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-left border border-slate-700 hover:border-blue-500 group"
                                  >
                                      <h4 className="text-lg font-bold text-white group-hover:text-blue-400">Term {report.term} - {report.academicYear}</h4>
                                      <p className="text-sm text-slate-400 mt-2">Class: {report.classId}</p>
                                      <p className="text-xs text-green-400 mt-4 font-bold uppercase tracking-wider">View Report Card →</p>
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <p className="text-center py-10 text-gray-500">No published reports found for your class.</p>
                      )}
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
      {/* UPDATE: Removed default padding when in immersive modes like Science Lab or Study Mode */}
      <main className={`flex-1 overflow-y-auto relative custom-scrollbar ${['science_lab', 'study_mode', 'live_lesson'].includes(activeTab) ? 'p-0' : 'p-4 sm:p-6'}`}>
        {renderContent()}
      </main>
      <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
      
      {/* ... (viewingAssignment modal) ... */}
       {viewingAssignment && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-4 z-50">
              <Card className="w-full max-w-3xl h-[90vh] flex flex-col !bg-slate-800 !border-slate-600 shadow-2xl">
                  {/* ... (assignment modal content) ... */}
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
                                                  {q.options?.map(opt => (
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
                              <p className="text-sm text-slate-300 font-mono">Timestamp: {submissions[viewingAssignment.id].submittedAt?.toDate()?.toLocaleString()}</p>
                              {submissions[viewingAssignment.id].grade && (
                                  <div className="mt-4 pt-4 border-t border-green-500/30">
                                      <p className="text-lg"><strong className="text-green-300">Score:</strong> {submissions[viewingAssignment.id].grade}</p>
                                      <div className="mt-2 p-3 bg-green-900/30 rounded-lg text-green-200 italic text-sm border border-green-500/20">
                                          "{submissions[viewingAssignment.id].feedback}"
                                      </div>
                                      
                                      {/* CORRECTION SECTION */}
                                      <div className="mt-6 pt-6 border-t border-green-500/30">
                                        <h5 className="font-bold text-white mb-3">Corrections</h5>
                                        {submissions[viewingAssignment.id].correction ? (
                                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                                <p className="text-xs text-slate-400 mb-2">Submitted on {submissions[viewingAssignment.id].correction?.submittedAt.toDate().toLocaleString()}</p>
                                                {submissions[viewingAssignment.id].correction?.text && (
                                                    <p className="text-slate-200 whitespace-pre-wrap">{submissions[viewingAssignment.id].correction?.text}</p>
                                                )}
                                                {submissions[viewingAssignment.id].correction?.reattemptedAnswers && viewingAssignment.quiz && (
                                                    <div className="mt-3 space-y-2">
                                                        <h6 className="text-xs font-bold text-slate-400 uppercase">Re-attempted Questions</h6>
                                                        {Object.entries(submissions[viewingAssignment.id].correction?.reattemptedAnswers || {}).map(([idx, ans]) => {
                                                            const i = parseInt(idx);
                                                            const q = viewingAssignment.quiz?.quiz[i];
                                                            if (!q) return null;
                                                            return (
                                                                <div key={i} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                                                                    <p className="text-slate-300 mb-1">{i+1}. {q.question}</p>
                                                                    <p className="text-blue-300">Selected: {ans}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {submissions[viewingAssignment.id].correction?.attachmentURL && (
                                                    <div className="mt-2">
                                                        <a href={submissions[viewingAssignment.id].correction?.attachmentURL} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            {submissions[viewingAssignment.id].correction?.attachmentName || 'View Correction File'}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {viewingAssignment.type === 'Objective' && viewingAssignment.quiz ? (
                                                    // OBJECTIVE CORRECTION UI
                                                    <div className="space-y-6">
                                                        <p className="text-sm text-slate-300 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
                                                            Please correct your wrong answers below. Choose the correct option and check the explanation to understand better.
                                                        </p>
                                                        {getWrongQuestionIndices().map((questionIndex) => {
                                                            const q = viewingAssignment.quiz!.quiz[questionIndex];
                                                            const isExplanationVisible = visibleExplanations[questionIndex];
                                                            
                                                            return (
                                                                <div key={questionIndex} className="p-4 bg-slate-900 rounded-xl border border-red-500/30">
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <p className="font-medium text-white text-md"><span className="text-red-400 mr-2">Q{questionIndex + 1}.</span> {q.question}</p>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-2 ml-2">
                                                                        {q.options?.map(opt => (
                                                                            <label key={opt} className="flex items-center space-x-3 cursor-pointer group">
                                                                                <div className="relative flex items-center">
                                                                                    <input 
                                                                                        type="radio" 
                                                                                        name={`correction-q-${questionIndex}`} 
                                                                                        value={opt} 
                                                                                        checked={correctionAnswers[questionIndex] === opt} 
                                                                                        onChange={() => setCorrectionAnswers(prev => ({ ...prev, [questionIndex]: opt }))} 
                                                                                        className="peer sr-only" 
                                                                                    />
                                                                                    <div className="w-4 h-4 border-2 border-slate-500 rounded-full peer-checked:border-green-500 peer-checked:bg-green-500 transition-all"></div>
                                                                                </div>
                                                                                <span className="text-slate-300 group-hover:text-white transition-colors text-sm">{opt}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    <div className="mt-4 flex flex-col items-start gap-2">
                                                                        <button 
                                                                            onClick={() => toggleExplanation(questionIndex)} 
                                                                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                                        >
                                                                            {isExplanationVisible ? '🙈 Hide Explanation' : '💡 Show Explanation'}
                                                                        </button>
                                                                        
                                                                        {isExplanationVisible && (
                                                                            <div className="w-full bg-blue-900/20 p-3 rounded-lg border-l-2 border-blue-500 text-xs text-blue-200 animate-fade-in-short">
                                                                                <strong>Explanation:</strong> {q.explanation || 'No explanation provided.'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {getWrongQuestionIndices().length === 0 && <p className="text-green-400">All answers correct! No corrections needed.</p>}
                                                    </div>
                                                ) : (
                                                    // THEORY CORRECTION UI
                                                    <>
                                                        <p className="text-sm text-slate-300">Submit correction for this assignment:</p>
                                                        <textarea 
                                                            value={correctionText} 
                                                            onChange={e => setCorrectionText(e.target.value)} 
                                                            placeholder="Enter correction details..." 
                                                            rows={4} 
                                                            className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                                                        />
                                                        <input 
                                                            type="file" 
                                                            onChange={e => setCorrectionFile(e.target.files?.[0] || null)} 
                                                            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                                                        />
                                                    </>
                                                )}
                                                
                                                <Button onClick={() => handleSubmitCorrection(submissions[viewingAssignment.id].id)} disabled={isSubmittingCorrection} size="sm" className="bg-blue-600 hover:bg-blue-500">
                                                    {isSubmittingCorrection ? 'Submitting...' : 'Submit Correction'}
                                                </Button>
                                            </div>
                                        )}
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
               <div className="w-full max-w-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <FlyerCard 
                        data={selectedFlyer.content}
                        className="min-h-[400px]"
                    />
                    <div className="mt-4 flex justify-center">
                        <button onClick={() => setSelectedFlyer(null)} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
               </div>
          </div>
      )}
      
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};
