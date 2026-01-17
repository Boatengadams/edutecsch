import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, LiveLesson, Timetable, PublishedFlyer, TerminalReport, AttendanceRecord, TeachingMaterial, VideoContent, ElectionConfig, ElectionStatus } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import Button from './common/Button';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import { useToast } from './common/Toast';
import MessagingView from './MessagingView';
import StudentLiveClassroom from './StudentLiveClassroom';
import { StudentStudyMode } from './StudentStudyMode';
import ScienceLab from './ScienceLab/ScienceLab';
import StudentProfile from './StudentProfile';
import StudentAssignments from './StudentAssignments';
import StudentMaterials from './StudentMaterials';
import StudentReports from './StudentReports';
import StudentAttendanceLog from './StudentAttendanceLog';
import FlyerCard from './common/FlyerCard';
import StudentElectionPortal from './elections/StudentElectionPortal';
import PaymentPortal from './PaymentPortal';
import AppTutorial from './common/AppTutorial';

export const StudentView: React.FC<{ isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void; }> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile, schoolSettings } = useAuthentication();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Data State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [liveLesson, setLiveLesson] = useState<LiveLesson | null>(null);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [flyers, setFlyers] = useState<PublishedFlyer[]>([]);
  const [electionConfig, setElectionConfig] = useState<ElectionConfig | null>(null);

  useEffect(() => {
    // SECURITY GUARD: Only proceed if user is approved. Pending users don't have access to these collections.
    if (!user || !userProfile || userProfile.status !== 'approved') {
        if (userProfile && userProfile.status === 'pending') setLoading(false);
        return;
    }
    
    const unsubscribers: (() => void)[] = [];
    
    const handleError = (name: string) => (err: any) => {
        if (err.code === 'permission-denied') {
            console.warn(`${name} access restricted by system security.`);
        } else {
            console.error(`${name} stream error:`, err);
        }
    };

    if (userProfile.class) {
        unsubscribers.push(db.collection('assignments').where('classId', '==', userProfile.class).onSnapshot(
            snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment))),
            handleError("Assignments")
        ));
        
        unsubscribers.push(db.collection('liveLessons').where('classId', '==', userProfile.class).where('status', '==', 'active').onSnapshot(
            snap => setLiveLesson(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as LiveLesson),
            handleError("LiveLessons")
        ));
        
        unsubscribers.push(db.collection('timetables').doc(userProfile.class).onSnapshot(
            doc => setTimetable(doc.exists ? doc.data() as Timetable : null),
            handleError("Timetable")
        ));
    }
    
    unsubscribers.push(db.collection('submissions').where('studentId', '==', user.uid).onSnapshot(
        snap => setSubmissions(snap.docs.map(d => ({id: d.id, ...d.data()} as Submission))),
        handleError("Submissions")
    ));
    
    unsubscribers.push(db.collection('publishedFlyers').orderBy('createdAt', 'desc').limit(5).onSnapshot(
        snap => setFlyers(snap.docs.map(d => ({id: d.id, ...d.data()} as PublishedFlyer))),
        handleError("Flyers")
    ));
    
    unsubscribers.push(db.collection('electionConfig').doc('active').onSnapshot(doc => {
        if (doc.exists) {
            setElectionConfig({ id: doc.id, ...doc.data() } as ElectionConfig);
        }
    }, handleError("ElectionConfig")));

    setLoading(false);

    // Auto-show tutorial for first-time students
    const onboarded = localStorage.getItem('edutec_onboarding_student');
    if (!onboarded) {
        const timer = setTimeout(() => setShowTutorial(true), 2000);
        return () => clearTimeout(timer);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user?.uid, userProfile?.status, userProfile?.class]);

  const navItems = useMemo(() => {
    const rawItems = [
        { key: 'dashboard', label: 'Dashboard', icon: '🚀' },
        { key: 'assignments', label: 'Assignments', icon: '📝' },
        { key: 'elections', label: 'Election Portal', icon: '🗳️' },
        { key: 'live_lesson', label: <span className="flex items-center">Live Class {liveLesson && <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: '📡' },
        { key: 'science_lab', label: 'Virtual Lab', icon: '🧪' },
        { key: 'study_mode', label: 'Study Mode', icon: '🧠' },
        { key: 'materials', label: 'Study Materials', icon: '📚' },
        { key: 'messages', label: 'Messages', icon: '💬' },
        { key: 'reports', label: 'Reports', icon: '📊' },
        { key: 'payments', label: 'Payments', icon: '💳' },
        { key: 'profile', label: 'Profile', icon: '👤' },
        { key: 'timetable', label: 'Timetable', icon: '🗓️' },
        { key: 'attendance', label: 'Attendance', icon: '📅' },
    ];

    const savedOrder = userProfile?.sidebarTabOrder?.student;
    if (!savedOrder) return rawItems;

    const itemMap = new Map(rawItems.map(item => [item.key, item]));
    const orderedItems = savedOrder
        .map(key => itemMap.get(key))
        .filter((item): item is typeof rawItems[0] => !!item);

    const currentKeys = new Set(orderedItems.map(item => item.key));
    const missingItems = rawItems.filter(item => !currentKeys.has(item.key));

    return [...orderedItems, ...missingItems];
  }, [liveLesson, userProfile?.sidebarTabOrder?.student]);

  const handleReorder = async (newOrder: string[]) => {
    if (!userProfile) return;
    try {
        await db.collection('users').doc(userProfile.uid).set({
            sidebarTabOrder: {
                ...(userProfile.sidebarTabOrder || {}),
                student: newOrder
            }
        }, { merge: true });
    } catch (err) {
        console.warn("Failed to save sidebar order:", err);
    }
  };

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
      if (userProfile?.status === 'pending') return (
        <div className="p-20 text-center animate-fade-in">
            <div className="text-6xl mb-6">⏳</div>
            <h2 className="text-2xl font-bold text-white mb-2">Account Pending Approval</h2>
            <p className="text-slate-400 max-w-md mx-auto italic">Your profile has been created and is currently in the administrator review queue.</p>
        </div>
      );

      const firstName = (userProfile?.name || 'Learner').split(' ')[0];

      switch (activeTab) {
          case 'dashboard':
              return (
                  <div className="space-y-8 animate-fade-in-up">
                      <div className="flex justify-between items-end">
                          <div>
                              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-1">Term 1 • {schoolSettings?.academicYear}</p>
                              <h1 className="text-5xl font-black text-white leading-tight">Good Morning, <span className="text-blue-500">{firstName}</span></h1>
                              <p className="text-slate-500 italic mt-2">"Vision without execution is just hallucination."</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <Card className="lg:col-span-2 !bg-blue-600/5 border-blue-500/20 relative overflow-hidden group min-h-[220px] flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl group-hover:scale-110 transition-transform">📡</div>
                                <div>
                                    <span className="text-[10px] font-black bg-red-600 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                        Live Now
                                    </span>
                                    {liveLesson ? (
                                        <div className="mt-4">
                                            <h2 className="text-3xl font-black text-white">{liveLesson.topic}</h2>
                                            <p className="text-blue-400 font-bold uppercase text-xs mt-1">{liveLesson.subject}</p>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 mt-4 italic">No active classroom signal detected. Stand by.</p>
                                    )}
                                </div>
                                <Button onClick={() => setActiveTab('live_lesson')} disabled={!liveLesson} className="w-full sm:w-fit py-3 px-10 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Join Class 🚀</Button>
                           </Card>

                           <div className="flex flex-col gap-4">
                               <Card className="flex flex-col justify-between py-6 cursor-pointer hover:bg-slate-800" onClick={() => setActiveTab('assignments')}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-4xl font-black text-white">{assignments.length - submissions.length}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Pending Tasks</p>
                                        </div>
                                        <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg text-xs font-black uppercase">Due Soon</div>
                                    </div>
                               </Card>
                               <Card className="flex flex-col justify-between py-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-3xl font-black text-white">{userProfile?.xp || 0}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">XP</p>
                                        </div>
                                        <p className="text-[10px] text-blue-400 font-black">LVL {userProfile?.level || 1}</p>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (userProfile?.xp || 0) % 100)}%` }}></div>
                                    </div>
                               </Card>
                           </div>
                      </div>
                  </div>
              );
          case 'assignments': return <StudentAssignments userProfile={userProfile!} assignments={assignments} submissions={submissions} />;
          case 'elections': return <StudentElectionPortal userProfile={userProfile!} />;
          case 'materials': return <StudentMaterials userProfile={userProfile!} />;
          case 'reports': return <StudentReports userProfile={userProfile!} schoolSettings={schoolSettings} />;
          case 'attendance': return <StudentAttendanceLog userProfile={userProfile!} />;
          case 'payments': return <PaymentPortal />;
          case 'science_lab': return <ScienceLab userProfile={userProfile!} />;
          case 'study_mode': return <StudentStudyMode userProfile={userProfile!} onExit={() => setActiveTab('dashboard')} timetable={timetable} />;
          case 'live_lesson': return liveLesson ? <StudentLiveClassroom lessonId={liveLesson.id} userProfile={userProfile!} onClose={() => setActiveTab('dashboard')} /> : <div className="flex flex-col items-center justify-center h-full p-20 text-slate-500 italic"><span className="text-5xl mb-4 opacity-20">📡</span>No active transmissions.</div>;
          case 'profile': return <StudentProfile userProfile={userProfile!} assignments={assignments} submissions={submissions} />;
          case 'messages': return <MessagingView userProfile={userProfile!} contacts={[]} />;
          case 'timetable': return timetable ? <NotebookTimetable classId={userProfile?.class || ''} timetableData={timetable.timetableData} /> : <div className="text-center p-20 text-slate-500">No timetable published for your class.</div>;
          default: return <div className="p-10 text-slate-600">Module online. Select from navigation.</div>;
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
        title="Student Portal"
        onReorder={handleReorder}
      />
      <main className={`flex-1 overflow-y-auto bg-slate-950 ${['science_lab', 'study_mode', 'live_lesson', 'elections'].includes(activeTab) ? 'p-0' : 'p-6'}`}>
        {renderContent()}
      </main>

      {/* Tutorial Trigger */}
      <button 
        onClick={() => setShowTutorial(true)}
        className="fixed bottom-6 right-6 z-[80] w-12 h-12 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-blue-600 transition-all group"
        title="Help & Tutorial"
      >
        <span className="text-xl group-hover:scale-110 transition-transform">💡</span>
      </button>

      {showTutorial && (
        <AppTutorial 
            role="student" 
            onClose={() => setShowTutorial(false)} 
            isTriggeredManually={true} 
        />
      )}
    </div>
  );
};