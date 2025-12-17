
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

const CORE_SUBJECTS = ['English Language', 'Mathematics', 'Integrated Science', 'Science', 'Social Studies', 'ICT', 'Computing', 'RME', 'Our World Our People'];

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
    currentMarks?: Record<string, Partial<TerminalReportMark>>; 
    attendance?: { present: number; total: number };
}

const StudentReportCard: React.FC<StudentReportCardProps> = ({ student, report, schoolSettings, ranking, classSize, currentMarks, attendance }) => {
    
    const studentSubjects = useMemo(() => {
        let subs: ({ subject: string } & Partial<TerminalReportMark>)[] = [];
        
        if (currentMarks) {
             subs = Object.entries(currentMarks).map(([subject, mark]) => {
                const safeMark = mark || {};
                return { subject, ...(safeMark as any) };
            }).filter(s => s.overallTotal !== undefined);
        } else if (report && report.subjects) {
            subs = Object.entries(report.subjects).map(([subject, data]) => {
                const subjectData = data as { marks: Record<string, TerminalReportMark> };
                const mark = subjectData.marks?.[student.uid];
                if (!mark) return null;
                return { subject, ...mark };
            }).filter((s): s is { subject: string } & TerminalReportMark => s !== null && s.overallTotal !== undefined);
        }

        // Normalize subject names
        const normalizedSubs: typeof subs = [];
        const seenSubjects = new Set<string>();
        const isJHS = student.class && student.class.toUpperCase().includes('JHS');

        subs.forEach(s => {
            let subjectName = s.subject;
            if (subjectName === 'Science' || subjectName === 'Integrated Science') {
                subjectName = isJHS ? 'Integrated Science' : 'Science';
            }
            if (!seenSubjects.has(subjectName)) {
                normalizedSubs.push({ ...s, subject: subjectName });
                seenSubjects.add(subjectName);
            }
        });

        // Sort: Core subjects first, then alphabetical
        return normalizedSubs.sort((a, b) => {
            const idxA = CORE_SUBJECTS.indexOf(a.subject);
            const idxB = CORE_SUBJECTS.indexOf(b.subject);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.subject.localeCompare(b.subject);
        });

    }, [report, student.uid, currentMarks, student.class]);

    return (
        <div className="printable-report-card relative w-full max-w-[210mm] mx-auto mb-8 bg-white text-slate-800 p-0 shadow-2xl rounded-xl overflow-hidden print:shadow-none print:rounded-none print:border-2 print:border-black print:text-black print:break-after-page font-sans">
            
            {/* Colorful Top Accent for Screen */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 print:hidden"></div>

            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                 <h1 className="text-6xl sm:text-8xl font-bold uppercase transform -rotate-45 whitespace-nowrap">{schoolSettings?.schoolName}</h1>
            </div>

            <div className="p-8 print:p-6">
                {/* Header */}
                <div className="flex flex-col items-center border-b-4 border-double border-slate-200 print:border-black pb-6 mb-6 relative z-10">
                    <div className="flex w-full items-center justify-between mb-4">
                        <div className="w-24 h-24 flex items-center justify-center border-4 border-blue-50 print:border-black rounded-full bg-blue-50 print:bg-transparent overflow-hidden shadow-sm print:shadow-none">
                            <span className="text-4xl">🎓</span>
                        </div>
                        <div className="text-center flex-grow px-6">
                            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-widest font-sans text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 print:text-black print:bg-none leading-none mb-2">
                                {schoolSettings?.schoolName || 'EDUTECSCH'}
                            </h1>
                            <p className="text-sm italic font-semibold text-slate-500 print:text-black">"{schoolSettings?.schoolMotto || 'Excellence in Education'}"</p>
                            <div className="mt-3 inline-block px-4 py-1 bg-slate-100 print:bg-transparent rounded-full border border-slate-200 print:border-none">
                                <p className="text-xs font-bold text-slate-600 print:text-black uppercase tracking-wider">Student Performance Report</p>
                            </div>
                        </div>
                        <div className="w-24 h-24 border-4 border-slate-100 print:border-black bg-slate-50 print:bg-transparent flex items-center justify-center text-slate-300 print:text-black shadow-inner print:shadow-none overflow-hidden rounded-lg print:rounded-none">
                            {student.photoURL ? (
                                <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs">PHOTO</span>
                            )}
                        </div>
                    </div>
                    <div className="w-full flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 print:bg-none print:bg-transparent print:border-y-2 print:border-black text-white print:text-black px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg print:rounded-none shadow-md print:shadow-none">
                        <span>Term {report?.term || schoolSettings?.currentTerm}</span>
                        <span>Year: {report?.academicYear || schoolSettings?.academicYear}</span>
                    </div>
                </div>

                {/* Student Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-slate-50 print:bg-transparent p-4 rounded-xl border border-slate-100 print:border-none print:p-0">
                    <div className="col-span-2 flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">Student Name</span>
                        <span className="font-bold text-lg text-slate-800 print:text-black uppercase truncate">{student.name}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">Class</span>
                        <span className="font-semibold text-slate-700 print:text-black">{student.class}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">ID Number</span>
                        <span className="font-mono font-semibold text-slate-700 print:text-black">{student.uid.substring(0, 6).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">Attendance</span>
                        <span className="font-semibold text-slate-700 print:text-black">{attendance ? `${attendance.present} / ${attendance.total}` : '-'}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">No. on Roll</span>
                        <span className="font-semibold text-slate-700 print:text-black">{classSize}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">Position</span>
                        <span className="font-black text-blue-600 print:text-black text-lg">
                            {ranking ? `${ranking.position}${getOrdinal(ranking.position)}` : '-'}
                        </span>
                    </div>
                    <div className="flex flex-col border-b border-slate-200 print:border-black pb-1">
                        <span className="text-[10px] uppercase text-slate-400 print:text-black font-bold tracking-wider">Next Term</span>
                        <span className="font-semibold italic text-slate-700 print:text-black">....................</span>
                    </div>
                </div>

                {/* Academic Table */}
                <div className="mb-8 relative z-10 overflow-hidden rounded-lg print:rounded-none border border-slate-200 print:border-black">
                    <table className="w-full text-xs sm:text-sm border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-100 print:bg-transparent text-xs uppercase tracking-wider text-slate-600 print:text-black border-b border-slate-200 print:border-black">
                                <th className="p-3 font-bold border-r border-slate-200 print:border-black">Subject</th>
                                <th className="p-2 text-center w-12 border-r border-slate-200 print:border-black">Class<br/>(50)</th>
                                <th className="p-2 text-center w-12 border-r border-slate-200 print:border-black">Exam<br/>(50)</th>
                                <th className="p-2 text-center w-14 bg-slate-200 print:bg-transparent font-bold text-slate-800 print:text-black border-r border-slate-200 print:border-black">Total<br/>(100)</th>
                                <th className="p-2 text-center w-10 border-r border-slate-200 print:border-black">Grd</th>
                                <th className="p-2 text-center w-10 border-r border-slate-200 print:border-black">Pos</th>
                                <th className="p-3 w-1/3">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 print:divide-black text-slate-700 print:text-black">
                            {studentSubjects.length > 0 ? studentSubjects.map((s, idx) => (
                                <tr key={idx} className="even:bg-slate-50 print:even:bg-transparent">
                                    <td className="p-3 font-bold uppercase text-xs border-r border-slate-200 print:border-black">{s.subject}</td>
                                    <td className="p-2 text-center border-r border-slate-200 print:border-black">{s.scaledClassScore?.toFixed(0)}</td>
                                    <td className="p-2 text-center border-r border-slate-200 print:border-black">{s.scaledExamScore?.toFixed(0)}</td>
                                    <td className="p-2 text-center font-bold bg-slate-100 print:bg-transparent text-slate-900 print:text-black border-r border-slate-200 print:border-black">{s.overallTotal?.toFixed(0)}</td>
                                    <td className={`p-2 text-center font-bold border-r border-slate-200 print:border-black ${s.grade === 'F' ? 'text-red-500 print:text-black' : s.grade?.startsWith('A') ? 'text-green-600 print:text-black' : ''}`}>{s.grade}</td>
                                    <td className="p-2 text-center text-xs text-slate-500 print:text-black border-r border-slate-200 print:border-black">{s.position || '-'}</td>
                                    <td className="p-3 text-xs italic">{s.remarks || getRemark(s.grade || '')}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 print:text-black italic">Marks pending entry.</td>
                                </tr>
                            )}
                             {studentSubjects.length > 0 && ranking && (
                                <tr className="bg-slate-800 print:bg-transparent text-white print:text-black font-bold border-t-2 border-slate-800 print:border-black">
                                    <td className="p-3 text-right uppercase tracking-wider border-r border-slate-600 print:border-black">Overall Performance</td>
                                    <td colSpan={2} className="border-r border-slate-600 print:border-black"></td>
                                    <td className="p-3 text-center bg-slate-700 print:bg-transparent border-r border-slate-600 print:border-black text-lg">{ranking.totalScore.toFixed(0)}</td>
                                    <td colSpan={2} className="p-3 text-right border-r border-slate-600 print:border-black">Average:</td>
                                    <td className="p-3 text-lg text-green-400 print:text-black">{ranking.average.toFixed(1)}%</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Assessment Areas */}
                <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
                    <div className="border border-slate-200 print:border-black p-3 rounded-lg print:rounded-none bg-slate-50 print:bg-transparent">
                        <h4 className="font-bold uppercase text-slate-500 print:text-black border-b border-slate-200 print:border-black mb-2 pb-1">Conduct & Character</h4>
                        <div className="space-y-2 pt-1">
                             <div className="flex justify-between border-b border-dotted border-slate-300 print:border-black pb-1"><span>Attitude to Work:</span> <span className="italic font-semibold">Good</span></div>
                             <div className="flex justify-between border-b border-dotted border-slate-300 print:border-black pb-1"><span>Conduct in Class:</span> <span className="italic font-semibold">Satisfactory</span></div>
                             <div className="flex justify-between border-b border-dotted border-slate-300 print:border-black pb-1"><span>Assignments:</span> <span className="italic font-semibold">Regular</span></div>
                        </div>
                    </div>
                    <div className="border border-slate-200 print:border-black p-3 rounded-lg print:rounded-none bg-slate-50 print:bg-transparent">
                        <h4 className="font-bold uppercase text-slate-500 print:text-black border-b border-slate-200 print:border-black mb-2 pb-1">Interests & Skills</h4>
                         <div className="space-y-2 pt-1">
                             <div className="flex justify-between border-b border-dotted border-slate-300 print:border-black pb-1"><span>Sports/Games:</span> <span className="italic font-semibold">Active</span></div>
                             <div className="flex justify-between border-b border-dotted border-slate-300 print:border-black pb-1"><span>Leadership:</span> <span className="italic font-semibold">Shows potential</span></div>
                             <div className="flex justify-between border-b border-dotted border-slate-300 print:border-black pb-1"><span>Creativity:</span> <span className="italic font-semibold">High</span></div>
                        </div>
                    </div>
                </div>

                {/* Footer / Remarks */}
                <div className="space-y-6 relative z-10 text-slate-800 print:text-black">
                    <div className="border border-slate-300 print:border-black p-4 rounded-lg print:rounded-none flex flex-col gap-1 bg-white print:bg-transparent">
                        <p className="font-bold text-xs uppercase text-slate-500 print:text-black">Class Teacher's Remarks:</p>
                        <div className="border-b border-slate-800 print:border-black h-6 w-full"></div>
                        <div className="flex justify-between items-end mt-2">
                            <div className="text-xs text-slate-500 print:text-black">Date: ........................</div>
                            <div className="text-xs text-slate-500 print:text-black">Signature: ........................</div>
                        </div>
                    </div>
                    
                    <div className="border border-slate-300 print:border-black p-4 rounded-lg print:rounded-none flex flex-col gap-1 bg-white print:bg-transparent">
                        <p className="font-bold text-xs uppercase text-slate-500 print:text-black">Head Teacher's Remarks:</p>
                        <div className="border-b border-slate-800 print:border-black h-6 w-full"></div>
                        <div className="flex justify-between items-end mt-2">
                            <div className="text-xs text-slate-500 print:text-black">Date: ........................</div>
                            <div className="w-24 h-8 border border-dashed border-slate-400 print:border-black flex items-center justify-center text-[8px] text-slate-400 print:text-black uppercase">
                                Official Stamp
                            </div>
                            <div className="text-xs text-slate-500 print:text-black">Signature: ........................</div>
                        </div>
                    </div>
                </div>
                
                {/* Grading Scale Legend */}
                <div className="mt-6 pt-3 border-t border-slate-200 print:border-black text-[9px] text-slate-500 print:text-black flex flex-wrap justify-center gap-x-4 uppercase font-bold tracking-wide">
                    <span className="text-green-600 print:text-black">80-100 (A) Excellent</span>
                    <span className="text-blue-600 print:text-black">70-79 (B+) Very Good</span>
                    <span className="text-blue-500 print:text-black">60-69 (B) Good</span>
                    <span className="text-yellow-600 print:text-black">55-59 (C+) Credit</span>
                    <span className="text-yellow-500 print:text-black">50-54 (C) Pass</span>
                    <span className="text-orange-500 print:text-black">40-49 (D) Weak Pass</span>
                    <span className="text-red-500 print:text-black">0-39 (F) Fail</span>
                </div>
                
                <div className="text-center mt-4 text-[8px] text-slate-300 print:text-black italic">
                    System Generated Report • {schoolSettings?.schoolName} • {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

export default StudentReportCard;
