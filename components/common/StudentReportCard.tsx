
import React, { useMemo } from 'react';
import { UserProfile, TerminalReport, TerminalReportMark, SchoolSettings } from '../../types';

const getRemark = (grade: string) => {
    if (grade === 'A') return 'Excellent';
    if (grade === 'B+') return 'Very Good';
    if (grade === 'B') return 'Good';
    if (grade === 'C+') return 'Credit';
    if (grade === 'C') return 'Pass';
    if (grade === 'D+' || grade === 'D') return 'Weak Pass';
    return 'Fail';
};

const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

interface RankingData {
    position: number;
    totalScore: number;
    average: number;
}

interface StudentReportCardProps { 
    student: UserProfile; 
    report: TerminalReport | null; 
    schoolSettings: SchoolSettings | null;
    ranking: RankingData | null;
    classSize: number;
    currentMarks?: Record<string, Partial<TerminalReportMark>>; // Optional: for previewing unsaved/current editing marks
    teacherSubjects?: string[]; // Optional: to filter/order subjects
}

const StudentReportCard: React.FC<StudentReportCardProps> = ({ student, report, schoolSettings, ranking, classSize, currentMarks }) => {
    
    const studentSubjects = useMemo(() => {
        if (currentMarks) {
            // Preview mode using local state
             return Object.entries(currentMarks).map(([subject, mark]) => {
                const safeMark = mark || {};
                return {
                    subject,
                    ...(safeMark as any)
                };
            }).filter(s => s.overallTotal !== undefined);
        }

        // Standard mode using saved report
        if (!report || !report.subjects) return [];
        return Object.entries(report.subjects).map(([subject, data]) => {
            const subjectData = data as { marks: Record<string, TerminalReportMark> };
            const mark = subjectData.marks?.[student.uid];
            if (!mark) return null;
            return { subject, ...mark };
        }).filter((s): s is { subject: string } & TerminalReportMark => s !== null && s.overallTotal !== undefined);
    }, [report, student.uid, currentMarks]);

    return (
        <div className="printable-report-card bg-white text-black p-4 sm:p-8 max-w-[210mm] mx-auto mb-8 border-2 border-gray-800 shadow-xl print:shadow-none print:border-2 print:break-after-page font-serif relative text-sm w-full">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none overflow-hidden">
                 <h1 className="text-6xl sm:text-9xl font-bold uppercase transform -rotate-45 whitespace-nowrap">{schoolSettings?.schoolName}</h1>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-b-4 border-double border-gray-800 pb-4 mb-6 relative z-10 gap-4 sm:gap-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center border-2 border-gray-800 rounded-full bg-gray-100 shrink-0 overflow-hidden">
                    <span className="text-2xl sm:text-3xl">🎓</span>
                </div>
                <div className="text-center flex-grow px-4">
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest font-sans text-black leading-tight">{schoolSettings?.schoolName || 'EDUTECSCH'}</h1>
                    <p className="text-xs sm:text-sm italic font-semibold text-gray-800 mt-1">"{schoolSettings?.schoolMotto || 'Excellence in Education'}"</p>
                    <div className="mt-3 inline-block bg-black text-white px-6 sm:px-8 py-1 rounded-sm uppercase text-xs sm:text-sm font-bold tracking-widest">
                        Term {report?.term || schoolSettings?.currentTerm} Report
                    </div>
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 border border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-xs text-center p-1 shrink-0 overflow-hidden">
                    {student.photoURL ? (
                        <img src={student.photoURL} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                        "Student Photo"
                    )}
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
                        <span className="font-semibold">{report?.academicYear || schoolSettings?.academicYear}</span>
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
                                <td className="border border-gray-400 p-2 text-center text-xs text-black">{s.position || '-'}</td>
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

export default StudentReportCard;
