
import React, { useState, useEffect } from 'react';
import { db, firebase } from '../services/firebase';
import { GES_CLASSES, GES_SUBJECTS, TerminalReport, TerminalReportMark, UserProfile, SchoolSettings } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';

const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D+';
    if (score >= 40) return 'D';
    return 'F';
};

const AdminTerminalReports: React.FC<{ schoolSettings: SchoolSettings | null, user: firebase.User | null }> = ({ schoolSettings, user }) => {
    const { showToast } = useToast();
    const [selectedClass, setSelectedClass] = useState(GES_CLASSES[0]);
    const [selectedSubject, setSelectedSubject] = useState(GES_SUBJECTS[0]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [marks, setMarks] = useState<Record<string, Partial<TerminalReportMark>>>({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch students for the selected class
    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const snapshot = await db.collection('users')
                    .where('role', '==', 'student')
                    .where('class', '==', selectedClass)
                    .get();
                const fetchedStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
                setStudents(fetchedStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            } catch (err) {
                console.error("Error fetching students:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [selectedClass]);

    // Fetch existing report data
    useEffect(() => {
        if (!schoolSettings) return;
        const fetchReport = async () => {
            const academicYear = schoolSettings.academicYear?.replace(/\//g, '-') || '';
            const term = schoolSettings.currentTerm || 1;
            const reportId = `${academicYear}_${term}_${selectedClass}`;
            
            try {
                const doc = await db.collection('terminalReports').doc(reportId).get();
                if (doc.exists) {
                    const data = doc.data() as TerminalReport;
                    if (data.subjects && data.subjects[selectedSubject]) {
                        setMarks(data.subjects[selectedSubject].marks || {});
                    } else {
                        setMarks({});
                    }
                } else {
                    setMarks({});
                }
            } catch (err) {
                console.error("Error fetching report:", err);
            }
        };
        fetchReport();
    }, [selectedClass, selectedSubject, schoolSettings]);

    const handleMarkChange = (studentId: string, field: keyof TerminalReportMark, value: string) => {
        const numericValue = value === '' ? undefined : Number(value);
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: numericValue
            }
        }));
    };

    const calculateTotalsAndSave = async () => {
        if (!selectedClass || !selectedSubject || !schoolSettings || !user) {
            showToast("Missing required information.", 'error');
            return;
        }
        setIsSaving(true);

        const calculatedMarks: Record<string, TerminalReportMark> = {};
        const studentTotals: { studentId: string, total: number }[] = [];

        students.forEach(student => {
            const studentMark = marks[student.uid] || {};
            
            const totalClassScore = (studentMark.indivTest || 0) + (studentMark.groupWork || 0) + (studentMark.classTest || 0) + (studentMark.project || 0);
            const examScore = studentMark.endOfTermExams || 0;

            const scaledClassScore = (totalClassScore / 60) * 50;
            const scaledExamScore = (examScore / 100) * 50;
            const overallTotal = scaledClassScore + scaledExamScore;
            
            calculatedMarks[student.uid] = {
                studentName: student.name,
                indivTest: studentMark.indivTest,
                groupWork: studentMark.groupWork,
                classTest: studentMark.classTest,
                project: studentMark.project,
                endOfTermExams: studentMark.endOfTermExams,
                totalClassScore: parseFloat(totalClassScore.toFixed(1)),
                scaledClassScore: parseFloat(scaledClassScore.toFixed(1)),
                scaledExamScore: parseFloat(scaledExamScore.toFixed(1)),
                overallTotal: parseFloat(overallTotal.toFixed(1)),
                grade: getGrade(overallTotal),
            };
            studentTotals.push({ studentId: student.uid, total: overallTotal });
        });
        
        // Calculate Positions
        studentTotals.sort((a, b) => b.total - a.total);
        studentTotals.forEach((item, index) => {
            let position = index + 1;
            if (index > 0 && item.total === studentTotals[index - 1].total) {
                position = calculatedMarks[studentTotals[index - 1].studentId].position || position;
            }
            calculatedMarks[item.studentId].position = position;
        });

        const academicYear = schoolSettings.academicYear.replace(/\//g, '-');
        const term = schoolSettings.currentTerm || 1;
        const reportId = `${academicYear}_${term}_${selectedClass}`;
        const reportRef = db.collection('terminalReports').doc(reportId);

        try {
            await reportRef.set({
                id: reportId,
                academicYear: schoolSettings.academicYear,
                term,
                classId: selectedClass,
                subjects: {
                    [selectedSubject]: {
                        teacherId: user.uid, // Admin editing acts as teacher
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        marks: calculatedMarks
                    }
                }
            }, { merge: true });

            setMarks(calculatedMarks);
            showToast('Marks saved successfully!', 'success');
        } catch (err: any) {
            showToast(`Failed to save marks: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                 <div>
                     <h2 className="text-2xl font-bold text-white">Master Report Sheet</h2>
                     <p className="text-xs text-slate-400 mt-1">View and edit marks for any class.</p>
                 </div>
                 <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="hidden md:block h-8 w-px bg-slate-700 mx-2"></div>
                    <Button onClick={calculateTotalsAndSave} disabled={isSaving || loading} className="flex-grow md:flex-grow-0 shadow-lg shadow-blue-600/20">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                 </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-64"><Spinner /></div>
            ) : (
                 <div className="overflow-auto border border-slate-700 rounded-xl shadow-inner custom-scrollbar flex-grow relative">
                     <div className="min-w-[1000px]">
                         <table className="w-full text-sm border-collapse">
                             <thead className="bg-slate-800 sticky top-0 z-20">
                                <tr>
                                    <th rowSpan={2} className="p-3 text-left border-b border-r border-slate-600 font-bold text-slate-300 min-w-[180px] sticky left-0 bg-slate-800 z-30 shadow-lg">STUDENT NAME</th>
                                    <th colSpan={4} className="p-2 border-b border-r border-slate-600 text-center bg-blue-900/20 text-blue-200 font-bold">CLASS ASSESSMENT (15 each)</th>
                                    <th rowSpan={2} className="p-2 border-b border-r border-slate-600 text-center w-20 font-bold bg-slate-700/50 text-slate-300">CLASS (50%)</th>
                                    <th rowSpan={2} className="p-2 border-b border-r border-slate-600 text-center w-24 font-bold bg-purple-900/20 text-purple-200">EXAM (100)</th>
                                    <th rowSpan={2} className="p-2 border-b border-r border-slate-600 text-center w-20 font-bold bg-slate-700/50 text-slate-300">EXAM (50%)</th>
                                    <th colSpan={3} className="p-2 border-b border-slate-600 text-center bg-green-900/20 text-green-200 font-bold">FINAL GRADING</th>
                                </tr>
                                <tr className="text-xs text-slate-400">
                                    <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">ASSIGNMENTS</th>
                                    <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">GROUP</th>
                                    <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">TEST</th>
                                    <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">PROJECT</th>
                                    <th className="p-2 border-b border-r border-slate-600 font-bold text-white bg-slate-900/50">TOTAL (100)</th>
                                    <th className="p-2 border-b border-r border-slate-600 font-bold text-white bg-slate-900/50">GRADE</th>
                                    <th className="p-2 border-b border-slate-600 font-bold text-white bg-slate-900/50">POS.</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                {students.map((student) => {
                                    const mark = marks[student.uid] || {};
                                    const totalClassScore = (mark.indivTest || 0) + (mark.groupWork || 0) + (mark.classTest || 0) + (mark.project || 0);
                                    const scaledClassScore = (totalClassScore / 60) * 50;
                                    const scaledExamScore = ((mark.endOfTermExams || 0) / 100) * 50;
                                    const overallTotal = scaledClassScore + scaledExamScore;
                                    const grade = getGrade(overallTotal);

                                    let gradeColor = 'text-slate-400';
                                    if (grade === 'A') gradeColor = 'text-green-400 font-black';
                                    else if (grade.startsWith('B')) gradeColor = 'text-green-300 font-bold';
                                    else if (grade === 'F') gradeColor = 'text-red-500 font-black';
                                    else if (grade.startsWith('D')) gradeColor = 'text-yellow-400 font-bold';

                                    return (
                                        <tr key={student.uid} className="hover:bg-slate-800 transition-colors group">
                                            <td className="p-3 text-left border-r border-slate-700 font-medium text-white sticky left-0 bg-slate-900 group-hover:bg-slate-800 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.2)] whitespace-nowrap uppercase">
                                                {student.name}
                                            </td>
                                            {['indivTest', 'groupWork', 'classTest', 'project'].map((field) => (
                                                <td key={field} className="p-1 border-r border-slate-700 bg-blue-900/5">
                                                    <input 
                                                        type="number" step="0.1" min="0" max="15" 
                                                        value={mark[field as keyof TerminalReportMark] ?? ''} 
                                                        onChange={e => handleMarkChange(student.uid, field as keyof TerminalReportMark, e.target.value)} 
                                                        className="w-full h-8 bg-transparent text-center focus:bg-slate-700 focus:ring-1 focus:ring-blue-500 outline-none rounded text-slate-300 placeholder-slate-700 font-mono"
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold border-r border-slate-700 text-slate-300 bg-slate-800/50">{scaledClassScore.toFixed(1)}</td>
                                            <td className="p-1 border-r border-slate-700 bg-purple-900/5">
                                                <input 
                                                    type="number" step="0.1" min="0" max="100" 
                                                    value={mark.endOfTermExams ?? ''} 
                                                    onChange={e => handleMarkChange(student.uid, 'endOfTermExams', e.target.value)} 
                                                    className="w-full h-8 bg-transparent text-center focus:bg-slate-700 focus:ring-1 focus:ring-purple-500 outline-none rounded text-white font-bold font-mono"
                                                    placeholder="-"
                                                />
                                            </td>
                                            <td className="p-2 text-center font-medium border-r border-slate-700 text-slate-400 bg-slate-800/50">{scaledExamScore.toFixed(1)}</td>
                                            <td className="p-2 text-center font-black border-r border-slate-700 text-white text-lg bg-slate-900/50">{overallTotal.toFixed(1)}</td>
                                            <td className={`p-2 text-center text-lg border-r border-slate-700 bg-slate-900/50 ${gradeColor}`}>{grade}</td>
                                            <td className="p-2 text-center font-bold text-white bg-slate-900/50">{mark.position || '-'}</td>
                                        </tr>
                                    );
                                })}
                             </tbody>
                         </table>
                     </div>
                 </div>
            )}
        </Card>
    );
};

export default AdminTerminalReports;
