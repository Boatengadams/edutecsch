
import React, { useMemo } from 'react';
import { UserProfile, GES_CLASSES } from '../types';
import Card from './common/Card';

interface AdminClassManagementProps {
    allUsers: UserProfile[];
}

const AdminClassManagement: React.FC<AdminClassManagementProps> = ({ allUsers }) => {
    
    const classStats = useMemo(() => {
        const stats: Record<string, { studentCount: number; classTeacher: string | null }> = {};
        
        // Initialize
        GES_CLASSES.forEach(c => {
            stats[c] = { studentCount: 0, classTeacher: null };
        });

        allUsers.forEach(user => {
            if (user.role === 'student' && user.class && stats[user.class]) {
                stats[user.class].studentCount++;
            }
            if (user.role === 'teacher' && user.classTeacherOf && stats[user.classTeacherOf]) {
                stats[user.classTeacherOf].classTeacher = user.name;
            }
        });

        return stats;
    }, [allUsers]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Class Management</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {GES_CLASSES.map(className => {
                    const stat = classStats[className];
                    return (
                        <Card key={className} className="relative group hover:border-blue-500/50 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white">{className}</h3>
                                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                                    {stat.studentCount} Students
                                </span>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Class Teacher</p>
                                {stat.classTeacher ? (
                                    <div className="flex items-center gap-2 text-blue-300">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span className="font-medium truncate">{stat.classTeacher}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-500 italic">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        <span>Not Assigned</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminClassManagement;
