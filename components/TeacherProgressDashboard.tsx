
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
        if (!isNaN(score) && !isNaN(max) && max > 0) {
            return (score / max) * 100;
        }
    }
    const numericGrade = parseFloat(grade);
    if (!isNaN(numericGrade)) return numericGrade;
    return null;
};

const normalizeSubject = (subject: string) => {
    if (subject === 'Science') return 'Integrated Science';
    return subject;
};

const TeacherProgressDashboard: React.FC<TeacherProgressDashboardProps> = ({ students, assignments, submissions, teacherClasses }) => {
    const [selectedClass, setSelectedClass] = useState(teacherClasses[0] || 'all');

    const classData = useMemo(() => {
        const relevantStudents = selectedClass === 'all'
            ? students
            : students.filter(s => s.class === selectedClass);
        
        const relevantStudentUids = new Set(relevantStudents.map(s => s.uid));

        const relevantAssignments = selectedClass === 'all'
            ? assignments
            : assignments.filter(a => a.classId === selectedClass);
        
        const relevantSubmissions = submissions.filter(s => relevantStudentUids.has(s.studentId));

        const gradedSubmissions = relevantSubmissions.filter(s => s.status === 'Graded' && s.grade);
        const allGrades = gradedSubmissions.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
        const averageGrade = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0;
        
        const submissionRate = relevantAssignments.length > 0
            ? (relevantSubmissions.length / (relevantAssignments.length * relevantStudents.length)) * 100
            : 0;

        const performanceBySubject = relevantAssignments.reduce((acc, assignment) => {
            const subject = normalizeSubject(assignment.subject);
            
            if (!acc[subject]) {
                acc[subject] = { grades: [] };
            }
            const subjectSubmissions = gradedSubmissions.filter(s => s.assignmentId === assignment.id);
            subjectSubmissions.forEach(sub => {
                const grade = gradeToNumeric(sub.grade);
                if (grade !== null) {
                    acc[subject].grades.push(grade);
                }
            });
            return acc;
        }, {} as Record<string, { grades: number[] }>);

        const subjectChartData = Object.entries(performanceBySubject).map(([subject, data]: [string, { grades: number[] }]) => ({
            label: subject,
            value: data.grades.length > 0 ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length : 0,
        })).filter(d => d.value > 0);

        const assignmentMap = new Map(relevantAssignments.map(a => [a.id, a]));
        const gradeTrendData = gradedSubmissions
            .map(sub => ({ sub, assign: assignmentMap.get(sub.assignmentId) }))
            .filter((item): item is { sub: Submission; assign: Assignment } => !!item.assign)
            .sort((a, b) => a.assign.createdAt.toMillis() - b.assign.createdAt.toMillis())
            .map(item => ({
                label: item.assign.title,
                value: gradeToNumeric(item.sub.grade)!,
            }));


        return {
            averageGrade,
            submissionRate,
            allGrades,
            subjectChartData,
            gradeTrendData,
        };
    }, [selectedClass, students, assignments, submissions]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Progress Dashboard</h2>
                <div className="flex items-center gap-2">
                    <label className="text-sm">Class:</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 bg-slate-700 rounded-md">
                        <option value="all">All My Classes</option>
                        {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <Card>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Class Average Grade</p>
                        <p className="text-3xl font-bold text-blue-400">{classData.averageGrade.toFixed(1)}%</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Overall Submission Rate</p>
                        <p className="text-3xl font-bold text-green-400">{classData.submissionRate.toFixed(0)}%</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Grade Distribution</h3>
                    <div className="h-72">
                        <Histogram data={classData.allGrades} />
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Performance by Subject</h3>
                     <div className="h-72">
                        <BarChart data={classData.subjectChartData} />
                    </div>
                </Card>
            </div>

            <Card>
                <h3 className="text-xl font-semibold mb-4">Grade Trend Over Time</h3>
                <div className="h-72">
                    <LineChart data={classData.gradeTrendData} />
                </div>
            </Card>
        </div>
    );
};

export default TeacherProgressDashboard;
