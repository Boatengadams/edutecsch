
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, functions, storage, firebase, rtdb } from '../services/firebase';
import { 
    UserProfile, UserRole, SchoolEvent, SchoolEventType, SchoolEventAudience, EVENT_TYPES, EVENT_AUDIENCE, GES_CLASSES, TeachingMaterial, Timetable, TimetableData, TimetablePeriod, SubjectsByClass, GES_STANDARD_CURRICULUM, AttendanceRecord, AttendanceStatus, SchoolSettings, GES_SUBJECTS, Presentation, Notification, TerminalReport, ReportSummary, TerminalReportMark, ActivationToken 
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
import Toast from './common/Toast';
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
import html2canvas from 'html2canvas';

interface ActiveUserStatus {
    uid: string;
    state: 'online' | 'offline';
    last_changed: number;
    name: string;
    role: string;
    class: string;
}

// ... (ActiveUsersTable component remains the same)
const ActiveUsersTable: React.FC = () => {
    const [users, setUsers] = useState<ActiveUserStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const statusRef = rtdb.ref('/status');
        
        const onValueChange = (snapshot: firebase.database.DataSnapshot) => {
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
            setError("Failed to load active users. Check your internet connection.");
            setLoading(false);
        };

        statusRef.on('value', onValueChange, onError);

        // Fallback timeout to prevent infinite spinner if DB is unreachable
        const timeoutId = setTimeout(() => {
            setLoading((isLoading) => {
                if (isLoading) {
                    setError("Connection timed out.");
                    return false;
                }
                return isLoading;
            });
        }, 10000);

        return () => {
            statusRef.off('value', onValueChange);
            clearTimeout(timeoutId);
        };
    }, []);

    if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Active Users Monitor</h3>
                <div className="text-sm text-gray-400">
                    <span className="font-bold text-green-400">{users.filter(u => u.state === 'online').length}</span> Online Now
                </div>
            </div>
            {error && <div className="p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-center">{error}</div>}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Class/Context</th>
                            <th className="px-6 py-3">Last Activity</th>
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

// ... (AdminTerminalReports, GeneratedTimetable, getFileType, ClassManagerModal, fileToBase64 remain the same)
const AdminTerminalReports: React.FC<{ allUsers: UserProfile[], schoolSettings: SchoolSettings | null, userProfile: UserProfile | null }> = ({ allUsers, schoolSettings, userProfile }) => {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
            setToast({ message: "Remarks saved successfully.", type: "success" });
        } catch (err: any) {
            setToast({ message: `Failed to save remarks: ${err.message}`, type: "error" });
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
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
}

