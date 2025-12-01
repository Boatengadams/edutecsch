
import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile, AttendanceRecord, GES_CLASSES } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import LineChart from './common/charts/LineChart';
import HeatMap from './common/charts/HeatMap';

interface AdminAttendanceDashboardProps {
    allUsers: UserProfile[];
    attendanceRecords: AttendanceRecord[];
}

const AdminAttendanceDashboard: React.FC<AdminAttendanceDashboardProps> = ({ allUsers, attendanceRecords }) => {
    const [selectedClass, setSelectedClass] = useState('all');
    const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [aiInsight, setAiInsight] = useState('');

    // --- Data Processing ---

    // 1. Filter Records by Date
    const filteredRecords = useMemo(() => {
        const now = new Date();
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - parseInt(dateRange));
        
        return attendanceRecords
            .filter(rec => new Date(rec.date) >= pastDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [attendanceRecords, dateRange]);

    // 2. Aggregate Data based on View (All School vs Specific Class)
    const stats = useMemo(() => {
        const recordsToProcess = selectedClass === 'all' 
            ? filteredRecords 
            : filteredRecords.filter(rec => rec.classId === selectedClass);

        // Daily Stats for Charts
        const dailyStats: Record<string, { present: number; total: number }> = {};
        
        // Student Stats Accumulator
        const studentStats: Record<string, { present: number; absent: number; late: number; total: number; name: string; class: string }> = {};

        // Initialize student stats for the relevant scope to ensure 0s are counted
        const scopeStudents = allUsers.filter(u => u.role === 'student' && (selectedClass === 'all' || u.class === selectedClass));
        scopeStudents.forEach(s => {
            studentStats[s.uid] = { present: 0, absent: 0, late: 0, total: 0, name: s.name, class: s.class || 'N/A' };
        });

        recordsToProcess.forEach(record => {
            if (!dailyStats[record.date]) dailyStats[record.date] = { present: 0, total: 0 };
            
            // Iterate through actual records in the doc
            if (record.records) {
                Object.entries(record.records).forEach(([uid, status]) => {
                    // Update Daily
                    if (status === 'Present' || status === 'Late') dailyStats[record.date].present++;
                    dailyStats[record.date].total++;

                    // Update Student Specific
                    if (studentStats[uid]) {
                        studentStats[uid].total++;
                        if (status === 'Present') studentStats[uid].present++;
                        else if (status === 'Absent') studentStats[uid].absent++;
                        else if (status === 'Late') studentStats[uid].late++;
                    }
                });
            }
        });

        // Chart Data
        const chartData = Object.entries(dailyStats).map(([date, data]) => ({
            label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            date: date,
            value: data.total > 0 ? (data.present / data.total) * 100 : 0
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // KPIs
        const totalPresent = Object.values(studentStats).reduce((acc, s) => acc + s.present + s.late, 0);
        const totalPossible = Object.values(studentStats).reduce((acc, s) => acc + s.total, 0);
        const averageAttendance = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

        const atRiskCount = Object.values(studentStats).filter(s => s.total > 0 && ((s.present + s.late) / s.total) < 0.85).length;
        const perfectCount = Object.values(studentStats).filter(s => s.total > 0 && s.absent === 0).length;

        // Class Breakdown (for "All" view)
        const classBreakdown = GES_CLASSES.map(cls => {
            const classStudents = Object.values(studentStats).filter(s => s.class === cls);
            const clsPresent = classStudents.reduce((acc, s) => acc + s.present + s.late, 0);
            const clsTotal = classStudents.reduce((acc, s) => acc + s.total, 0);
            return {
                id: cls,
                avg: clsTotal > 0 ? (clsPresent / clsTotal) * 100 : 0,
                absences: classStudents.reduce((acc, s) => acc + s.absent, 0),
                lates: classStudents.reduce((acc, s) => acc + s.late, 0)
            };
        }).sort((a,b) => b.avg - a.avg); // Best performing first

        // Student Breakdown (for "Class" view)
        const studentBreakdown = Object.values(studentStats)
            .filter(s => s.total > 0) // Only show active students with records in this period
            .map(s => ({
                ...s,
                rate: (s.present + s.late) / s.total * 100
            }))
            .sort((a, b) => a.rate - b.rate); // Risk students first

        return { chartData, averageAttendance, atRiskCount, perfectCount, classBreakdown, studentBreakdown };
    }, [selectedClass, filteredRecords, allUsers]);


    const handleGenerateInsight = async () => {
        setLoadingInsight(true);
        setAiInsight('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Analyze this school attendance data for a professional report.
                Context: Last ${dateRange} days. Scope: ${selectedClass === 'all' ? 'Entire School' : selectedClass}.
                
                **Key Metrics:**
                - Average Attendance: ${stats.averageAttendance.toFixed(1)}%
                - Students At Risk (<85%): ${stats.atRiskCount}
                - Perfect Attendance: ${stats.perfectCount}
                
                **Task:**
                1. Provide an executive summary of the attendance health.
                2. Identify if the 'At Risk' number is concerning (based on typical school standards).
                3. Suggest 2 specific administrative actions to improve attendance based on these numbers.
                
                Keep it concise and professional. Use Markdown.
            `;
            const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
            setAiInsight(response.text);
        } catch (err) {
            setAiInsight("Unable to generate insight at this time.");
        } finally {
            setLoadingInsight(false);
        }
    };

    const handleExportCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (selectedClass === 'all') {
            csvContent += "Class,Average Attendance (%),Total Absences,Total Lates\n";
            stats.classBreakdown.forEach(row => {
                csvContent += `${row.id},${row.avg.toFixed(2)},${row.absences},${row.lates}\n`;
            });
        } else {
            csvContent += "Student Name,Attendance Rate (%),Present,Absent,Late,Total Days\n";
            stats.studentBreakdown.forEach(row => {
                csvContent += `${row.name},${row.rate.toFixed(2)},${row.present},${row.absent},${row.late},${row.total}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${selectedClass}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div>
                    <h2 className="text-2xl font-bold text-white">Attendance Intelligence</h2>
                    <p className="text-xs text-slate-400">Monitor trends and identify at-risk students.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        {['7', '30', '90'].map(d => (
                            <button 
                                key={d}
                                onClick={() => setDateRange(d as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${dateRange === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {d} Days
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)} 
                        className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">All Classes</option>
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                        Export CSV
                    </Button>
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex items-center justify-between !bg-slate-800/80">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg. Attendance</p>
                        <p className={`text-3xl font-black mt-1 ${stats.averageAttendance >= 90 ? 'text-green-400' : stats.averageAttendance >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {stats.averageAttendance.toFixed(1)}%
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl">📊</div>
                </Card>
                <Card className="flex items-center justify-between !bg-slate-800/80">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">At Risk Students</p>
                        <p className="text-3xl font-black mt-1 text-red-400">{stats.atRiskCount}</p>
                        <p className="text-[10px] text-red-300/50">Below 85% attendance</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-2xl">⚠️</div>
                </Card>
                <Card className="flex items-center justify-between !bg-slate-800/80">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Perfect Record</p>
                        <p className="text-3xl font-black mt-1 text-green-400">{stats.perfectCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-2xl">🏆</div>
                </Card>
            </div>

            {/* Visualizations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-80">
                    <Card className="h-full flex flex-col">
                        <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase">Attendance Trend</h3>
                        <div className="flex-grow">
                            <LineChart data={stats.chartData} />
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-1 h-80">
                    <HeatMap data={stats.chartData} title="Intensity Map" />
                </div>
            </div>

            {/* Detailed Breakdown / AI Insight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Left: Table Data */}
                 <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">
                                {selectedClass === 'all' ? 'Class Performance Ranking' : `Student Roster: ${selectedClass}`}
                            </h3>
                        </div>
                        <div className="flex-grow overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                            {selectedClass === 'all' ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="p-3 rounded-tl-lg">Class</th>
                                            <th className="p-3 w-1/3">Attendance Rate</th>
                                            <th className="p-3 text-right">Absences</th>
                                            <th className="p-3 text-right rounded-tr-lg">Lates</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {stats.classBreakdown.map(cls => (
                                            <tr key={cls.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-3 font-medium text-white">{cls.id}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono w-10">{cls.avg.toFixed(0)}%</span>
                                                        <div className="flex-grow bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                            <div className={`h-full rounded-full ${cls.avg >= 90 ? 'bg-green-500' : cls.avg >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${cls.avg}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right text-slate-400">{cls.absences}</td>
                                                <td className="p-3 text-right text-slate-400">{cls.lates}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="p-3 rounded-tl-lg">Student</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">Present</th>
                                            <th className="p-3 text-right">Absent</th>
                                            <th className="p-3 text-right rounded-tr-lg">Late</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {stats.studentBreakdown.map(student => (
                                            <tr key={student.name} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-3 font-medium text-white">{student.name}</td>
                                                <td className="p-3">
                                                    {student.rate < 85 ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/20">
                                                            At Risk ({student.rate.toFixed(0)}%)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/20">
                                                            Good ({student.rate.toFixed(0)}%)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right text-green-300">{student.present}</td>
                                                <td className="p-3 text-right text-red-300 font-bold">{student.absent}</td>
                                                <td className="p-3 text-right text-yellow-300">{student.late}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                 </div>

                 {/* Right: AI & Summary */}
                 <div className="lg:col-span-1">
                    <Card className="h-full bg-gradient-to-b from-slate-800 to-slate-900 border-none flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI Admin Assistant</h3>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">🤖</div>
                        </div>
                        
                        <div className="flex-grow bg-slate-900/50 rounded-xl p-4 mb-4 overflow-y-auto border border-slate-700/50">
                            {aiInsight ? (
                                <div className="prose-styles prose-invert text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/(\r\n|\n|\r)/gm,"<br/>") }}></div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center gap-2">
                                    <span className="text-3xl opacity-50">💡</span>
                                    <p className="text-xs">Generate professional insights and recommendations based on the current data.</p>
                                </div>
                            )}
                        </div>

                        <Button onClick={handleGenerateInsight} disabled={loadingInsight} className="w-full shadow-lg shadow-purple-900/20">
                            {loadingInsight ? <Spinner /> : 'Generate Report Analysis'}
                        </Button>
                    </Card>
                 </div>
            </div>
        </div>
    );
};

export default AdminAttendanceDashboard;
