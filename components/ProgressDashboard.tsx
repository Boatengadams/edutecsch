import React, { useState, useEffect, useMemo } from 'react';
// FIX: Import firebase for compat services
import { db, firebase } from '../services/firebase';
import { GoogleGenAI } from '@google/genai';
import { UserProfile, Assignment, Submission, AttendanceRecord } from '../types';
import Spinner from './common/Spinner';
import Button from './common/Button';
import LineChart from './common/charts/LineChart';

interface ProgressDashboardProps {
  student: UserProfile;
  onClose?: () => void;
  isModal?: boolean;
}

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    const numericGrade = parseFloat(grade);
    if (!isNaN(numericGrade)) return numericGrade;

    const upperGrade = grade.toUpperCase();
    if (upperGrade.startsWith('A')) return 95;
    if (upperGrade.startsWith('B')) return 85;
    if (upperGrade.startsWith('C')) return 75;
    if (upperGrade.startsWith('D')) return 65;
    if (upperGrade.startsWith('F')) return 50;
    return null;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ student, onClose, isModal = true }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState('');
    const [loadingInsight, setLoadingInsight] = useState(false);

    useEffect(() => {
        if (!student.uid || !student.class) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const assignmentsSnapshot = await db.collection('assignments').where('classId', '==', student.class).orderBy('createdAt', 'desc').get();
                setAssignments(assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));

                const submissionsSnapshot = await db.collection('submissions').where('studentId', '==', student.uid).get();
                setSubmissions(submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));

                const attendanceSnapshot = await db.collection('attendance').where('studentUids', 'array-contains', student.uid).orderBy('date', 'desc').limit(30).get();
                setAttendance(attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
            } catch (error) {
                console.error("Error fetching progress data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [student.uid, student.class]);

    const dashboardData = useMemo(() => {
        const gradedSubmissions = submissions.filter(s => s.status === 'Graded' && s.grade);
        const numericGrades = gradedSubmissions.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
        const overallAverageGrade = numericGrades.length > 0 ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) : null;
        
        const totalAssignments = assignments.length;
        const submittedCount = submissions.length;
        const completionRate = totalAssignments > 0 ? (submittedCount / totalAssignments) * 100 : 0;
        
        const assignmentsWithDueDate = assignments.filter((a: Assignment) => a.dueDate);
        const onTimeSubmissions = submissions.filter((sub: Submission) => {
            // FIX: Use .find() directly on the assignments array to ensure proper type inference.
            const assignment = assignments.find(a => a.id === sub.assignmentId);
            if (!assignment || !assignment.dueDate) return false; // Only count assignments with due dates for this metric
            // FIX: Cast submittedAt to any to call toDate() safely
            return (sub.submittedAt as any).toDate() <= new Date(assignment.dueDate + 'T23:59:59');
        }).length;
        const onTimeRate = assignmentsWithDueDate.length > 0 ? (onTimeSubmissions / assignmentsWithDueDate.length) * 100 : 0;
        
        const subjectGradesItems = gradedSubmissions
            // FIX: Use .find() directly on the assignments array to ensure proper type inference.
            .map(sub => ({ sub, assignment: assignments.find(a => a.id === sub.assignmentId) }))
            .filter((item): item is { sub: Submission; assignment: Assignment } => !!item.assignment);

        const subjectGrades = subjectGradesItems.reduce((acc, { sub, assignment }) => {
                const grade = gradeToNumeric(sub.grade);
                if (grade !== null) {
                    if (!acc[assignment.subject]) {
                        acc[assignment.subject] = [];
                    }
                    acc[assignment.subject].push(grade);
                }
                return acc;
            }, {} as { [subject: string]: number[] });

        const subjectMastery = Object.entries(subjectGrades).map(([subject, grades]: [string, number[]]) => {
            const subjectSubmissions = gradedSubmissions
                // FIX: Use .find() directly on the assignments array to ensure proper type inference.
                .map(sub => ({ sub, assign: assignments.find(a => a.id === sub.assignmentId) }))
                .filter((item): item is { sub: Submission; assign: Assignment } => !!item.assign && item.assign.subject === subject)
                // FIX: Cast createdAt to any to call toMillis() safely
                .sort((a, b) => (a.assign!.createdAt as any).toMillis() - (b.assign!.createdAt as any).toMillis());

            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (subjectSubmissions.length >= 4) {
                const firstHalf = subjectSubmissions.slice(0, Math.floor(subjectSubmissions.length / 2));
                const secondHalf = subjectSubmissions.slice(Math.floor(subjectSubmissions.length / 2));

                const firstHalfGrades = firstHalf.map(item => gradeToNumeric(item.sub.grade)!).filter(g => g !== null);
                const secondHalfGrades = secondHalf.map(item => gradeToNumeric(item.sub.grade)!).filter(g => g !== null);

                if (firstHalfGrades.length > 0 && secondHalfGrades.length > 0) {
                    const firstAvg = firstHalfGrades.reduce((a, b) => a + b, 0) / firstHalfGrades.length;
                    const secondAvg = secondHalfGrades.reduce((a, b) => a + b, 0) / secondHalfGrades.length;

                    if (secondAvg > firstAvg + 3) trend = 'improving';
                    if (secondAvg < firstAvg - 3) trend = 'declining';
                }
            }
            
            return {
                subject,
                average: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
                trend
            };
        }).sort((a,b) => b.average - a.average);
        
        const validGradedSubmissions = gradedSubmissions
            // FIX: Use .find() directly on the assignments array to ensure proper type inference.
            .map(sub => ({ sub, assign: assignments.find(a => a.id === sub.assignmentId) }))
            .filter((item): item is { sub: Submission; assign: Assignment } => !!item.assign);

        const gradeHistoryChartData = validGradedSubmissions
            // FIX: Cast createdAt to any to call toMillis() safely
            .sort((a, b) => (a.assign!.createdAt as any).toMillis() - (b.assign!.createdAt as any).toMillis())
            .map(item => ({
                label: item.assign!.title,
                value: gradeToNumeric(item.sub.grade)!,
            }));
            
        const recentActivities = [
            // FIX: Cast submittedAt to any to call toDate() safely
            ...submissions.map(s => ({ type: 'submission' as const, data: s, date: (s.submittedAt as any).toDate() })),
            ...attendance.map(a => ({ type: 'attendance' as const, data: a, date: new Date(a.date) }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);


        return { overallAverageGrade, subjectMastery, gradeHistoryChartData, recentActivities, gradedSubmissions, completionRate, onTimeRate };
    }, [assignments, submissions, attendance]);

    useEffect(() => {
        if (!loading && dashboardData.gradedSubmissions.length > 0) {
            const generateInsight = async () => {
                setLoadingInsight(true);
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const subjectPerformance = dashboardData.subjectMastery.map(s => `- ${s.subject}: ${s.average.toFixed(1)}%`).join('\n');
                    const recentGrades = dashboardData.gradedSubmissions
                        // FIX: Cast submittedAt to any to call toMillis() safely
                        .sort((a, b) => (b.submittedAt as any).toMillis() - (a.submittedAt as any).toMillis())
                        .slice(0, 3)
                        .map(s => `- ${assignments.find(a => a.id === s.assignmentId)?.title}: ${s.grade}`)
                        .join('\n');
                    
                    const prompt = `You are an encouraging AI academic advisor named Edu. Analyze the following student progress data for ${student.name}. Provide a brief, positive, and insightful summary (2-3 sentences). Then, offer one concrete piece of actionable advice for improvement based on their performance. Keep the tone motivational and address the student directly.

                    Data Summary:
                    - Overall Average Grade: ${dashboardData.overallAverageGrade?.toFixed(1)}%
                    - Subject Performance (averages):
                    ${subjectPerformance || 'No graded subjects yet.'}
                    - Recent Grades:
                    ${recentGrades || 'No recent grades.'}

                    Respond directly with the insight. Do not repeat the data back. Format your response with Markdown for clarity (e.g., use bold for key terms).`;
                    
                    // FIX: Updated model name to 'gemini-3-flash-preview' for basic text tasks as per guidelines.
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: prompt,
                        config: {
                            thinkingConfig: { thinkingBudget: 0 }
                        }
                    });
                    setAiInsight(response.text || "");

                } catch (error) {
                    console.error("AI Insight Error:", error);
                } finally {
                    setLoadingInsight(false);
                }
            };
            generateInsight();
        }
    }, [loading, dashboardData, student.name, assignments, submissions]);


    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        }

        const { overallAverageGrade, subjectMastery, gradeHistoryChartData, recentActivities } = dashboardData;
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (overallAverageGrade || 0) / 100 * circumference;

        return (
            <div className="p-4 sm:p-6 space-y-6">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 futuristic-panel p-6 flex flex-col items-center justify-center animate-fade-in-up">
                         <h3 className="text-lg font-semibold text-gray-300 mb-4">Performance Index</h3>
                         <svg className="w-48 h-48" viewBox="0 0 140 140">
                             <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                            <circle className="performance-gauge-bg" cx="70" cy="70" r={60} strokeWidth="12" />
                            <circle
                                className="performance-gauge-fg"
                                cx="70"
                                cy="70"
                                r={60}
                                strokeWidth="12"
                                stroke="url(#gaugeGradient)"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                            />
                            <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-4xl font-bold fill-current text-white glow-text">
                                {overallAverageGrade ? overallAverageGrade.toFixed(1) : 'N/A'}
                            </text>
                            <text x="50%" y="65%" textAnchor="middle" className="text-sm fill-current text-gray-400">
                                Overall Avg.
                            </text>
                         </svg>
                    </div>
                    <div className="lg:col-span-2 futuristic-panel p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <h3 className="text-lg font-semibold text-gray-300 mb-4">Subject Mastery</h3>
                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                            {subjectMastery.length > 0 ? subjectMastery.map(s => (
                                <div key={s.subject}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-sm font-medium text-gray-200">{s.subject}</span>
                                        <div className="flex items-center gap-2">
                                             {s.trend === 'improving' && <span className="text-green-400 text-xs flex items-center">▲ Improving</span>}
                                             {s.trend === 'declining' && <span className="text-red-400 text-xs flex items-center">▼ Declining</span>}
                                            <span className="text-lg font-bold text-blue-300">{s.average.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="subject-mastery-bar-bg">
                                        <div className="subject-mastery-bar-fg" style={{ width: `${s.average}%` }}></div>
                                    </div>
                                </div>
                            )) : <p className="text-gray-500 text-center">No graded assignments yet.</p>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="futuristic-panel p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <h3 className="text-lg font-semibold text-gray-300 mb-4">Grade History (Last 10)</h3>
                        <div className="h-60">
                           <LineChart data={gradeHistoryChartData.slice(-10)} />
                        </div>
                     </div>
                     <div className="futuristic-panel p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <h3 className="text-lg font-semibold text-gray-300 mb-4">AI Insight by Edu</h3>
                        {loadingInsight ? <div className="flex justify-center items-center h-full"><Spinner/></div> :
                        aiInsight ? <div className="prose-styles prose-invert text-sm" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }}></div> :
                        <p className="text-gray-500 text-center">Not enough data for an insight yet. Complete more assignments!</p>}
                     </div>
                </div>

                 <div className="futuristic-panel p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Recent Activity</h3>
                     <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                         {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                             <div key={index} className="flex items-center gap-4 p-2 bg-slate-900/50 rounded-md">
                                 <div className="text-xs text-center text-gray-400">
                                     <div>{activity.date.toLocaleDateString('en-US', { month: 'short' })}</div>
                                     <div className="font-bold text-lg">{activity.date.getDate()}</div>
                                 </div>
                                 <div>
                                     {activity.type === 'submission' ? (
                                        <p>Submitted '<strong>{assignments.find(a => a.id === activity.data.assignmentId)?.title}</strong>'</p>
                                     ) : (
                                        <p>Attendance marked as <strong>{activity.data.records[student.uid]}</strong></p>
                                     )}
                                 </div>
                             </div>
                         )) : <p className="text-gray-500 text-center">No recent activities.</p>}
                     </div>
                 </div>
            </div>
        );
    };

    const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (isModal) {
            return (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-700">
                            <h2 className="text-xl font-bold">Progress Dashboard for {student.name}</h2>
                            <Button variant="secondary" onClick={onClose}>Close</Button>
                        </header>
                        <main className="flex-grow overflow-y-auto">
                            {children}
                        </main>
                    </div>
                </div>
            );
        }
        return <>{children}</>;
    };

    return <Container>{renderContent()}</Container>;
};
