
import React, { useState } from 'react';
import { UserProfile, Assignment, Submission } from '../types';
import Card from './common/Card';
import TeacherStudentCard from './TeacherStudentCard';
import StudentProfile from './StudentProfile';
import Button from './common/Button';
import TeacherCreateStudentForm from './TeacherCreateStudentForm';
import TeacherCreateParentForm from './TeacherCreateParentForm';

interface TeacherStudentsListProps {
    students: UserProfile[];
    assignments: Assignment[];
    submissions: Submission[];
}

const TeacherStudentsList: React.FC<TeacherStudentsListProps> = ({ students, assignments, submissions }) => {
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [showCreateModal, setShowCreateModal] = useState<'student' | 'parent' | null>(null);

    if (selectedStudent) {
        return (
            <div className="animate-fade-in-up">
                <Button variant="secondary" onClick={() => setSelectedStudent(null)} className="mb-6">← Back to List</Button>
                <StudentProfile 
                    userProfile={selectedStudent} 
                    assignments={assignments.filter(a => a.classId === selectedStudent.class)} 
                    submissions={submissions.filter(s => s.studentId === selectedStudent.uid)}
                    viewer="teacher"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">My Students</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowCreateModal('parent')}>+ Add Parent</Button>
                    <Button onClick={() => setShowCreateModal('student')}>+ Add Student</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map(student => (
                    <TeacherStudentCard 
                        key={student.uid} 
                        student={student} 
                        classAssignments={assignments.filter(a => a.classId === student.class)}
                        studentSubmissions={submissions.filter(s => s.studentId === student.uid)}
                        onClick={() => setSelectedStudent(student)}
                        onMessage={() => {}} 
                    />
                ))}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">New {showCreateModal === 'student' ? 'Student' : 'Parent'} Account</h3>
                            <button onClick={() => setShowCreateModal(null)} className="text-slate-400">✕</button>
                        </div>
                        {showCreateModal === 'student' ? (
                            <TeacherCreateStudentForm classId={students[0]?.class || ''} />
                        ) : (
                            <TeacherCreateParentForm allStudents={students} setToast={() => {}} />
                        )}
                        <Button variant="ghost" onClick={() => setShowCreateModal(null)} className="w-full mt-4">Cancel</Button>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default TeacherStudentsList;
