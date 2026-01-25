
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, LiveLesson, Timetable, PublishedFlyer, ElectionConfig } from '../types';
// FIX: Added missing imports for Card and Button
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import MessagingView from './MessagingView';
import StudentLiveClassroom from './StudentLiveClassroom';
import { StudentStudyMode } from './StudentStudyMode';
import ScienceLab from './ScienceLab/ScienceLab';
import StudentProfile from './StudentProfile';
import StudentAssignments from './StudentAssignments';
import StudentMaterials from './StudentMaterials';
import StudentReports from './StudentReports';
import StudentAttendanceLog from './StudentAttendanceLog';
import StudentElectionPortal from './elections/StudentElectionPortal';
import StudentGroupWork from './StudentGroupWork';
import PaymentPortal from './PaymentPortal';
import { 
  RocketIcon, 
  ClipboardIcon, 
  BallotIcon, 
  BroadcastIcon, 
  FlaskIcon, 
  BrainIcon, 
  LibraryIcon, 
  ChatIcon, 
  AnalyticsIcon, 
  WalletIcon, 
  ProfileIcon, 
  ScheduleIcon, 
  AttendanceIcon,
  UserMatrixIcon
} from './common/PremiumIcons';

export const StudentView: React.FC<{ isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void; }> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile, schoolSettings } = useAuthentication();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [liveLesson, setLiveLesson] = useState<LiveLesson | null>(null);
  const [timetable, setTimetable] = useState<Timetable | null>(null);

  useEffect(() => {
    if (!user || !userProfile || userProfile.status !== 'approved') {
        if (userProfile && userProfile.status === 'pending') setLoading(false);
        return;
    }
    
    const unsubscribers: (() => void)[] = [];
    
    if (userProfile.class) {
        unsubscribers.push(db.collection('assignments').where('classId', '==', userProfile.class).onSnapshot(
            snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)))
        ));
        
        unsubscribers.push(db.collection('liveLessons').where('classId', '==', userProfile.class).where('status', '==', 'active').onSnapshot(
            snap => setLiveLesson(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as LiveLesson)
        ));
        
        unsubscribers.push(db.collection('timetables').doc(userProfile.class).onSnapshot(
            doc => setTimetable(doc.exists ? doc.data() as Timetable : null)
        ));
    }
    
    unsubscribers.push(db.collection('submissions').where('studentId', '==', user.uid).onSnapshot(
        snap => setSubmissions(snap.docs.map(d => ({id: d.id, ...d.data()} as Submission)))
    ));

    setLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user?.uid, userProfile?.status, userProfile?.class]);

  const navItems = useMemo(() => {
    const rawItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <RocketIcon size={20} active={activeTab === 'dashboard'} /> },
        { key: 'assignments', label: 'Assignments', icon: <ClipboardIcon size={20} active={activeTab === 'assignments'} /> },
        { key: 'group_work', label: 'Groups', icon: <UserMatrixIcon size={20} active={activeTab === 'group_work'} /> },
        { key: 'live_lesson', label: <span className="flex items-center">Live Class {liveLesson && <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <BroadcastIcon size={20} active={activeTab === 'live_lesson'} /> },
        { key: 'science_lab', label: 'Virtual Lab', icon: <FlaskIcon size={20} active={activeTab === 'science_lab'} /> },
        { key: 'study_mode', label: 'Study Mode', icon: <BrainIcon size={20} active={activeTab === 'study_mode'} /> },
        { key: 'materials', label: 'Materials', icon: <LibraryIcon size={20} active={activeTab === 'materials'} /> },
        { key: 'elections', label: 'Elections', icon: <BallotIcon size={20} active={activeTab === 'elections'} /> },
        { key: 'messages', label: 'Messages', icon: <ChatIcon size={20} active={activeTab === 'messages'} /> },
        { key: 'reports', label: 'Reports', icon: <AnalyticsIcon size={20} active={activeTab === 'reports'} /> },
        { key: 'payments', label: 'Payments', icon: <WalletIcon size={20} active={activeTab === 'payments'} /> },
        { key: 'profile', label: 'Profile', icon: <ProfileIcon size={20} active={activeTab === 'profile'} /> },
        { key: 'timetable', label: 'Timetable', icon: <ScheduleIcon size={20} active={activeTab === 'timetable'} /> },
        { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon size={20} active={activeTab === 'attendance'} /> },
    ];
    const savedOrder = userProfile?.sidebarTabOrder?.student;
    if (!savedOrder) return rawItems;
    const itemMap = new Map(rawItems.map(item => [item.key, item]));
    return savedOrder.map(key => itemMap.get(key)).filter(Boolean) as any[];
  }, [liveLesson, userProfile?.sidebarTabOrder?.student, activeTab]);

  const handleReorder = async (newOrder: string[]) => {
    if (!userProfile) return;
    try { await db.collection('users').doc(userProfile.uid).set({ sidebarTabOrder: { ...(userProfile.sidebarTabOrder || {}), student: newOrder } }, { merge: true }); } 
    catch (err) { console.warn("Reorder fault:", err); }
  };

  const renderContent = () => {
      if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
      if (userProfile?.status === 'pending') return <div className="p-20 text-center animate-fade-in"><div className="text-6xl mb-6">⏳</div><h2 className="text-2xl font-bold text-white mb-2">Registry Access Pending</h2></div>;
      const firstName = (userProfile?.name || 'Learner').split(' ')[0];
      switch (activeTab) {
          case 'dashboard':
              return (
                  <div className="space-y-10 animate-fade-in-up">
                      <div><p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Standard Learner Terminal</p><h1 className="text-5xl font-black text-white leading-tight">Welcome, <span className="text-blue-500">{firstName}</span></h1></div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                           <Card className="lg:col-span-2 !bg-blue-600/5 border-blue-500/20 relative overflow-hidden group min-h-[250px] flex flex-col justify-between rounded-[3rem]">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-9xl group-hover:scale-110 transition-transform">📡</div>
                                <div>
                                    <span className="text-[10px] font-black bg-red-600 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2 w-fit shadow-lg shadow-red-900/40">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
                                        Live Classroom Feed
                                    </span>
                                    {liveLesson ? (
                                        <div className="mt-8"><h2 className="text-4xl font-black text-white uppercase tracking-tighter">{liveLesson.topic}</h2><p className="text-blue-400 font-black uppercase text-xs mt-2 tracking-widest">{liveLesson.subject} &bull; Transmitting</p></div>
                                    ) : <p className="text-slate-500 mt-8 font-bold italic text-sm">Awaiting instructor transmission signal...</p>}
                                </div>
                                <Button onClick={() => setActiveTab('live_lesson')} disabled={!liveLesson} className="w-full sm:w-fit py-4 px-12 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/30">Connect Link 🚀</Button>
                           </Card>
                           <div className="flex flex-col gap-6">
                               <Card className="flex flex-col justify-between p-8 cursor-pointer hover:bg-slate-800 rounded-[2.5rem]" onClick={() => setActiveTab('assignments')}>
                                    <div className="flex justify-between items-start">
                                        <div><p className="text-5xl font-black text-white">{assignments.length - submissions.length}</p><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Protocols Pending</p></div>
                                        <div className="bg-amber-500/10 text-amber-500 p-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Critical</div>
                                    </div>
                               </Card>
                               <Card className="flex flex-col justify-between p-8 rounded-[2.5rem]">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3"><p className="text-3xl font-black text-white">{userProfile?.xp || 0}</p><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">XP</p></div>
                                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.3em]">LVL {userProfile?.level || 1}</p>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, (userProfile?.xp || 0) % 100)}%` }}></div></div>
                               </Card>
                           </div>
                      </div>
                  </div>
              );
          case 'assignments': return <StudentAssignments userProfile={userProfile!} assignments={assignments} submissions={submissions} />;
          case 'group_work': return <StudentGroupWork userProfile={userProfile!} />;
          case 'materials': return <StudentMaterials userProfile={userProfile!} />;
          case 'reports': return <StudentReports userProfile={userProfile!} schoolSettings={schoolSettings} />;
          case 'attendance': return <StudentAttendanceLog userProfile={userProfile!} />;
          case 'payments': return <PaymentPortal />;
          case 'science_lab': return <ScienceLab userProfile={userProfile!} />;
          case 'study_mode': return <StudentStudyMode userProfile={userProfile!} onExit={() => setActiveTab('dashboard')} timetable={timetable} />;
          case 'live_lesson': return liveLesson ? <StudentLiveClassroom lessonId={liveLesson.id} userProfile={userProfile!} onClose={() => setActiveTab('dashboard')} /> : <div className="p-20 text-center text-slate-600 italic">TRANSMISSION OFFLINE</div>;
          case 'profile': return <StudentProfile userProfile={userProfile!} assignments={assignments} submissions={submissions} />;
          case 'messages': return <MessagingView userProfile={userProfile!} contacts={[]} />;
          case 'elections': return <StudentElectionPortal userProfile={userProfile!} />;
          case 'timetable': return timetable ? <NotebookTimetable classId={userProfile?.class || ''} timetableData={timetable.timetableData} /> : <div className="text-center p-20 text-slate-600 italic">TIMETABLE UNPUBLISHED</div>;
          default: return <div className="p-10 text-slate-600">SECTOR ONLINE.</div>;
      }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Student Hub" onReorder={handleReorder} />
      <main className={`flex-1 overflow-y-auto bg-slate-950 dark:bg-slate-950 ${['science_lab', 'study_mode', 'live_lesson', 'elections'].includes(activeTab) ? 'p-0' : 'p-10'}`}>{renderContent()}</main>
    </div>
  );
};
