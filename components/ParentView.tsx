
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase } from '../services/firebase';
import { UserProfile, Assignment, Submission, AttendanceRecord, PublishedFlyer, TerminalReport } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import Button from './common/Button';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import MessagingView from './MessagingView';
import StudentProfile from './StudentProfile';
import HeatMap from './common/charts/HeatMap';
import StudentReportCard from './common/StudentReportCard';
import FlyerCard from './common/FlyerCard';
import PaymentPortal from './PaymentPortal';

const OMNI_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

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

export const ParentView: React.FC<{isSidebarExpanded: boolean; setIsSidebarExpanded: (v: boolean) => void;}> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile, schoolSettings } = useAuthentication();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [childrenProfiles, setChildrenProfiles] = useState<UserProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [terminalReports, setTerminalReports] = useState<TerminalReport[]>([]);
  const [flyers, setFlyers] = useState<PublishedFlyer[]>([]);
  const [viewingReport, setViewingReport] = useState<TerminalReport | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedChildProfile = useMemo(() => childrenProfiles.find(c => c.uid === selectedChildId), [childrenProfiles, selectedChildId]);
  const isOmni = OMNI_EMAILS.includes(user?.email || "");

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = isOmni 
        ? db.collection('users').where('role', '==', 'student').where('status', '==', 'approved')
        : db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', userProfile?.childUids || ['_dummy_']);
    
    const unsubscribe = q.onSnapshot(snap => {
        const profiles = snap.docs.map(doc => doc.data() as UserProfile);
        setChildrenProfiles(profiles);
        if (profiles.length > 0 && !selectedChildId) setSelectedChildId(profiles[0].uid);
        setLoading(false);
    }, err => {
        console.warn("Parent children listener error:", err.message);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [user, userProfile, isOmni]);

  useEffect(() => {
    if (!selectedChildId || !selectedChildProfile) return;
    const unsubscribers: (() => void)[] = [];
    unsubscribers.push(db.collection('assignments').where('classId', '==', selectedChildProfile.class).onSnapshot(snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()} as Assignment)))));
    unsubscribers.push(db.collection('submissions').where('studentId', '==', selectedChildId).onSnapshot(snap => setAllSubmissions(snap.docs.map(d => ({id: d.id, ...d.data()} as Submission)))));
    unsubscribers.push(db.collection('attendance').where('studentUids', 'array-contains', selectedChildId).limit(50).onSnapshot(snap => setAttendanceRecords(snap.docs.map(d => ({id: d.id, ...d.data()} as AttendanceRecord)))));
    unsubscribers.push(db.collection('terminalReports').where('classId', '==', selectedChildProfile.class).where('published', '==', true).onSnapshot(snap => setTerminalReports(snap.docs.map(d => ({id: d.id, ...d.data()} as TerminalReport)))));
    unsubscribers.push(db.collection('publishedFlyers').orderBy('createdAt', 'desc').limit(5).onSnapshot(snap => setFlyers(snap.docs.map(d => ({id: d.id, ...d.data()} as PublishedFlyer)))));
    return () => unsubscribers.forEach(u => u());
  }, [selectedChildId, selectedChildProfile]);

  const stats = useMemo(() => {
      const graded = allSubmissions.filter(s => s.status === 'Graded' && s.grade);
      const numeric = graded.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
      const avg = numeric.length > 0 ? (numeric.reduce((a, b) => a + b, 0) / numeric.length) : null;
      const attRate = attendanceRecords.length > 0 ? (attendanceRecords.filter(r => r.records[selectedChildId!] === 'Present').length / attendanceRecords.length) * 100 : 100;
      return { avg, attRate, pending: assignments.length - allSubmissions.length };
  }, [allSubmissions, assignments, attendanceRecords, selectedChildId]);

  const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { key: 'academics', label: 'Academics', icon: '📈' },
      { key: 'reports', label: 'Report Cards', icon: '📊' },
      { key: 'payments', label: 'School Fees', icon: '💳' },
      { key: 'attendance', label: 'Attendance', icon: '📅' },
      { key: 'timetable', label: 'Timetable', icon: '🗓️' },
      { key: 'notifications', label: 'My Notifications', icon: '🔔' },
      { key: 'messages', label: 'Contact Teachers', icon: '💬' },
  ];

  if (loading) return <div className="flex h-full items-center justify-center bg-slate-950"><Spinner /></div>;

  const renderContent = () => {
    switch(activeTab) {
        case 'dashboard':
            return (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Good Morning • {schoolSettings?.academicYear}</p>
                            <h2 className="text-4xl font-black text-white leading-tight">Welcome, <span className="text-blue-500">{userProfile?.name}</span></h2>
                        </div>
                        <select value={selectedChildId || ''} onChange={e => setSelectedChildId(e.target.value)} className="bg-blue-600 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg outline-none border-none">
                            {childrenProfiles.map(child => <option key={child.uid} value={child.uid}>{child.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="flex flex-col justify-between py-6 !bg-slate-900/40 border-slate-800">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <p className="text-3xl font-black text-white">{stats.avg ? `${stats.avg.toFixed(0)}%` : '--'}</p>
                                     <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{selectedChildProfile?.name?.split(' ')[0]}'s Average</p>
                                 </div>
                             </div>
                        </Card>
                        <Card className="flex flex-col justify-between py-6 !bg-slate-900/40 border-slate-800">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <p className="text-3xl font-black text-white">{stats.attRate.toFixed(0)}%</p>
                                     <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Attendance Rate</p>
                                 </div>
                             </div>
                        </Card>
                    </div>
                </div>
            );
        case 'academics': return selectedChildProfile ? <StudentProfile userProfile={selectedChildProfile} assignments={assignments} submissions={allSubmissions} viewer="parent" /> : null;
        case 'reports': return <div className="space-y-6">{terminalReports.map(r => <Card key={r.id} className="flex justify-between items-center bg-slate-900/40 border-slate-800"><h4 className="font-bold text-slate-200">Term {r.term} - {r.academicYear}</h4><Button size="sm" onClick={() => setViewingReport(r)}>View Card</Button></Card>)}</div>;
        case 'payments': return <PaymentPortal />;
        case 'attendance': return <div className="h-96"><HeatMap data={attendanceRecords.map(r => ({date: r.date, value: r.records[selectedChildId!] === 'Present' ? 100 : 0}))} title="Attendance Intensity" /></div>;
        case 'timetable': return selectedChildProfile ? <NotebookTimetable classId={selectedChildProfile.class || ''} timetableData={{}} /> : null;
        case 'messages': return <MessagingView userProfile={userProfile!} contacts={[]} />;
        default: return <div className="p-20 text-center text-slate-600 italic">This sector is online and operational.</div>;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-950 text-slate-200">
      <Sidebar isExpanded={isSidebarExpanded} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarExpanded(false)} title="Parent Hub" />
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">{renderContent()}</main>
      {viewingReport && selectedChildProfile && (
          <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
              <div className="max-w-5xl mx-auto py-10">
                <Button variant="secondary" onClick={() => setViewingReport(null)} className="mb-6">← Close Report</Button>
                <StudentReportCard student={selectedChildProfile} report={viewingReport} schoolSettings={schoolSettings} ranking={null} classSize={childrenProfiles.length} />
              </div>
          </div>
      )}
    </div>
  );
};
