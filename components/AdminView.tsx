
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, functions, storage, firebase, rtdb } from '../services/firebase';
import { 
    UserProfile, UserRole, SchoolEvent, SchoolEventType, SchoolEventAudience, EVENT_TYPES, EVENT_AUDIENCE, GES_CLASSES, TeachingMaterial, Timetable, TimetableData, TimetablePeriod, SubjectsByClass, GES_STANDARD_CURRICULUM, AttendanceRecord, AttendanceStatus, SchoolSettings, GES_SUBJECTS, Presentation, Notification, TerminalReport, ReportSummary, TerminalReportMark, ActivationToken, PublishedFlyer, UserActivityLog 
} from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useAuthentication } from '../hooks/useAuth';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import AIAssistant from './AIAssistant';
import ChangePasswordModal from './common/ChangePasswordModal';
import { useToast } from './common/Toast';
import UserEditModal from './UserEditModal';
import PieChart from './common/charts/PieChart';
import BarChart from './common/charts/BarChart';
import { useCreateUser } from '../hooks/useCreateUser';
import SnapToRegister from './SnapToRegister';
import { AdminApprovalQueue } from './AdminApprovalQueue';
import ConfirmationModal from './common/ConfirmationModal';
import { useRejectUser } from '../hooks/useRejectUser';
import AdminCreateUserForm from './AdminCreateUserForm';
import AdminCreateParentForm from './AdminCreateParentForm';
import AdminAttendanceDashboard from './AdminAttendanceDashboard';
import SystemActivation from './SystemActivation';
import MessagingView from './MessagingView';
import html2canvas from 'html2canvas';

interface ActiveUserStatus {
    uid: string;
    state: 'online' | 'offline';
    last_changed: number;
    name: string;
    role: string;
    class: string;
}

