import React, { useState, useEffect, useMemo } from 'react';
import { db, firebase } from '../services/firebase';
import { UserProfile, AttendanceStatus, AttendanceRecord } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import { useAuthentication } from '../hooks/useAuth';

const OMNI_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

interface TeacherAttendanceProps {
    teacherClasses: string[];
    students: UserProfile[];
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ teacherClasses, students }) => {
    const { user, userProfile } = useAuthentication();
    const { showToast } = useToast();
    const [selectedClass, setSelectedClass] = useState(userProfile?.classTeacherOf || teacherClasses[0] || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isOmni = useMemo(() => OMNI_EMAILS.includes(user?.email || ""), [user]);
    
    // AUTHORITY CHECK: Is this teacher the official class teacher for the selected class?
    const isDesignatedClassTeacher = useMemo(() => {
        if (isOmni) return true;
        return userProfile?.classTeacherOf === selectedClass;
    }, [userProfile, selectedClass, isOmni]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.class === selectedClass).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    , [students, selectedClass]);

    // PREVENT INCOMPLETE RECORDS: Check if all students in the list have been marked
    const isMarkingComplete = useMemo(() => {
        if (filteredStudents.length === 0) return false;
        return filteredStudents.every(student => !!records[student.uid]);
    }, [filteredStudents, records]);

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
                    // Reset records when changing class or date if no record exists
                    setRecords({});
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchExisting();
    }, [selectedClass, date]);

    const handleUpdate = (uid: string, status: AttendanceStatus) => {
        if (!isDesignatedClassTeacher) {
            showToast("Protocol locked. You are not the designated class teacher.", "error");
            return;
        }
        setRecords(prev => ({ ...prev, [uid]: status }));
    };

    const handleSave = async () => {
        if (!user || !userProfile || !isDesignatedClassTeacher) {
            showToast("Unauthorized: Protocol Restricted to Designated Class Teacher.", "error");
            return;
        }
        if (!isMarkingComplete) {
            showToast("Incomplete Registry: Please mark all students before saving.", "error");
            return;
        }

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
            showToast("Registry Committed Successfully.", "success");
        } catch (err: any) {
            showToast(`Protocol Interrupted: ${err.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const markAll = (status: AttendanceStatus) => {
        if (!isDesignatedClassTeacher) return;
        const newRecords: Record<string, AttendanceStatus> = {};
        filteredStudents.forEach(s => newRecords[s.uid] = status);
        setRecords(newRecords);
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* Header / Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900/60 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Class Registry</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500">
                            {teacherClasses.map(c => (
                                <option key={c} value={c}>
                                    {c} {userProfile?.classTeacherOf === c ? '(Official Responsibility)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registry Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500" />
                    </div>
                </div>

                {!isDesignatedClassTeacher ? (
                    <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 px-6 py-4 rounded-2xl w-full xl:w-auto">
                        <span className="text-xl">🛡️</span>
                        <div>
                            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest leading-none">ReadOnly Inspection Mode</p>
                            <p className="text-slate-500 text-[9px] font-bold uppercase mt-1">Marking restricted to official Class Teacher.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <Button variant="secondary" size="sm" onClick={() => markAll('Present')} className="flex-1 sm:flex-none py-3 px-4 text-[10px] font-black uppercase">Present All</Button>
                        <div className="flex flex-col gap-1">
                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving || !isMarkingComplete} 
                                className={`flex-1 sm:flex-none py-3 px-10 text-[10px] font-black uppercase shadow-xl ${!isMarkingComplete ? 'opacity-50 grayscale' : 'shadow-blue-900/30'}`}
                            >
                                {isSaving ? <Spinner /> : '🚀 Commit Registry'}
                            </Button>
                            {!isMarkingComplete && filteredStudents.length > 0 && (
                                <span className="text-[8px] text-orange-400 font-bold uppercase text-center animate-pulse">Mark all to enable save</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* List Table */}
            <Card className="!p-0 overflow-hidden border-white/5 shadow-3xl rounded-[2.5rem] relative">
                {!isDesignatedClassTeacher && (
                    <div className="absolute inset-0 z-10 bg-slate-950/40 backdrop-grayscale pointer-events-none"></div>
                )}
                {loading ? <div className="p-32 flex justify-center"><Spinner /></div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-black tracking-[0.3em]">
                                <tr>
                                    <th className="px-8 py-6 w-12">#</th>
                                    <th className="px-8 py-6">Student Terminal Identity</th>
                                    <th className="px-8 py-6 text-center">Authorization Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map((student, idx) => (
                                    <tr key={student.uid} className={`group transition-colors ${!isDesignatedClassTeacher ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}>
                                        <td className="px-8 py-6 text-xs font-mono text-slate-600">{idx + 1}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-slate-400 shadow-inner">
                                                    {(student.name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-base tracking-tight group-hover:text-blue-400 transition-colors uppercase">{student.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{student.uid.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center gap-6">
                                                {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(status => (
                                                    <label 
                                                        key={status} 
                                                        className={`flex items-center gap-3 transition-all ${
                                                            isDesignatedClassTeacher ? 'cursor-pointer group/opt' : 'cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="radio" 
                                                            name={`status-${student.uid}`} 
                                                            checked={records[student.uid] === status} 
                                                            onChange={() => handleUpdate(student.uid, status)}
                                                            disabled={!isDesignatedClassTeacher}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                                                            records[student.uid] === status 
                                                                ? status === 'Present' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 
                                                                  status === 'Absent' ? 'bg-rose-500 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' :
                                                                  'bg-amber-500 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                                                : 'border-slate-700 group-hover/opt:border-slate-500'
                                                        }`}>
                                                            {records[student.uid] === status && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                            records[student.uid] === status ? 'text-white' : 'text-slate-500'
                                                        }`}>{status}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-32 text-center text-slate-600 italic">
                                            <div className="text-6xl mb-4 opacity-10">📂</div>
                                            <p className="font-black uppercase tracking-widest">Sector Empty</p>
                                            <p className="text-[10px] mt-2">No students linked to this class registry.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TeacherAttendance;