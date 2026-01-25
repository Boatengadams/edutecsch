import React, { useState, useMemo } from 'react';
import { UserProfile, Assignment, Submission, GES_CLASSES, UserRole } from '../types';
import Card from './common/Card';
import TeacherStudentCard from './TeacherStudentCard';
import StudentProfile from './StudentProfile';
import Button from './common/Button';
import TeacherCreateStudentForm from './TeacherCreateStudentForm';
import TeacherCreateParentForm from './TeacherCreateParentForm';
import { InstitutionIcon } from './common/PremiumIcons';
import SnapToRegister from './SnapToRegister';
import { useAuthentication } from '../hooks/useAuth';

interface TeacherStudentsListProps {
    students: UserProfile[];
    assignments: Assignment[];
    submissions: Submission[];
}

const TeacherStudentsList: React.FC<TeacherStudentsListProps> = ({ students, assignments, submissions }) => {
    const { userProfile } = useAuthentication();
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [showCreateModal, setShowCreateModal] = useState<'student' | 'parent' | null>(null);
    const [showSnapModal, setShowSnapModal] = useState<UserRole | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const isOmni = useMemo(() => ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"].includes(userProfile?.email || ""), [userProfile]);

    // Filter students by search term first
    const filteredStudents = useMemo(() => {
        return students.filter(s => 
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    // Group filtered students by class and sort names within groups
    const groupedStudents = useMemo(() => {
        const groups: Record<string, UserProfile[]> = {};
        
        filteredStudents.forEach(student => {
            const className = student.class || 'Unassigned';
            if (!groups[className]) groups[className] = [];
            groups[className].push(student);
        });

        // Sort names alphabetically within each class group
        Object.keys(groups).forEach(className => {
            groups[className].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        });

        return groups;
    }, [filteredStudents]);

    // Sort the class names according to the master GES_CLASSES order
    const sortedClassNames = useMemo(() => {
        return Object.keys(groupedStudents).sort((a, b) => {
            const indexA = GES_CLASSES.indexOf(a);
            const indexB = GES_CLASSES.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            return a.localeCompare(b);
        });
    }, [groupedStudents]);

    const canRegisterInAnyClass = isOmni || !!userProfile?.classTeacherOf;

    if (selectedStudent) {
        return (
            <div className="animate-fade-in-up">
                <Button variant="secondary" onClick={() => setSelectedStudent(null)} className="mb-6">← Back to Registry</Button>
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
        <div className="space-y-10 animate-fade-in-up pb-20">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Student <span className="text-blue-500">Registry</span></h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Authorized Learner Records</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative group">
                        <input 
                            type="search" 
                            placeholder="Find student..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all placeholder-slate-600"
                        />
                    </div>
                    
                    {canRegisterInAnyClass && (
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setShowSnapModal('student')} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest border border-blue-500/20 !text-blue-400">📸 Snap List</Button>
                            <Button variant="secondary" onClick={() => setShowCreateModal('parent')} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest">+ Parent</Button>
                            <Button onClick={() => setShowCreateModal('student')} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest">+ Student</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Grouped Student List */}
            <div className="space-y-16">
                {sortedClassNames.length > 0 ? sortedClassNames.map(className => (
                    <section key={className} className="space-y-6 animate-fade-in-up">
                        {/* Class Header */}
                        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400">
                                <InstitutionIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wider">{className}</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{groupedStudents[className].length} Active Learners</p>
                            </div>
                            <div className="flex-grow h-px bg-gradient-to-r from-white/10 to-transparent ml-4"></div>
                        </div>

                        {/* Student Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {groupedStudents[className].map(student => (
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
                    </section>
                )) : (
                    <div className="py-40 text-center space-y-4 opacity-20">
                        <span className="text-8xl block">🔍</span>
                        <p className="text-lg font-black uppercase tracking-[0.5em]">No Students Found</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-4 z-[100] animate-fade-in">
                    <Card className="w-full max-w-md shadow-3xl !p-0 overflow-hidden border-white/10">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">
                                Protocol: {showCreateModal === 'student' ? 'Student' : 'Parent'} Enrollment
                            </h3>
                            <button onClick={() => setShowCreateModal(null)} className="text-slate-500 hover:text-white p-2">✕</button>
                        </div>
                        <div className="p-8">
                            <div className="mb-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-300 font-bold uppercase tracking-widest leading-relaxed">
                                Restriction: You are authorized to register users only for your designated class: <span className="text-white font-black">{userProfile?.classTeacherOf || 'UNAUTHORIZED'}</span>
                            </div>
                            {showCreateModal === 'student' ? (
                                <TeacherCreateStudentForm classId={userProfile?.classTeacherOf || ''} />
                            ) : (
                                <TeacherCreateParentForm allStudents={students.filter(s => s.class === userProfile?.classTeacherOf)} setToast={() => {}} />
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {showSnapModal && (
                <SnapToRegister 
                    onClose={() => setShowSnapModal(null)} 
                    roleToRegister={showSnapModal} 
                    classId={userProfile?.classTeacherOf}
                />
            )}
        </div>
    );
};

export default TeacherStudentsList;