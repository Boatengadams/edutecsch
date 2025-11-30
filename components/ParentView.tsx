
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
// FIX: Import firebase for compat services like firestore.FieldValue
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, Notification, SchoolEvent, SchoolEventType, Timetable, AttendanceRecord, Group, Conversation, PublishedFlyer } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import Button from './common/Button';
import AIAssistant from './AIAssistant';
import { ProgressDashboard } from './ProgressDashboard';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import ChangePasswordModal from './common/ChangePasswordModal';
import { useToast } from './common/Toast';
import PieChart from './common/charts/PieChart';
import LineChart from './common/charts/LineChart';
import MessagingView from './MessagingView';
import StudentProfile from './StudentProfile';

interface ParentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const QUOTES = [
    "Children are the living messages we send to a time we will not see.",
    "Education is the most powerful weapon which you can use to change the world.",
    "The beautiful thing about learning is that no one can take it away from you.",
    "Your children need your presence more than your presents.",
    "Encourage your child to have a love for learning.",
    "Behind every young child who believes in himself is a parent who believed first."
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

export const ParentView: React.FC<ParentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile } = useAuthentication();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for multi-child support
  const [childrenProfiles, setChildrenProfiles] = useState<UserProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [childsGroup, setChildsGroup] = useState<Group | null>(null);
  const [publishedFlyers, setPublishedFlyers] = useState<PublishedFlyer[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<PublishedFlyer | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(true);
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [relevantTeachers, setRelevantTeachers] = useState<UserProfile[]>([]);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const selectedChildProfile = useMemo(() => childrenProfiles.find(c => c.uid === selectedChildId), [childrenProfiles, selectedChildId]);

  const submissions = useMemo(() => {
    const subsForChild = allSubmissions.filter(s => s.studentId === selectedChildId);
    return subsForChild.reduce((acc, sub) => {
        acc[sub.assignmentId] = sub;
        return acc;
    }, {} as Record<string, Submission>);
  }, [allSubmissions, selectedChildId]);

  // Effect to fetch all children profiles
  useEffect(() => {
    if (userProfile?.role === 'parent' && userProfile.childUids && userProfile.childUids.length > 0) {
        setLoading(true);
        const childPromises = userProfile.childUids.map(uid => db.collection('users').doc(uid).get());
        Promise.all(childPromises).then(docs => {
            const profiles = docs.map(doc => doc.data() as UserProfile).filter(Boolean);
            setChildrenProfiles(profiles);
            if (profiles.length > 0) {
                setSelectedChildId(profiles[0].uid);
            }
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching children profiles:", err);
            showToast("Failed to load children profiles.", "error");
            setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, [userProfile, showToast]);

  
  // Effect for parent-specific data (notifications, events, all submissions, flyers)
  useEffect(() => {
    if (!user || !userProfile) return;

    const unsubscribers: (() => void)[] = [];

    // Notifications
    const notifQuery = db.collection('notifications').where('userId', '==', user.uid);
    unsubscribers.push(notifQuery.onSnapshot(snapshot => {
        const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        setNotifications(fetchedNotifications.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, err => console.error("Error fetching notifications:", err)));

    // School Feed Events
    const eventQuery = db.collection('calendarEvents');
    unsubscribers.push(eventQuery.onSnapshot(snapshot => {
        const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent));
        const relevantEvents = fetchedEvents.filter(event => event.audience === 'All' || event.audience === 'Parents' || event.audience === 'Students');
        setEvents(relevantEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => console.error("Error fetching school calendar:", error)));
    
    // Submissions for all children
    const subQuery = db.collection('submissions').where('parentUids', 'array-contains', user.uid);
    unsubscribers.push(subQuery.onSnapshot(snapshot => {
        const fetchedSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setAllSubmissions(fetchedSubmissions);
    }, err => console.error("Error fetching submissions:", err)));

     // Published Flyers
     const flyerQueries = [
        db.collection('publishedFlyers').where('targetAudience', '==', 'all'),
        db.collection('publishedFlyers').where('targetRoles', 'array-contains', 'parent'),
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


    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, userProfile]);
  
  // Effect for child-specific data, runs when selectedChildId changes
  useEffect(() => {
    if (!selectedChildProfile || !selectedChildProfile.class || !user) {
        setAssignments([]);
        setTimetable(null);
        setAttendanceRecords([]);
        setChildsGroup(null);
        setLoadingTimetable(false);
        return;
    };
    
    const unsubscribers: (() => void)[] = [];

    // Assignments
    const assignQuery = db.collection('assignments').where('classId', '==', selectedChildProfile.class);
    unsubscribers.push(assignQuery.onSnapshot(snapshot => {
        const fetchedAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
        fetchedAssignments.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setAssignments(fetchedAssignments);
    }, err => console.error("Error fetching assignments for child:", err)));

    // Timetable
    setLoadingTimetable(true);
    unsubscribers.push(db.collection('timetables').doc(selectedChildProfile.class).onSnapshot(doc => {
        setTimetable(doc.exists ? doc.data() as Timetable : null);
        setLoadingTimetable(false);
    }, err => {
        console.error("Error fetching timetable for child:", err);
        setLoadingTimetable(false);
    }));

    // Attendance Records
    const attendanceQuery = db.collection('attendance')
        .where('parentUids', 'array-contains', user.uid)
        .limit(50);
    unsubscribers.push(attendanceQuery.onSnapshot(snap => {
        const allRecordsForParent = snap.docs.map(doc => doc.data() as AttendanceRecord);
        allRecordsForParent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recordsForSelectedChild = allRecordsForParent.filter(
            record => record.studentUids.includes(selectedChildProfile.uid)
        );
        setAttendanceRecords(recordsForSelectedChild);
    }, err => console.error("Error fetching attendance for child:", err)));

    // Group Project
    const groupQuery = db.collection('groups')
        .where('classId', '==', selectedChildProfile.class)
        .where('memberUids', 'array-contains', selectedChildProfile.uid)
        .limit(1);
    unsubscribers.push(groupQuery.onSnapshot(snap => {
        setChildsGroup(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as Group);
    }));


    return () => unsubscribers.forEach(unsub => unsub());

  }, [selectedChildProfile, user]);

    // Effect for AI Assistant context
    useEffect(() => {
        const baseInstruction = "You are Edu, an AI assistant for parents at UTOPIA INTERNATIONAL SCHOOL. Your role is to provide insights into the curriculum, offer learning support strategies, and clarify school policies. Maintain a professional, supportive, and informative tone. Do not disclose specific student performance data, but you can talk about trends and general progress. You can summarize the content on the parent's current page if asked. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";

        let context = '';
        let prompts: string[] = ["Kofi, kyerɛ me Twi ase."];
        if (selectedChildProfile) {
            switch (activeTab) {
                case 'overview':
                    const pendingCount = assignments.filter(a => !submissions[a.id]).length;
                    context = `The parent is on the main 'Overview' page for their child, ${selectedChildProfile.name}, who is in ${selectedChildProfile.class}. Their child has ${pendingCount} pending assignments.`;
                    prompts.push(`What are some good study habits for a ${selectedChildProfile.class} student?`);
                    break;
                case 'notifications':
                    context = `The parent is viewing the 'Notifications' page.`;
                    prompts.push("What are the most recent school-wide announcements?");
                    break;
                case 'timetable':
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    context = `The parent is viewing the 'Timetable' page for their child, ${selectedChildProfile.name} (${selectedChildProfile.class}). Today is ${today}.`;
                    prompts.push(`What homework might be expected for today's classes?`);
                    break;
                case 'progress':
                    const gradedCount = Object.values(submissions).filter(s => (s as Submission).status === 'Graded').length;
                    context = `The parent is on the 'Progress' dashboard for their child, ${selectedChildProfile.name}. They are viewing academic performance trends. Their child has ${gradedCount} graded assignments so far.`;
                    prompts.push("Explain my child's grade trend.");
                    prompts.push("How can I help my child improve in their lowest-scoring subjects?");
                    break;
                case 'attendance':
                    context = `The parent is viewing the attendance log for their child, ${selectedChildProfile.name}.`;
                    prompts.push("What is the school's policy on absences?");
                    break;
            }
        } else {
            context = "The parent's account is not yet linked to a student. They are viewing a limited dashboard.";
        }

        setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
        setAiSuggestedPrompts(prompts);

    }, [activeTab, selectedChildProfile, assignments, submissions, notifications]);

     // Fetch unread messages count
    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection('conversations')
            .where('participantUids', 'array-contains', user.uid)
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.forEach(doc => {
                    const conv = doc.data() as Conversation;
                    count += conv.unreadCount?.[user.uid] || 0;
                });
                setUnreadMessages(count);
            });
        return () => unsubscribe();
    }, [user]);

     // Fetch relevant teachers for all children
    useEffect(() => {
        if (childrenProfiles.length === 0) {
            setRelevantTeachers([]);
            return;
        };

        const childClassIds = Array.from(new Set(childrenProfiles.map(c => c.class).filter(Boolean))) as string[];
        if (childClassIds.length === 0) {
            setRelevantTeachers([]);
            return;
        };

        const unsubscribe = db.collection('users')
            .where('role', '==', 'teacher')
            .where('status', '==', 'approved')
            .onSnapshot(snapshot => {
                const allTeachers = snapshot.docs.map(doc => doc.data() as UserProfile);
                // Filter teachers who teach any of the child's classes
                const relevant = allTeachers.filter(t => 
                    t.classesTaught?.some(c => childClassIds.includes(c)) || 
                    (t.classTeacherOf && childClassIds.includes(t.classTeacherOf))
                );
                setRelevantTeachers(relevant);
            });
            
        return () => unsubscribe();
    }, [childrenProfiles]);

  const dashboardData = useMemo(() => {
      const gradedSubs = (Object.values(submissions) as Submission[]).filter(s => s.status === 'Graded' && s.grade);
      const numericGrades = gradedSubs.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
      const averageGrade = numericGrades.length > 0 ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) : null;
      
      const pendingCount = assignments.filter(a => !submissions[a.id]).length;
      
      // Attendance Stats
      const totalAttendance = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(r => r.records[selectedChildId!] === 'Present').length;
      const attendancePercentage = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 100;

      return { averageGrade, pendingCount, attendancePercentage };
  }, [submissions, assignments, attendanceRecords, selectedChildId]);

  if (!user || !userProfile) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

  const navItems = [
      { key: 'overview', label: 'Overview', icon: '🏠' },
      { key: 'timetable', label: 'Timetable', icon: '📅' },
      { key: 'progress', label: 'Progress Report', icon: '📈' },
      { key: 'attendance', label: 'Attendance Log', icon: '📋' },
      { key: 'notifications', label: 'Notifications', icon: '🔔' },
      { key: 'messages', label: <span className="flex justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: '💬' },
  ];

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
      
      if (childrenProfiles.length === 0) {
          return <div className="p-8 text-center text-gray-400">No student profiles linked to your account. Please contact the administrator.</div>;
      }

      switch (activeTab) {
          case 'overview':
              return (
                  <div className="space-y-8 animate-fade-in-up pb-10">
                      {/* Header with Child Selector */}
                      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                          <div>
                              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-1">
                                  <span>{getGreeting()}</span>
                                  <span>•</span>
                                  <span>Term {firebase.firestore.Timestamp.now().toDate().getFullYear()}</span>
                              </div>
                              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                  Parent Dashboard
                              </h1>
                              <p className="text-slate-400 mt-2 text-lg italic max-w-2xl">"{quote}"</p>
                          </div>
                          
                          {childrenProfiles.length > 1 && (
                              <div className="bg-slate-800 p-1 rounded-lg flex items-center gap-2">
                                  {childrenProfiles.map(child => (
                                      <button
                                          key={child.uid}
                                          onClick={() => setSelectedChildId(child.uid)}
                                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selectedChildId === child.uid ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                      >
                                          {child.name.split(' ')[0]}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card className="flex flex-col items-center justify-center py-8">
                              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl mb-3">
                                  📊
                              </div>
                              <p className="text-4xl font-bold text-white">{dashboardData.averageGrade ? `${dashboardData.averageGrade.toFixed(0)}%` : '-'}</p>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Average Grade</p>
                          </Card>
                          
                          <Card className="flex flex-col items-center justify-center py-8">
                              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-2xl mb-3">
                                  📝
                              </div>
                              <p className="text-4xl font-bold text-yellow-400">{dashboardData.pendingCount}</p>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Assignments Due</p>
                          </Card>

                          <Card className="flex flex-col items-center justify-center py-8">
                              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-2xl mb-3">
                                  📅
                              </div>
                              <p className="text-4xl font-bold text-green-400">{dashboardData.attendancePercentage.toFixed(0)}%</p>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Attendance</p>
                          </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Recent Activity Feed */}
                          <div className="lg:col-span-2">
                              <Card className="h-full">
                                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                      <span className="text-blue-400">⚡</span> Recent Activity for {selectedChildProfile?.name.split(' ')[0]}
                                  </h3>
                                  <div className="space-y-4">
                                      {(Object.values(submissions) as Submission[])
                                          .sort((a, b) => b.submittedAt.toMillis() - a.submittedAt.toMillis())
                                          .slice(0, 5)
                                          .map(sub => {
                                              const assignment = assignments.find(a => a.id === sub.assignmentId);
                                              return (
                                                  <div key={sub.id} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${sub.status === 'Graded' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                          {sub.status === 'Graded' ? '✓' : '⇪'}
                                                      </div>
                                                      <div className="flex-grow">
                                                          <p className="font-bold text-white">{assignment?.title || 'Assignment'}</p>
                                                          <p className="text-xs text-slate-400 mt-1">{new Date(sub.submittedAt.toDate()).toLocaleDateString()} • {assignment?.subject}</p>
                                                          {sub.grade && (
                                                              <div className="mt-2 text-sm">
                                                                  <span className="text-slate-300">Grade: </span>
                                                                  <span className="font-bold text-green-400">{sub.grade}</span>
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      {Object.keys(submissions).length === 0 && <p className="text-slate-500 text-center py-8">No recent activity recorded.</p>}
                                  </div>
                              </Card>
                          </div>

                          {/* Notices / School Board */}
                          <div className="lg:col-span-1">
                              <Card className="h-full bg-gradient-to-b from-slate-800 to-slate-900 border-none">
                                  <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                                      <span className="text-purple-400">📢</span> School Board
                                  </h3>
                                  <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                      {publishedFlyers.map(flyer => (
                                          <div key={flyer.id} onClick={() => setSelectedFlyer(flyer)} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer group">
                                              <p className="text-xs text-slate-400 mb-1">{flyer.createdAt?.toDate().toLocaleDateString()}</p>
                                              <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">{flyer.title}</h4>
                                              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{flyer.content}</p>
                                          </div>
                                      ))}
                                      {publishedFlyers.length === 0 && <p className="text-slate-500 text-center">No notices posted.</p>}
                                  </div>
                              </Card>
                          </div>
                      </div>
                  </div>
              );
          case 'notifications':
              return (
                  <div className="space-y-4">
                      <h2 className="text-3xl font-bold mb-6">Notifications</h2>
                      {notifications.map(notif => (
                          <Card key={notif.id} className="border-l-4 border-blue-500">
                              <p className="text-gray-300">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-2">{notif.createdAt?.toDate().toLocaleString()}</p>
                          </Card>
                      ))}
                      {notifications.length === 0 && <p className="text-gray-500 text-center py-10">No notifications yet.</p>}
                  </div>
              );
          case 'timetable':
              return (
                  <div className="space-y-6">
                      <h2 className="text-3xl font-bold">Class Timetable - {selectedChildProfile?.class}</h2>
                      {loadingTimetable ? <div className="flex justify-center p-10"><Spinner /></div> : 
                          timetable ? <NotebookTimetable classId={selectedChildProfile?.class || ''} timetableData={timetable.timetableData} /> : <p className="text-center text-gray-500 py-10">No timetable available for this class.</p>
                      }
                  </div>
              );
          case 'progress':
              return selectedChildProfile ? <StudentProfile userProfile={selectedChildProfile} assignments={assignments} submissions={Object.values(submissions)} /> : null;
          case 'attendance':
              return (
                  <div className="space-y-6">
                      <h2 className="text-3xl font-bold">Attendance History</h2>
                      <Card>
                          <div className="space-y-2">
                              {attendanceRecords.map(rec => (
                                  <div key={rec.id} className="flex justify-between p-4 bg-slate-800/50 rounded-lg border-l-4 border-slate-700 hover:bg-slate-800 transition-colors">
                                      <span className="font-mono text-slate-300">{new Date(rec.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                                      <span className={`font-bold px-3 py-1 rounded text-xs uppercase tracking-wider ${rec.records[selectedChildId!] === 'Present' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{rec.records[selectedChildId!]}</span>
                                  </div>
                              ))}
                              {attendanceRecords.length === 0 && <p className="text-gray-500 italic text-center py-8">No attendance records found.</p>}
                          </div>
                      </Card>
                  </div>
              );
          case 'messages':
              return <MessagingView userProfile={userProfile} contacts={relevantTeachers} />;
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
        title="Parent Portal"
      />
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative custom-scrollbar">
        {renderContent()}
      </main>
      <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
      
      {selectedFlyer && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center p-4 z-50" onClick={() => setSelectedFlyer(null)}>
              <div className="max-w-2xl w-full max-h-[90vh] overflow-auto relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
                        <h2 className="text-2xl font-bold text-white">{selectedFlyer.title}</h2>
                        <button onClick={() => setSelectedFlyer(null)} className="bg-slate-700/50 text-slate-300 p-2 rounded-full hover:bg-slate-600 hover:text-white transition-colors">&times;</button>
                  </div>
                  <div className="p-8 overflow-y-auto bg-slate-900 custom-scrollbar">
                      <p className="text-lg text-slate-200 whitespace-pre-wrap leading-loose">{selectedFlyer.content}</p>
                  </div>
                  <div className="p-4 bg-slate-800 border-t border-slate-700 text-xs text-slate-500 font-mono text-right">
                      POSTED BY: {selectedFlyer.publisherName.toUpperCase()} // {selectedFlyer.createdAt?.toDate().toLocaleDateString()}
                  </div>
              </div>
          </div>
      )}
      
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};
