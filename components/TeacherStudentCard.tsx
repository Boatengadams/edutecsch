
import React, { useMemo } from 'react';
import { UserProfile, Assignment, Submission } from '../types';
import Button from './common/Button';

interface TeacherStudentCardProps {
    student: UserProfile;
    classAssignments: Assignment[];
    studentSubmissions: Submission[];
    onClick: () => void;
    onMessage: () => void;
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

const TeacherStudentCard: React.FC<TeacherStudentCardProps> = ({ 
    student, 
    classAssignments, 
    studentSubmissions, 
    onClick, 
    onMessage 
}) => {
    
    const stats = useMemo(() => {
        const gradedSubs = studentSubmissions.filter(s => s.status === 'Graded' && s.grade);
        const numericGrades = gradedSubs.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
        const average = numericGrades.length > 0 
            ? Math.round(numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) 
            : null;

        const totalAssignments = classAssignments.length;
        const completionRate = totalAssignments > 0 
            ? Math.round((studentSubmissions.length / totalAssignments) * 100) 
            : 0;

        return { average, completionRate };
    }, [classAssignments, studentSubmissions]);

    const displayName = student.name || 'Unknown Student';

    // Generate a consistent color based on the name
    const getAvatarColor = (name: string) => {
        const colors = [
            'from-blue-500 to-cyan-500',
            'from-purple-500 to-pink-500',
            'from-green-500 to-emerald-500',
            'from-orange-500 to-red-500',
            'from-indigo-500 to-violet-500'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div 
            className="group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden"
            onClick={onClick}
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0 ${!student.photoURL ? `bg-gradient-to-br ${getAvatarColor(displayName)}` : 'bg-slate-700'}`}>
                        {student.photoURL ? (
                            <img src={student.photoURL} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white font-bold text-lg">{displayName.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1">{displayName}</h4>
                        <p className="text-xs text-slate-400">{student.email || 'No email'}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    {stats.average !== null ? (
                        <span className={`text-sm font-bold ${stats.average >= 70 ? 'text-green-400' : stats.average >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {stats.average}% Avg
                        </span>
                    ) : (
                        <span className="text-xs text-slate-500">No Grades</span>
                    )}
                </div>
            </div>

            <div className="relative z-10 mt-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Assignments Completed</span>
                    <span>{stats.completionRate}%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stats.completionRate}%` }}
                    ></div>
                </div>
            </div>

            <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/50 flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-2 group-hover:translate-y-0">
                <Button 
                    size="sm" 
                    className="flex-1 !text-xs !py-2" 
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                >
                    View Profile
                </Button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onMessage(); }}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                    title="Message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                        <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default TeacherStudentCard;
