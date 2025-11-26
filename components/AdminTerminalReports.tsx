
import React, { useState, useEffect, useMemo } from 'react';
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

const getRemark = (grade: string) => {
    if (grade === 'A') return 'Excellent';
    if (grade === 'B+') return 'Very Good';
    if (grade === 'B') return 'Good';
    if (grade === 'C+') return 'Credit';
    if (grade === 'C') return 'Pass';
    if (grade === 'D+' || grade === 'D') return 'Weak Pass';
    return 'Fail';
};

interface RankingData {
    position: number;
    totalScore: number;
    average: number;
}

const StudentReportCard: React.FC<{ 
    student: UserProfile; 
    report: TerminalReport | null; 
    schoolSettings: SchoolSettings | null;
    ranking: RankingData | null;
    classSize: number;
}> = ({ student, report, schoolSettings, ranking, classSize }) => {
    
    const studentSubjects = useMemo(() => {
        if (!report || !report.subjects) return [];
        return Object.entries(report.subjects).map(([subject, data]) => {
            const subjectData = data as { marks: Record<string, TerminalReportMark> };
            const mark = subjectData.marks?.[student.uid];
            // Only show subjects that have at least some data entered
            if (!mark) return null;
            return { subject, ...mark };
        }).filter((s): s is { subject: string } & TerminalReportMark => s !== null && s.overallTotal !== undefined);
    }, [report, student.uid]);

    return (
        <div className="printable-report-card bg-white text-black p-4 sm:p-8 max-w-[210mm] mx-auto mb-8 border-2 border-gray-800 shadow-xl print:shadow-none print:border-2 print:break-after-page font-serif relative text-sm w-full">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none overflow-hidden">
                <h1 className="text-6xl sm:text-9xl font-bold uppercase transform -rotate-45 whitespace-nowrap">{schoolSettings?.schoolName}</h1>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-b-4 border-double border-gray-800 pb-4 mb-6 relative z-10 gap-4 sm:gap-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center border-2 border-gray-800 rounded-full bg-gray-100 shrink-0">
                    {/* Placeholder Logo */}
                    <span className="text-2xl sm:text-3xl">🎓</span>
                </div>
                <div className="text-center flex-grow px-4">
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest font-sans text-black leading-tight">{schoolSettings?.schoolName || 'UTOPIA INTERNATIONAL SCHOOL'}</h1>
                    <p className="text-xs sm:text-sm italic font-semibold text-gray-800 mt-1">"{schoolSettings?.schoolMotto || 'Excellence in Education'}"</p>
                    <p className="text-[10px] sm:text-xs mt-1 text-black">Email: info@utopia.edu | Tel: +233 20 000 0000</p>
                    <div className="mt-3 inline-block bg-black text-white px-6 sm:px-8 py-1 rounded-sm uppercase text-xs sm:text-sm font-bold tracking-widest">
                        Term {report?.term} Report
                    </div>
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 border border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-xs text-center p-1 shrink-0">
                    Student Photo
                </div>
            </div>

            {/* Student Info Grid */}
            <div className="bg-white border border-gray-800 p-3 sm:p-4 mb-6 relative z-10 rounded-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3 text-black">
                    <div className="col-span-1 sm:col-span-2 flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">Name:</span>
                        <span className="uppercase font-bold text-base sm:text-lg truncate">{student.name}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">Class:</span>
                        <span className="font-semibold">{student.class}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">ID No:</span>
                        <span className="font-mono font-semibold">{student.uid.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">Year:</span>
                        <span className="font-semibold">{report?.academicYear}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">No. on Roll:</span>
                        <span className="font-semibold">{classSize}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">Position:</span>
                        <span className="font-black text-base sm:text-lg">
                            {ranking ? `${ranking.position}${getOrdinal(ranking.position)}` : '-'}
                        </span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">Overall Avg:</span>
                        <span className="font-bold">{ranking ? ranking.average.toFixed(1) : '-'}%</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-24 shrink-0">Attendance:</span>
                        <span>- / -</span>
                    </div>
                </div>
            </div>

            {/* Academic Table */}
            <div className="overflow-x-auto mb-6 relative z-10">
                <table className="w-full text-sm border-collapse border-2 border-gray-800 text-black min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-600 p-2 text-left w-1/3 font-bold uppercase text-black">Subject</th>
                            <th className="border border-gray-600 p-2 text-center w-16 sm:w-20 text-black">Class Score<br/><span className="text-[10px]">(50%)</span></th>
                            <th className="border border-gray-600 p-2 text-center w-16 sm:w-20 text-black">Exam Score<br/><span className="text-[10px]">(50%)</span></th>
                            <th className="border border-gray-600 p-2 text-center w-16 sm:w-20 bg-gray-300 font-bold text-black">Total<br/><span className="text-[10px]">(100%)</span></th>
                            <th className="border border-gray-600 p-2 text-center w-12 sm:w-16 text-black">Grade</th>
                            <th className="border border-gray-600 p-2 text-center w-12 sm:w-16 text-black">Pos.</th>
                            <th className="border border-gray-600 p-2 text-left w-1/4 text-black">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentSubjects.length > 0 ? studentSubjects.map((s, idx) => (
                            <tr key={idx} className="even:bg-gray-50 hover:bg-gray-100">
                                <td className="border border-gray-400 p-2 font-bold text-black">{s.subject}</td>
                                <td className="border border-gray-400 p-2 text-center text-black">{s.scaledClassScore?.toFixed(1)}</td>
                                <td className="border border-gray-400 p-2 text-center text-black">{s.scaledExamScore?.toFixed(1)}</td>
                                <td className="border border-gray-400 p-2 text-center font-bold bg-gray-100 text-black">{s.overallTotal?.toFixed(1)}</td>
                                <td className={`border border-gray-400 p-2 text-center font-bold ${s.grade === 'F' ? 'text-red-600' : 'text-black'}`}>{s.grade}</td>
                                <td className="border border-gray-400 p-2 text-center text-xs text-black">{s.position}</td>
                                <td className="border border-gray-400 p-2 text-xs italic text-black">{s.remarks || getRemark(s.grade || '')}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="border border-gray-400 p-8 text-center text-gray-500 italic">Marks pending entry.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mt-8 relative z-10 text-black print:grid-cols-2">
                <div className="border border-gray-400 p-4 rounded-sm">
                    <p className="font-bold text-sm mb-1 uppercase text-black">Class Teacher's Remarks:</p>
                    <div className="border-b border-dotted border-black h-6 mb-2"></div>
                    <div className="border-b border-dotted border-black h-6"></div>
                    <div className="mt-6 flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-2 sm:gap-0">
                        <span className="text-xs text-gray-600">Date: ........................</span>
                        <span className="text-xs text-gray-600">Signature: ........................</span>
                    </div>
                </div>
                <div className="border border-gray-400 p-4 rounded-sm">
                    <p className="font-bold text-sm mb-1 uppercase text-black">Head Teacher's Remarks:</p>
                    <div className="border-b border-dotted border-black h-6 mb-2"></div>
                    <div className="border-b border-dotted border-black h-6"></div>
                    <div className="mt-6 flex justify-between items-end">
                        <span className="text-xs text-gray-600">Date: ........................</span>
                        <div className="text-center">
                            <div className="w-20 h-8 border border-dashed border-gray-400 mb-1 flex items-center justify-center text-[9px] text-gray-400">STAMP</div>
                            <span className="text-xs text-gray-600">Signature</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Grading Scale Legend */}
            <div className="mt-6 text-[9px] sm:text-[10px] text-black flex flex-wrap justify-center gap-2 sm:gap-4 uppercase font-bold">
                <span>80-100 (A) Excellent</span>
                <span>70-79 (B+) Very Good</span>
                <span>60-69 (B) Good</span>
                <span>55-59 (C+) Credit</span>
                <span>50-54 (C) Pass</span>
                <span>40-49 (D) Weak Pass</span>
                <span>0-39 (F) Fail</span>
            </div>
            
            <div className="text-center mt-4 text-[10px] text-gray-500 italic">
                Generated by EduTec School Management System on {new Date().toLocaleDateString()}
            </div>
        </div>
    );
};

// Helper for ordinals (1st, 2nd, 3rd)
function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

const AdminTerminalReports: React.FC<{ schoolSettings: SchoolSettings | null, user: firebase.User | null }> = ({ schoolSettings, user }) => {
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<'entry' | 'print'>('entry');
    
    const [selectedClass, setSelectedClass] = useState(GES_CLASSES[0]);
    const [selectedSubject, setSelectedSubject] = useState(GES_SUBJECTS[0]);
    
    const [students, setStudents] = useState<UserProfile[]>([]);
    // 'fullReport' holds the entire document (all subjects)
    const [fullReport, setFullReport] = useState<TerminalReport | null>(null);
    // 'marks' holds only the currently selected subject's marks for editing
    const [marks, setMarks] = useState<Record<string, Partial<TerminalReportMark>>>({});
    
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch students
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

    // Fetch report data (all subjects)
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
                    setFullReport(data);
                    
                    // Load marks for the specifically selected subject into the editing state
                    if (data.subjects && data.subjects[selectedSubject]) {
                        setMarks(data.subjects[selectedSubject].marks || {});
                    } else {
                        setMarks({});
                    }
                } else {
                    setFullReport(null);
                    setMarks({});
                }
            } catch (err) {
                console.error("Error fetching report:", err);
            }
        };
        fetchReport();
    }, [selectedClass, selectedSubject, schoolSettings, viewMode]); // Re-fetch when switching views or selection

    // Calculate Class Rankings
    const classRanking = useMemo(() => {
        if (!fullReport || !fullReport.subjects) return {};
        
        const studentTotals: Record<string, { total: number, count: number }> = {};
        
        // Aggregate totals across all subjects
        Object.values(fullReport.subjects).forEach((subjectData: any) => {
            if (subjectData.marks) {
                Object.entries(subjectData.marks).forEach(([uid, mark]: [string, any]) => {
                    if (mark.overallTotal !== undefined) {
                        if (!studentTotals[uid]) studentTotals[uid] = { total: 0, count: 0 };
                        studentTotals[uid].total += (mark.overallTotal || 0);
                        studentTotals[uid].count += 1;
                    }
                });
            }
        });

        // Sort by total score descending
        const sortedUids = Object.keys(studentTotals).sort((a, b) => studentTotals[b].total - studentTotals[a].total);
        
        const rankings: Record<string, RankingData> = {};
        sortedUids.forEach((uid, index) => {
            const data = studentTotals[uid];
            rankings[uid] = { 
                position: index + 1, 
                totalScore: data.total,
                average: data.count > 0 ? data.total / data.count : 0
            };
        });
        
        return rankings;
    }, [fullReport]);

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
        
        // Calculate Subject Positions
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
                        teacherId: user.uid, 
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        marks: calculatedMarks
                    }
                }
            }, { merge: true });

            setMarks(calculatedMarks);
            
            // Update local fullReport state slightly to reflect changes without full refetch
            if (fullReport) {
                const updatedSubjects = { ...fullReport.subjects, [selectedSubject]: { ...fullReport.subjects[selectedSubject], marks: calculatedMarks } };
                setFullReport({ ...fullReport, subjects: updatedSubjects });
            } else {
                // If fullReport was null (first time creating), we need to construct it minimally
                setFullReport({
                    id: reportId,
                    academicYear: schoolSettings.academicYear,
                    term,
                    classId: selectedClass,
                    subjects: {
                        [selectedSubject]: {
                            teacherId: user.uid,
                            updatedAt: firebase.firestore.Timestamp.now(),
                            marks: calculatedMarks
                        }
                    }
                });
            }

            showToast('Marks saved successfully!', 'success');
        } catch (err: any) {
            showToast(`Failed to save marks: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Print
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="h-full flex flex-col">
            {/* Inject Print Styles to override App layout constraints */}
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body, html, #root {
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }
                    /* Show only our print container and its children */
                    .print-only-container, .print-only-container * {
                        visibility: visible;
                    }
                    .print-only-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    /* Ensure page breaks */
                    .report-card-page-break {
                        break-after: page;
                        page-break-after: always;
                        margin-bottom: 0;
                    }
                    /* Hide headers/sidebars specifically if visibility trick misses them */
                    header, nav, .sidebar, .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Header - Hidden when printing */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 print:hidden">
                 <div className="w-full lg:w-auto">
                     <h2 className="text-2xl font-bold text-white">
                         {viewMode === 'entry' ? 'Master Report Sheet' : 'Student Report Cards'}
                     </h2>
                     <p className="text-xs text-slate-400 mt-1">
                         {viewMode === 'entry' ? 'View and edit marks for any class.' : 'Preview and print final terminal reports.'}
                     </p>
                 </div>
                 <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
                        <button 
                            onClick={() => setViewMode('entry')} 
                            className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all text-center ${viewMode === 'entry' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Data Entry
                        </button>
                        <button 
                            onClick={() => setViewMode('print')} 
                            className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all text-center ${viewMode === 'print' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Report Cards
                        </button>
                    </div>
                    
                    <div className="hidden lg:block h-8 w-px bg-slate-700 mx-2"></div>

                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full sm:w-auto flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    {viewMode === 'entry' && (
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full sm:w-auto flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    
                    {viewMode === 'entry' ? (
                        <Button onClick={calculateTotalsAndSave} disabled={isSaving || loading} className="w-full sm:w-auto flex-grow shadow-lg shadow-blue-600/20 justify-center">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    ) : (
                        <Button onClick={handlePrint} variant="secondary" className="w-full sm:w-auto flex-grow justify-center">
                            🖨️ Print Reports
                        </Button>
                    )}
                 </div>
            </div>
            
            {/* Content */}
            {loading ? (
                <div className="flex justify-center items-center h-64"><Spinner /></div>
            ) : (
                 <>
                    {viewMode === 'entry' ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-auto border border-gray-300 rounded-xl shadow-lg custom-scrollbar flex-grow relative bg-white h-[calc(100dvh-280px)] md:h-auto">
                                <div className="min-w-[1000px]">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                                            <tr>
                                                <th rowSpan={2} className="p-3 text-left border-b border-r border-gray-300 font-bold text-black min-w-[180px] sticky left-0 bg-gray-100 z-30 shadow-lg">STUDENT NAME</th>
                                                <th colSpan={4} className="p-2 border-b border-r border-gray-300 text-center bg-blue-50 text-blue-800 font-bold">CLASS ASSESSMENT (15 each)</th>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 text-center w-20 font-bold bg-gray-50 text-gray-800">CLASS (50%)</th>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 text-center w-24 font-bold bg-purple-50 text-purple-800">EXAM (100)</th>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 text-center w-20 font-bold bg-gray-50 text-gray-800">EXAM (50%)</th>
                                                <th colSpan={3} className="p-2 border-b border-gray-300 text-center bg-green-50 text-green-800 font-bold">FINAL GRADING</th>
                                            </tr>
                                            <tr className="text-xs text-gray-600">
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">ASSIGNMENTS</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">GROUP</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">TEST</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">PROJECT</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-bold text-black bg-white">TOTAL (100)</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-bold text-black bg-white">GRADE</th>
                                                <th className="p-2 border-b border-gray-300 font-bold text-black bg-white">POS.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {students.map((student) => {
                                                const mark = marks[student.uid] || {};
                                                const totalClassScore = (mark.indivTest || 0) + (mark.groupWork || 0) + (mark.classTest || 0) + (mark.project || 0);
                                                const scaledClassScore = (totalClassScore / 60) * 50;
                                                const scaledExamScore = ((mark.endOfTermExams || 0) / 100) * 50;
                                                const overallTotal = scaledClassScore + scaledExamScore;
                                                const grade = getGrade(overallTotal);

                                                let gradeColor = 'text-gray-800';
                                                if (grade === 'A' || grade === 'B+') gradeColor = 'text-green-600 font-bold';
                                                else if (grade === 'F') gradeColor = 'text-red-600 font-bold';
                                                else if (grade.startsWith('D')) gradeColor = 'text-yellow-600 font-bold';

                                                return (
                                                    <tr key={student.uid} className="hover:bg-blue-50 transition-colors group">
                                                        <td className="p-3 text-left border-r border-gray-300 font-bold text-black sticky left-0 bg-white group-hover:bg-blue-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap uppercase text-sm">
                                                            {student.name}
                                                        </td>
                                                        {['indivTest', 'groupWork', 'classTest', 'project'].map((field) => (
                                                            <td key={field} className="p-1 border-r border-gray-300 bg-gray-50/50">
                                                                <input 
                                                                    type="number" step="0.1" min="0" max="15" 
                                                                    value={mark[field as keyof TerminalReportMark] ?? ''} 
                                                                    onChange={e => handleMarkChange(student.uid, field as keyof TerminalReportMark, e.target.value)} 
                                                                    className="w-full h-10 bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none rounded text-black font-mono border border-transparent hover:border-gray-300 text-base"
                                                                    placeholder="-"
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="p-2 text-center font-bold border-r border-gray-300 text-gray-700 bg-gray-100 text-sm">{scaledClassScore.toFixed(1)}</td>
                                                        <td className="p-1 border-r border-gray-300 bg-purple-50/50">
                                                            <input 
                                                                type="number" step="0.1" min="0" max="100" 
                                                                value={mark.endOfTermExams ?? ''} 
                                                                onChange={e => handleMarkChange(student.uid, 'endOfTermExams', e.target.value)} 
                                                                className="w-full h-10 bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none rounded text-black font-bold font-mono border border-transparent hover:border-gray-300 text-base"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center font-medium border-r border-gray-300 text-gray-700 bg-gray-100 text-sm">{scaledExamScore.toFixed(1)}</td>
                                                        <td className="p-2 text-center font-black border-r border-gray-300 text-black text-base bg-gray-50">{overallTotal.toFixed(1)}</td>
                                                        <td className={`p-2 text-center text-base border-r border-gray-300 bg-gray-50 ${gradeColor}`}>{grade}</td>
                                                        <td className="p-2 text-center font-bold text-black bg-gray-50 text-sm">{mark.position || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden flex-grow overflow-y-auto space-y-4 pb-20 px-1">
                                {students.map(student => {
                                    const mark = marks[student.uid] || {};
                                    const totalClassScore = (mark.indivTest || 0) + (mark.groupWork || 0) + (mark.classTest || 0) + (mark.project || 0);
                                    const scaledClassScore = (totalClassScore / 60) * 50;
                                    const scaledExamScore = ((mark.endOfTermExams || 0) / 100) * 50;
                                    const overallTotal = scaledClassScore + scaledExamScore;
                                    const grade = getGrade(overallTotal);

                                    return (
                                        <div key={student.uid} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                            {/* Card Header */}
                                            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{student.name}</h3>
                                                    <p className="text-xs text-gray-500">Position: {mark.position || '-'}</p>
                                                </div>
                                                <span className={`text-lg font-black ${grade === 'A' ? 'text-green-600' : grade === 'F' ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {grade}
                                                </span>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                {/* Class Assessments Grid */}
                                                <div>
                                                    <p className="text-xs font-bold text-blue-800 uppercase mb-2">Class Assessment (Max 15 each)</p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {['indivTest', 'groupWork', 'classTest', 'project'].map((field) => (
                                                            <div key={field} className="flex flex-col">
                                                                <label className="text-[10px] text-gray-500 uppercase mb-1 truncate text-center">
                                                                    {field === 'indivTest' ? 'Assg' : field === 'groupWork' ? 'Grp' : field === 'classTest' ? 'Test' : 'Proj'}
                                                                </label>
                                                                <input 
                                                                    type="number" inputMode="decimal" step="0.1" min="0" max="15"
                                                                    value={mark[field as keyof TerminalReportMark] ?? ''} 
                                                                    onChange={e => handleMarkChange(student.uid, field as keyof TerminalReportMark, e.target.value)}
                                                                    className="w-full p-2 bg-blue-50 border border-blue-200 rounded text-center font-mono text-black focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    placeholder="-"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Exam Score */}
                                                <div>
                                                    <p className="text-xs font-bold text-purple-800 uppercase mb-2">Exam Score (Max 100)</p>
                                                    <input 
                                                        type="number" inputMode="decimal" step="0.1" min="0" max="100"
                                                        value={mark.endOfTermExams ?? ''} 
                                                        onChange={e => handleMarkChange(student.uid, 'endOfTermExams', e.target.value)}
                                                        className="w-full p-3 bg-purple-50 border border-purple-200 rounded text-center font-bold font-mono text-lg text-black focus:ring-2 focus:ring-purple-500 outline-none"
                                                        placeholder="Enter Exam Score"
                                                    />
                                                </div>
                                            </div>

                                            {/* Footer Summary */}
                                            <div className="bg-gray-100 p-3 border-t border-gray-200 flex justify-between items-center text-xs">
                                                <div className="text-center">
                                                    <p className="text-gray-500">Class (50%)</p>
                                                    <p className="font-bold text-gray-800">{scaledClassScore.toFixed(1)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-gray-500">Exam (50%)</p>
                                                    <p className="font-bold text-gray-800">{scaledExamScore.toFixed(1)}</p>
                                                </div>
                                                <div className="text-center bg-black text-white px-3 py-1 rounded">
                                                    <p className="text-[10px] opacity-70">TOTAL</p>
                                                    <p className="font-bold text-base">{overallTotal.toFixed(1)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-100 p-4 sm:p-8 rounded-xl overflow-y-auto h-[calc(100dvh-280px)] md:h-[calc(100vh-200px)] custom-scrollbar print:h-auto print:overflow-visible print:bg-white print:p-0">
                            <div className="print-only-container">
                                {students.map(student => (
                                    <div key={student.uid} className="report-card-page-break w-full">
                                        <StudentReportCard 
                                            student={student} 
                                            report={fullReport} 
                                            schoolSettings={schoolSettings} 
                                            ranking={classRanking[student.uid] || null}
                                            classSize={students.length}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </>
            )}
        </div>
    );
};

export default AdminTerminalReports;