const ActiveUsersTable: React.FC = () => {
    const [users, setUsers] = useState<ActiveUserStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        const statusRef = rtdb.ref('/status');
        
        const onValueChange = (snapshot: firebase.database.DataSnapshot) => {
            setError(''); // Clear any previous errors on successful data
            const data = snapshot.val();
            if (data) {
                const activeUsersArray = Object.keys(data).map(key => ({
                    uid: key,
                    ...data[key]
                }));
                // Sort by online first, then by last changed
                activeUsersArray.sort((a, b) => {
                    if (a.state === b.state) {
                        return b.last_changed - a.last_changed;
                    }
                    return a.state === 'online' ? -1 : 1;
                });
                setUsers(activeUsersArray);
            } else {
                setUsers([]);
            }
            setLoading(false);
        };

        const onError = (err: Error) => {
            console.error("RTDB Error:", err);
            setError(`Connection Error: ${err.message}`);
            setLoading(false);
        };

        statusRef.on('value', onValueChange, onError);

        // Fallback timeout to prevent infinite spinner if DB is unreachable
        const timeoutId = setTimeout(() => {
            setLoading((isLoading) => {
                if (isLoading) {
                    setError("Connection timed out. The server may be unreachable.");
                    return false;
                }
                return isLoading;
            });
        }, 15000);

        return () => {
            statusRef.off('value', onValueChange);
            clearTimeout(timeoutId);
        };
    }, [retryCount]);

    const handleRetry = () => {
        setError('');
        setLoading(true);
        setRetryCount(p => p + 1);
    };

    if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Active Users Monitor</h3>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400">
                        <span className="font-bold text-green-400">{users.filter(u => u.state === 'online').length}</span> Online Now
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleRetry} title="Refresh Connection">
                        Refresh
                    </Button>
                </div>
            </div>
            {error && (
                <div className="p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-center flex flex-col items-center gap-2">
                    <p>{error}</p>
                    <Button size="sm" variant="secondary" onClick={handleRetry}>Retry Connection</Button>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Class/Context</th>
                            <th className="px-6 py-3">Last Status Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.uid} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 transition-colors">
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.state === 'online' 
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${user.state === 'online' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                                        {user.state === 'online' ? 'Online' : 'Offline'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {user.name || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 capitalize">
                                    {user.role || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                    {user.class || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {user.last_changed ? new Date(user.last_changed).toLocaleString() : 'Never'}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !error && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No user activity recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const SessionLogsTable: React.FC = () => {
    const [logs, setLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .onSnapshot(snapshot => {
                setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog)));
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

    return (
        <Card>
            <h3 className="text-2xl font-bold mb-6">Session Logs (Last 100)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">Class/Context</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                    {log.timestamp?.toDate().toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {log.userName}
                                </td>
                                <td className="px-6 py-4 capitalize">
                                    {log.userRole}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'login' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {log.action.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {log.userClass}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                             <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No session logs available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

const AdminTerminalReports: React.FC<{ allUsers: UserProfile[], schoolSettings: SchoolSettings | null, userProfile: UserProfile | null }> = ({ allUsers, schoolSettings, userProfile }) => {
    const { showToast } = useToast();

    const allStudents = useMemo(() => allUsers.filter(u => u.role === 'student').sort((a, b) => (a.name || '').localeCompare(b.name || '')), [allUsers]);

    const [selectedClass, setSelectedClass] = useState(GES_CLASSES[0]);
    const classStudents = useMemo(() => allStudents.filter(s => s.class === selectedClass), [allStudents, selectedClass]);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    const [reportData, setReportData] = useState<TerminalReport | null>(null);
    const [summaryData, setSummaryData] = useState<ReportSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const academicYear = schoolSettings?.academicYear || '';
    const term = schoolSettings?.currentTerm || 1;
    const sanitizedAcademicYear = academicYear.replace(/\//g, '-');
    
    useEffect(() => {
        if (classStudents.length > 0 && !classStudents.some(s => s.uid === selectedStudentId)) {
            setSelectedStudentId(classStudents[0].uid);
        } else if (classStudents.length === 0) {
            setSelectedStudentId('');
        }
    }, [selectedClass, classStudents, selectedStudentId]);
    
    useEffect(() => {
        if (!selectedStudentId || !academicYear) {
            setReportData(null);
            setSummaryData(null);
            return;
        };

        const student = classStudents.find(s => s.uid === selectedStudentId);
        if (!student) return;

        setIsLoading(true);
        const reportId = `${sanitizedAcademicYear}_${term}_${student.class}`;
        const summaryId = `${sanitizedAcademicYear}_${term}_${student.uid}`;

        const unsubReport = db.collection('terminalReports').doc(reportId).onSnapshot((doc) => {
            setReportData(doc.exists ? doc.data() as TerminalReport : null);
            setIsLoading(false);
        }, () => setIsLoading(false));

        const unsubSummary = db.collection('reportSummaries').doc(summaryId).onSnapshot((doc) => {
            setSummaryData(doc.exists ? doc.data() as ReportSummary : null);
        });

        return () => {
            unsubReport();
            unsubSummary();
        };
    }, [selectedStudentId, academicYear, sanitizedAcademicYear, term, classStudents]);

    const selectedStudent = classStudents.find(s => s.uid === selectedStudentId);
    const [headTeacherRemarks, setHeadTeacherRemarks] = useState('');
    const [isSavingRemarks, setIsSavingRemarks] = useState(false);

    useEffect(() => {
        setHeadTeacherRemarks(summaryData?.headTeacherRemarks || '');
    }, [summaryData]);

    const handleSaveRemarks = async () => {
        if (!selectedStudent || !userProfile) return;
        setIsSavingRemarks(true);
        const summaryId = `${sanitizedAcademicYear}_${term}_${selectedStudent.uid}`;
        const summaryRef = db.collection('reportSummaries').doc(summaryId);
        try {
            await summaryRef.set({
                id: summaryId,
                studentId: selectedStudent.uid,
                classId: selectedStudent.class,
                academicYear: academicYear,
                term: term,
                headTeacherRemarks: headTeacherRemarks
            }, { merge: true });
            showToast("Remarks saved successfully.", "success");
        } catch (err: any) {
            showToast(`Failed to save remarks: ${err.message}`, "error");
        } finally {
            setIsSavingRemarks(false);
        }
    };

    const studentMarksBySubject = useMemo(() => {
        if (!reportData || !selectedStudent) return [];
        return Object.entries(reportData.subjects || {})
            .map(([subject, data]) => ({
                subject,
                mark: (data as TerminalReport['subjects'][string]).marks?.[selectedStudent.uid]
            }))
            .filter(item => item.mark) as { subject: string, mark: TerminalReportMark }[];
    }, [reportData, selectedStudent]);

    return (
        <>
        <Card>
            <div className="flex justify-between items-start no-print">
                <h3 className="text-xl font-semibold mb-4">View Terminal Reports</h3>
                <Button onClick={() => window.print()} className="no-print">Print Report</Button>
            </div>
            <div className="flex gap-4 mb-6 no-print">
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 bg-slate-700 rounded-md">
                    {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="p-2 bg-slate-700 rounded-md" disabled={classStudents.length === 0}>
                    {classStudents.length > 0 ? classStudents.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>) : <option>No students in class</option>}
                </select>
            </div>
            {isLoading ? <div className="flex justify-center"><Spinner /></div> : selectedStudent ? (
                <div className="printable-area bg-slate-800 p-6 rounded-lg overflow-x-auto" id="report-card-container">
                    <header className="text-center mb-6 border-b-2 border-blue-400 pb-4">
                        <h1 className="text-3xl font-bold text-gray-100">{schoolSettings?.schoolName}</h1>
                        <p className="text-sm text-gray-300 italic">"{schoolSettings?.schoolMotto}"</p>
                        <h2 className="text-xl font-semibold mt-2">Terminal Report</h2>
                    </header>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <p><strong>Student Name:</strong> {selectedStudent.name}</p>
                        <p><strong>Class:</strong> {selectedStudent.class}</p>
                        <p><strong>Academic Year:</strong> {academicYear}</p>
                        <p><strong>Term:</strong> {term}</p>
                    </div>
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="border border-slate-600 p-2 text-left">Subject</th>
                                <th className="border border-slate-600 p-2">Class Score (50)</th>
                                <th className="border border-slate-600 p-2">Exam Score (50)</th>
                                <th className="border border-slate-600 p-2">Total (100)</th>
                                <th className="border border-slate-600 p-2">Grade</th>
                                <th className="border border-slate-600 p-2">Position</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentMarksBySubject.map(({subject, mark}) => (
                                <tr key={subject}>
                                    <td className="border border-slate-600 p-2 font-semibold">{subject}</td>
                                    <td className="border border-slate-600 p-2 text-center">{mark.scaledClassScore?.toFixed(1)}</td>
                                    <td className="border border-slate-600 p-2 text-center">{mark.scaledExamScore?.toFixed(1)}</td>
                                    <td className="border border-slate-600 p-2 text-center font-bold">{mark.overallTotal?.toFixed(1)}</td>
                                    <td className="border border-slate-600 p-2 text-center">{mark.grade}</td>
                                    <td className="border border-slate-600 p-2 text-center">{mark.position}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2">
                            <h4 className="font-bold border-b border-slate-600 pb-1 mb-1">Class Teacher's Remarks</h4>
                            <p><strong>Conduct:</strong> {summaryData?.conduct || 'N/A'}</p>
                            <p><strong>Attitude:</strong> {summaryData?.attitude || 'N/A'}</p>
                            <p><strong>Interest:</strong> {summaryData?.interest || 'N/A'}</p>
                            <p><strong>Remarks:</strong> {summaryData?.classTeacherRemarks || 'N/A'}</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold border-b border-slate-600 pb-1 mb-1">Head Teacher's Remarks</h4>
                            <textarea
                                value={headTeacherRemarks}
                                onChange={(e) => setHeadTeacherRemarks(e.target.value)}
                                rows={4}
                                className="w-full p-2 bg-slate-700 rounded-md border border-slate-600 no-print"
                                placeholder="Enter remarks..."
                            />
                            <p className="print-only">{headTeacherRemarks}</p>
                            <Button onClick={handleSaveRemarks} disabled={isSavingRemarks} size="sm" className="no-print">
                                {isSavingRemarks ? "Saving..." : "Save Remarks"}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : <p className="text-center text-gray-400">Please select a student to view their report.</p>}
        </Card>
        </>
    );
};


interface GeneratedTimetable {
    classId: string;
    timetableData: TimetableData;
}

const getFileType = (fileName: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' => {
    if (!fileName) return 'other';
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return 'other';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return 'audio';
    if (extension === 'pdf') return 'pdf';
    
    return 'other';
}

interface ClassManagerModalProps {
    classId: string;
    allUsers: UserProfile[];
    onClose: () => void;
    onSave: () => void;
}

const ClassManagerModal: React.FC<ClassManagerModalProps> = ({ classId, allUsers, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const teachers = useMemo(() => allUsers.filter(u => u.role === 'teacher' && u.status === 'approved'), [allUsers]);
    
    const [classTeacherUid, setClassTeacherUid] = useState<string>('');
    const [otherTeacherUids, setOtherTeacherUids] = useState<string[]>([]);
    const [studentsInClass, setStudentsInClass] = useState<UserProfile[]>([]);
    const [otherStudents, setOtherStudents] = useState<UserProfile[]>([]);

    const [selectedStudentsInClass, setSelectedStudentsInClass] = useState<string[]>([]);
    const [selectedOtherStudents, setSelectedOtherStudents] = useState<string[]>([]);
    
    useEffect(() => {
        const currentClassTeacher = teachers.find(t => t.classTeacherOf === classId);
        setClassTeacherUid(currentClassTeacher?.uid || '');

        const currentOtherTeachers = teachers.filter(t => t.classesTaught?.includes(classId) && t.uid !== currentClassTeacher?.uid);
        setOtherTeacherUids(currentOtherTeachers.map(t => t.uid));

        const allStudents = allUsers.filter(u => u.role === 'student' && u.status === 'approved');
        setStudentsInClass(allStudents.filter(s => s.class === classId).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setOtherStudents(allStudents.filter(s => s.class !== classId).sort((a, b) => (a.name || '').localeCompare(b.name || '')));

    }, [classId, allUsers, teachers]);

    const handleSaveChanges = async () => {
        setLoading(true);
        setError('');

        const batch = db.batch();

        const originalTeacher = teachers.find(t => t.classTeacherOf === classId);
        if (originalTeacher && originalTeacher.uid !== classTeacherUid) {
            const ref = db.collection('users').doc(originalTeacher.uid);
            batch.update(ref, { classTeacherOf: firebase.firestore.FieldValue.delete() });
        }
        if (classTeacherUid && classTeacherUid !== originalTeacher?.uid) {
            const ref = db.collection('users').doc(classTeacherUid);
            batch.update(ref, { classTeacherOf: classId });
        }

        teachers.forEach(teacher => {
            const userDocRef = db.collection('users').doc(teacher.uid);
            const isAssigned = otherTeacherUids.includes(teacher.uid) || classTeacherUid === teacher.uid;
            const wasAssigned = teacher.classesTaught?.includes(classId) || teacher.classTeacherOf === classId;

            if (isAssigned && !wasAssigned) {
                batch.update(userDocRef, { classesTaught: firebase.firestore.FieldValue.arrayUnion(classId) });
            } else if (!isAssigned && wasAssigned) {
                batch.update(userDocRef, { classesTaught: firebase.firestore.FieldValue.arrayRemove(classId) });
            }
        });

        studentsInClass.forEach(student => {
            if (student.class !== classId) {
                const ref = db.collection('users').doc(student.uid);
                batch.update(ref, { class: classId });
            }
        });
        
        otherStudents.forEach(student => {
            const wasInClass = allUsers.find(u => u.uid === student.uid)?.class === classId;
            if (wasInClass) {
                 const ref = db.collection('users').doc(student.uid);
                 batch.update(ref, { class: firebase.firestore.FieldValue.delete() });
            }
        });

        try {
            await batch.commit();
            onSave();
            onClose();
        } catch (err: any) {
            console.error("Failed to save class changes:", err);
            setError(`Failed to save: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentMove = (direction: 'toClass' | 'fromClass') => {
        if (direction === 'toClass') {
            const toMove = otherStudents.filter(s => selectedOtherStudents.includes(s.uid));
            setStudentsInClass(prev => [...prev, ...toMove].sort((a,b) => (a.name || '').localeCompare(b.name || '')));
            setOtherStudents(prev => prev.filter(s => !selectedOtherStudents.includes(s.uid)));
            setSelectedOtherStudents([]);
        } else {
            const toMove = studentsInClass.filter(s => selectedStudentsInClass.includes(s.uid));
            setOtherStudents(prev => [...prev, ...toMove].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            setStudentsInClass(prev => prev.filter(s => !selectedStudentsInClass.includes(s.uid)));
            setSelectedStudentsInClass([]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-4xl h-[95vh] flex flex-col">
                 <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                    <h2 className="text-2xl font-bold">Manage Class: {classId}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                 </div>
                 <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Class Teacher</label>
                            <select value={classTeacherUid} onChange={e => setClassTeacherUid(e.target.value)} className="w-full p-2 bg-slate-700 rounded-md">
                                <option value="">None</option>
                                {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Other Subject Teachers</label>
                            <select multiple value={otherTeacherUids} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOtherTeacherUids(Array.from(e.target.selectedOptions).map(option => (option as HTMLOptionElement).value))} className="w-full p-2 bg-slate-700 rounded-md h-24">
                                {teachers.filter(t => t.uid !== classTeacherUid).map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-lg mb-2">Manage Students</h3>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div className="flex flex-col h-64 border border-slate-700 rounded-md p-2">
                                <h4 className="text-sm font-bold mb-2">Other Students ({otherStudents.length})</h4>
                                <div className="flex-grow overflow-y-auto bg-slate-900/50 rounded-md">
                                    {otherStudents.map(s => (
                                        <label key={s.uid} className="flex items-center gap-2 p-2 hover:bg-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={selectedOtherStudents.includes(s.uid)} onChange={() => setSelectedOtherStudents(p => p.includes(s.uid) ? p.filter(id => id !== s.uid) : [...p, s.uid])} className="h-4 w-4 rounded bg-slate-700 border-slate-500" />
                                            <span className="text-sm">{s.name} <span className="text-xs text-gray-400">({s.class || 'Unassigned'})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => handleStudentMove('toClass')} disabled={selectedOtherStudents.length === 0}>>></Button>
                                <Button onClick={() => handleStudentMove('fromClass')} disabled={selectedStudentsInClass.length === 0}>&lt;&lt;</Button>
                            </div>
                            <div className="flex flex-col h-64 border border-slate-700 rounded-md p-2">
                                <h4 className="text-sm font-bold mb-2">Students in {classId} ({studentsInClass.length})</h4>
                                 <div className="flex-grow overflow-y-auto bg-slate-900/50 rounded-md">
                                     {studentsInClass.map(s => (
                                        <label key={s.uid} className="flex items-center gap-2 p-2 hover:bg-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={selectedStudentsInClass.includes(s.uid)} onChange={() => setSelectedStudentsInClass(p => p.includes(s.uid) ? p.filter(id => id !== s.uid) : [...p, s.uid])} className="h-4 w-4 rounded bg-slate-700 border-slate-500" />
                                            <span className="text-sm">{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="flex-shrink-0 pt-4 border-t border-slate-700 flex justify-end gap-2">
                    {error && <p className="text-red-400 text-sm mr-auto">{error}</p>}
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveChanges} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                 </div>
            </Card>
        </div>
    );
};

const fileToBase64 = (file: File): Promise<{ mimeType: string, data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const data = result.split(',')[1];
            resolve({ mimeType: file.type, data });
        };
        reader.onerror = (error) => reject(error);
    });
};

// Reusable component to preview uploaded images
const ImagePreview: React.FC<{ file: File; onRemove?: () => void }> = ({ file, onRemove }) => {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  if (!preview) return <div className="w-16 h-16 bg-slate-800 rounded animate-pulse" />;

  return (
    <div className="relative w-16 h-16 group">
      <img src={preview} alt="Preview" className="w-full h-full object-cover rounded border border-slate-600" />
      {onRemove && (
        <button onClick={onRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          &times;
        </button>
      )}
    </div>
  );
};

interface FlyerDesignerProps {
    onClose: () => void;
    allUsers: UserProfile[];
    userProfile: UserProfile;
}

const FlyerDesigner: React.FC<FlyerDesignerProps> = ({ onClose, allUsers, userProfile }) => {
    const { showToast } = useToast();
    // Metadata State
    const [flyerTitle, setFlyerTitle] = useState('');
    const [eventType, setEventType] = useState('Academic');
    const [locality, setLocality] = useState('');
    const [date, setDate] = useState('');
    
    // Assets State
    const [mainImage, setMainImage] = useState<File | null>(null);
    const [secondaryImages, setSecondaryImages] = useState<File[]>([]);
    const [customFont, setCustomFont] = useState('Inter');
    const [customColorScheme, setCustomColorScheme] = useState('#3b82f6');
    const [customInstructions, setCustomInstructions] = useState('');

    // AI & Generation State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<{ prompt: string; tasks: string } | null>(null);
    const [flyerBackgroundUrl, setFlyerBackgroundUrl] = useState<string | null>(null);
    
    // Publishing State
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [targetAudience, setTargetAudience] = useState<'all' | 'role' | 'selected'>('all');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    
    // Refs
    const flyerRef = useRef<HTMLDivElement>(null);
    const mainImageInputRef = useRef<HTMLInputElement>(null);
    const secondaryImageInputRef = useRef<HTMLInputElement>(null);

    const fonts = ['Inter', 'Kalam', 'Roboto', 'Playfair Display', 'Montserrat', 'Lato', 'Open Sans'];
    const eventTypes = ['Academic', 'Sports', 'Cultural', 'Religious', 'Meeting', 'Holiday', 'Fundraiser', 'Competition'];

    const handleGeneratePlan = async () => {
        if (!flyerTitle || !eventType) {
            showToast("Please enter at least an Event Title and Type.", "error");
            return;
        }

        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
# ROLE: Multimodal Design Assistant for Admin Portal
# DESCRIPTION: Generates flyer background prompt + editing instructions for school event flyers.

You are the Multimodal Design Assistant for the *Admin Portal* of a School Management Web App.  
Your job is to convert structured event metadata into:

1) A high-quality Image Generation Prompt  
2) A technical Image Editing & Composition Task List  

You must ALWAYS output **exactly these two sections** — nothing more, nothing less.

-----------------------------------------------------
INPUT VARIABLES:
-----------------------------------------------------
[EVENT_TITLE]: ${flyerTitle}
[EVENT_TYPE]: ${eventType}
[LOCALITY]: ${locality || 'School Premises'}
[MAIN_IMAGE_ID]: ${mainImage ? 'User Uploaded Main Image' : 'None'}
[SECONDARY_IMAGES_COUNT]: ${secondaryImages.length}
[CUSTOM_FONT]: ${customFont}
[CUSTOM_COLOR_SCHEME]: ${customColorScheme}
[CUSTOM_INSTRUCTIONS]: ${customInstructions || 'None'}

-----------------------------------------------------
REQUIRED OUTPUT FORMAT
-----------------------------------------------------

# 1. Image Generation Prompt
Create a single, detailed paragraph (max 200 words) describing the ideal flyer background.

Must include:
* Aesthetic theme combining [EVENT_TITLE], [EVENT_TYPE], [LOCALITY]
* Consideration of [CUSTOM_INSTRUCTIONS] as high-priority directives for style and content.
* Full-page flyer layout, rule of thirds, visual hierarchy
* Cinematic or soft-diffused lighting instructions
* Ultra-high-quality terms: 8K, HDR, print-ready sharpness
* Artistic direction (e.g., retro, modern academic, minimalistic, futuristic)
* Integration of [CUSTOM_FONT] and [CUSTOM_COLOR_SCHEME] as part of the design logic

The response must be ONE paragraph only.

-----------------------------------------------------

# 2. Image Editing & Composition Tasks
Provide a numbered list of exact technical steps for the flyer-builder engine:

1. Load the primary image using [MAIN_IMAGE_ID].  
2. Apply precise facial realism enhancement (clarity, skin texture accuracy).  
3. Remove original background and replace with the theme created in Section 1.  
4. Apply global color harmonization based on [CUSTOM_COLOR_SCHEME].  
5. Normalize brightness, contrast, and vibrance across all image layers.  
6. Set the main image as the primary focal point.  
7. Insert and position [SECONDARY_IMAGES_COUNT] supplemental images using balanced grid spacing.  
8. Build a professional flyer layout with title, information, and footer zones.  
9. Add the event title using [EVENT_TITLE] + [CUSTOM_FONT].  
10. Place placeholder text areas for date, venue, and extra event data.  
11. Ensure all text has strong contrast for readability.  
12. Render the final flyer as a high-resolution, 300 DPI print-ready output.  
13. Optimize for both digital display and physical printing.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt
            });

            const text = response.text;
            
            // Simple parsing logic
            const promptMatch = text.match(/# 1\. Image Generation Prompt\n([\s\S]*?)\n# 2\./);
            const tasksMatch = text.match(/# 2\. Image Editing & Composition Tasks\n([\s\S]*)/);

            const extractedPrompt = promptMatch ? promptMatch[1].trim() : "A high quality school event background.";
            const extractedTasks = tasksMatch ? tasksMatch[1].trim() : "1. Render flyer.";

            setGeneratedPlan({ prompt: extractedPrompt, tasks: extractedTasks });
            
        } catch (error) {
            console.error("Error generating plan:", error);
            showToast("Failed to generate design plan.", "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRenderFlyer = async () => {
        if (!generatedPlan) return;
        setIsGeneratingBackground(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Use the AI generated prompt for the image
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: generatedPlan.prompt,
                config: { numberOfImages: 1, aspectRatio: '3:4' }
            });
            
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            setFlyerBackgroundUrl(`data:image/png;base64,${base64ImageBytes}`);

        } catch (error) {
            console.error("Error generating background:", error);
            showToast("Failed to generate background image.", "error");
        } finally {
            setIsGeneratingBackground(false);
        }
    };

    const handleDownloadFlyer = async () => {
        if (flyerRef.current) {
            try {
                const canvas = await html2canvas(flyerRef.current, { useCORS: true, scale: 2, backgroundColor: null });
                const link = document.createElement('a');
                link.download = `Flyer-${flyerTitle || 'Event'}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                showToast("Flyer downloaded!", "success");
            } catch (error) {
                console.error("Error downloading flyer:", error);
                showToast("Error downloading flyer.", "error");
            }
        }
    };

    const handlePublishFlyer = async () => {
        if (!flyerRef.current || !flyerTitle) return;
        
        if (targetAudience === 'selected' && selectedUsers.length === 0) {
            showToast("Please select at least one user to publish to.", "error");
            return;
        }

        if (targetAudience === 'role' && targetRoles.length === 0) {
            showToast("Please select at least one role to publish to.", "error");
            return;
        }

        setIsPublishing(true);
        try {
            // 1. Capture Canvas to Blob
            const canvas = await html2canvas(flyerRef.current, { useCORS: true, scale: 2, backgroundColor: null });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) throw new Error("Failed to generate image blob");

            // 2. Upload to Storage
            const storageRef = storage.ref(`flyers/${Date.now()}-${flyerTitle.replace(/\s+/g, '-')}.png`);
            await storageRef.put(blob);
            const imageUrl = await storageRef.getDownloadURL();

            // 3. Create PublishedFlyer document
            const flyerData: PublishedFlyer = {
                id: db.collection('publishedFlyers').doc().id,
                title: flyerTitle,
                imageUrl: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                publisherId: userProfile.uid,
                publisherName: userProfile.name,
                targetAudience: targetAudience,
                targetRoles: targetAudience === 'role' ? targetRoles : undefined,
                targetUids: targetAudience === 'selected' ? selectedUsers : undefined,
            };

            await db.collection('publishedFlyers').doc(flyerData.id).set(flyerData);
            
            showToast("Flyer published successfully!", "success");
            setShowPublishModal(false);
            onClose();

        } catch (error) {
            console.error("Error publishing flyer:", error);
            showToast("Failed to publish flyer.", "error");
        } finally {
            setIsPublishing(false);
        }
    };

    // Helper to read main image for display
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    useEffect(() => {
        if (mainImage) {
            const reader = new FileReader();
            reader.onloadend = () => setMainImagePreview(reader.result as string);
            reader.readAsDataURL(mainImage);
        } else {
            setMainImagePreview(null);
        }
    }, [mainImage]);
    
    // Helper to read secondary images
    const [secondaryImagePreviews, setSecondaryImagePreviews] = useState<string[]>([]);
    useEffect(() => {
        const loadImages = async () => {
            const promises = secondaryImages.map(file => new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            }));
            const results = await Promise.all(promises);
            setSecondaryImagePreviews(results);
        };
        loadImages();
    }, [secondaryImages]);

    const filteredUsers = useMemo(() => {
        if (!userSearchTerm) return allUsers;
        return allUsers.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.role.toLowerCase().includes(userSearchTerm.toLowerCase()));
    }, [allUsers, userSearchTerm]);

    const handleSelectUser = (uid: string) => {
        setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };
    
    const handleSelectRole = (role: UserRole) => {
        setTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };


    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            {/* Header / Toolbar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                 <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Multimodal Design Assistant</h3>
                 <div className="flex gap-3">
                     <Button variant="secondary" onClick={onClose}>Close Designer</Button>
                     <Button onClick={handleDownloadFlyer} disabled={!flyerBackgroundUrl}>Download</Button>
                     <Button onClick={() => setShowPublishModal(true)} disabled={!flyerBackgroundUrl} className="bg-green-600 hover:bg-green-500">Publish</Button>
                 </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                
                {/* Left Panel: Controls */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                    
                    {/* Step 1: Metadata */}
                    <Card className="border-l-4 border-blue-500">
                        <h4 className="font-bold text-lg mb-4 text-blue-300">1. Event Metadata</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Event Title</label>
                                <input type="text" value={flyerTitle} onChange={e => setFlyerTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" placeholder="e.g. Annual Science Fair" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Event Type</label>
                                    <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm">
                                        {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-xs text-gray-400 mb-1">Font</label>
                                     <select value={customFont} onChange={e => setCustomFont(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm">
                                        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                                     </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                 <div>
                                    <label className="block text-xs text-gray-400 mb-1">Locality</label>
                                    <input type="text" value={locality} onChange={e => setLocality(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" placeholder="e.g. Assembly Hall" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Custom Instructions (Optional)</label>
                                <textarea 
                                    value={customInstructions} 
                                    onChange={e => setCustomInstructions(e.target.value)} 
                                    className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm h-20" 
                                    placeholder="e.g. Make it look like a 1980s poster with neon colors. Include a robot mascot." 
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Step 2: Assets */}
                    <Card className="border-l-4 border-purple-500">
                        <h4 className="font-bold text-lg mb-4 text-purple-300">2. Visual Assets</h4>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs text-gray-400 mb-2">Main Image (Focal Point)</label>
                                <input type="file" ref={mainImageInputRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setMainImage(e.target.files[0])} />
                                <div onClick={() => mainImageInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 relative overflow-hidden">
                                    {mainImage ? (
                                        <ImagePreview file={mainImage} onRemove={() => setMainImage(null)} />
                                    ) : <span className="text-xs text-gray-500">+ Upload Main Image</span>}
                                </div>
                             </div>
                             <div>
                                <label className="block text-xs text-gray-400 mb-2">Secondary Images (Grid)</label>
                                <input type="file" ref={secondaryImageInputRef} accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && setSecondaryImages(Array.from(e.target.files))} />
                                <div onClick={() => secondaryImageInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 relative">
                                    {secondaryImages.length > 0 ? (
                                        <div className="flex gap-2 overflow-x-auto p-2 w-full">
                                            {secondaryImages.map((file, idx) => <div key={idx} className="flex-shrink-0"><ImagePreview file={file} /></div>)}
                                        </div>
                                    ) : <span className="text-xs text-gray-500">+ Upload Extras</span>}
                                </div>
                             </div>
                             <div>
                                 <label className="block text-xs text-gray-400 mb-2">Color Theme</label>
                                 <input type="color" value={customColorScheme} onChange={e => setCustomColorScheme(e.target.value)} className="w-full h-10 rounded bg-transparent cursor-pointer" />
                             </div>
                        </div>
                    </Card>
                    
                     {/* Step 3: Plan & Generate */}
                    <Card className="border-l-4 border-green-500">
                        <h4 className="font-bold text-lg mb-4 text-green-300">3. AI Generation</h4>
                         <div className="space-y-3">
                             <Button onClick={handleGeneratePlan} disabled={isAnalyzing} className="w-full">
                                 {isAnalyzing ? <Spinner /> : 'Generate Design Plan'}
                             </Button>
                             
                             {generatedPlan && (
                                 <div className="mt-4 p-3 bg-slate-900/50 rounded text-xs text-gray-300 max-h-40 overflow-y-auto">
                                     <p className="font-bold text-blue-400 mb-1">AI Plan:</p>
                                     {generatedPlan.tasks}
                                 </div>
                             )}

                             <Button onClick={handleRenderFlyer} disabled={!generatedPlan || isGeneratingBackground} className="w-full bg-gradient-to-r from-pink-600 to-orange-600 border-0">
                                 {isGeneratingBackground ? <Spinner /> : 'Render Flyer Background'}
                             </Button>
                         </div>
                    </Card>

                </div>

                {/* Right Panel: Preview */}
                <div className="w-full lg:w-2/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                    {flyerBackgroundUrl ? (
                        <div 
                            ref={flyerRef}
                            className="w-full max-w-[500px] aspect-[3/4] relative shadow-2xl"
                            style={{ 
                                backgroundImage: `url(${flyerBackgroundUrl})`, 
                                backgroundSize: 'cover', 
                                backgroundPosition: 'center',
                                fontFamily: customFont 
                            }}
                        >
                            {/* Overlay Content - Simulating the "Composition Engine" */}
                            <div className="absolute inset-0 bg-black/20"></div> {/* Global Dim */}
                            
                            {/* Header Zone */}
                            <div className="absolute top-8 left-0 right-0 text-center px-4 z-10">
                                <h1 className="text-4xl font-extrabold text-white drop-shadow-lg uppercase tracking-wider" style={{ textShadow: '2px 2px 0px #000' }}>{flyerTitle}</h1>
                                <p className="text-xl text-white font-light mt-2 drop-shadow-md">{eventType}</p>
                            </div>

                            {/* Main Image Zone (If uploaded) */}
                            {mainImagePreview && (
                                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/4 w-2/3 aspect-square rounded-full border-4 border-white shadow-xl overflow-hidden z-0">
                                    <img src={mainImagePreview} alt="Main" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Footer / Info Zone */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-8 pt-20 text-white z-10">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-lg font-bold">{locality}</p>
                                        <p className="text-sm opacity-90">{date ? new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date TBD'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="inline-block bg-white text-black font-bold px-3 py-1 rounded-full text-xs">
                                            UTOPIA INT. SCHOOL
                                        </div>
                                    </div>
                                </div>
                                {secondaryImagePreviews.length > 0 && (
                                    <div className="flex gap-2 mt-4 overflow-hidden justify-center">
                                        {secondaryImagePreviews.slice(0, 3).map((src, i) => (
                                            <img key={i} src={src} alt="sec" className="w-12 h-12 object-cover rounded border border-white/50" />
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <div className="text-6xl mb-4">🎨</div>
                            <p>Design preview area.</p>
                            <p className="text-sm mt-2">Fill metadata -> Generate Plan -> Render.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Publish Modal */}
             {showPublishModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Publish Flyer</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-700">
                                        <input type="radio" name="audience" value="all" checked={targetAudience === 'all'} onChange={() => setTargetAudience('all')} />
                                        <span>All Users</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-700">
                                        <input type="radio" name="audience" value="role" checked={targetAudience === 'role'} onChange={() => setTargetAudience('role')} />
                                        <span>Specific Roles</span>
                                    </label>
                                    {targetAudience === 'role' && (
                                        <div className="ml-6 grid grid-cols-2 gap-2">
                                            {(['student', 'teacher', 'parent'] as UserRole[]).map(role => (
                                                <label key={role} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => handleSelectRole(role)} className="rounded bg-slate-700 border-slate-500" />
                                                    <span className="capitalize">{role}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-700">
                                        <input type="radio" name="audience" value="selected" checked={targetAudience === 'selected'} onChange={() => setTargetAudience('selected')} />
                                        <span>Specific Individuals</span>
                                    </label>
                                </div>
                            </div>

                            {targetAudience === 'selected' && (
                                <div>
                                    <input 
                                        type="search" 
                                        placeholder="Search users..." 
                                        value={userSearchTerm} 
                                        onChange={e => setUserSearchTerm(e.target.value)} 
                                        className="w-full p-2 bg-slate-700 rounded border border-slate-600 mb-2 text-sm"
                                    />
                                    <div className="max-h-40 overflow-y-auto border border-slate-700 rounded bg-slate-800 p-2">
                                        {filteredUsers.map(u => (
                                            <label key={u.uid} className="flex items-center gap-2 p-1 hover:bg-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={selectedUsers.includes(u.uid)} onChange={() => handleSelectUser(u.uid)} />
                                                <span className="text-sm">{u.name} ({u.role})</span>
                                            </label>
                                        ))}
                                        {filteredUsers.length === 0 && <p className="text-gray-500 text-xs text-center">No users found.</p>}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{selectedUsers.length} users selected.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="secondary" onClick={() => setShowPublishModal(false)}>Cancel</Button>
                                <Button onClick={handlePublishFlyer} disabled={isPublishing}>
                                    {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};


export const AdminView: React.FC<{ isSidebarExpanded: boolean; setIsSidebarExpanded: (isExpanded: boolean) => void; }> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { userProfile, schoolSettings, subscriptionStatus } = useAuthentication();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showCreateUserForm, setShowCreateUserForm] = useState(false);
    const [showSnapRegister, setShowSnapRegister] = useState(false);
    const [roleToRegister, setRoleToRegister] = useState<UserRole>('student');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [managingClassId, setManagingClassId] = useState<string | null>(null);
    const [viewingTimetableClassId, setViewingTimetableClassId] = useState<string | null>(null);
    const [classTimetableData, setClassTimetableData] = useState<TimetableData | null>(null);
    const [showFlyerDesigner, setShowFlyerDesigner] = useState(false);

    // Fetch all users
    useEffect(() => {
        const unsubscribe = db.collection('users').onSnapshot(snapshot => {
            const users = snapshot.docs.map(doc => doc.data() as UserProfile);
            setAllUsers(users);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // Fetch all attendance
    useEffect(() => {
        if (activeTab === 'attendance') {
            const unsubscribe = db.collection('attendance').limit(100).onSnapshot(snapshot => {
                setAttendanceRecords(snapshot.docs.map(doc => doc.data() as AttendanceRecord));
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    // Fetch timetable when class selected
    useEffect(() => {
        if (activeTab === 'timetables' && viewingTimetableClassId) {
            const unsub = db.collection('timetables').doc(viewingTimetableClassId).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data() as Timetable;
                    setClassTimetableData(data.timetableData);
                } else {
                    setClassTimetableData(null);
                }
            });
            return () => unsub();
        }
    }, [activeTab, viewingTimetableClassId]);


    const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
        try {
            await db.collection('users').doc(uid).update(data);
            showToast('User updated successfully', 'success');
            setEditingUser(null);
        } catch (error: any) {
            showToast(`Error updating user: ${error.message}`, 'error');
        }
    };

    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">📊</span> },
        { key: 'active_users', label: 'Active Users', icon: <span className="text-xl">🟢</span> },
        { key: 'session_logs', label: 'Session Logs', icon: <span className="text-xl">📜</span> },
        { key: 'approval_queue', label: 'Approval Queue', icon: <span className="text-xl">✅</span> },
        { key: 'users', label: 'User Management', icon: <span className="text-xl">👥</span> },
        { key: 'classes', label: 'Class Management', icon: <span className="text-xl">🏫</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
        { key: 'timetables', label: 'Timetables', icon: <span className="text-xl">🗓️</span> },
        { key: 'calendar', label: 'School Calendar', icon: <span className="text-xl">📆</span> },
        { key: 'materials', label: 'Teaching Materials', icon: <span className="text-xl">📚</span> },
        { key: 'reports', label: 'Terminal Reports', icon: <span className="text-xl">📄</span> },
        { key: 'communication', label: 'Communication', icon: <span className="text-xl">💬</span> },
        { key: 'activation', label: 'System Activation', icon: <span className="text-xl">🔑</span> },
        { key: 'settings', label: 'Settings', icon: <span className="text-xl">⚙️</span> },
    ];
    
    // Define subjectsByClass properly from all teacher profiles
    const subjectsByClass: Record<string, string[]> = {};
    // This logic is simplified; ideally we aggregate from all teachers or a central curriculum config.
    allUsers.filter(u => u.role === 'teacher').forEach(t => {
        if (t.subjectsByClass) {
            Object.entries(t.subjectsByClass).forEach(([cls, subs]) => {
                if (!subjectsByClass[cls]) subjectsByClass[cls] = [];
                if (Array.isArray(subs)) {
                     subs.forEach(s => { if (!subjectsByClass[cls].includes(s)) subjectsByClass[cls].push(s); });
                }
            });
        }
    });
    
    // Prepare contact list for messaging
    const contactsForMessaging = useMemo(() => allUsers.filter(u => u.uid !== userProfile?.uid && u.status === 'approved'), [allUsers, userProfile]);

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

        switch(activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                                <p className="text-sm text-gray-400">Total Students</p>
                                <p className="text-3xl font-bold">{allUsers.filter(u => u.role === 'student').length}</p>
                            </Card>
                            <Card>
                                <p className="text-sm text-gray-400">Total Teachers</p>
                                <p className="text-3xl font-bold">{allUsers.filter(u => u.role === 'teacher').length}</p>
                            </Card>
                             <Card>
                                <p className="text-sm text-gray-400">Pending Approvals</p>
                                <p className="text-3xl font-bold text-yellow-400">{allUsers.filter(u => u.status === 'pending').length}</p>
                            </Card>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="secondary" onClick={() => setShowCreateUserForm(true)}>Add User</Button>
                                    <Button variant="secondary" onClick={() => setActiveTab('active_users')}>Monitor Activity</Button>
                                    <Button variant="secondary" onClick={() => setActiveTab('approval_queue')}>Review Approvals</Button>
                                    <Button variant="secondary" onClick={() => setActiveTab('calendar')}>Event Planner</Button>
                                </div>
                            </Card>
                             <Card>
                                <h3 className="text-lg font-bold mb-4">System Status</h3>
                                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg mb-2">
                                    <span className="text-gray-300">Subscription</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${subscriptionStatus?.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {subscriptionStatus?.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Plan: {subscriptionStatus?.planType?.toUpperCase() || 'NONE'}</p>
                            </Card>
                        </div>
                    </div>
                );
            case 'active_users':
                return <ActiveUsersTable />;
            case 'session_logs':
                return <SessionLogsTable />;
            case 'approval_queue':
                return (
                    <Card>
                        <h3 className="text-xl font-semibold mb-4">Pending User Approvals</h3>
                        <AdminApprovalQueue allUsers={allUsers} />
                    </Card>
                );
            case 'users':
                const usersList = allUsers.filter(u => u.status !== 'pending');
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">User Management</h2>
                            <div className="flex gap-2">
                                <Button onClick={() => setShowCreateUserForm(true)}>Create User</Button>
                                <Button variant="secondary" onClick={() => { setRoleToRegister('student'); setShowSnapRegister(true); }}>Snap Register</Button>
                            </div>
                        </div>
                        <Card>
                             <div className="overflow-x-auto">
                                 <table className="min-w-full text-sm text-left text-gray-400">
                                     <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                                         <tr>
                                             <th className="px-6 py-3">Name</th>
                                             <th className="px-6 py-3">Role</th>
                                             <th className="px-6 py-3">Email</th>
                                             <th className="px-6 py-3">Actions</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-700">
                                         {usersList.map(u => (
                                             <tr key={u.uid} className="hover:bg-slate-800">
                                                 <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                                                 <td className="px-6 py-4 capitalize">{u.role}</td>
                                                 <td className="px-6 py-4">{u.email}</td>
                                                 <td className="px-6 py-4">
                                                     <Button size="sm" variant="secondary" onClick={() => setEditingUser(u)}>Edit</Button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                        </Card>
                    </div>
                );
            case 'classes':
                return (
                     <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Class Management</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {GES_CLASSES.map(cls => {
                                const count = allUsers.filter(u => u.role === 'student' && u.class === cls).length;
                                const teacher = allUsers.find(u => u.role === 'teacher' && u.classTeacherOf === cls);
                                return (
                                    <button key={cls} onClick={() => setManagingClassId(cls)} className="bg-slate-800 hover:bg-slate-700 p-6 rounded-xl border border-slate-700 transition-all text-left group">
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 mb-2">{cls}</h3>
                                        <p className="text-sm text-gray-400">{count} Students</p>
                                        <p className="text-xs text-gray-500 mt-2">Teacher: {teacher?.name || 'Not Assigned'}</p>
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                );
            case 'attendance':
                return <AdminAttendanceDashboard allUsers={allUsers} attendanceRecords={attendanceRecords} />;
            case 'timetables':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">Timetables</h2>
                            <select value={viewingTimetableClassId || ''} onChange={e => setViewingTimetableClassId(e.target.value)} className="p-2 bg-slate-700 rounded-md">
                                <option value="">Select Class to View</option>
                                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {viewingTimetableClassId ? (
                            <Card>
                                {classTimetableData ? (
                                    <NotebookTimetable classId={viewingTimetableClassId} timetableData={classTimetableData} />
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400">No timetable found for {viewingTimetableClassId}.</p>
                                        <Button className="mt-4" disabled>Edit Timetable (Coming Soon)</Button>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card>
                                <p className="text-center text-gray-400 py-12">Select a class above to view its timetable.</p>
                            </Card>
                        )}
                    </div>
                );
            case 'calendar':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">School Calendar & Events</h2>
                             {!showFlyerDesigner && (
                                <div className="flex gap-2">
                                    <Button onClick={() => setShowFlyerDesigner(true)}>Open Flyer Designer</Button>
                                    {/* Future: Add Event Button */}
                                </div>
                             )}
                        </div>
                        {showFlyerDesigner ? (
                            <FlyerDesigner onClose={() => setShowFlyerDesigner(false)} allUsers={allUsers} userProfile={userProfile!} />
                        ) : (
                            <Card>
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📅</div>
                                    <p className="text-xl text-gray-300 mb-4">Manage upcoming school events and announcements.</p>
                                    <p className="text-sm text-gray-500">Use the Flyer Designer to create promotional materials.</p>
                                </div>
                            </Card>
                        )}
                    </div>
                );
            case 'materials':
                 return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Teaching Materials</h2>
                        <Card>
                            <p className="text-center text-gray-400 py-12">Repository for uploaded syllabi, textbooks, and resources.</p>
                        </Card>
                    </div>
                 );
            case 'reports':
                return <AdminTerminalReports allUsers={allUsers} schoolSettings={schoolSettings} userProfile={userProfile} />;
            case 'communication':
                return <MessagingView userProfile={userProfile!} contacts={contactsForMessaging} />;
            case 'activation':
                return <SystemActivation subscriptionStatus={subscriptionStatus} />;
            case 'settings':
                 return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">System Settings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-lg font-bold mb-4">School Configuration</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400">School Name</label>
                                        <input type="text" value={schoolSettings?.schoolName || ''} disabled className="w-full p-2 bg-slate-700 rounded-md mt-1 opacity-50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400">Academic Year</label>
                                        <input type="text" value={schoolSettings?.academicYear || ''} disabled className="w-full p-2 bg-slate-700 rounded-md mt-1 opacity-50" />
                                    </div>
                                </div>
                            </Card>
                             <Card>
                                <h3 className="text-lg font-bold mb-4">Sleep Mode</h3>
                                <p className="text-sm text-gray-400 mb-4">Automatically lock student access during night hours.</p>
                                {/* Sleep mode controls would go here */}
                                <div className="p-4 bg-slate-800 rounded border border-slate-700 text-center text-sm text-gray-500">
                                    Configured in main App settings
                                </div>
                            </Card>
                        </div>
                    </div>
                 );
            default:
                return null;
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
                title="Admin Portal"
            />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950">
                {renderContent()}
            </main>
            
            {/* Modals */}
            {showCreateUserForm && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-xl font-bold">Create User</h3>
                            <button onClick={() => setShowCreateUserForm(false)}>&times;</button>
                        </div>
                         <div className="space-y-4">
                            <AdminCreateUserForm />
                            <hr className="border-slate-700" />
                            <AdminCreateParentForm allStudents={allUsers.filter(u => u.role === 'student')} />
                         </div>
                    </Card>
                </div>
            )}
            {showSnapRegister && (
                <SnapToRegister 
                    onClose={() => setShowSnapRegister(false)}
                    roleToRegister={roleToRegister}
                />
            )}
             {editingUser && (
                <UserEditModal 
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    user={editingUser}
                    allUsers={allUsers}
                    subjectsByClass={subjectsByClass}
                    onSave={handleUpdateUser}
                />
            )}
            {managingClassId && (
                <ClassManagerModal 
                    classId={managingClassId}
                    allUsers={allUsers}
                    onClose={() => setManagingClassId(null)}
                    onSave={() => { /* Optional refresh logic */ }}
                />
            )}
        </div>
    );
};
