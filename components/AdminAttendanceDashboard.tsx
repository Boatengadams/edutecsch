import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile, AttendanceRecord, GES_CLASSES } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import LineChart from './common/charts/LineChart';

interface AdminAttendanceDashboardProps {
    allUsers: UserProfile[];
    attendanceRecords: AttendanceRecord[];
}

const AdminAttendanceDashboard: React.FC<AdminAttendanceDashboardProps> = ({ allUsers, attendanceRecords }) => {
    const [selectedClass, setSelectedClass] = useState('all');
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [aiInsight, setAiInsight] = useState('');

    const students = useMemo(() => allUsers.filter(u => u.role === 'student'), [allUsers]);
    
    // Filter records for the last 30 days
    const filteredRecords = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return attendanceRecords.filter(rec => new Date(rec.date) >= thirtyDaysAgo);
    }, [attendanceRecords]);
    
    // Process data for charts and stats
    const processedData = useMemo(() => {
        const recordsToProcess = selectedClass === 'all' 
            ? filteredRecords 
            : filteredRecords.filter(rec => rec.classId === selectedClass);
        
        const dailyStats: { [date: string]: { present: number; total: number } } = {};

        for (const record of recordsToProcess) {
            if (!dailyStats[record.date]) {
                dailyStats[record.date] = { present: 0, total: 0 };
            }
            const presentCount = Object.values(record.records || {}).filter(status => status === 'Present').length;
            dailyStats[record.date].present += presentCount;
            dailyStats[record.date].total += (record.studentUids || []).length;
        }

        const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
            label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
        })).sort((a,b) => new Date(a.label + ', ' + new Date().getFullYear()).getTime() - new Date(b.label + ', ' + new Date().getFullYear()).getTime());

        const averageAttendance = chartData.length > 0 ? chartData.reduce((sum, day) => sum + day.value, 0) / chartData.length : 0;
        
        let trend = 'Stable';
        if (chartData.length > 10) {
            const firstHalfAvg = chartData.slice(0, Math.floor(chartData.length / 2)).reduce((sum, day) => sum + day.value, 0) / Math.floor(chartData.length / 2);
            const secondHalfAvg = chartData.slice(Math.floor(chartData.length / 2)).reduce((sum, day) => sum + day.value, 0) / Math.ceil(chartData.length / 2);
            if (secondHalfAvg > firstHalfAvg + 1) trend = 'Improving';
            if (secondHalfAvg < firstHalfAvg - 1) trend = 'Declining';
        }

        return { chartData, averageAttendance, trend };
    }, [selectedClass, filteredRecords, students]);

    const schoolWideStats = useMemo(() => {
        const classAverages: { classId: string, average: number, absences: number, lates: number }[] = [];
        for (const classId of GES_CLASSES) {
            const classRecords = filteredRecords.filter(r => r.classId === classId);
            if (classRecords.length === 0) continue;

            let totalAbsences = 0;
            let totalLates = 0;
            
            const uniqueDays = new Set(classRecords.map(rec => rec.date));

            classRecords.forEach(rec => {
                totalAbsences += Object.values(rec.records || {}).filter(s => s === 'Absent').length;
                totalLates += Object.values(rec.records || {}).filter(s => s === 'Late').length;
            });
            
            let dailyPercentages: number[] = [];
            uniqueDays.forEach(date => {
                const dayRecords = classRecords.filter(r => r.date === date);
                let dayPresent = 0;
                let dayTotal = 0;
                dayRecords.forEach(rec => {
                    dayPresent += Object.values(rec.records || {}).filter(s => s === 'Present').length;
                    dayTotal += (rec.studentUids || []).length;
                });
                if(dayTotal > 0) dailyPercentages.push((dayPresent/dayTotal) * 100);
            });

            const average = dailyPercentages.length > 0 ? dailyPercentages.reduce((a,b) => a+b, 0) / dailyPercentages.length : 0;
            classAverages.push({ classId, average, absences: totalAbsences, lates: totalLates });
        }
        
        classAverages.sort((a,b) => b.average - a.average);
        const bestClass = classAverages[0];
        const worstClass = classAverages[classAverages.length - 1];
        
        return { classAverages, bestClass, worstClass };
    }, [filteredRecords]);

    const handleGenerateInsight = async () => {
        setLoadingInsight(true);
        setAiInsight('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                You are a professional school data analyst providing insights to a school administrator. Based on the following attendance data for the last 30 days, provide a concise report.

                **Data Summary:**
                - Overall School Attendance Rate: ${processedData.averageAttendance.toFixed(1)}%
                - School-wide Trend: ${processedData.trend}
                - Class with Highest Attendance: ${schoolWideStats.bestClass?.classId || 'N/A'} at ${schoolWideStats.bestClass?.average.toFixed(1) || 'N/A'}%
                - Class with Lowest Attendance: ${schoolWideStats.worstClass?.classId || 'N/A'} at ${schoolWideStats.worstClass?.average.toFixed(1) || 'N/A'}%
                - Notable Daily Trend: Analysis of daily data suggests attendance may be lowest on Mondays and Fridays.

                **Your Task:**
                1.  **Executive Summary:** Write a 2-3 sentence professional summary of the school's attendance.
                2.  **Key Observations:** In bullet points, highlight the most important positive and negative trends. Identify any specific classes or days that require attention.
                3.  **Recommendations for Event Planning:** Based on the data, provide actionable guidance for scheduling future school events to maximize student participation. For example, suggest the best and worst days of the week for events.
                
                Format your response using Markdown.
            `;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAiInsight(response.text);
        } catch (err) {
            setAiInsight("An error occurred while generating insights. Please try again.");
        } finally {
            setLoadingInsight(false);
        }
    };


    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Attendance Dashboard</h2>
            <div className="flex gap-4 items-center">
                 <label htmlFor="class-filter" className="text-sm font-medium">View Data For:</label>
                 <select id="class-filter" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                    <option value="all">All School</option>
                    {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
            </div>
            
            <Card>
                <h3 className="text-xl font-semibold mb-4">Attendance Trend (Last 30 Days) - {selectedClass === 'all' ? 'All School' : selectedClass}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 bg-slate-900/50 rounded-lg text-center"><p className="text-sm text-gray-400">Average Attendance</p><p className="text-2xl font-bold">{processedData.averageAttendance.toFixed(1)}%</p></div>
                    <div className="p-4 bg-slate-900/50 rounded-lg text-center"><p className="text-sm text-gray-400">30-Day Trend</p><p className="text-2xl font-bold">{processedData.trend}</p></div>
                    <div className="p-4 bg-slate-900/50 rounded-lg text-center"><p className="text-sm text-gray-400">Top Class</p><p className="text-2xl font-bold">{schoolWideStats.bestClass?.classId || 'N/A'}</p></div>
                    <div className="p-4 bg-slate-900/50 rounded-lg text-center"><p className="text-sm text-gray-400">Lowest Class</p><p className="text-2xl font-bold">{schoolWideStats.worstClass?.classId || 'N/A'}</p></div>
                </div>
                <div className="h-72">
                    <LineChart data={processedData.chartData} />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">AI Analysis & Guidance</h3>
                        <Button onClick={handleGenerateInsight} disabled={loadingInsight}>
                            {loadingInsight ? <Spinner /> : 'Generate Analysis'}
                        </Button>
                    </div>
                    {aiInsight ? (
                        <div className="prose-styles prose-invert max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/(\r\n|\n|\r)/gm,"<br/>") }}></div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">Click "Generate Analysis" to get AI-powered insights and recommendations for event planning based on attendance trends.</p>
                    )}
                 </Card>
                 <Card>
                    <h3 className="text-xl font-semibold mb-4">Class Breakdown (Last 30 Days)</h3>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left bg-slate-700">
                                    <th className="p-2">Class</th>
                                    <th className="p-2 text-center">Avg. Attendance</th>
                                    <th className="p-2 text-center">Total Absences</th>
                                    <th className="p-2 text-center">Total Lates</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schoolWideStats.classAverages.map(c => (
                                    <tr key={c.classId} className="border-b border-slate-700">
                                        <td className="p-2 font-semibold">{c.classId}</td>
                                        <td className="p-2 text-center">{c.average.toFixed(1)}%</td>
                                        <td className="p-2 text-center">{c.absences}</td>
                                        <td className="p-2 text-center">{c.lates}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </Card>
            </div>
        </div>
    );
};

export default AdminAttendanceDashboard;
