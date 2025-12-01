
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
// FIX: Import firebase for compat services like firestore.FieldValue
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, Notification, SchoolEvent, SchoolEventType, Timetable, AttendanceRecord, Group, Conversation, PublishedFlyer } from '../types';
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
import HeatMap from './common/charts/HeatMap';

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

type FeedItem = 
    | { type: 'assignment', data: Assignment, date: Date }
    | { type: 'submission', data: Submission, date: Date }
    | { type: 'attendance', data: AttendanceRecord, date: Date }
    | { type: 'flyer', data: PublishedFlyer, date: Date };

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
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
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

  
  // Effect for parent-specific data (notifications, submissions, flyers)
  useEffect(() => {
    if (!user || !userProfile) return;

    const unsubscribers: (() => void)[] = [];

    // Notifications
    const notifQuery = db.collection('notifications').where('userId', '==', user.uid);
    unsubscribers.push(notifQuery.onSnapshot(snapshot => {
        const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        setNotifications(fetchedNotifications.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, err => console.error("Error fetching notifications:", err)));
    
    // Submissions for all children (filtered by parentUids for security, though rules handle this)
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
    const unsubFlyers = flyerQueries.map(q => q.limit(20).onSnapshot(snap => {
        const flyers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublishedFlyer));
        setPublishedFlyers(prev => {
            const all = [...prev, ...flyers];
            const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
            return unique.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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
        .where('studentUids', 'array-contains', selectedChildProfile.uid)
        .orderBy('date', 'desc')
        .limit(60); // Get last 2 months roughly
        
    unsubscribers.push(attendanceQuery.onSnapshot(snap => {
        const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        setAttendanceRecords(records);
    }, err => console.error("Error fetching attendance for child:", err)));

    // Fetch teachers for messaging
    const teacherQuery = db.collection('users')
        .where('role', '==', 'teacher')
        .where('classesTaught', 'array-contains', selectedChildProfile.class);
    unsubscribers.push(teacherQuery.onSnapshot(snap => {
        setRelevantTeachers(snap.docs.map(d => ({...d.data(), uid: d.id} as UserProfile)));
    }));

    return () => unsubscribers.forEach(unsub => unsub());

  }, [selectedChildProfile, user]);

    // Effect for AI Assistant context
    useEffect(() => {
        const baseInstruction = "You are Edu, an AI assistant for parents at UTOPIA INTERNATIONAL SCHOOL. Your role is to provide insights into the curriculum, offer learning support strategies, and clarify school policies. Maintain a professional, supportive, and informative tone. You can access the parent's current view data.";

        let context = '';
        let prompts: string[] = ["Kofi, kyerɛ me Twi ase."];
        
        if (selectedChildProfile) {
            const childName = selectedChildProfile.name.split(' ')[0];
            const gradedCount = (Object.values(submissions) as Submission[]).filter(s => s.status === 'Graded').length;
            const pendingCount = assignments.filter(a => !submissions[a.id]).length;
            
            // Calculate average
            const numericGrades = (Object.values(submissions) as Submission[])
                .filter(s => s.status === 'Graded' && s.grade)
                .map(s => gradeToNumeric(s.grade))
                .filter((g): g is number => g !== null);
            const avg = numericGrades.length > 0 ? (numericGrades.reduce((a,b)=>a+b,0)/numericGrades.length).toFixed(1) : "N/A";

            context = `Currently viewing child: ${selectedChildProfile.name} (${selectedChildProfile.class}).
            Academic Status: ${gradedCount} assignments graded with an average of ${avg}%. ${pendingCount} assignments are pending.
            Attendance: ${attendanceRecords.filter(r => r.records[selectedChildId!] === 'Present').length} days present out of ${attendanceRecords.length} recorded days.`;

            switch (activeTab) {
                case 'overview':
                    prompts.push(`How is ${childName} performing overall?`);
                    prompts.push(`Any upcoming assignments for ${childName}?`);
                    break;
                case 'timetable':
                    context += ` The parent is looking at the timetable for ${selectedChildProfile.class}.`;
                    prompts.push(`Help me create a home study schedule based on this timetable.`);
                    break;
                case 'progress':
                    context += ` The parent is viewing the detailed academic progress report.`;
                    prompts.push(`Explain ${childName}'s strongest subject.`);
                    prompts.push(`How can I help ${childName} improve?`);
                    break;
                case 'attendance':
                    context += ` The parent is viewing the attendance history.`;
                    prompts.push(`Is ${childName}'s attendance satisfactory?`);
                    break;
            }
        } else {
            context = "The parent has not selected a child yet.";
        }

        setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CHILD CONTEXT:\n${context}`);
        setAiSuggestedPrompts(prompts);

    }, [activeTab, selectedChildProfile, assignments, submissions, notifications, attendanceRecords]);

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


  const dashboardData = useMemo(() => {
      const gradedSubs = (Object.values(submissions) as Submission[]).filter(s => s.status === 'Graded' && s.grade);
      const numericGrades = gradedSubs.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
      const averageGrade = numericGrades.length > 0 ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) : null;
      
      const pendingCount = assignments.filter(a => !submissions[a.id]).length;
      
      // Attendance Stats
      const totalAttendance = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(r => selectedChildId && r.records[selectedChildId] === 'Present').length;
      const attendancePercentage = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 100;

      // Activity Feed Generation
      const feed: FeedItem[] = [];
      
      // 1. New Assignments
      assignments.forEach(a => {
          if (new Date().getTime() - a.createdAt.toMillis() < 7 * 24 * 60 * 60 * 1000) { // Last 7 days
              feed.push({ type: 'assignment', data: a, date: a.createdAt.toDate() });
          }
      });
      
      // 2. Graded Submissions
      (Object.values(submissions) as Submission[]).forEach(s => {
          if (s.status === 'Graded') {
              feed.push({ type: 'submission', data: s, date: s.submittedAt.toDate() }); // Using submittedAt as proxy, ideally gradedAt
          }
      });
      
      // 3. Attendance Alerts (Absent/Late)
      attendanceRecords.forEach(r => {
          const status = selectedChildId ? r.records[selectedChildId] : null;
          if (status === 'Absent' || status === 'Late') {
              feed.push({ type: 'attendance', data: r, date: new Date(r.date) });
          }
      });
      
      // 4. Flyers
      publishedFlyers.forEach(f => {
           feed.push({ type: 'flyer', data: f, date: f.createdAt.toDate() });
      });

      return { 
          averageGrade, 
          pendingCount, 
          attendancePercentage,
          feed: feed.sort((a, b) => b.date.getTime() - a.date.getTime())
      };
  }, [submissions, assignments, attendanceRecords, selectedChildId, publishedFlyers]);

  if (!user || !userProfile) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

  const navItems = [
      { key: 'overview', label: 'Dashboard', icon: '🏠' },
      { key: 'progress', label: 'Academics', icon: '📈' },
      { key: 'attendance', label: 'Attendance', icon: '📅' },
      { key: 'timetable', label: 'Timetable', icon: '🗓️' },
      { key: 'notifications', label: 'My Notifications', icon: '🔔' },
      { key: 'messages', label: <span className="flex justify-between w-full">Contact Teachers {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: '💬' },
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
                      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                          <div>
                              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-1">
                                  <span>{getGreeting()}</span>
                                  <span>•</span>
                                  <span>Term {firebase.firestore.Timestamp.now().toDate().getFullYear()}</span>
                              </div>
                              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                  Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{userProfile.name}</span>
                              </h1>
                              <p className="text-slate-400 mt-2 text-sm italic max-w-xl">"{quote}"</p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Viewing Profile:</span>
                              <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                                  {childrenProfiles.map(child => (
                                      <button
                                          key={child.uid}
                                          onClick={() => setSelectedChildId(child.uid)}
                                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedChildId === child.uid ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                      >
                                          {child.name.split(' ')[0]}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card className="flex flex-col items-center justify-center py-8 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">📊</div>
                              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl mb-3 text-blue-400 border border-blue-500/20">
                                  GPA
                              </div>
                              <p className="text-4xl font-black text-white">{dashboardData.averageGrade ? `${dashboardData.averageGrade.toFixed(0)}%` : '-'}</p>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">{selectedChildProfile?.name.split(' ')[0]}'s Average</p>
                          </Card>
                          
                          <Card className="flex flex-col items-center justify-center py-8 relative overflow-hidden group hover:border-green-500/50 transition-colors">
                              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">📅</div>
                              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-2xl mb-3 text-green-400 border border-green-500/20">
                                  {dashboardData.attendancePercentage.toFixed(0)}%
                              </div>
                              <p className="text-lg font-bold text-white mt-1">Attendance Rate</p>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Days Present</p>
                          </Card>

                          <Card className="flex flex-col items-center justify-center py-8 relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
                              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">📝</div>
                              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-2xl mb-3 text-yellow-400 border border-yellow-500/20">
                                  {dashboardData.pendingCount}
                              </div>
                              <p className="text-lg font-bold text-white mt-1">Action Required</p>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Assignments Due</p>
                          </Card>
                      </div>

                      {/* Main Activity Feed */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                              <Card className="h-full">
                                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                      <span className="text-blue-400">⚡</span> Activity Feed for {selectedChildProfile?.name.split(' ')[0]}
                                  </h3>
                                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                                      {dashboardData.feed.slice(0, 10).map((item, idx) => (
                                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                              {/* Icon */}
                                              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xl">
                                                  {item.type === 'assignment' && '📚'}
                                                  {item.type === 'submission' && '✅'}
                                                  {item.type === 'attendance' && '⚠️'}
                                                  {item.type === 'flyer' && '📢'}
                                              </div>
                                              
                                              {/* Content Card */}
                                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors shadow-sm">
                                                  <div className="flex items-center justify-between space-x-2 mb-1">
                                                      <span className="font-bold text-slate-200">
                                                          {item.type === 'assignment' && 'New Assignment'}
                                                          {item.type === 'submission' && 'Work Graded'}
                                                          {item.type === 'attendance' && 'Attendance Alert'}
                                                          {item.type === 'flyer' && 'School Notice'}
                                                      </span>
                                                      <time className="font-mono text-xs text-slate-500">{item.date.toLocaleDateString()}</time>
                                                  </div>
                                                  
                                                  {item.type === 'assignment' && (
                                                      <div>
                                                          <p className="text-sm text-blue-300 font-medium">{item.data.title}</p>
                                                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.data.description}</p>
                                                          <div className="mt-2 text-[10px] bg-blue-900/30 text-blue-300 px-2 py-1 rounded w-fit">Due: {item.data.dueDate || 'No Date'}</div>
                                                      </div>
                                                  )}
                                                  
                                                  {item.type === 'submission' && (
                                                      <div>
                                                          <p className="text-sm text-green-300 font-medium">Graded: {item.data.grade || 'Completed'}</p>
                                                          {item.data.feedback && <p className="text-xs text-slate-400 italic mt-1">"{item.data.feedback}"</p>}
                                                      </div>
                                                  )}
                                                  
                                                  {item.type === 'attendance' && (
                                                      <div>
                                                          <p className="text-sm text-red-300 font-medium">Marked {selectedChildId ? item.data.records[selectedChildId] : 'Unknown'}</p>
                                                          <p className="text-xs text-slate-400 mt-1">Please check with the school if this is an error.</p>
                                                      </div>
                                                  )}
                                                  
                                                  {item.type === 'flyer' && (
                                                      <div onClick={() => setSelectedFlyer(item.data)} className="cursor-pointer">
                                                          <p className="text-sm text-purple-300 font-medium hover:underline">{item.data.title}</p>
                                                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.data.content}</p>
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                      {dashboardData.feed.length === 0 && <p className="text-slate-500 text-center py-8">No recent activity to report.</p>}
                                  </div>
                              </Card>
                          </div>

                          {/* Notices / School Board (Sticky) */}
                          <div className="lg:col-span-1">
                              <Card className="h-full bg-gradient-to-b from-slate-800 to-slate-900 border-none sticky top-4">
                                  <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                                      <span className="text-purple-400">📢</span> School Board
                                  </h3>
                                  <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                      {publishedFlyers.slice(0, 5).map(flyer => (
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
                      <h2 className="text-3xl font-bold mb-6">My Notifications</h2>
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
                      <h2 className="text-3xl font-bold">{selectedChildProfile?.name.split(' ')[0]}'s Timetable</h2>
                      <p className="text-sm text-gray-400 mb-4">Class: {selectedChildProfile?.class}</p>
                      {loadingTimetable ? <div className="flex justify-center p-10"><Spinner /></div> : 
                          timetable ? <NotebookTimetable classId={selectedChildProfile?.class || ''} timetableData={timetable.timetableData} /> : <p className="text-center text-gray-500 py-10">No timetable available for this class.</p>
                      }
                  </div>
              );
          case 'progress':
              return selectedChildProfile ? <StudentProfile userProfile={selectedChildProfile} assignments={assignments} submissions={Object.values(submissions)} viewer="parent" /> : null;
          case 'attendance':
              const presentDays = attendanceRecords.filter(r => selectedChildId && r.records[selectedChildId] === 'Present').length;
              const absentDays = attendanceRecords.filter(r => selectedChildId && r.records[selectedChildId] === 'Absent').length;
              const lateDays = attendanceRecords.filter(r => selectedChildId && r.records[selectedChildId] === 'Late').length;
              
              // Prepare data for HeatMap
              const heatMapData = attendanceRecords.map(r => ({
                  date: r.date,
                  value: (selectedChildId && r.records[selectedChildId] === 'Present') ? 100 : (selectedChildId && r.records[selectedChildId] === 'Late') ? 70 : 0
              }));

              return (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h2 className="text-3xl font-bold">{selectedChildProfile?.name.split(' ')[0]}'s Attendance</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card className="!bg-slate-800/80 text-center">
                              <p className="text-xs text-slate-400 uppercase font-bold">Present</p>
                              <p className="text-3xl font-black text-green-400">{presentDays}</p>
                          </Card>
                          <Card className="!bg-slate-800/80 text-center">
                              <p className="text-xs text-slate-400 uppercase font-bold">Absent</p>
                              <p className="text-3xl font-black text-red-400">{absentDays}</p>
                          </Card>
                          <Card className="!bg-slate-800/80 text-center">
                              <p className="text-xs text-slate-400 uppercase font-bold">Late</p>
                              <p className="text-3xl font-black text-yellow-400">{lateDays}</p>
                          </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="h-80">
                              <HeatMap data={heatMapData} title="Attendance Intensity (Last 60 Days)" />
                          </div>
                          
                          <Card>
                              <h3 className="font-bold text-slate-300 mb-4 uppercase text-xs">Detailed Log</h3>
                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                  {attendanceRecords.map(rec => (
                                      <div key={rec.id} className="flex justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-sm">
                                          <span className="font-mono text-slate-400">{new Date(rec.date).toLocaleDateString(undefined, {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</span>
                                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                              selectedChildId && rec.records[selectedChildId] === 'Present' ? 'bg-green-500/20 text-green-400' : 
                                              selectedChildId && rec.records[selectedChildId] === 'Late' ? 'bg-yellow-500/20 text-yellow-400' :
                                              'bg-red-500/20 text-red-400'
                                          }`}>
                                              {selectedChildId ? rec.records[selectedChildId] : 'N/A'}
                                          </span>
                                      </div>
                                  ))}
                                  {attendanceRecords.length === 0 && <p className="text-gray-500 italic text-center py-4">No attendance records found.</p>}
                              </div>
                          </Card>
                      </div>
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