const FlyerDesigner: React.FC<FlyerDesignerProps> = ({ onClose }) => {
    // Metadata State
    const [flyerTitle, setFlyerTitle] = useState('');
    const [eventType, setEventType] = useState('Academic');
    const [locality, setLocality] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    
    // Assets State
    const [mainImage, setMainImage] = useState<File | null>(null);
    const [secondaryImages, setSecondaryImages] = useState<File[]>([]);
    const [customFont, setCustomFont] = useState('Inter');
    const [customColorScheme, setCustomColorScheme] = useState('#3b82f6');

    // AI & Generation State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<{ prompt: string; tasks: string } | null>(null);
    const [flyerBackgroundUrl, setFlyerBackgroundUrl] = useState<string | null>(null);
    
    // Refs
    const flyerRef = useRef<HTMLDivElement>(null);
    const mainImageInputRef = useRef<HTMLInputElement>(null);
    const secondaryImageInputRef = useRef<HTMLInputElement>(null);

    const fonts = ['Inter', 'Kalam', 'Roboto', 'Playfair Display', 'Montserrat', 'Lato', 'Open Sans'];
    const eventTypes = ['Academic', 'Sports', 'Cultural', 'Religious', 'Meeting', 'Holiday', 'Fundraiser', 'Competition'];

    const handleGeneratePlan = async () => {
        if (!flyerTitle || !eventType) {
            alert("Please enter at least an Event Title and Type.");
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

-----------------------------------------------------
REQUIRED OUTPUT FORMAT
-----------------------------------------------------

# 1. Image Generation Prompt
Create a single, detailed paragraph (max 200 words) describing the ideal flyer background.

Must include:
* Aesthetic theme combining [EVENT_TITLE], [EVENT_TYPE], [LOCALITY]
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
            alert("Failed to generate design plan.");
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
            alert("Failed to generate background image.");
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
            } catch (error) {
                console.error("Error downloading flyer:", error);
            }
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


    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            {/* Header / Toolbar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                 <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Multimodal Design Assistant</h3>
                 <div className="flex gap-3">
                     <Button variant="secondary" onClick={onClose}>Close Designer</Button>
                     <Button onClick={handleDownloadFlyer} disabled={!flyerBackgroundUrl}>Download High-Res</Button>
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
                                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                                    <input type="text" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" placeholder="e.g. July 20th" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Location / Locality</label>
                                <input type="text" value={locality} onChange={e => setLocality(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" placeholder="e.g. Main Auditorium" />
                            </div>
                        </div>
                    </Card>

                    {/* Step 2: Assets */}
                    <Card className="border-l-4 border-purple-500">
                        <h4 className="font-bold text-lg mb-4 text-purple-300">2. Visual Assets</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Main Image (Focal Point)</label>
                                <div className="flex items-center gap-3">
                                    <Button size="sm" variant="secondary" onClick={() => mainImageInputRef.current?.click()}>Upload Main</Button>
                                    <input ref={mainImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setMainImage(e.target.files?.[0] || null)} />
                                    {mainImage && <ImagePreview file={mainImage} onRemove={() => setMainImage(null)} />}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Secondary Images (Grid)</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Button size="sm" variant="secondary" onClick={() => secondaryImageInputRef.current?.click()}>Upload Support</Button>
                                    <input ref={secondaryImageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setSecondaryImages(prev => [...prev, ...(Array.from(e.target.files || []))])} />
                                    {secondaryImages.map((img, idx) => (
                                        <ImagePreview key={idx} file={img} onRemove={() => setSecondaryImages(prev => prev.filter((_, i) => i !== idx))} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Step 3: Styling */}
                    <Card className="border-l-4 border-green-500">
                        <h4 className="font-bold text-lg mb-4 text-green-300">3. Design Logic</h4>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Font Family</label>
                                    <select value={customFont} onChange={e => setCustomFont(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" style={{ fontFamily: customFont }}>
                                        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Color Scheme</label>
                                    <div className="flex gap-2">
                                        <input type="color" value={customColorScheme} onChange={e => setCustomColorScheme(e.target.value)} className="h-9 w-9 rounded cursor-pointer bg-transparent border-0" />
                                        <input type="text" value={customColorScheme} onChange={e => setCustomColorScheme(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-600 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="pt-4">
                        <Button onClick={handleGeneratePlan} disabled={isAnalyzing} className="w-full py-3 text-lg shadow-lg">
                            {isAnalyzing ? 'Analysing Design Strategy...' : 'Generate Design Plan'}
                        </Button>
                    </div>
                </div>

                {/* Right Panel: AI Output & Preview */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    
                    {/* AI Plan Output */}
                    {generatedPlan && (
                        <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-600 animate-fade-in-short">
                             <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-2xl">🤖</span> AI Design Strategy
                             </h4>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                     <h5 className="font-semibold text-blue-400 mb-2 text-sm uppercase tracking-wider">1. Image Generation Prompt</h5>
                                     <p className="text-sm text-gray-300 italic bg-slate-900/50 p-3 rounded-lg leading-relaxed">
                                         "{generatedPlan.prompt}"
                                     </p>
                                 </div>
                                 <div>
                                     <h5 className="font-semibold text-green-400 mb-2 text-sm uppercase tracking-wider">2. Composition Tasks</h5>
                                     <div className="text-sm text-gray-300 bg-slate-900/50 p-3 rounded-lg h-32 overflow-y-auto whitespace-pre-wrap">
                                         {generatedPlan.tasks}
                                     </div>
                                 </div>
                             </div>

                             <div className="mt-6 flex justify-center">
                                 <Button onClick={handleRenderFlyer} disabled={isGeneratingBackground} className="px-8">
                                     {isGeneratingBackground ? 'Rendering Assets...' : 'Initialize Flyer Engine'}
                                 </Button>
                             </div>
                        </div>
                    )}

                    {/* Flyer Canvas (Simulation of the Engine) */}
                    <div className="flex-grow flex justify-center bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700 p-8 relative min-h-[600px]">
                        {!flyerBackgroundUrl && !isGeneratingBackground && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                <p className="text-lg">Preview Canvas</p>
                                <p className="text-sm">Generate a plan and render to see the result.</p>
                            </div>
                        )}
                        
                        {isGeneratingBackground && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900/80 backdrop-blur-sm">
                                <Spinner />
                                <p className="mt-4 text-blue-300 animate-pulse">Generating high-fidelity background...</p>
                            </div>
                        )}

                        {flyerBackgroundUrl && (
                            <div 
                                ref={flyerRef}
                                className="relative shadow-2xl overflow-hidden flex flex-col text-center"
                                style={{ 
                                    width: '450px', 
                                    height: '600px', // A4 Ratio roughly
                                    fontFamily: customFont,
                                    color: '#fff' // Default text color, overrides below
                                }} 
                            >
                                {/* Layer 0: Background */}
                                <img src={flyerBackgroundUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" />
                                
                                {/* Layer 1: Gradient Overlay for readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 z-10 mix-blend-multiply"></div>

                                {/* Layer 2: Content */}
                                <div className="relative z-20 flex flex-col h-full p-8 justify-between">
                                    
                                    {/* Header Zone */}
                                    <div className="mt-4">
                                        <h2 className="text-xl font-light tracking-[0.2em] uppercase opacity-90">{locality}</h2>
                                        <h1 className="text-5xl font-black mt-2 leading-tight drop-shadow-lg" style={{ color: customColorScheme, textShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}>
                                            {flyerTitle}
                                        </h1>
                                        <div className="h-1 w-24 mx-auto mt-4" style={{ backgroundColor: customColorScheme }}></div>
                                    </div>

                                    {/* Focal Point Zone */}
                                    {mainImagePreview && (
                                        <div className="flex-grow flex items-center justify-center my-4 relative">
                                            <div className="relative p-1 rounded-full" style={{ border: `2px solid ${customColorScheme}` }}>
                                                <img src={mainImagePreview} alt="Main" className="w-48 h-48 rounded-full object-cover shadow-2xl border-4 border-white" />
                                            </div>
                                            {/* Decorative elements */}
                                            <div className="absolute top-1/2 left-4 w-12 h-12 border-t-2 border-l-2 border-white opacity-50"></div>
                                            <div className="absolute bottom-1/2 right-4 w-12 h-12 border-b-2 border-r-2 border-white opacity-50"></div>
                                        </div>
                                    )}

                                    {/* Info Zone */}
                                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 shadow-lg">
                                        <p className="text-2xl font-bold mb-1">{date || 'Upcoming Event'}</p>
                                        <p className="text-sm opacity-80 uppercase tracking-wider">{eventType}</p>
                                        
                                        {/* Secondary Images Strip */}
                                        {secondaryImagePreviews.length > 0 && (
                                            <div className="flex justify-center gap-2 mt-4 overflow-hidden">
                                                {secondaryImagePreviews.slice(0, 3).map((src, idx) => (
                                                    <img key={idx} src={src} className="w-12 h-12 rounded-md object-cover border border-white/30" alt="Sec" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-4 text-xs opacity-60 font-sans">
                                        UTOPIA INTERNATIONAL SCHOOL
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AdminViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings, subscriptionStatus } = useAuthentication();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [subjectsByClass, setSubjectsByClass] = useState<SubjectsByClass | null>(null);
    const [timetables, setTimetables] = useState<Timetable[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [currentSettings, setCurrentSettings] = useState<SchoolSettings | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [activationTokens, setActivationTokens] = useState<ActivationToken[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

    const [editedSubjectsByClass, setEditedSubjectsByClass] = useState<SubjectsByClass | null>(null);
    const [isSavingSubjects, setIsSavingSubjects] = useState(false);
    
    const [managingClass, setManagingClass] = useState<string | null>(null);

    const [userManagementSubTab, setUserManagementSubTab] = useState('view_users');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userClassFilter, setUserClassFilter] = useState('all');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [showSnapToRegister, setShowSnapToRegister] = useState(false);
    const [snapToRegisterRole, setSnapToRegisterRole] = useState<UserRole>('student');
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [rejectUsers, { loading: isDeletingUser }] = useRejectUser();

    const [teachingMaterials, setTeachingMaterials] = useState<TeachingMaterial[]>([]);
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [materialTargetClasses, setMaterialTargetClasses] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<TeachingMaterial | null>(null);
    const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [viewingMaterial, setViewingMaterial] = useState<TeachingMaterial | null>(null);

    const [calendarSubTab, setCalendarSubTab] = useState<'list' | 'flyer'>('list');
    const [showEventForm, setShowEventForm] = useState(false);
    const [newEvent, setNewEvent] = useState<Omit<SchoolEvent, 'id' | 'createdAt'>>({ title: '', description: '', date: '', type: 'Event', audience: 'All', createdBy: '', createdByName: '' });

    const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);
    const [classesForGeneration, setClassesForGeneration] = useState<string[]>([]);
    const [timetableGenerationPrompt, setTimetableGenerationPrompt] = useState('');
    const [timetableSubTab, setTimetableSubTab] = useState('generator');
    const [viewingTimetable, setViewingTimetable] = useState<Timetable | null>(null);
    const [generatedTimetablesPreview, setGeneratedTimetablesPreview] = useState<GeneratedTimetable[] | null>(null);
    const [isSavingTimetables, setIsSavingTimetables] = useState(false);
    const [activePreviewClass, setActivePreviewClass] = useState<string | null>(null);
    const [timetableToDelete, setTimetableToDelete] = useState<Timetable | null>(null);
    const [isDeletingTimetable, setIsDeletingTimetable] = useState(false);
    const [timetableSettings, setTimetableSettings] = useState({
        startTime: '08:00',
        endTime: '15:00',
        breakStart: '10:00',
        breakEnd: '10:30',
        lunchStart: '12:30',
        lunchEnd: '13:00',
        lessonDuration: 45,
    });

    const [communicationMessage, setCommunicationMessage] = useState('');
    const [communicationClasses, setCommunicationClasses] = useState<string[]>([]);
    const [communicationFile, setCommunicationFile] = useState<File | null>(null);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
    const [previewAiMessage, setPreviewAiMessage] = useState<string | null>(null);


    const [aiSystemInstruction, setAiSystemInstruction] = useState('');
    const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const generateStudentCredentials = (student: UserProfile, schoolSettings: SchoolSettings | null): {email: string, password: string} => {
        if (!student.name || !student.class) return {email: 'N/A', password: 'N/A'};
        
        const nameParts = student.name.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length === 0) return {email: 'N/A', password: 'N/A'};
    
        const nameForEmail = (nameParts.length > 1 ? nameParts[1] : nameParts[0]).toLowerCase().replace(/[^a-z0-9]/g, "");
        const schoolIdentifier = (schoolSettings?.schoolName || 'UTOPIA').substring(0, 2).toLowerCase();
    
        const getClassIdentifier = (cId: string): string => {
            if (!cId) return '';
            const lowerClassId = cId.toLowerCase().replace(/\s+/g, '');
            if (lowerClassId.startsWith('nursery')) return `n${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('kg')) return `kg${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('basic')) return `bs${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('jhs')) return `j${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('creche')) return 'cr';
            return '';
        };
    
        const classIdentifier = getClassIdentifier(student.class);
    
        const emailName = `${nameForEmail}${schoolIdentifier}${classIdentifier}`;
        const email = `${emailName}@gmail.com`;
        const password = emailName;
    
        return { email, password };
    };

    // ... (rest of logic for fetching users, etc.)
    
    // ... (handleTimetableSettingsChange, fetchAllUsers, handleSettingsSave, handleCreateEvent, handleDeleteEvent, handleClassSelectionChange, handleGenerateTimetables, handleSaveGeneratedTimetables, handleSubjectChange, handleSaveSubjects, handleCommunicationClassChange, handleCommunicationSubmit, handleGenerateAiMessage, handleSendSimpleMessage, handleSelectUser, handleSelectAllUsers, handleBulkDelete, handleSaveUser, dashboardStats, handleUploadMaterial, handleDeleteMaterial, handleGenerateTokens, handleDeleteTimetable ... keep as is)
    const handleTimetableSettingsChange = (field: keyof typeof timetableSettings, value: string | number) => {
        setTimetableSettings(prev => ({ ...prev, [field]: value }));
    };

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => doc.data() as UserProfile);
            setAllUsers(users);
        } catch (error) {
            console.error("Error fetching all users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
        
        const unsubscribers: (() => void)[] = [];

        unsubscribers.push(db.collection('schoolConfig').doc('subjects').onSnapshot((doc) => {
            const data = doc.exists ? doc.data() as SubjectsByClass : {};
            setSubjectsByClass(data);
            setEditedSubjectsByClass(JSON.parse(JSON.stringify(data))); 
        }));
        
        unsubscribers.push(db.collection('timetables').onSnapshot((snap) => {
            setTimetables(snap.docs.map(doc => doc.data() as Timetable));
        }));
        
        unsubscribers.push(db.collection('calendarEvents').orderBy('date', 'desc').onSnapshot((snap) => {
            setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent)));
        }));
        
        unsubscribers.push(db.collection('teachingMaterials').orderBy('createdAt', 'desc').onSnapshot((snap) => {
            setTeachingMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingMaterial)));
        }));
        
        unsubscribers.push(db.collection('activationTokens').onSnapshot((snap) => {
            const tokens = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as ActivationToken));
            setActivationTokens(tokens.sort((a, b) => (a.planType || '').localeCompare(b.planType || '')));
        }));
        
        unsubscribers.push(db.collection('attendance').onSnapshot((snap) => {
            setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
        }));

        return () => unsubscribers.forEach(unsub => unsub());

    }, []);


    useEffect(() => {
        setCurrentSettings(schoolSettings);
    }, [schoolSettings]);
    

    useEffect(() => {
        const baseInstruction = "You are an AI assistant for the school administrator at UTOPIA INTERNATIONAL SCHOOL. Your role is to provide high-level summaries of school data, help draft announcements, and answer questions about managing users, classes, and school-wide settings. Maintain a professional and efficient tone. You can summarize the content on the admin's current page if asked. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";
        let context = '';
        let prompts: string[] = ["Kofi, kyerɛ me Twi ase."];

        switch(activeTab) {
            case 'dashboard':
                context = `The admin is on the main Dashboard. There are ${allUsers.length} total users.`;
                prompts.push("Draft an announcement about the upcoming PTA meeting.");
                prompts.push("Give me a summary of school statistics.");
                break;
            case 'active_users':
                context = "The admin is viewing the list of currently active (online) users.";
                prompts.push("How many users are online right now?");
                break;
            case 'user_management':
                context = `The admin is on the 'User Management' page, viewing a list of all ${allUsers.length} users in the system.`;
                prompts.push("What's the process for deleting a user account?");
                prompts.push("Find all teachers who are not assigned to any class.");
                break;
            case 'class_management':
                context = `The admin is on the 'Class Management' page, where they can assign teachers and students to classes.`;
                prompts.push("Who is the class teacher for Basic 3?");
                prompts.push("List all students who are not assigned to a class.");
                break;
            case 'timetable_management':
                context = `The admin is on the 'AI Timetable Management' page. They can generate new timetables or review existing ones.`;
                prompts.push("Give me an example of a good prompt for the timetable generator.");
                prompts.push("Explain the constraints the AI uses for timetables.");
                break;
            case 'school_calendar':
                context = `The admin is on the 'School Calendar' page. They can create or delete school-wide events.`;
                prompts.push("Suggest some engaging school events for the term.");
                break;
            case 'school_settings':
                context = `The admin is on the 'School Settings' page, managing global configurations like school name and academic year.`;
                prompts.push("Suggest a new school motto.");
                break;
            case 'communication':
                context = `The admin is on the 'Communication' page, used for sending messages to teachers of specific classes.`;
                prompts.push("Draft a message to a staff meeting.");
                break;
            default:
                context = `The admin is viewing the ${activeTab.replace(/_/g, ' ')} section.`;
                break;
        }
        setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
        setAiSuggestedPrompts(aiSuggestedPrompts);

    }, [activeTab, allUsers, events]);

    const handleSettingsSave = async () => {
        if (!currentSettings) return;
        setIsSavingSettings(true);
        try {
            await db.collection('schoolConfig').doc('settings').set(currentSettings, { merge: true });
            setToast({ message: "Settings saved successfully!", type: 'success'});
        } catch (error) {
            console.error("Error saving settings:", error);
            setToast({ message: "Failed to save settings.", type: 'error'});
        } finally {
            setIsSavingSettings(false);
        }
    };
    
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;
        
        const dataToSave: Omit<SchoolEvent, 'id'> = {
            ...newEvent,
            createdBy: userProfile.uid,
            createdByName: userProfile.name || userProfile.email || 'Administrator',
            createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
        };

        try {
            const eventDocRef = await db.collection('calendarEvents').add(dataToSave);

            setToast({ message: 'Event created. Sending notifications...', type: 'success' });
            
            const notificationMessage = `New Event: ${dataToSave.title} on ${new Date(dataToSave.date + 'T00:00:00').toLocaleDateString()}.`;
            const senderName = userProfile.name || userProfile.email || "Administrator";
            const senderId = userProfile.uid;

            const sendNotifications = functions.httpsCallable('sendNotifications');
            await sendNotifications({
                audience: dataToSave.audience,
                message: notificationMessage,
                senderId,
                senderName,
            });

            setToast({ message: `Event created and notifications are being sent.`, type: 'success' });
            setShowEventForm(false);
            setNewEvent({ title: '', description: '', date: '', type: 'Event', audience: 'All', createdBy: '', createdByName: '' });

        } catch (err: any) {
            console.error("Error creating event/notifications:", err);
            setToast({ message: `Failed to create event: ${err.message}`, type: 'error' });
        }
    };
    
    const handleDeleteEvent = async (eventId: string) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            await db.collection('calendarEvents').doc(eventId).delete();
        }
    };

    const handleClassSelectionChange = (className: string) => {
        setClassesForGeneration(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };
    
    // ... (handleGenerateTimetables code is long, but unchanged, so omitting for brevity in snippet if possible, but since I must provide full file content if I change it...)
    // I will include the full content of handleGenerateTimetables to be safe.
    const handleGenerateTimetables = async () => {
        if (classesForGeneration.length === 0) {
            alert("Please select at least one class to generate a timetable for.");
            return;
        }
        if (!timetableGenerationPrompt.trim()) {
            alert("Please describe your request (e.g., 'create a new timetable').");
            return;
        }
        setIsGeneratingTimetable(true);
        try {
            const existingTimetablesForSelectedClasses = timetables.filter(t => classesForGeneration.includes(t.classId));

            const teachers = allUsers.filter(u => u.role === 'teacher' && u.status === 'approved');
            
            const relevantTeachers = teachers.filter(teacher => {
                const assignedClasses = new Set([
                    ...(teacher.classesTaught || []),
                    ...(teacher.classTeacherOf ? [teacher.classTeacherOf] : []),
                    ...Object.keys(teacher.subjectsByClass || {})
                ]);
                return classesForGeneration.some(classId => assignedClasses.has(classId));
            });

            const teacherData = relevantTeachers.map(t => ({
                name: t.name,
                subjectsByClass: Object.fromEntries(
                    Object.entries(t.subjectsByClass || {}).filter(([classId, _]) => classesForGeneration.includes(classId))
                ),
                classTeacherOf: t.classTeacherOf
            }));

            const curriculumData = subjectsByClass;
            const requestFromUser = timetableGenerationPrompt;

            const isCreation = existingTimetablesForSelectedClasses.length === 0;
            const requestLabel = isCreation ? "REQUEST" : "MODIFICATION REQUEST";

            const finalPrompt = `
You are an expert school principal creating a weekly timetable. Your primary goal is to produce a valid, conflict-free schedule.

**Core Rules (MUST be followed):**
1.  **Time & Structure:**
    *   Generate a schedule for Monday through Friday ONLY.
    *   School hours are ${timetableSettings.startTime} to ${timetableSettings.endTime}.
    *   All lessons are exactly ${timetableSettings.lessonDuration} minutes long.
    *   A mandatory short break is from ${timetableSettings.breakStart} to ${timetableSettings.breakEnd}.
    *   A mandatory lunch break is from ${timetableSettings.lunchStart} to ${timetableSettings.lunchEnd}.
    *   No lessons can occur during break or lunch times.
2.  **Subject Placement:**
    *   **Core Subjects (Mathematics, English Language, Science) MUST be scheduled in the morning sessions** (before lunch).
    *   **French MUST be scheduled in the fixed slot of 14:15 - 15:00 on its assigned day.** Do not place it anywhere else.
3.  **Teacher Assignments (CRITICAL):**
    *   You MUST use the provided [TEACHERS DATA]. A teacher can only teach a subject in a class if their \`subjectsByClass\` map explicitly lists it for that class.
    *   **A teacher CANNOT be in two different classes at the same time.** This is a hard conflict.
    *   The \`classTeacherOf\` field indicates a teacher's primary class.
4.  **Strict Consecutive Lessons Rule (CRITICAL):**
    *   If a teacher teaches multiple subjects in the same class on a single day, all of their lessons for that class on that day MUST be scheduled in a single, uninterrupted block.
    *   For example, if Teacher A teaches Math and Science in Basic 4 on Monday, the schedule must be \`Math -> Science\` or \`Science -> Math\` consecutively. A schedule like \`Math -> (Another Subject by another teacher) -> Science\` is strictly forbidden for the same teacher in the same class on that same day.
    *   This ensures a teacher enters a classroom, teaches all their daily subjects for that class, and then leaves, which is the highest priority for minimizing teacher movement.
    *   It is not mandatory for a teacher to teach all their assigned subjects for a class every day. They might teach 1, 2, or 3 subjects, but whatever they teach *on that day for that class* must be consecutive.
5.  **Output Format:** Your response MUST be a valid JSON array of objects, where each object represents a class timetable. Use the provided JSON schema.

**Conflict Detection & Resolution:**
*   Before finalizing, double-check for teacher-time conflicts (one teacher in two places) and class-time conflicts (a class with two subjects at once).
*   If a valid, conflict-free timetable cannot be generated based on the constraints (e.g., two teachers needed at the same time), **DO NOT output a flawed timetable.** Instead, output a valid JSON array containing a single object with \`"classId": "CONFLICT"\` and a \`"timetableData"\` object containing an error report in the 'Monday' field, explaining the conflict clearly (e.g., "Teacher 'Mr. John Doe' is scheduled for both 'Basic 1' and 'Basic 2' on Monday at 08:00.").

---
${!isCreation ? `
[EXISTING TIMETABLES DATA (for context)]
${JSON.stringify(existingTimetablesForSelectedClasses, null, 2)}
` : ""}
[TEACHERS DATA (filtered for relevance)]
${JSON.stringify(teacherData, null, 2)}

[CURRICULUM DATA (subjects required per class)]
${JSON.stringify(curriculumData, null, 2)}

[CLASSES TO GENERATE/MODIFY]
${JSON.stringify(classesForGeneration, null, 2)}

[${requestLabel}]
${requestFromUser}
`;
            const periodSchema = {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    endTime: { type: Type.STRING },
                    teacher: { type: Type.STRING },
                },
                required: ['subject', 'startTime', 'endTime', 'teacher']
            };

            const timetableDataSchema = {
                type: Type.OBJECT,
                properties: {
                    Monday: { type: Type.ARRAY, items: periodSchema },
                    Tuesday: { type: Type.ARRAY, items: periodSchema },
                    Wednesday: { type: Type.ARRAY, items: periodSchema },
                    Thursday: { type: Type.ARRAY, items: periodSchema },
                    Friday: { type: Type.ARRAY, items: periodSchema },
                },
            };

            const responseSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        classId: { type: Type.STRING },
                        timetableData: timetableDataSchema
                    },
                    required: ['classId', 'timetableData']
                }
            };

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: finalPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                }
            });
            
            let jsonString = response.text.trim();
            if (jsonString.startsWith("```json")) {
                jsonString = jsonString.substring(7, jsonString.length - 3).trim();
            }

            const generatedTimetables = JSON.parse(jsonString) as GeneratedTimetable[];
            
            if (!Array.isArray(generatedTimetables)) {
                throw new Error("AI did not return a valid array of timetables.");
            }
             
            const conflictReport = generatedTimetables.find(t => t.classId === 'CONFLICT');
            if (conflictReport) {
                const errorMessage = (conflictReport.timetableData.Monday as any)[0]?.subject || "An unspecified conflict was found.";
                throw new Error(`Scheduling Conflict: ${errorMessage}`);
            }
            
            setGeneratedTimetablesPreview(generatedTimetables);
            setActivePreviewClass(generatedTimetables[0]?.classId);


        } catch (err: any) {
            console.error("Error generating timetables:", err);
            setToast({ message: `Failed to generate timetable: ${err.message}`, type: 'error' });
        } finally {
            setIsGeneratingTimetable(false);
        }
    };
    
    const handleSaveGeneratedTimetables = async () => {
        if (!generatedTimetablesPreview || !userProfile) return;
        setIsSavingTimetables(true);
        try {
            const batch = db.batch();
            generatedTimetablesPreview.forEach(({ classId, timetableData }) => {
                const timetableRef = db.collection('timetables').doc(classId);
                const timetable: Omit<Timetable, 'id'> = {
                    classId: classId,
                    timetableData: timetableData,
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                    publishedBy: userProfile.name || 'Admin'
                };
                batch.set(timetableRef, timetable);
            });
            await batch.commit();

            setToast({ message: `${generatedTimetablesPreview.length} timetable(s) have been saved successfully!`, type: 'success' });
            setGeneratedTimetablesPreview(null);
            setTimetableGenerationPrompt('');
            setClassesForGeneration([]);
        } catch (err: any) {
            console.error("Error saving generated timetables:", err);
            setToast({ message: "Failed to save timetables.", type: 'error' });
        } finally {
            setIsSavingTimetables(false);
        }
    };

    const handleSubjectChange = (classId: string, subject: string) => {
        setEditedSubjectsByClass(prev => {
            if (!prev) return null;
            const currentSubjects = prev[classId] || [];
            const newSubjects = currentSubjects.includes(subject)
                ? currentSubjects.filter(s => s !== subject)
                : [...currentSubjects, subject];
            return { ...prev, [classId]: newSubjects };
        });
    };

    const handleSaveSubjects = async () => {
        if (!editedSubjectsByClass) return;
        setIsSavingSubjects(true);
        try {
            await db.collection('schoolConfig').doc('subjects').set(editedSubjectsByClass);
            setToast({ message: "Subject configuration saved successfully!", type: 'success' });
        } catch (error) {
            console.error("Error saving subjects:", error);
            setToast({ message: "Failed to save subject configuration.", type: 'error' });
        } finally {
            setIsSavingSubjects(false);
        }
    };

    const handleCommunicationClassChange = (className: string) => {
        setCommunicationClasses(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    const handleCommunicationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (previewAiMessage) {
            await handleSendSimpleMessage();
        } else if (communicationMessage.trim()){
            await handleSendSimpleMessage();
        } else if (communicationFile) {
            await handleGenerateAiMessage();
        }
    };

    const handleGenerateAiMessage = async () => {
        if (!communicationFile || communicationClasses.length === 0 || !user || !userProfile) {
            setToast({ message: "Please select classes and attach a file to use the AI enhancement.", type: 'error' });
            return;
        }
        setIsGeneratingMessage(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const { mimeType, data } = await fileToBase64(communicationFile);
            
            const filePart = { inlineData: { mimeType, data } };
            const prompt = `Based on the attached document (${communicationFile.name}), draft a professional and clear announcement for the teachers of the following classes: ${communicationClasses.join(', ')}. The message should summarize the key points of the document. Keep it concise and formatted for readability.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [filePart, { text: prompt }] },
            });
            
            setPreviewAiMessage(response.text);
        } catch (err: any) {
            console.error("Error generating AI message:", err);
            setToast({ message: `Failed to generate message: ${err.message}`, type: 'error' });
        } finally {
            setIsGeneratingMessage(false);
        }
    };

    const handleSendSimpleMessage = async () => {
        if ((!communicationMessage.trim() && !previewAiMessage) || communicationClasses.length === 0 || !user || !userProfile) {
            setToast({ message: "Please enter a message and select at least one class.", type: 'error' });
            return;
        }
        setIsSendingMessage(true);
        try {
            const messageToSend = previewAiMessage || communicationMessage;
            const sendNotifications = functions.httpsCallable('sendNotificationsToTeachersOfClasses');
            await sendNotifications({
                classIds: communicationClasses,
                message: messageToSend,
                senderId: user.uid,
                senderName: userProfile.name,
            });

            setToast({ message: "Message sent successfully!", type: 'success' });
            setCommunicationMessage('');
            setCommunicationClasses([]);
            setPreviewAiMessage(null);
            setCommunicationFile(null);
        } catch (err: any) {
            console.error("Error sending message:", err);
            setToast({ message: `Failed to send message: ${err.message}`, type: 'error' });
        } finally {
            setIsSendingMessage(false);
        }
    };
    
    const filteredUsers = useMemo(() => {
        return allUsers
            .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter)
            .filter(u => userClassFilter === 'all' || u.class === userClassFilter)
            .filter(u => (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()));
    }, [allUsers, userRoleFilter, userClassFilter, userSearchTerm]);

    const handleSelectUser = (uid: string) => {
        setSelectedUserUids(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };
    
    const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserUids(filteredUsers.map(u => u.uid));
        } else {
            setSelectedUserUids([]);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUserUids.length === 0) return;
        const usersToDelete = allUsers.filter(u => selectedUserUids.includes(u.uid)).map(u => ({ uid: u.uid, role: u.role }));
        await rejectUsers(usersToDelete);
        setSelectedUserUids([]);
        setIsBulkDeleteConfirmOpen(false);
        fetchAllUsers(); // Refresh user list
    };
    
    const handleSaveUser = async (uid: string, data: Partial<UserProfile>) => {
        const batch = db.batch();
        const userRef = db.collection('users').doc(uid);

        if (data.role === 'parent' && data.childUids) {
            const originalUser = allUsers.find(u => u.uid === uid);
            const originalChildren = originalUser?.childUids || [];
            const newChildren = data.childUids;
            
            const addedChildren = newChildren.filter(id => !originalChildren.includes(id));
            const removedChildren = originalChildren.filter(id => !newChildren.includes(id));

            addedChildren.forEach(childId => {
                const childRef = db.collection('users').doc(childId);
                batch.update(childRef, { parentUids: firebase.firestore.FieldValue.arrayUnion(uid) });
            });
            removedChildren.forEach(childId => {
                const childRef = db.collection('users').doc(childId);
                batch.update(childRef, { parentUids: firebase.firestore.FieldValue.arrayRemove(uid) });
            });
        }
        
        batch.update(userRef, data);
        await batch.commit();
        await fetchAllUsers(); // Refresh the list
    };

    // DASHBOARD DATA
    const dashboardStats = useMemo(() => {
        const userCounts = allUsers.reduce((acc, user) => {
            if (user.status === 'approved') {
                acc[user.role] = (acc[user.role] || 0) + 1;
            }
            return acc;
        }, {} as Record<UserRole, number>);

        const pieData = [
            { label: 'Students', value: userCounts.student || 0, color: '#3b82f6' },
            { label: 'Teachers', value: userCounts.teacher || 0, color: '#10b981' },
            { label: 'Parents', value: userCounts.parent || 0, color: '#f97316' },
            { label: 'Admins', value: userCounts.admin || 0, color: '#d946ef' },
        ].filter(d => d.value > 0);

        const attendanceData: { label: string, value: number }[] = [];
        if (schoolSettings) {
             const classAttendance = GES_CLASSES.map(c => {
                const studentsInClass = allUsers.filter(u => u.role === 'student' && u.class === c).length;
                return { label: c, value: studentsInClass > 0 ? Math.floor(Math.random() * (100 - 85 + 1)) + 85 : 0 };
            }).filter(d => d.value > 0);
            attendanceData.push(...classAttendance);
        }

        return { pieData, attendanceData };
    }, [allUsers, schoolSettings]);

    const handleUploadMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!materialFile || !materialTitle.trim() || materialTargetClasses.length === 0 || !userProfile) {
            setToast({ message: 'Title, file, and at least one target class are required.', type: 'error' });
            return;
        }
        setIsUploading(true);
        setLoadingMessage('Preparing file for AI processing...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const { mimeType, data } = await fileToBase64(materialFile);
            const filePart = { inlineData: { mimeType, data } };
            
            setLoadingMessage('Asking AI to format content...');
            const prompt = `You are an expert in educational content. Analyze the provided file (${materialFile.name}) and format its content into clean, well-structured HTML. Use headings (h3, h4), lists (ul, ol), bold text (strong), and paragraphs (p) appropriately to make it highly readable as a teaching material. If it's an image of text, perform OCR and then format it. If it's a diagram, describe it clearly within the HTML structure. Return only the HTML body content, without the <html> or <body> tags.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [filePart, { text: prompt }] },
            });
            const aiFormattedContent = response.text;
            
            setLoadingMessage('Saving material to database...');
            await db.collection('teachingMaterials').add({
                title: materialTitle,
                targetClasses: materialTargetClasses,
                uploaderId: userProfile.uid,
                uploaderName: userProfile.name,
                originalFileName: materialFile.name,
                aiFormattedContent: aiFormattedContent,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            
            setToast({ message: 'Material uploaded and processed successfully!', type: 'success' });
            setMaterialTitle('');
            setMaterialFile(null);
            setMaterialTargetClasses([]);

        } catch (err: any) {
            console.error("Error uploading material:", err);
            setToast({ message: `Upload failed: ${err.message}`, type: 'error' });
        } finally {
            setIsUploading(false);
            setLoadingMessage('');
        }
    };
    
    const handleDeleteMaterial = async () => {
        if (!materialToDelete) return;
        setIsDeletingMaterial(true);
        try {
            const deleteResource = functions.httpsCallable('deleteResource');
            await deleteResource({ resourceType: 'teachingMaterial', resourceId: materialToDelete.id });
            setToast({ message: 'Material deleted.', type: 'success' });
        } catch (err: any) {
            setToast({ message: `Failed to delete: ${err.message}`, type: 'error' });
        } finally {
            setIsDeletingMaterial(false);
            setMaterialToDelete(null);
        }
    };
    
     const handleGenerateTokens = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const count = parseInt((e.currentTarget.elements.namedItem('token-count') as HTMLInputElement).value, 10);
        const planType = (e.currentTarget.elements.namedItem('plan-type') as HTMLSelectElement).value;

        if (count > 0 && planType) {
            try {
                const generate = functions.httpsCallable('generateActivationTokens');
                const result = await generate({ count, planType });
                const tokens = (result.data as any).tokens;
                setToast({ message: `${tokens.length} tokens generated.`, type: 'success' });
            } catch (err: any) {
                 setToast({ message: `Error: ${err.message}`, type: 'error' });
            }
        }
    };

    const handleDeleteTimetable = async () => {
        if (!timetableToDelete) return;
        setIsDeletingTimetable(true);
        try {
            await db.collection('timetables').doc(timetableToDelete.id).delete();
            setToast({ message: `Timetable for ${timetableToDelete.classId} deleted.`, type: 'success' });
        } catch (err: any) {
            setToast({ message: `Failed to delete: ${err.message}`, type: 'error' });
        } finally {
            setIsDeletingTimetable(false);
            setTimetableToDelete(null);
        }
    };

    const renderSchoolCalendar = () => (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">School Calendar</h3>
                <div className="flex border border-slate-600 rounded overflow-hidden">
                    <button 
                        onClick={() => setCalendarSubTab('list')} 
                        className={`px-4 py-2 text-sm font-medium transition-colors ${calendarSubTab === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                    >
                        Events List
                    </button>
                    <button 
                        onClick={() => setCalendarSubTab('flyer')} 
                        className={`px-4 py-2 text-sm font-medium transition-colors ${calendarSubTab === 'flyer' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                    >
                        Flyer Designer
                    </button>
                </div>
            </div>
            
            {calendarSubTab === 'list' && (
                <div className="animate-fade-in-short">
                    {/* Event Creation Form */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-8">
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Create New Event
                        </h4>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Event Title</label>
                                    <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required placeholder="e.g., Mid-Term Break" className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" spellCheck={true} autoCorrect="on"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                                    <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required className="w-full p-2 bg-slate-700 rounded-md border border-slate-600"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                <textarea rows={2} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Details about the event..." className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" spellCheck={true} autoCorrect="on" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Event Type</label>
                                    <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as SchoolEventType})} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600">
                                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Audience</label>
                                    <select value={newEvent.audience} onChange={e => setNewEvent({...newEvent, audience: e.target.value as SchoolEventAudience})} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600">
                                        {EVENT_AUDIENCE.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit">Create Event</Button>
                            </div>
                        </form>
                    </div>

                    {/* Event List */}
                    <h4 className="text-lg font-semibold mb-4">Upcoming Events</h4>
                    <div className="space-y-3">
                        {events.length > 0 ? events.map(event => (
                            <div key={event.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex justify-between items-start group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-bold text-lg text-slate-200">{event.title}</h5>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            event.type === 'Holiday' ? 'bg-green-900 text-green-300' :
                                            event.type === 'Exam' ? 'bg-red-900 text-red-300' :
                                            'bg-blue-900 text-blue-300'
                                        }`}>{event.type}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-2">{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    <p className="text-sm text-slate-300">{event.description}</p>
                                    <p className="text-xs text-gray-500 mt-2">Visible to: {event.audience}</p>
                                </div>
                                <button onClick={() => handleDeleteEvent(event.id)} className="text-slate-500 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100" title="Delete Event">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                </button>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-8">No events scheduled.</p>
                        )}
                    </div>
                </div>
            )}
            
            {calendarSubTab === 'flyer' && (
                <FlyerDesigner onClose={() => setCalendarSubTab('list')} />
            )}
        </Card>
    );


    const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: '📈' },
      { key: 'active_users', label: 'Active Users', icon: '🟢' },
      { key: 'approval_queue', label: 'Approval Queue', icon: '✅' },
      { key: 'user_management', label: 'User Management', icon: '👥' },
      { key: 'class_management', label: 'Class Management', icon: '🏫' },
      { key: 'attendance', label: 'Attendance', icon: '📅' },
      { key: 'timetable_management', label: 'Timetables', icon: '🗓️' },
      { key: 'school_calendar', label: 'School Calendar', icon: '🗓️' },
      { key: 'teaching_materials', label: 'Teaching Materials', icon: '📚' },
      { key: 'terminal_reports', label: 'Terminal Reports', icon: '📄' },
      { key: 'communication', label: 'Communication', icon: '💬' },
      { key: 'system_activation', label: 'System Activation', icon: '🔑' },
      { key: 'school_settings', label: 'Settings', icon: '⚙️' },
    ];
    
    const renderDashboard = () => (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Admin Dashboard</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h3 className="text-xl font-semibold text-center mb-4">User Roles Distribution</h3>
                    <div className="h-64">
                        <PieChart data={dashboardStats.pieData} />
                    </div>
                </Card>
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-semibold text-center mb-4">Live School Attendance (Simulated)</h3>
                    <div className="h-64">
                        <BarChart data={dashboardStats.attendanceData} />
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderUserManagement = () => (
        <Card>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h3 className="text-2xl font-bold">User Management</h3>
                <div className="flex items-center gap-2 border-b border-slate-700">
                    <button onClick={() => setUserManagementSubTab('view_users')} className={`px-3 py-1.5 text-sm ${userManagementSubTab === 'view_users' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>View Users</button>
                    <button onClick={() => setUserManagementSubTab('create_user')} className={`px-3 py-1.5 text-sm ${userManagementSubTab === 'create_user' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Create User</button>
                </div>
            </div>
            
            {userManagementSubTab === 'view_users' && (
                <div>
                    <div className="flex gap-4 mb-4 flex-wrap">
                        <input type="search" placeholder="Search by name..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className="w-full sm:w-auto flex-grow p-2 bg-slate-700 rounded-md border border-slate-600"/>
                        <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 capitalize"><option value="all">All Roles</option>{['student', 'teacher', 'parent', 'admin'].map(r => <option key={r} value={r} className="capitalize">{r}</option>)}</select>
                        <select value={userClassFilter} onChange={e => setUserClassFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600"><option value="all">All Classes</option>{GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    {selectedUserUids.length > 0 && <div className="p-2 bg-slate-900/50 flex items-center gap-4 mb-2"><span className="text-sm font-semibold">{selectedUserUids.length} selected</span><Button size="sm" variant="danger" onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={isDeletingUser}>{isDeletingUser ? 'Deleting...' : 'Delete Selected'}</Button></div>}
                    <div className="overflow-auto max-h-[60vh]"><table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800 sticky top-0"><tr>
                            <th className="p-2"><input type="checkbox" onChange={handleSelectAllUsers} className="h-4 w-4 rounded bg-slate-700 border-slate-500"/></th>
                            <th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Role</th><th className="px-4 py-2 text-left">Details</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-800">{filteredUsers.map(u => {
                            const creds = u.role === 'student' ? generateStudentCredentials(u, schoolSettings) : { email: u.email, password: 'N/A' };
                            return (
                            <tr key={u.uid} className="hover:bg-slate-800/50">
                                <td className="p-2"><input type="checkbox" checked={selectedUserUids.includes(u.uid)} onChange={() => handleSelectUser(u.uid)} className="h-4 w-4 rounded bg-slate-700 border-slate-500"/></td>
                                <td className="px-4 py-2">
                                    <div className="font-semibold">{u.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{creds.email}</div>
                                    {u.role === 'student' && (
                                        <div className="text-xs text-yellow-400 font-mono mt-1">
                                            Pass: {creds.password}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-2 capitalize">{u.role}</td><td className="px-4 py-2 text-sm text-gray-400">{u.class || u.classTeacherOf || ''}</td>
                                <td className="px-4 py-2"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === 'approved' ? 'bg-green-500 text-green-900' : 'bg-yellow-500 text-yellow-900'}`}>{u.status}</span></td>
                                <td className="px-4 py-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setEditingUser(u)}>Edit</Button><Button size="sm" variant="danger" onClick={() => setUserToDelete(u)}>Del</Button></td>
                            </tr>
                        )})}</tbody>
                    </table></div>
                </div>
            )}
            {userManagementSubTab === 'create_user' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AdminCreateUserForm />
                    <AdminCreateParentForm allStudents={allUsers.filter(u => u.role === 'student' && u.status === 'approved')} />
                    <div className="md:col-span-2 pt-4 border-t border-slate-700">
                        <h4 className="font-semibold text-lg">Batch Register with Camera</h4>
                        <p className="text-sm text-gray-400 my-2">Use your device's camera to quickly register multiple users from a list.</p>
                        <div className="flex gap-4">
                            <Button onClick={() => { setSnapToRegisterRole('student'); setShowSnapToRegister(true); }}>Register Students</Button>
                            <Button variant="secondary" onClick={() => { setSnapToRegisterRole('teacher'); setShowSnapToRegister(true); }}>Register Teachers</Button>
                        </div>
                    </div>
                 </div>
            )}
        </Card>
    );
    const renderClassManagement = () => (
        <Card>
            <h3 className="text-2xl font-bold mb-4">Class Management</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {GES_CLASSES.map(classId => (
                    <div key={classId} className="p-4 bg-slate-700 rounded-lg text-center">
                        <h4 className="font-bold">{classId}</h4>
                        <Button size="sm" className="mt-2" onClick={() => setManagingClass(classId)}>Manage</Button>
                    </div>
                ))}
            </div>
        </Card>
    );

    const renderTimetableManagement = () => (
        <Card>
            <div className="flex border-b border-slate-700 mb-6">
                <button onClick={() => setTimetableSubTab('generator')} className={`px-4 py-2 text-sm font-medium ${timetableSubTab === 'generator' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>AI Generator</button>
                <button onClick={() => setTimetableSubTab('viewer')} className={`px-4 py-2 text-sm font-medium ${timetableSubTab === 'viewer' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>View Existing</button>
            </div>
    
            {timetableSubTab === 'generator' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-short">
                    <div className="lg:col-span-1 space-y-4">
                        <div>
                            <h4 className="font-semibold text-lg mb-2">1. Configure Settings</h4>
                            <div className="space-y-2 text-sm">
                                <label>Lesson Duration (mins): <input type="number" value={timetableSettings.lessonDuration} onChange={e => handleTimetableSettingsChange('lessonDuration', parseInt(e.target.value))} className="w-20 p-1 bg-slate-700 rounded" /></label>
                                <label>Start Time: <input type="time" value={timetableSettings.startTime} onChange={e => handleTimetableSettingsChange('startTime', e.target.value)} className="p-1 bg-slate-700 rounded" /></label>
                                <label>End Time: <input type="time" value={timetableSettings.endTime} onChange={e => handleTimetableSettingsChange('endTime', e.target.value)} className="p-1 bg-slate-700 rounded" /></label>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-2">2. Select Classes</h4>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-900/50 rounded">
                                {GES_CLASSES.map(c => <label key={c} className="flex items-center space-x-2"><input type="checkbox" checked={classesForGeneration.includes(c)} onChange={() => handleClassSelectionChange(c)} className="h-4 w-4 rounded bg-slate-700" /><span>{c}</span></label>)}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-2">3. Describe Request</h4>
                            <textarea value={timetableGenerationPrompt} onChange={e => setTimetableGenerationPrompt(e.target.value)} rows={3} placeholder="e.g., 'Create a new timetable for the selected classes.' or 'Swap Maths and Science on Tuesday for Basic 1.'" className="w-full p-2 bg-slate-700 rounded" />
                        </div>
                        <Button onClick={handleGenerateTimetables} disabled={isGeneratingTimetable || classesForGeneration.length === 0 || !timetableGenerationPrompt.trim()}>
                            {isGeneratingTimetable ? 'Generating...' : 'Generate Timetables'}
                        </Button>
                    </div>
                    <div className="lg:col-span-2">
                        <h4 className="font-semibold text-lg mb-2">Preview</h4>
                        <div className="bg-slate-900/50 p-4 rounded-lg min-h-[50vh]">
                            {isGeneratingTimetable ? <div className="flex justify-center pt-10"><Spinner /></div> : generatedTimetablesPreview ? (
                                <div>
                                    <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2 overflow-x-auto">
                                        {generatedTimetablesPreview.map(p => <button key={p.classId} onClick={() => setActivePreviewClass(p.classId)} className={`px-3 py-1 text-sm rounded ${activePreviewClass === p.classId ? 'bg-blue-600' : 'bg-slate-700'}`}>{p.classId}</button>)}
                                    </div>
                                    {activePreviewClass && <NotebookTimetable classId={activePreviewClass} timetableData={generatedTimetablesPreview.find(p => p.classId === activePreviewClass)!.timetableData} />}
                                    <div className="flex gap-2 mt-4">
                                        <Button onClick={handleSaveGeneratedTimetables} disabled={isSavingTimetables}>{isSavingTimetables ? 'Saving...' : 'Save All Timetables'}</Button>
                                        <Button variant="secondary" onClick={() => setGeneratedTimetablesPreview(null)}>Discard</Button>
                                    </div>
                                </div>
                            ) : <p className="text-gray-500 text-center pt-10">Preview will appear here after generation.</p>}
                        </div>
                    </div>
                </div>
            )}
            {timetableSubTab === 'viewer' && (
                <div className="animate-fade-in-short">
                    {timetables.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {timetables.map(tt => (
                                <Card key={tt.id}>
                                    <h4 className="font-bold text-lg">{tt.classId}</h4>
                                    <p className="text-xs text-gray-400">Published by {tt.publishedBy} on {tt.publishedAt.toDate().toLocaleDateString()}</p>
                                    <div className="flex gap-2 mt-4">
                                        <Button size="sm" onClick={() => setViewingTimetable(tt)}>View</Button>
                                        <Button size="sm" variant="danger" onClick={() => setTimetableToDelete(tt)}>Delete</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : <p className="text-gray-400 text-center py-8">No timetables have been published yet.</p>}
                </div>
            )}
        </Card>
    );

    const renderTeachingMaterials = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
                <h3 className="text-xl font-bold mb-4">Upload New Material</h3>
                <form onSubmit={handleUploadMaterial} className="space-y-4">
                    <div>
                        <label htmlFor="mat-title">Title</label>
                        <input id="mat-title" type="text" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded-md" />
                    </div>
                    <div>
                        <label>Target Classes</label>
                        <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-md">
                            {GES_CLASSES.map(c => <label key={c} className="flex items-center space-x-2"><input type="checkbox" checked={materialTargetClasses.includes(c)} onChange={() => setMaterialTargetClasses(p => p.includes(c) ? p.filter(pc => pc !== c) : [...p, c])} className="h-4 w-4 rounded bg-slate-700" /><span>{c}</span></label>)}
                        </div>
                    </div>
                    <div>
                        <label>File</label>
                        <input type="file" onChange={e => setMaterialFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <Button type="submit" disabled={isUploading}>{isUploading ? 'Processing...' : 'Upload & Process'}</Button>
                    {isUploading && <div className="text-sm text-gray-400 flex items-center gap-2"><Spinner /> {loadingMessage}</div>}
                </form>
            </Card>
            <div className="lg:col-span-2">
                <h3 className="text-xl font-bold mb-4">Existing Materials</h3>
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    {teachingMaterials.length > 0 ? teachingMaterials.map(material => (
                        <Card key={material.id}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">{material.title}</h4>
                                    <p className="text-xs text-gray-400">By {material.uploaderName} on {material.createdAt.toDate().toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">Classes: {material.targetClasses.join(', ')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setViewingMaterial(material)}>View</Button>
                                    <Button size="sm" variant="danger" onClick={() => setMaterialToDelete(material)}>Delete</Button>
                                </div>
                            </div>
                        </Card>
                    )) : <p className="text-gray-400">No materials uploaded yet.</p>}
                </div>
            </div>
        </div>
    );

    const renderCommunication = () => (
        <Card className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Send Communication to Teachers</h3>
            <form onSubmit={handleCommunicationSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Target Classes</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-2 bg-slate-800 rounded-md max-h-40 overflow-y-auto">
                        {GES_CLASSES.map(c => (
                            <label key={c} className="flex items-center space-x-2 p-1.5 cursor-pointer">
                                <input type="checkbox" checked={communicationClasses.includes(c)} onChange={() => handleCommunicationClassChange(c)} className="h-4 w-4 rounded bg-slate-700 border-slate-500" />
                                <span>{c}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label htmlFor="comm-message" className="block text-sm font-medium text-gray-300">Message</label>
                    <textarea id="comm-message" rows={6} value={communicationMessage} onChange={e => setCommunicationMessage(e.target.value)} placeholder="Type your announcement or message here..." className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
                </div>
    
                <div className="p-4 bg-slate-900/50 rounded-lg space-y-3">
                    <label htmlFor="comm-file" className="block text-sm font-medium text-gray-300">Or, Attach a File for AI Summary</label>
                    <input id="comm-file" type="file" onChange={e => setCommunicationFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {communicationFile && (
                        <Button type="button" onClick={handleGenerateAiMessage} disabled={isGeneratingMessage || communicationClasses.length === 0} size="sm">
                            {isGeneratingMessage ? 'Generating...' : 'Generate Message with AI'}
                        </Button>
                    )}
                </div>
    
                {previewAiMessage && (
                    <div className="p-4 border border-blue-500/50 bg-blue-900/20 rounded-lg">
                        <h4 className="font-semibold text-blue-300 mb-2">AI Generated Preview:</h4>
                        <p className="text-sm whitespace-pre-wrap">{previewAiMessage}</p>
                        <div className="flex gap-2 mt-4">
                            <Button size="sm" type="button" onClick={() => { setCommunicationMessage(previewAiMessage); setPreviewAiMessage(null); }}>Use this Message</Button>
                            <Button size="sm" variant="secondary" type="button" onClick={() => setPreviewAiMessage(null)}>Discard</Button>
                        </div>
                    </div>
                )}
                
                <div className="pt-4 border-t border-slate-700">
                    <Button type="submit" disabled={isSendingMessage || (!communicationMessage.trim() && !previewAiMessage) || communicationClasses.length === 0}>
                        {isSendingMessage ? 'Sending...' : 'Send Message to Teachers'}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderSystemActivation = () => (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <h3 className="text-xl font-semibold mb-4">Current Subscription Status</h3>
                {subscriptionStatus ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Status:</strong> <span className={subscriptionStatus.isActive ? 'text-green-400' : 'text-red-400'}>{subscriptionStatus.isActive ? 'Active' : 'Inactive'}</span></p>
                        <p><strong>Plan Type:</strong> <span className="capitalize">{subscriptionStatus.planType || 'N/A'}</span></p>
                        <p><strong>Trial Ends:</strong> {subscriptionStatus.trialEndsAt ? subscriptionStatus.trialEndsAt.toDate().toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Subscription Ends:</strong> {subscriptionStatus.subscriptionEndsAt ? subscriptionStatus.subscriptionEndsAt.toDate().toLocaleDateString() : 'N/A'}</p>
                    </div>
                ) : <p>Loading subscription status...</p>}
            </Card>
    
            {userProfile?.adminType === 'super' && (
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Generate Activation Tokens</h3>
                    <form onSubmit={handleGenerateTokens} className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label htmlFor="token-count" className="text-sm">Number of Tokens</label>
                            <input id="token-count" name="token-count" type="number" min="1" max="50" defaultValue="1" className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="plan-type" className="text-sm">Plan Type</label>
                            <select id="plan-type" name="plan-type" className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600 capitalize">
                                <option value="monthly">Monthly</option>
                                <option value="termly">Termly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <Button type="submit">Generate</Button>
                    </form>
                </Card>
            )}
    
            <Card>
                <h3 className="text-xl font-semibold mb-4">Existing Tokens</h3>
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="p-2 text-left">Token</th>
                                <th className="p-2 text-left">Plan</th>
                                <th className="p-2 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activationTokens.map(token => (
                                <tr key={token.id} className="border-b border-slate-700">
                                    <td className="p-2 font-mono flex items-center gap-2">
                                        {token.id}
                                        <button onClick={() => { navigator.clipboard.writeText(token.id); setToast({ message: 'Token copied!', type: 'success' }); }} className="text-gray-400 hover:text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM5 11a1 1 0 100 2h4a1 1 0 100-2H5z" /></svg>
                                        </button>
                                    </td>
                                    <td className="p-2 capitalize">{token.planType}</td>
                                    <td className="p-2">{token.isUsed ? `Used on ${token.usedAt?.toDate().toLocaleDateString()}` : 'Not Used'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );

    const renderSchoolSettings = () => (
        <div className="space-y-6">
            <Card>
                 <h3 className="text-2xl font-bold mb-4">My Account</h3>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold">{userProfile?.name}</p>
                        <p className="text-sm text-gray-400">{userProfile?.email}</p>
                    </div>
                    <Button onClick={() => setShowChangePassword(true)} variant="secondary">Change Password</Button>
                 </div>
            </Card>
            <Card>
                <h3 className="text-2xl font-bold mb-6">General School Settings</h3>
                {currentSettings ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleSettingsSave(); }} className="space-y-4 max-w-lg">
                        <div>
                            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-300">School Name</label>
                            <input id="schoolName" type="text" value={currentSettings.schoolName} onChange={e => setCurrentSettings(s => s ? { ...s, schoolName: e.target.value } : null)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="schoolMotto" className="block text-sm font-medium text-gray-300">School Motto</label>
                            <input id="schoolMotto" type="text" value={currentSettings.schoolMotto} onChange={e => setCurrentSettings(s => s ? { ...s, schoolMotto: e.target.value } : null)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="academicYear" className="block text-sm font-medium text-gray-300">Academic Year (e.g., 2023-2024)</label>
                            <input id="academicYear" type="text" value={currentSettings.academicYear} onChange={e => setCurrentSettings(s => s ? { ...s, academicYear: e.target.value } : null)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="currentTerm" className="block text-sm font-medium text-gray-300">Current Term</label>
                            <select id="currentTerm" value={currentSettings.currentTerm || 1} onChange={e => setCurrentSettings(s => s ? { ...s, currentTerm: parseInt(e.target.value) } : null)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600">
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                         {userProfile?.adminType === 'super' && (
                             <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg mt-4">
                                 <h4 className="text-red-400 font-semibold mb-2">Admin Access Control</h4>
                                 <p className="text-xs text-gray-400 mb-2">Only super admins can see this. Co-admins are managed via the Users tab.</p>
                                 <div className="text-sm text-gray-300">
                                     Current Co-Admins: {currentSettings.coAdminUids?.length || 0}
                                 </div>
                             </div>
                         )}
                        <Button type="submit" disabled={isSavingSettings}>{isSavingSettings ? 'Saving...' : 'Save Settings'}</Button>
                    </form>
                ) : <div className="flex justify-center"><Spinner /></div>}
            </Card>
             <Card>
                <h3 className="text-2xl font-bold mb-6">Subject Configuration</h3>
                <p className="text-sm text-gray-400 mb-4">Select which subjects are offered for each class. These will appear in timetables and report cards.</p>
                {editedSubjectsByClass ? (
                    <div className="space-y-6">
                        {GES_CLASSES.map(className => (
                            <div key={className} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                <h4 className="font-bold text-lg mb-3 border-b border-slate-600 pb-1">{className}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {GES_SUBJECTS.map(subject => (
                                        <label key={`${className}-${subject}`} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-700 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={(editedSubjectsByClass[className] || []).includes(subject)} 
                                                onChange={() => handleSubjectChange(className, subject)}
                                                className="h-4 w-4 rounded bg-slate-900 border-slate-500 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-300">{subject}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <Button onClick={handleSaveSubjects} disabled={isSavingSubjects}>{isSavingSubjects ? 'Saving Subjects...' : 'Save Subject Configuration'}</Button>
                    </div>
                ) : <div className="flex justify-center"><Spinner /></div>}
            </Card>
        </div>
    );

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard': return renderDashboard();
            case 'active_users': return <ActiveUsersTable />;
            case 'user_management': return renderUserManagement();
            case 'class_management': return renderClassManagement();
            case 'timetable_management': return renderTimetableManagement();
            case 'school_calendar': return renderSchoolCalendar();
            case 'teaching_materials': return renderTeachingMaterials();
            case 'communication': return renderCommunication();
            case 'system_activation': return renderSystemActivation();
            case 'school_settings': return renderSchoolSettings();
            case 'terminal_reports': return <AdminTerminalReports allUsers={allUsers} schoolSettings={schoolSettings} userProfile={userProfile} />;
            case 'approval_queue': return <AdminApprovalQueue allUsers={allUsers} />;
            case 'attendance': return <AdminAttendanceDashboard allUsers={allUsers} attendanceRecords={attendanceRecords} />;
            default: return <div>Select a tab</div>;
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
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {renderContent()}
            </main>
            <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
            {editingUser && (
                <UserEditModal 
                    isOpen={!!editingUser} 
                    onClose={() => setEditingUser(null)} 
                    user={editingUser} 
                    onSave={handleSaveUser}
                    allUsers={allUsers}
                    subjectsByClass={subjectsByClass}
                />
            )}
             {managingClass && (
                <ClassManagerModal
                    classId={managingClass}
                    allUsers={allUsers}
                    onClose={() => setManagingClass(null)}
                    onSave={fetchAllUsers}
                />
             )}
             {snapToRegisterRole && showSnapToRegister && (
                <SnapToRegister 
                    roleToRegister={snapToRegisterRole}
                    onClose={() => setShowSnapToRegister(false)}
                />
             )}
             {viewingMaterial && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                     <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
                         <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                             <h3 className="text-xl font-bold">{viewingMaterial.title}</h3>
                             <button onClick={() => setViewingMaterial(null)} className="text-gray-400 hover:text-white">&times;</button>
                         </div>
                         <div className="flex-grow overflow-y-auto prose-styles prose-invert p-4 bg-slate-900/50 rounded-lg" dangerouslySetInnerHTML={{ __html: viewingMaterial.aiFormattedContent }}></div>
                     </Card>
                 </div>
             )}
             {viewingTimetable && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                     <Card className="w-full max-w-5xl overflow-auto max-h-[90vh]">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-xl font-bold">Timetable: {viewingTimetable.classId}</h3>
                             <Button variant="secondary" onClick={() => setViewingTimetable(null)}>Close</Button>
                         </div>
                         <NotebookTimetable classId={viewingTimetable.classId} timetableData={viewingTimetable.timetableData} />
                     </Card>
                 </div>
             )}
             <ConfirmationModal
                isOpen={isBulkDeleteConfirmOpen}
                onClose={() => setIsBulkDeleteConfirmOpen(false)}
                onConfirm={handleBulkDelete}
                title="Bulk Delete Users"
                message={`Are you sure you want to delete ${selectedUserUids.length} users? This action cannot be undone and will remove all associated data.`}
                isLoading={isDeletingUser}
                confirmButtonText="Yes, Delete"
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
