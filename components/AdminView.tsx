// FIX: `useMemo` was not imported. Added it to the import statement.
import React, { useState, useEffect, useRef, useMemo } from 'react';
// FIX: Switched from v9 modular imports to v8 compat syntax by adding 'firebase' to the import.
import { db, functions, storage, firebase } from '../services/firebase';
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
// FIX: Changed import to a named import as AdminApprovalQueue is not a default export.
import { AdminApprovalQueue } from './AdminApprovalQueue';
import ConfirmationModal from './common/ConfirmationModal';
import { useRejectUser } from '../hooks/useRejectUser';
import AdminCreateUserForm from './AdminCreateUserForm';
import AdminCreateParentForm from './AdminCreateParentForm';
import AdminAttendanceDashboard from './AdminAttendanceDashboard';

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

        // FIX: Replaced v9 onSnapshot(doc(...)) with v8 compat syntax.
        const unsubReport = db.collection('terminalReports').doc(reportId).onSnapshot((doc) => {
            setReportData(doc.exists ? doc.data() as TerminalReport : null);
            setIsLoading(false);
        }, () => setIsLoading(false));

        // FIX: Replaced v9 onSnapshot(doc(...)) with v8 compat syntax.
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
        // FIX: Replaced v9 doc() with v8 compat syntax.
        const summaryRef = db.collection('reportSummaries').doc(summaryId);
        try {
            // FIX: Replaced v9 setDoc() with v8 compat syntax.
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
    
    // State for pending changes
    const [classTeacherUid, setClassTeacherUid] = useState<string>('');
    const [otherTeacherUids, setOtherTeacherUids] = useState<string[]>([]);
    const [studentsInClass, setStudentsInClass] = useState<UserProfile[]>([]);
    const [otherStudents, setOtherStudents] = useState<UserProfile[]>([]);

    // State for transfer list selections
    const [selectedStudentsInClass, setSelectedStudentsInClass] = useState<string[]>([]);
    const [selectedOtherStudents, setSelectedOtherStudents] = useState<string[]>([]);
    
    useEffect(() => {
        // Initialize state from props
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

        // FIX: Replaced v9 writeBatch() with v8 compat syntax.
        const batch = db.batch();

        // 1. Update Class Teacher
        const originalTeacher = teachers.find(t => t.classTeacherOf === classId);
        if (originalTeacher && originalTeacher.uid !== classTeacherUid) {
            // FIX: Replaced v9 doc() with v8 compat syntax.
            const ref = db.collection('users').doc(originalTeacher.uid);
            // FIX: Replaced v9 deleteField() with v8 compat syntax.
            batch.update(ref, { classTeacherOf: firebase.firestore.FieldValue.delete() });
        }
        if (classTeacherUid && classTeacherUid !== originalTeacher?.uid) {
            // FIX: Replaced v9 doc() with v8 compat syntax.
            const ref = db.collection('users').doc(classTeacherUid);
            batch.update(ref, { classTeacherOf: classId });
        }

        // 2. Update Other Teachers' `classesTaught` array
        teachers.forEach(teacher => {
            // FIX: Replaced v9 doc() with v8 compat syntax.
            const userDocRef = db.collection('users').doc(teacher.uid);
            const isAssigned = otherTeacherUids.includes(teacher.uid) || classTeacherUid === teacher.uid;
            const wasAssigned = teacher.classesTaught?.includes(classId) || teacher.classTeacherOf === classId;

            if (isAssigned && !wasAssigned) {
                // FIX: Replaced v9 arrayUnion() with v8 compat syntax.
                batch.update(userDocRef, { classesTaught: firebase.firestore.FieldValue.arrayUnion(classId) });
            } else if (!isAssigned && wasAssigned) {
                // FIX: Replaced v9 arrayRemove() with v8 compat syntax.
                batch.update(userDocRef, { classesTaught: firebase.firestore.FieldValue.arrayRemove(classId) });
            }
        });

        // 3. Update students who are now in the class
        studentsInClass.forEach(student => {
            if (student.class !== classId) {
                // FIX: Replaced v9 doc() with v8 compat syntax.
                const ref = db.collection('users').doc(student.uid);
                batch.update(ref, { class: classId });
            }
        });
        
        // 4. Update students who were removed from the class
        otherStudents.forEach(student => {
            const wasInClass = allUsers.find(u => u.uid === student.uid)?.class === classId;
            if (wasInClass) {
                 // FIX: Replaced v9 doc() with v8 compat syntax.
                 const ref = db.collection('users').doc(student.uid);
                 // FIX: Replaced v9 deleteField() with v8 compat syntax.
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
                    {/* Teacher Assignment */}
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
                            {/* FIX: Explicitly cast `option` to `HTMLOptionElement` to resolve type error. */}
                            <select multiple value={otherTeacherUids} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOtherTeacherUids(Array.from(e.target.selectedOptions).map(option => (option as HTMLOptionElement).value))} className="w-full p-2 bg-slate-700 rounded-md h-24">
                                {teachers.filter(t => t.uid !== classTeacherUid).map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Student Transfer List */}
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Manage Students</h3>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            {/* Other Students */}
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
                            {/* Buttons */}
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => handleStudentMove('toClass')} disabled={selectedOtherStudents.length === 0}>>></Button>
                                <Button onClick={() => handleStudentMove('fromClass')} disabled={selectedStudentsInClass.length === 0}>&lt;&lt;</Button>
                            </div>
                            {/* Students in Class */}
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

interface AdminViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

// Helper to convert file to base64 for Gemini API
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

const AdminView: React.FC<AdminViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
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

    // Subject Management State
    const [editedSubjectsByClass, setEditedSubjectsByClass] = useState<SubjectsByClass | null>(null);
    const [isSavingSubjects, setIsSavingSubjects] = useState(false);
    
    // Class Management
    const [managingClass, setManagingClass] = useState<string | null>(null);

    // User & Content Management State
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
    const [rejectUsers, { loading: isDeletingUser, error: deleteError }] = useRejectUser();


    // Material Upload State
    const [teachingMaterials, setTeachingMaterials] = useState<TeachingMaterial[]>([]);
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [materialTargetClasses, setMaterialTargetClasses] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [materialToDelete, setMaterialToDelete] = useState<TeachingMaterial | null>(null);
    const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [viewingMaterial, setViewingMaterial] = useState<TeachingMaterial | null>(null);
    const [previewMaterialContent, setPreviewMaterialContent] = useState<string | null>(null);


    // Calendar State
    const [showEventForm, setShowEventForm] = useState(false);
    const [newEvent, setNewEvent] = useState<Omit<SchoolEvent, 'id' | 'createdAt'>>({ title: '', description: '', date: '', type: 'Event', audience: 'All', createdBy: '', createdByName: '' });

    // Timetable State
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

    // Communication State
    const [communicationMessage, setCommunicationMessage] = useState('');
    const [communicationClasses, setCommunicationClasses] = useState<string[]>([]);
    const [communicationFile, setCommunicationFile] = useState<File | null>(null);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
    const [previewAiMessage, setPreviewAiMessage] = useState<string | null>(null);


    // AI Assistant State
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

    const handleTimetableSettingsChange = (field: keyof typeof timetableSettings, value: string | number) => {
        setTimetableSettings(prev => ({ ...prev, [field]: value }));
    };

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            // FIX: Replaced v9 getDocs(collection(...)) with v8 compat syntax.
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

        // FIX: Replaced v9 onSnapshot(doc(...)) with v8 compat syntax.
        unsubscribers.push(db.collection('schoolConfig').doc('subjects').onSnapshot((doc) => {
            const data = doc.exists ? doc.data() as SubjectsByClass : {};
            setSubjectsByClass(data);
            setEditedSubjectsByClass(JSON.parse(JSON.stringify(data))); // Deep copy for editing
        }));
        
        // FIX: Replaced v9 onSnapshot(collection(...)) with v8 compat syntax.
        unsubscribers.push(db.collection('timetables').onSnapshot((snap) => {
            setTimetables(snap.docs.map(doc => doc.data() as Timetable));
        }));
        
        // FIX: Replaced v9 onSnapshot(query(collection(...), orderBy(...))) with v8 compat syntax.
        unsubscribers.push(db.collection('calendarEvents').orderBy('date', 'desc').onSnapshot((snap) => {
            setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent)));
        }));
        
        // FIX: Replaced v9 onSnapshot(query(collection(...), orderBy(...))) with v8 compat syntax.
        unsubscribers.push(db.collection('teachingMaterials').orderBy('createdAt', 'desc').onSnapshot((snap) => {
            setTeachingMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingMaterial)));
        }));
        
        // FIX: Replaced v9 onSnapshot(collection(...)) with v8 compat syntax.
        unsubscribers.push(db.collection('activationTokens').onSnapshot((snap) => {
            const tokens = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as ActivationToken));
            // FIX: Add fallback for planType to prevent crash if data is malformed.
            setActivationTokens(tokens.sort((a, b) => (a.planType || '').localeCompare(b.planType || '')));
        }));
        
        // FIX: Replaced v9 onSnapshot(collection(...)) with v8 compat syntax.
        unsubscribers.push(db.collection('attendance').onSnapshot((snap) => {
            setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
        }));

        return () => unsubscribers.forEach(unsub => unsub());

    }, []);


    useEffect(() => {
        setCurrentSettings(schoolSettings);
    }, [schoolSettings]);
    

    // AI Assistant Context
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
            // FIX: Replaced v9 setDoc(doc(...)) with v8 compat syntax.
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
            // FIX: Replaced v9 serverTimestamp() with v8 compat syntax.
            createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
        };

        try {
            // FIX: Replaced v9 addDoc(collection(...)) with v8 compat syntax.
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
            // FIX: Replaced v9 deleteDoc(doc(...)) with v8 compat syntax.
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
            const taskDescription = isCreation ?
                "You are a school administrator creating a new weekly timetable from scratch." :
                "You are a school administrator modifying an existing weekly timetable based on a user's request.";
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
                model: 'gemini-2.5-flash',
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
            // FIX: Replaced v9 writeBatch() with v8 compat syntax.
            const batch = db.batch();
            generatedTimetablesPreview.forEach(({ classId, timetableData }) => {
                // FIX: Replaced v9 doc() with v8 compat syntax.
                const timetableRef = db.collection('timetables').doc(classId);
                const timetable: Omit<Timetable, 'id'> = {
                    classId: classId,
                    timetableData: timetableData,
                    // FIX: Replaced v9 serverTimestamp() with v8 compat syntax and casted type.
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
            // FIX: Replaced v9 setDoc(doc(...)) with v8 compat syntax.
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
                model: 'gemini-2.5-flash',
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
        // FIX: Replaced v9 writeBatch() with v8 compat syntax.
        const batch = db.batch();
        // FIX: Replaced v9 doc() with v8 compat syntax.
        const userRef = db.collection('users').doc(uid);

        // If a parent's child links changed, we need to update the children too.
        if (data.role === 'parent' && data.childUids) {
            const originalUser = allUsers.find(u => u.uid === uid);
            const originalChildren = originalUser?.childUids || [];
            const newChildren = data.childUids;
            
            const addedChildren = newChildren.filter(id => !originalChildren.includes(id));
            const removedChildren = originalChildren.filter(id => !newChildren.includes(id));

            addedChildren.forEach(childId => {
                // FIX: Replaced v9 doc() with v8 compat syntax.
                const childRef = db.collection('users').doc(childId);
                // FIX: Replaced v9 arrayUnion() with v8 compat syntax.
                batch.update(childRef, { parentUids: firebase.firestore.FieldValue.arrayUnion(uid) });
            });
            removedChildren.forEach(childId => {
                // FIX: Replaced v9 doc() with v8 compat syntax.
                const childRef = db.collection('users').doc(childId);
                // FIX: Replaced v9 arrayRemove() with v8 compat syntax.
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
                model: 'gemini-2.5-flash',
                contents: { parts: [filePart, { text: prompt }] },
            });
            const aiFormattedContent = response.text;
            
            setLoadingMessage('Saving material to database...');
            // FIX: Replaced v9 addDoc(collection(...)) with v8 compat syntax.
            await db.collection('teachingMaterials').add({
                title: materialTitle,
                targetClasses: materialTargetClasses,
                uploaderId: userProfile.uid,
                uploaderName: userProfile.name,
                originalFileName: materialFile.name,
                aiFormattedContent: aiFormattedContent,
                // FIX: Replaced v9 serverTimestamp() with v8 compat syntax.
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
    
    // FIX: Changed event type to React.FormEvent<HTMLFormElement> to correctly type e.currentTarget.
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
            // FIX: Replaced v9 deleteDoc(doc(...)) with v8 compat syntax.
            await db.collection('timetables').doc(timetableToDelete.id).delete();
            setToast({ message: `Timetable for ${timetableToDelete.classId} deleted.`, type: 'success' });
        } catch (err: any) {
            setToast({ message: `Failed to delete: ${err.message}`, type: 'error' });
        } finally {
            setIsDeletingTimetable(false);
            setTimetableToDelete(null);
        }
    };


    const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75Z" /></svg> },
      { key: 'approval_queue', label: 'Approval Queue', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
      { key: 'user_management', label: 'User Management', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-7.962a9.348 9.348 0 0 0-1.25-4.433-9.338 9.338 0 0 0-4.088-3.952m-13.5 7.962a9.348 9.348 0 0 0 1.25 4.433m11-4.433c0 1.631-1.314 2.945-2.945 2.945-1.631 0-2.945-1.314-2.945-2.945s1.314-2.945 2.945-2.945 2.945 1.314 2.945 2.945Z" /></svg> },
      { key: 'class_management', label: 'Class Management', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg> },
      { key: 'attendance', label: 'Attendance', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
      { key: 'timetable_management', label: 'Timetables', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18" /></svg> },
      { key: 'teaching_materials', label: 'Teaching Materials', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
      { key: 'terminal_reports', label: 'Terminal Reports', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
      { key: 'communication', label: 'Communication', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.233.323 2.385.88 3.39V17a1 1 0 001.447.894L10 15.118l3.673 2.776A1 1 0 0015 17v-4.61c.557-1.005.88-2.214.88-3.39a6 6 0 00-6-6zM8 8a1 1 0 112 0v1a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> },
      { key: 'system_activation', label: 'System Activation', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25-2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg> },
      { key: 'school_settings', label: 'Settings', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-.95.542.057 1.007.56 1.066 1.11.06.541-.218 1.14-.644 1.527a4.953 4.953 0 0 1-2.072.827c-.541.06-.95.542-.95 1.11 0 .542.409 1.007.95 1.11a4.953 4.953 0 0 1 2.072.827c.426.387.704.986.644 1.527-.06.542-.524 1.053-1.066 1.11-.541.057-1.02-.352-1.11-.95a4.953 4.953 0 0 1-.95-2.072c-.057-.542-.56-1.007-1.11-.95-.542-.057-1.007-.56-1.066-1.11-.06-.541.218-1.14.644-1.527a4.953 4.953 0 0 1 2.072-.827c.541-.06.95-.542-.95-1.11 0 .542-.409-1.007-.95-1.11a4.953 4.953 0 0 1-2.072-.827c-.426-.387-.704-.986-.644-1.527.06-.542.524-1.053 1.066 1.11.541-.057 1.02.352 1.11-.95Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.98 3.94c.09-.542.56-1.007 1.11-.95.542.057 1.007.56 1.066 1.11.06.541-.218 1.14-.644 1.527a4.953 4.953 0 0 1-2.072.827c-.541.06-.95.542-.95 1.11 0 .542.409 1.007.95 1.11a4.953 4.953 0 0 1 2.072.827c.426.387.704.986.644 1.527-.06.542-.524 1.053-1.066 1.11-.541.057-1.02-.352-1.11-.95a4.953 4.953 0 0 1-.95-2.072c-.057-.542-.56-1.007-1.11-.95-.542-.057-1.007-.56-1.066-1.11-.06-.541.218-1.14.644-1.527a4.953 4.953 0 0 1 2.072-.827c.541-.06.95-.542-.95-1.11 0 .542-.409-1.007-.95-1.11a4.953 4.953 0 0 1-2.072-.827c-.426-.387-.704-.986-.644-1.527.06-.542.524-1.053 1.066 1.11.541-.057 1.02.352 1.11-.95Z" /></svg> },
    ];
    
    // RENDER FUNCTIONS FOR EACH TAB
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
                                    <div className="text-xs text-gray-400">{creds.email}</div>
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
                        <Button type="submit" disabled={isSavingSettings}>{isSavingSettings ? 'Saving...' : 'Save Settings'}</Button>
                    </form>
                ) : <Spinner />}
            </Card>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">Subject Management</h3>
                    <Button onClick={handleSaveSubjects} disabled={isSavingSubjects}>{isSavingSubjects ? 'Saving...' : 'Save Subject Changes'}</Button>
                </div>
                <p className="text-sm text-gray-400 mb-4">Enable or disable subjects for each class. This affects which subjects teachers can be assigned to.</p>
                {editedSubjectsByClass ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {GES_CLASSES.map(classId => (
                            <details key={classId} className="bg-slate-900/50 rounded-lg">
                                <summary className="font-semibold p-3 cursor-pointer">{classId}</summary>
                                <div className="p-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {GES_SUBJECTS.map(subject => (
                                        <label key={`${classId}-${subject}`} className="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox"
                                                checked={(editedSubjectsByClass[classId] || []).includes(subject)}
                                                onChange={() => handleSubjectChange(classId, subject)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700"
                                            />
                                            <span className="text-gray-300 text-sm">{subject}</span>
                                        </label>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : <Spinner />}
            </Card>
        </div>
    );
    
    const renderContent = () => {
        if (loadingUsers) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;
        switch(activeTab) {
            case 'dashboard': return renderDashboard();
            case 'approval_queue': return <Card><AdminApprovalQueue allUsers={allUsers} /></Card>;
            case 'user_management': return renderUserManagement();
            case 'class_management': return renderClassManagement();
            case 'attendance': return <AdminAttendanceDashboard allUsers={allUsers} attendanceRecords={attendanceRecords} />;
            case 'timetable_management': return renderTimetableManagement();
            case 'teaching_materials': return renderTeachingMaterials();
            case 'terminal_reports': return <AdminTerminalReports allUsers={allUsers} schoolSettings={schoolSettings} userProfile={userProfile} />;
            case 'communication': return renderCommunication();
            case 'system_activation': return renderSystemActivation();
            case 'school_settings': return renderSchoolSettings();
            default: return renderDashboard();
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

            {/* Modals and other floating components */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
            {editingUser && <UserEditModal isOpen={!!editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} user={editingUser} allUsers={allUsers} subjectsByClass={subjectsByClass} />}
            {managingClass && <ClassManagerModal classId={managingClass} allUsers={allUsers} onClose={() => setManagingClass(null)} onSave={() => fetchAllUsers()} />}
            {viewingMaterial && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{viewingMaterial.title}</h3>
                            <Button onClick={() => setViewingMaterial(null)}>Close</Button>
                        </div>
                        <div className="flex-grow overflow-y-auto bg-slate-900 p-6 rounded-md prose-styles prose-invert" dangerouslySetInnerHTML={{ __html: viewingMaterial.aiFormattedContent }} />
                    </Card>
                </div>
            )}
            {viewingTimetable && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50" onClick={() => setViewingTimetable(null)}>
                    <div className="w-full max-w-5xl" onClick={e => e.stopPropagation()}>
                        <NotebookTimetable classId={viewingTimetable.classId} timetableData={viewingTimetable.timetableData} />
                        <Button onClick={() => setViewingTimetable(null)} className="mt-4">Close</Button>
                    </div>
                </div>
            )}
            <ConfirmationModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={() => { if(userToDelete) rejectUsers([{uid: userToDelete.uid, role: userToDelete.role}]).then(() => { setUserToDelete(null); fetchAllUsers(); }); }} title="Delete User?" message={<>Are you sure you want to permanently delete <strong>{userToDelete?.name}</strong>? This will permanently delete their account and all associated data (submissions, etc). This action cannot be undone.</>} isLoading={isDeletingUser} confirmButtonText="Yes, Delete User" />
            <ConfirmationModal isOpen={isBulkDeleteConfirmOpen} onClose={() => setIsBulkDeleteConfirmOpen(false)} onConfirm={handleBulkDelete} title={`Delete ${selectedUserUids.length} Users?`} message={<>Are you sure you want to permanently delete these <strong>{selectedUserUids.length}</strong> users and all their associated data? This action cannot be undone.</>} isLoading={isDeletingUser} confirmButtonText="Yes, Delete All" />
            <ConfirmationModal isOpen={!!materialToDelete} onClose={() => setMaterialToDelete(null)} onConfirm={handleDeleteMaterial} title="Delete Material?" message={<>Are you sure you want to delete <strong>{materialToDelete?.title}</strong>? This action cannot be undone.</>} isLoading={isDeletingMaterial} confirmButtonText="Yes, Delete" />
            <ConfirmationModal isOpen={!!timetableToDelete} onClose={() => setTimetableToDelete(null)} onConfirm={handleDeleteTimetable} title="Delete Timetable?" message={<>Are you sure you want to delete the timetable for <strong>{timetableToDelete?.classId}</strong>?</>} isLoading={isDeletingTimetable} confirmButtonText="Yes, Delete" />
            {showSnapToRegister && <SnapToRegister onClose={() => setShowSnapToRegister(false)} roleToRegister={snapToRegisterRole} />}
        </div>
    );
};

export default AdminView;