
import React, { useState, useEffect } from 'react';
import { db, firebase } from '../services/firebase';
import { UserProfile, AttendanceStatus, AttendanceRecord } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import { useAuthentication } from '../hooks/useAuth';

interface TeacherAttendanceProps {
    teacherClasses: string[];
    students: UserProfile[];
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ teacherClasses, students }) => {
    const { user, userProfile } = useAuthentication();
    const { showToast } = useToast();
    const [selectedClass, setSelectedClass] = useState(teacherClasses[0] || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const filteredStudents = students.filter(s => s.class === selectedClass);

    useEffect(() => {
        const fetchExisting = async () => {
            if (!selectedClass || !date) return;
            setLoading(true);
            try {
                const docId = `${date}_${selectedClass}`;
                const doc = await db.collection('attendance').doc(docId).get();
                if (doc.exists) {
                    const data = doc.data() as AttendanceRecord;
                    setRecords(data.records || {});
                } else {
                    const initial: Record<string, AttendanceStatus> = {};
                    filteredStudents.forEach(s => initial[s.uid] = 'Present');
                    setRecords(initial);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchExisting();
    }, [selectedClass, date, students]);

    const handleUpdate = (uid: string, status: AttendanceStatus) => {
        setRecords(prev => ({ ...prev, [uid]: status }));
    };

    const handleSave = async () => {
        if (!user || !userProfile) return;
        setIsSaving(true);
        try {
            const docId = `${date}_${selectedClass}`;
            await db.collection('attendance').doc(docId).set({
                id: docId,
                date,
                classId: selectedClass,
                teacherId: user.uid,
                teacherName: userProfile.name,
                records,
                studentUids: filteredStudents.map(s => s.uid),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("Attendance saved successfully.", "success");
        } catch (err: any) {
            showToast(`Error: ${err.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const markAll = (status: AttendanceStatus) => {
        const newRecords: Record<string, AttendanceStatus> = {};
        filteredStudents.forEach(s => newRecords[s.uid] = status);
        setRecords(newRecords);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex gap-4">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                        {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => markAll('Present')}>Mark All Present</Button>
                    <Button variant="secondary" size="sm" onClick={() => markAll('Absent')}>Mark All Absent</Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Attendance'}</Button>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden">
                {loading ? <div className="p-20 flex justify-center"><Spinner /></div> : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStudents.map(student => (
                                <tr key={student.uid} className="hover:bg-white/[0.02]">
                                    <td className="px-6 py-4 font-bold text-white uppercase">{student.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-4">
                                            {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(status => (
                                                <label key={status} className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        name={`status-${student.uid}`} 
                                                        checked={records[student.uid] === status} 
                                                        onChange={() => handleUpdate(student.uid, status)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${records[student.uid] === status ? 'bg-blue-500 border-blue-400 scale-125 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-slate-600 group-hover:border-slate-400'}`}></div>
                                                    <span className={`text-xs font-bold transition-colors ${records[student.uid] === status ? 'text-white' : 'text-slate-500'}`}>{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && <tr><td colSpan={2} className="p-20 text-center text-slate-600 italic">No students found in this class.</td></tr>}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};

export default TeacherAttendance;
