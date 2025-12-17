
import React, { useState, useEffect, useMemo } from 'react';
import { db, firebase } from '../services/firebase';
import { GES_CLASSES, GES_SUBJECTS, TerminalReport, TerminalReportMark, UserProfile, SchoolSettings, Assignment, Submission, Group, AttendanceRecord } from '../types';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import StudentReportCard from './common/StudentReportCard';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

const getGradeWeight = (grade: string) => {
    const weights: Record<string, number> = { 'A': 1, 'B+': 2, 'B': 3, 'C+': 4, 'C': 5, 'D+': 6, 'D': 7, 'F': 8 };
    return weights[grade] || 99;
};

interface RankingData {
    position: number;
    totalScore: number;
    average: number;
}

interface AdminTerminalReportsProps {
    schoolSettings: SchoolSettings | null;
    user: firebase.User | null;
    userProfile?: UserProfile | null; // Added userProfile for permission checks
    teacherMode?: boolean;
    allowedClasses?: string[];
    allStudents?: UserProfile[]; 
    assignments?: Assignment[];
    submissions?: Submission[];
    groups?: Group[];
}

const AdminTerminalReports: React.FC<AdminTerminalReportsProps> = ({ 
    schoolSettings, 
    user, 
    userProfile,
    teacherMode = false, 
    allowedClasses, 
    allStudents,
    assignments = [],
    submissions = [],
    groups = []
}) => {
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<'entry' | 'print'>('entry');
    
    // Use allowedClasses[0] as default if available, else GES default
    const [selectedClass, setSelectedClass] = useState(allowedClasses && allowedClasses.length > 0 ? allowedClasses[0] : GES_CLASSES[0]);
    const [selectedSubject, setSelectedSubject] = useState(GES_SUBJECTS[0]);
    
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [fullReport, setFullReport] = useState<TerminalReport | null>(null);
    const [marks, setMarks] = useState<Record<string, Partial<TerminalReportMark>>>({});
    const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { present: number, total: number }>>({});
    
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pdfGeneratingProgress, setPdfGeneratingProgress] = useState<string | null>(null);
    
    // Feature Toggle
    const [showPosition, setShowPosition] = useState(true);

    // Sorting & Ordering
    const [orderedUids, setOrderedUids] = useState<string[]>([]);
    const [sortMethod, setSortMethod] = useState<'name' | 'position' | 'grade' | 'custom'>('name');
    const [draggedUid, setDraggedUid] = useState<string | null>(null);

    // Printing selection state
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    // Permission Logic
    const isClassTeacher = useMemo(() => {
        return teacherMode && userProfile?.classTeacherOf === selectedClass;
    }, [teacherMode, userProfile, selectedClass]);

    const canEditSubject = useMemo(() => {
        if (!teacherMode) return true; // Admins can edit everything
        if (!userProfile?.subjectsByClass) return false;
        
        const subjectsForClass = userProfile.subjectsByClass[selectedClass] || [];
        return subjectsForClass.includes(selectedSubject);
    }, [teacherMode, userProfile, selectedClass, selectedSubject]);

    // Fetch students
    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                let fetchedStudents: UserProfile[] = [];
                
                if (allStudents && teacherMode) {
                    // Filter from passed prop
                    fetchedStudents = allStudents.filter(s => s.class === selectedClass);
                } else {
                    // Fetch from DB
                    const snapshot = await db.collection('users')
                        .where('role', '==', 'student')
                        .where('class', '==', selectedClass)
                        .get();
                    fetchedStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
                }
                
                // Sort by name initially
                fetchedStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                
                setStudents(fetchedStudents);
                setOrderedUids(fetchedStudents.map(s => s.uid));
                setSelectedStudentIds(fetchedStudents.map(s => s.uid));
            } catch (err) {
                console.error("Error fetching students:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [selectedClass, allStudents, teacherMode]);

    // Fetch report data
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
    }, [selectedClass, selectedSubject, schoolSettings, viewMode]);

    // Fetch Attendance for Print Mode
    useEffect(() => {
        if (viewMode === 'print' && selectedClass) {
            const fetchAttendance = async () => {
                try {
                    const snap = await db.collection('attendance').where('classId', '==', selectedClass).get();
                    const summary: Record<string, { present: number, total: number }> = {};
                    
                    snap.docs.forEach(doc => {
                        const data = doc.data() as AttendanceRecord;
                        if (data.records) {
                            Object.entries(data.records).forEach(([uid, status]) => {
                                if (!summary[uid]) summary[uid] = { present: 0, total: 0 };
                                summary[uid].total += 1;
                                if (status === 'Present' || status === 'Late') summary[uid].present += 1;
                            });
                        }
                    });
                    setAttendanceSummary(summary);
                } catch (e) {
                    console.error("Error loading attendance for reports", e);
                }
            };
            fetchAttendance();
        }
    }, [viewMode, selectedClass]);

    // --- SORTING & DRAG-DROP ---

    const getStudentScoreInfo = (uid: string) => {
        const mark = marks[uid] || {};
        const totalClassScore = (mark.indivTest || 0) + (mark.groupWork || 0) + (mark.classTest || 0) + (mark.project || 0);
        const scaledClassScore = (totalClassScore / 60) * 50;
        const scaledExamScore = ((mark.endOfTermExams || 0) / 100) * 50;
        const overallTotal = scaledClassScore + scaledExamScore;
        return { overallTotal, grade: getGrade(overallTotal) };
    };

    const handleSort = (method: 'name' | 'position' | 'grade') => {
        setSortMethod(method);
        const sorted = [...orderedUids].sort((aUid, bUid) => {
            const studentA = students.find(s => s.uid === aUid);
            const studentB = students.find(s => s.uid === bUid);
            if (!studentA || !studentB) return 0;

            if (method === 'name') {
                return (studentA.name || '').localeCompare(studentB.name || '');
            } else if (method === 'position') {
                const scoreA = getStudentScoreInfo(aUid).overallTotal;
                const scoreB = getStudentScoreInfo(bUid).overallTotal;
                return scoreB - scoreA; // Descending
            } else if (method === 'grade') {
                const gradeA = getStudentScoreInfo(aUid).grade;
                const gradeB = getStudentScoreInfo(bUid).grade;
                const weightA = getGradeWeight(gradeA);
                const weightB = getGradeWeight(gradeB);
                if (weightA !== weightB) return weightA - weightB; // Ascending weight (A=1)
                return getStudentScoreInfo(bUid).overallTotal - getStudentScoreInfo(aUid).overallTotal;
            }
            return 0;
        });
        setOrderedUids(sorted);
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, uid: string) => {
        setDraggedUid(uid);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.currentTarget.style.opacity = '1';
        setDraggedUid(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetUid: string) => {
        e.preventDefault();
        if (!draggedUid || draggedUid === targetUid) return;

        const newOrder = [...orderedUids];
        const draggedIndex = newOrder.indexOf(draggedUid);
        const targetIndex = newOrder.indexOf(targetUid);

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedUid);

        setOrderedUids(newOrder);
        setSortMethod('custom');
    };

    // --- AUTO FILL (Teacher Mode) ---
    const handleAutoFillScores = () => {
        const assignmentsForSubject = assignments.filter(a => a.classId === selectedClass && a.subject === selectedSubject);
        const submissionsForSubject = submissions.filter(s => s.classId === selectedClass && assignmentsForSubject.some(a => a.id === s.assignmentId) && s.grade);
        const groupsForSubject = groups.filter(g => g.classId === selectedClass && g.subject === selectedSubject && g.grade);

        const newMarks: Record<string, Partial<TerminalReportMark>> = { ...marks };

        students.forEach(student => {
            const studentSubmissions = submissionsForSubject.filter(s => s.studentId === student.uid);
            let totalPercentageSum = 0;
            const totalAssignmentsCount = assignmentsForSubject.length;

            if (totalAssignmentsCount > 0) {
                assignmentsForSubject.forEach(assignment => {
                    const submission = studentSubmissions.find(s => s.assignmentId === assignment.id);
                    if (submission && submission.grade) {
                        let score: number | null = null;
                        let maxScore: number | null = null;
                        if (submission.grade.includes('/')) {
                            const parts = submission.grade.split('/').map(p => parseFloat(p.trim()));
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > 0) {
                                score = parts[0];
                                maxScore = parts[1];
                            }
                        } else if (!isNaN(parseFloat(submission.grade))) {
                            score = parseFloat(submission.grade);
                            maxScore = 20; 
                        }
                        if (score !== null && maxScore !== null && maxScore > 0) {
                            totalPercentageSum += (score / maxScore);
                        }
                    }
                });
                const averagePercentage = totalPercentageSum / totalAssignmentsCount;
                const assignmentScore = averagePercentage * 15; 

                newMarks[student.uid] = { ...newMarks[student.uid], indivTest: parseFloat(assignmentScore.toFixed(1)) };
            }

            const studentGroup = groupsForSubject.find(g => g.memberUids.includes(student.uid));
            if (studentGroup && studentGroup.grade) {
                 const groupWorkScore = parseFloat(studentGroup.grade);
                 if (!isNaN(groupWorkScore)) {
                     newMarks[student.uid] = { ...newMarks[student.uid], groupWork: parseFloat(groupWorkScore.toFixed(1)) };
                 }
            }
        });
        setMarks(newMarks);
        showToast("Scores from assignments and group work have been filled in.", "success");
    };


    const classRanking = useMemo(() => {
        if (!fullReport || !fullReport.subjects) return {};
        
        const studentTotals: Record<string, { total: number, count: number }> = {};
        
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
        if (!canEditSubject) return; 

        // Handle string for remarks, number for others
        const val = field === 'remarks' ? value : (value === '' ? undefined : Number(value));
        
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: val
            }
        }));
    };

    const calculateTotalsAndSave = async () => {
        if (!selectedClass || !selectedSubject || !schoolSettings || !user) {
            showToast("Missing required information.", 'error');
            return;
        }
        if (!canEditSubject) {
            showToast("You are not authorized to save marks for this subject.", 'error');
            return;
        }

        setIsSaving(true);

        const calculatedMarks: Record<string, TerminalReportMark> = {};
        const studentTotals: { studentId: string, total: number }[] = [];

        students.forEach(student => {
            const studentMark = marks[student.uid] || {};
            
            const indivTest = studentMark.indivTest || 0;
            const groupWork = studentMark.groupWork || 0;
            const classTest = studentMark.classTest || 0;
            const project = studentMark.project || 0;
            const endOfTermExams = studentMark.endOfTermExams || 0;
            const remarks = studentMark.remarks || '';

            const totalClassScore = indivTest + groupWork + classTest + project;
            const scaledClassScore = (totalClassScore / 60) * 50;
            const scaledExamScore = (endOfTermExams / 100) * 50;
            const overallTotal = scaledClassScore + scaledExamScore;
            
            calculatedMarks[student.uid] = {
                studentName: student.name,
                indivTest,
                groupWork,
                classTest,
                project,
                endOfTermExams,
                totalClassScore: parseFloat(totalClassScore.toFixed(1)),
                scaledClassScore: parseFloat(scaledClassScore.toFixed(1)),
                scaledExamScore: parseFloat(scaledExamScore.toFixed(1)),
                overallTotal: parseFloat(overallTotal.toFixed(1)),
                grade: getGrade(overallTotal),
                remarks, // Save remarks
            };
            studentTotals.push({ studentId: student.uid, total: overallTotal });
        });
        
        // Subject Position Calculation
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
            if (fullReport) {
                const updatedSubjects = { ...fullReport.subjects, [selectedSubject]: { ...fullReport.subjects[selectedSubject], marks: calculatedMarks } };
                setFullReport({ ...fullReport, subjects: updatedSubjects });
            } else {
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
    
    const handleTogglePublish = async () => {
        if (!fullReport) return;
        const newStatus = !fullReport.published;
        
        if (window.confirm(newStatus ? 
            "Are you sure you want to PUBLISH these reports? Students and Parents will be able to view them." : 
            "Are you sure you want to UNPUBLISH these reports? Access will be revoked.")) {
            
            try {
                await db.collection('terminalReports').doc(fullReport.id).update({
                    published: newStatus
                });
                setFullReport({ ...fullReport, published: newStatus });
                showToast(newStatus ? 'Reports Published!' : 'Reports Unpublished.', 'success');
            } catch (err: any) {
                showToast(`Failed to update status: ${err.message}`, 'error');
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (selectedStudentIds.length === 0) {
            showToast("Please select at least one student to download.", "error");
            return;
        }

        const studentsToPrint = orderedUids.filter(id => selectedStudentIds.includes(id));
        setPdfGeneratingProgress(`Starting PDF generation for ${studentsToPrint.length} reports...`);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const width = pdf.internal.pageSize.getWidth();
            const height = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < studentsToPrint.length; i++) {
                const uid = studentsToPrint[i];
                setPdfGeneratingProgress(`Rendering report ${i + 1} of ${studentsToPrint.length}...`);

                const element = document.getElementById(`report-card-${uid}`);
                if (!element) {
                    console.warn(`Report element for ${uid} not found.`);
                    continue;
                }

                const canvas = await html2canvas(element, {
                    scale: 2, // Improve quality
                    useCORS: true, // For images (avatars, logos)
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                
                const margin = 10;
                const imgWidth = width - (margin * 2); 
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
            }
            
            setPdfGeneratingProgress("Finalizing PDF...");
            pdf.save(`Terminal_Reports_${selectedClass}_${new Date().toLocaleDateString()}.pdf`);
            showToast("Reports downloaded successfully!", "success");

        } catch (error: any) {
            console.error("PDF Generation failed:", error);
            showToast(`Failed to generate PDF: ${error.message}`, "error");
        } finally {
            setPdfGeneratingProgress(null);
        }
    };

    const toggleStudentSelection = (uid: string) => {
        setSelectedStudentIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    const toggleSelectAll = () => {
        if (selectedStudentIds.length === students.length) setSelectedStudentIds([]);
        else setSelectedStudentIds(students.map(s => s.uid));
    };

    const classesToDisplay = allowedClasses && allowedClasses.length > 0 ? allowedClasses : GES_CLASSES;

    return (
        <div className="h-full flex flex-col">
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body, html, #root { height: auto !important; overflow: visible !important; background: white !important; }
                    body * { visibility: hidden; }
                    .print-only-container, .print-only-container * { visibility: visible; }
                    .print-only-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                    .report-card-page-break { break-after: page; page-break-after: always; margin-bottom: 0; }
                    header, nav, .sidebar, .no-print { display: none !important; }
                }
            `}</style>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 print:hidden">
                 <div className="w-full lg:w-auto">
                     <h2 className="text-2xl font-bold text-white">
                         {viewMode === 'entry' ? 'Master Report Sheet' : 'Student Report Cards'}
                     </h2>
                     <p className="text-xs text-slate-400 mt-1">
                         {viewMode === 'entry' ? 'View, edit, and reorganize marks.' : 'Select specific students to download/print.'}
                     </p>
                 </div>
                 <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
                        <button onClick={() => setViewMode('entry')} className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'entry' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Data Entry</button>
                        <button onClick={() => setViewMode('print')} className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'print' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Print Mode</button>
                    </div>
                    
                    <div className="hidden lg:block h-8 w-px bg-slate-700 mx-2"></div>
                    
                    {/* Position Toggle */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                        <input type="checkbox" id="togglePos" checked={showPosition} onChange={(e) => setShowPosition(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-slate-700 text-blue-500 focus:ring-blue-600"/>
                        <label htmlFor="togglePos" className="text-sm text-gray-300 font-medium cursor-pointer">Show Overall Pos.</label>
                    </div>

                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full sm:w-auto flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm outline-none">
                        {classesToDisplay.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    {viewMode === 'entry' && (
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full sm:w-auto flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm outline-none">
                            {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    
                    {viewMode === 'entry' ? (
                        <>
                            {teacherMode && (
                                <Button onClick={handleAutoFillScores} disabled={!canEditSubject} variant="secondary" size="sm" className="hidden xl:block">
                                    Auto-fill Scores
                                </Button>
                            )}
                            <Button onClick={calculateTotalsAndSave} disabled={isSaving || loading || !canEditSubject} className="w-full sm:w-auto flex-grow justify-center">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button 
                                onClick={handleTogglePublish} 
                                variant={fullReport?.published ? 'danger' : 'primary'} 
                                className="w-full sm:w-auto flex-grow justify-center"
                                disabled={!fullReport}
                            >
                                {fullReport?.published ? 'Unpublish' : 'Publish to Portal'}
                            </Button>
                            <Button onClick={handleDownloadPDF} disabled={!!pdfGeneratingProgress} variant="secondary" className="w-full sm:w-auto flex-grow justify-center bg-green-600 hover:bg-green-500 text-white border-none">
                                {pdfGeneratingProgress ? <Spinner /> : '📥 Download PDF'}
                            </Button>
                        </>
                    )}
                 </div>
            </div>
            
            {pdfGeneratingProgress && (
                <div className="bg-blue-900/50 text-blue-200 px-4 py-3 rounded-lg mb-4 flex items-center justify-center gap-3 border border-blue-500/30">
                    <Spinner />
                    <span className="animate-pulse font-medium">{pdfGeneratingProgress}</span>
                </div>
            )}
            
            {loading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : (
                 <>
                    {viewMode === 'entry' ? (
                        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 relative">
                             {!canEditSubject && (
                                 <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-sm font-bold border-b border-yellow-200 flex items-center justify-center">
                                     🔒 Read Only Mode: You are not assigned to teach {selectedSubject} in {selectedClass}.
                                 </div>
                             )}
                             <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 items-center text-sm overflow-x-auto">
                                <span className="text-gray-500 font-bold px-2 whitespace-nowrap">Sort By:</span>
                                <button onClick={() => handleSort('name')} className={`px-3 py-1 rounded border ${sortMethod === 'name' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300'}`}>Name</button>
                                <button onClick={() => handleSort('position')} className={`px-3 py-1 rounded border ${sortMethod === 'position' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300'}`}>Position</button>
                                <button onClick={() => handleSort('grade')} className={`px-3 py-1 rounded border ${sortMethod === 'grade' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300'}`}>Grade</button>
                                {sortMethod === 'custom' && <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-300 whitespace-nowrap">Custom Order</span>}
                                {teacherMode && canEditSubject && (
                                     <button onClick={handleAutoFillScores} className="xl:hidden ml-auto px-3 py-1 rounded border bg-purple-100 border-purple-300 text-purple-800 text-xs whitespace-nowrap">Auto-fill</button>
                                )}
                            </div>

                            <div className="overflow-auto custom-scrollbar flex-grow relative h-[calc(100dvh-340px)] md:h-auto">
                                <div className="min-w-[1200px]">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                                            <tr>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 w-10 text-center bg-gray-50">#</th>
                                                <th rowSpan={2} className="p-3 text-left border-b border-r border-gray-300 font-bold text-black min-w-[180px] sticky left-0 bg-gray-100 z-30 shadow-lg">STUDENT NAME</th>
                                                <th colSpan={4} className="p-2 border-b border-r border-gray-300 text-center bg-blue-50 text-blue-800 font-bold">CLASS ASSESSMENT (15 each)</th>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 text-center w-20 font-bold bg-gray-50 text-gray-800">CLASS (50%)</th>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 text-center w-24 font-bold bg-purple-50 text-purple-800">EXAM (100)</th>
                                                <th rowSpan={2} className="p-2 border-b border-r border-gray-300 text-center w-20 font-bold bg-gray-50 text-gray-800">EXAM (50%)</th>
                                                <th colSpan={showPosition ? 4 : 3} className="p-2 border-b border-gray-300 text-center bg-green-50 text-green-800 font-bold">FINAL GRADING</th>
                                                {(showPosition && (isClassTeacher || !teacherMode)) && (
                                                    <th rowSpan={2} className="p-2 border-b border-l-2 border-gray-300 text-center w-24 font-black bg-indigo-50 text-indigo-800">OVERALL POS.</th>
                                                )}
                                            </tr>
                                            <tr className="text-xs text-gray-600">
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">ASSIGNMENTS</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">GROUP</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">TEST</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-medium text-center w-20">PROJECT</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-bold text-black bg-white">TOTAL (100)</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-bold text-black bg-white">GRADE</th>
                                                <th className="p-2 border-b border-r border-gray-300 font-bold text-black bg-white">REMARKS</th>
                                                {showPosition && <th className="p-2 border-b border-gray-300 font-bold text-black bg-white">POS.</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {orderedUids.map((uid, index) => {
                                                const student = students.find(s => s.uid === uid);
                                                if (!student) return null;
                                                const { overallTotal, grade } = getStudentScoreInfo(student.uid);
                                                const mark = marks[student.uid] || {};
                                                
                                                let gradeColor = 'text-gray-800';
                                                if (grade === 'A' || grade === 'B+') gradeColor = 'text-green-600 font-bold';
                                                else if (grade === 'F') gradeColor = 'text-red-600 font-bold';
                                                else if (grade.startsWith('D')) gradeColor = 'text-yellow-600 font-bold';

                                                const scaledClass = ((mark.indivTest||0) + (mark.groupWork||0) + (mark.classTest||0) + (mark.project||0)) / 60 * 50;
                                                const scaledExam = (mark.endOfTermExams || 0) / 100 * 50;

                                                const overallRankData = classRanking[student.uid];

                                                return (
                                                    <tr key={student.uid} draggable onDragStart={(e) => handleDragStart(e, student.uid)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, student.uid)} className="hover:bg-blue-50 transition-colors group cursor-grab active:cursor-grabbing">
                                                        <td className="p-2 text-center text-gray-400 font-mono text-xs border-r border-gray-300 bg-gray-50">
                                                            <div className="flex flex-col items-center"><span>{index + 1}</span><span className="text-[8px] opacity-0 group-hover:opacity-100">⋮⋮</span></div>
                                                        </td>
                                                        <td className="p-3 text-left border-r border-gray-300 font-bold text-black sticky left-0 bg-white group-hover:bg-blue-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap uppercase text-sm">{student.name}</td>
                                                        {['indivTest', 'groupWork', 'classTest', 'project'].map((field) => (
                                                            <td key={field} className="p-1 border-r border-gray-300 bg-gray-50/50">
                                                                <input type="number" step="0.1" min="0" max="15" disabled={!canEditSubject} value={mark[field as keyof TerminalReportMark] ?? ''} onChange={e => handleMarkChange(student.uid, field as keyof TerminalReportMark, e.target.value)} className="w-full h-10 bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none rounded text-black font-mono border border-transparent hover:border-gray-300 text-base disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="-" />
                                                            </td>
                                                        ))}
                                                        <td className="p-2 text-center font-bold border-r border-gray-300 text-gray-700 bg-gray-100 text-sm">{scaledClass.toFixed(1)}</td>
                                                        <td className="p-1 border-r border-gray-300 bg-purple-50/50">
                                                            <input type="number" step="0.1" min="0" max="100" disabled={!canEditSubject} value={mark.endOfTermExams ?? ''} onChange={e => handleMarkChange(student.uid, 'endOfTermExams', e.target.value)} className="w-full h-10 bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none rounded text-black font-bold font-mono border border-transparent hover:border-gray-300 text-base disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="-" />
                                                        </td>
                                                        <td className="p-2 text-center font-medium border-r border-gray-300 text-gray-700 bg-gray-100 text-sm">{scaledExam.toFixed(1)}</td>
                                                        <td className="p-2 text-center font-black border-r border-gray-300 text-black text-base bg-gray-50">{overallTotal.toFixed(1)}</td>
                                                        <td className={`p-2 text-center text-base border-r border-gray-300 bg-gray-50 ${gradeColor}`}>{grade}</td>
                                                        <td className="p-1 border-r border-gray-300">
                                                            <input 
                                                                type="text" 
                                                                disabled={!canEditSubject} 
                                                                value={mark.remarks || ''} 
                                                                onChange={e => handleMarkChange(student.uid, 'remarks', e.target.value)}
                                                                className="w-full h-10 bg-transparent text-xs px-2 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none rounded text-black border border-transparent hover:border-gray-300 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" 
                                                                placeholder={getGrade(overallTotal) === 'A' ? 'Excellent' : '-'} 
                                                            />
                                                        </td>
                                                        {showPosition && <td className="p-2 text-center font-bold text-black bg-gray-50 text-sm">{mark.position || '-'}</td>}
                                                        {(showPosition && (isClassTeacher || !teacherMode)) && (
                                                            <td className="p-2 text-center font-black text-indigo-700 bg-indigo-50 border-l-2 border-gray-300">
                                                                {overallRankData ? overallRankData.position : '-'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20 print:hidden">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={selectedStudentIds.length === students.length && students.length > 0} onChange={toggleSelectAll} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 font-semibold text-sm">Select All ({selectedStudentIds.length}/{students.length})</span>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="text-xs text-gray-500 italic">
                                         {fullReport?.published ? '✅ Report is Published' : '🚫 Report is NOT Published'}
                                     </div>
                                </div>
                            </div>
                            <div className="bg-gray-100 p-4 sm:p-8 rounded-xl overflow-y-auto h-[calc(100dvh-280px)] md:h-[calc(100vh-200px)] custom-scrollbar print:h-auto print:overflow-visible print:bg-white print:p-0">
                                <div className="grid grid-cols-1 gap-8 print:block print:gap-0">
                                    {orderedUids.map(uid => {
                                        const student = students.find(s => s.uid === uid);
                                        if (!student) return null;
                                        return (
                                            <div key={student.uid} className={`relative group transition-all duration-300 ${!selectedStudentIds.includes(student.uid) ? 'opacity-50 grayscale print:hidden' : 'print:block print:opacity-100'}`}>
                                                <div className="absolute top-4 right-4 z-20 print:hidden">
                                                    <input type="checkbox" checked={selectedStudentIds.includes(student.uid)} onChange={() => toggleStudentSelection(student.uid)} className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-md cursor-pointer" />
                                                </div>
                                                <div id={`report-card-${student.uid}`} className={`report-card-page-break w-full ${!selectedStudentIds.includes(student.uid) ? 'pointer-events-none' : ''}`}>
                                                    <StudentReportCard 
                                                        student={student} 
                                                        report={fullReport} 
                                                        schoolSettings={schoolSettings} 
                                                        ranking={classRanking[student.uid] || null} 
                                                        classSize={students.length} 
                                                        attendance={attendanceSummary[student.uid]}
                                                        showPosition={showPosition}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {students.length === 0 && <p className="text-center text-gray-500 p-8">No students found.</p>}
                            </div>
                        </div>
                    )}
                 </>
            )}
        </div>
    );
};

export default AdminTerminalReports;
