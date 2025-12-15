
import React, { useMemo, useState } from 'react';
import { UserProfile, GES_CLASSES } from '../types';
import Card from './common/Card';
import Button from './common/Button';

interface AdminClassManagementProps {
    allUsers: UserProfile[];
}

const AdminClassManagement: React.FC<AdminClassManagementProps> = ({ allUsers }) => {
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    const classStats = useMemo(() => {
        const stats: Record<string, { studentCount: number; classTeacher: UserProfile | null }> = {};
        
        // Initialize
        GES_CLASSES.forEach(c => {
            stats[c] = { studentCount: 0, classTeacher: null };
        });

        allUsers.forEach(user => {
            if (user.role === 'student' && user.class && stats[user.class]) {
                stats[user.class].studentCount++;
            }
            if (user.role === 'teacher' && user.classTeacherOf && stats[user.classTeacherOf]) {
                stats[user.classTeacherOf].classTeacher = user;
            }
        });

        return stats;
    }, [allUsers]);

    // Data for the detailed view
    const selectedClassData = useMemo(() => {
        if (!selectedClass) return null;
        
        const teacher = classStats[selectedClass]?.classTeacher;
        const students = allUsers.filter(u => u.role === 'student' && u.class === selectedClass);
        const studentsWithParents = students.filter(s => s.parentUids && s.parentUids.length > 0).length;

        return {
            className: selectedClass,
            teacher,
            students,
            stats: {
                total: students.length,
                linkedToParent: studentsWithParents,
                coverage: students.length > 0 ? Math.round((studentsWithParents / students.length) * 100) : 0
            }
        };
    }, [selectedClass, allUsers, classStats]);

    if (selectedClass && selectedClassData) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                {/* Header / Navigation */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedClass(null)}
                            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                        </button>
                        <div>
                            <h2 className="text-3xl font-bold text-white">{selectedClassData.className}</h2>
                            <p className="text-sm text-slate-400">Class Management Portal</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Placeholder actions */}
                        <Button variant="secondary" size="sm">View Timetable</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Teacher & Stats */}
                    <div className="space-y-6">
                        {/* Teacher Card */}
                        <Card className="!bg-indigo-900/20 !border-indigo-500/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">👩‍🏫</div>
                            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4">Class Teacher</h3>
                            {selectedClassData.teacher ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden border-2 border-indigo-400/50">
                                         {selectedClassData.teacher.photoURL ? (
                                            <img src={selectedClassData.teacher.photoURL} alt={selectedClassData.teacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            selectedClassData.teacher.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">{selectedClassData.teacher.name}</p>
                                        <p className="text-sm text-indigo-200">{selectedClassData.teacher.email}</p>
                                        <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            Status: Active
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 italic">
                                    No teacher assigned.
                                    <br/>
                                    <span className="text-xs">Assign one in User Management.</span>
                                </div>
                            )}
                        </Card>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="text-center py-6">
                                <p className="text-3xl font-black text-white">{selectedClassData.stats.total}</p>
                                <p className="text-xs text-slate-400 uppercase font-bold mt-1">Total Students</p>
                            </Card>
                            <Card className="text-center py-6">
                                <p className="text-3xl font-black text-green-400">{selectedClassData.stats.coverage}%</p>
                                <p className="text-xs text-slate-400 uppercase font-bold mt-1">Parents Linked</p>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Student Roster */}
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4">Student Roster</h3>
                            <div className="overflow-x-auto flex-grow">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-xs text-slate-200 uppercase bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Student Name</th>
                                            <th className="px-4 py-3">ID / Email</th>
                                            <th className="px-4 py-3 text-center">Parent Status</th>
                                            <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {selectedClassData.students.length > 0 ? (
                                            selectedClassData.students.map(student => (
                                                <tr key={student.uid} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-white flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden border border-slate-600">
                                                             {student.photoURL ? (
                                                                <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.name.charAt(0)
                                                            )}
                                                        </div>
                                                        {student.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-mono">
                                                        {student.email || 'No Email'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {student.parentUids && student.parentUids.length > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                                Linked
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button className="text-blue-400 hover:text-white text-xs font-medium">Edit</button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                                                    No students enrolled in this class yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // Default Grid View
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Class Management</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {GES_CLASSES.map(className => {
                    const stat = classStats[className];
                    return (
                        <div key={className} onClick={() => setSelectedClass(className)} className="cursor-pointer">
                            <Card className="relative group hover:border-blue-500/50 hover:bg-slate-800 transition-all h-full">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{className}</h3>
                                    <span className="bg-slate-700 group-hover:bg-blue-900/30 group-hover:text-blue-200 transition-colors text-slate-300 text-xs px-2 py-1 rounded-full">
                                        {stat.studentCount} Students
                                    </span>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-700/50 group-hover:border-slate-600 transition-colors">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Class Teacher</p>
                                    {stat.classTeacher ? (
                                        <div className="flex items-center gap-2 text-blue-300">
                                            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 border border-slate-600">
                                                {stat.classTeacher.photoURL ? (
                                                    <img src={stat.classTeacher.photoURL} alt={stat.classTeacher.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">{stat.classTeacher.name.charAt(0)}</div>
                                                )}
                                            </div>
                                            <span className="font-medium truncate">{stat.classTeacher.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-500 italic">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span>Not Assigned</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Hover prompt */}
                                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminClassManagement;
