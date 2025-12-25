
import React, { useState, useMemo } from 'react';
import { UserProfile, Assignment, Submission } from '../types';
import Card from './common/Card';
import LineChart from './common/charts/LineChart';
import BarChart from './common/charts/BarChart';
import Histogram from './common/charts/Histogram';

interface TeacherProgressDashboardProps {
    students: UserProfile[];
    assignments: Assignment[];
    submissions: Submission[];
    teacherClasses: string[];
}

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    if (grade.includes('/')) {
        const [score, max] = grade.split('/').map(Number);
        if (!isNaN(score) && !isNaN(max) && max > 0) return (score / max) * 100;
    }
    const numericGrade = parseFloat(grade);
    if (!isNaN(numericGrade)) return numericGrade;
    return null;
};

const TeacherProgressDashboard: React.FC<TeacherProgressDashboardProps> = ({ students, assignments, submissions, teacherClasses }) => {
    const [selectedClass, setSelectedClass] = useState(teacherClasses[0] || 'all');

    const classData = useMemo(() => {
        const relevantStudents = selectedClass === 'all' ? students : students.filter(s => s.class === selectedClass);
        const relevantStudentUids = new Set(relevantStudents.map(s => s.uid));
        const relevantAssignments = selectedClass === 'all' ? assignments : assignments.filter(a => a.classId === selectedClass);
        const relevantSubmissions = submissions.filter(s => relevantStudentUids.has(s.studentId));
        const gradedSubmissions = relevantSubmissions.filter(s => s.status === 'Graded' && s.grade);
        const allGrades = gradedSubmissions.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
        const averageGrade = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0;
        
        const submissionRate = relevantAssignments.length > 0 ? (relevantSubmissions.length / (relevantAssignments.length * relevantStudents.length)) * 100 : 0;
        
        const performanceBySubject = relevantAssignments.reduce((acc, assignment) => {
            const subject = assignment.subject;
            if (!acc[subject]) acc[subject] = { grades: [] };
            const subjectSubmissions = gradedSubmissions.filter(s => s.assignmentId === assignment.id);
            subjectSubmissions.forEach(sub => {
                const grade = gradeToNumeric(sub.grade);
                if (grade !== null) acc[subject].grades.push(grade);
            });
            return acc;
        }, {} as Record<string, { grades: number[] }>);

        const subjectChartData = Object.entries(performanceBySubject).map(([subject, data]: [string, { grades: number[] }]) => ({
            label: subject,
            value: data.grades.length > 0 ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length : 0,
        })).filter(d => d.value > 0);

        const gradeTrendData = gradedSubmissions.sort((a, b) => a.submittedAt.toMillis() - b.submittedAt.toMillis()).map(s => ({
            label: assignments.find(a => a.id === s.assignmentId)?.title || 'Task',
            value: gradeToNumeric(s.grade) || 0,
        }));

        return { averageGrade, submissionRate, allGrades, subjectChartData, gradeTrendData };
    }, [selectedClass, students, assignments, submissions]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Class Intelligence</h2>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 bg-slate-800 border border-white/5 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-300">
                    <option value="all">Across Classes</option>
                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <Card className="text-center bg-blue-900/10 border-blue-500/20"><p className="text-xs text-blue-400 uppercase font-bold tracking-widest mb-1">Average Grade</p><p className="text-4xl font-black text-white">{classData.averageGrade.toFixed(1)}%</p></Card>
                 <Card className="text-center bg-emerald-900/10 border-emerald-500/20"><p className="text-xs text-emerald-400 uppercase font-bold tracking-widest mb-1">Submission Rate</p><p className="text-4xl font-black text-white">{classData.submissionRate.toFixed(0)}%</p></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card><h3 className="text-sm font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Grade Distribution</h3><div className="h-72"><Histogram data={classData.allGrades} /></div></Card>
                <Card><h3 className="text-sm font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Performance by Subject</h3><div className="h-72"><BarChart data={classData.subjectChartData} /></div></Card>
            </div>

            <Card><h3 className="text-sm font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Longitudinal Grade Trend</h3><div className="h-72"><LineChart data={classData.gradeTrendData} /></div></Card>
        </div>
    );
};

export default TeacherProgressDashboard;
