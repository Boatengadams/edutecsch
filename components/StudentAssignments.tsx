import React, { useState, useMemo } from 'react';
import { Assignment, Submission, UserProfile } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import QuizInterface from './common/QuizInterface';

interface StudentAssignmentsProps {
    userProfile: UserProfile;
    assignments: Assignment[];
    submissions: Submission[];
}

const StudentAssignments: React.FC<StudentAssignmentsProps> = ({ userProfile, assignments, submissions }) => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('pending');
    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

    const sortedAssignments = useMemo(() => {
        return [...assignments].sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    }, [assignments]);

    const filteredAssignments = sortedAssignments.filter(a => {
        const sub = submissions.find(s => s.assignmentId === a.id);
        if (filter === 'pending') return !sub;
        if (filter === 'graded') return sub?.status === 'Graded';
        return true;
    });

    if (activeAssignment) {
        return (
            <div className="animate-fade-in pb-20">
                <Button variant="secondary" onClick={() => setActiveAssignment(null)} className="mb-10 text-[10px] font-black uppercase tracking-widest px-8 rounded-xl border border-white/10 shadow-lg">← Back to Registry</Button>
                <QuizInterface 
                    assignment={activeAssignment} 
                    userProfile={userProfile} 
                    onComplete={() => setActiveAssignment(null)} 
                />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in-up pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Academic <span className="text-blue-500">Vault</span></h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Personal Task Registry & Archives</p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto">
                    {['pending', 'graded', 'all'].map(f => (
                        <button 
                            key={f} 
                            onClick={() => setFilter(f as any)} 
                            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assignment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredAssignments.map(a => {
                    const sub = submissions.find(s => s.assignmentId === a.id);
                    const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && !sub;

                    return (
                        <Card key={a.id} className={`relative group overflow-hidden transition-all duration-500 rounded-[2.5rem] shadow-3xl p-8 flex flex-col min-h-[350px] ${
                            isOverdue ? 'border-rose-500/30' : 'border-white/5 hover:border-blue-500/30'
                        }`}>
                            {/* Icon Watermark */}
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-9xl group-hover:scale-125 transition-transform select-none pointer-events-none">
                                {a.type === 'Objective' ? '🧠' : '✍️'}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                                    a.type === 'Objective' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                    {a.type}
                                </span>
                                {isOverdue && <span className="text-[9px] font-black px-3 py-1 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-500 uppercase tracking-widest animate-pulse">Overdue</span>}
                            </div>

                            <div className="space-y-1 mb-6 relative z-10">
                                <h3 className="text-2xl font-black text-white leading-none tracking-tighter uppercase group-hover:text-blue-400 transition-colors line-clamp-2">{a.title}</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                    {a.subject}
                                </p>
                            </div>

                            <p className="text-sm text-slate-400 line-clamp-3 mb-8 leading-relaxed font-medium flex-grow">
                                {a.description}
                            </p>
                            
                            {/* Footer */}
                            <div className="pt-6 border-t border-white/5 flex justify-between items-center relative z-10 mt-auto">
                                {sub ? (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'Graded' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${sub.status === 'Graded' ? 'text-emerald-400' : 'text-amber-500'}`}>{sub.status}</span>
                                        </div>
                                        {sub.grade ? (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-white">{sub.grade}</span>
                                                <span className="text-[10px] text-slate-600 font-bold uppercase">certified</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pending Evaluation</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Expiration</span>
                                        <span className={`text-xs font-black ${isOverdue ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {a.dueDate ? new Date(a.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'No Deadline'}
                                        </span>
                                    </div>
                                )}
                                <Button 
                                    size="sm" 
                                    onClick={() => setActiveAssignment(a)} 
                                    disabled={!!sub && sub.status === 'Graded'}
                                    className="!text-[10px] font-black uppercase tracking-widest py-3 px-8 rounded-xl shadow-xl shadow-blue-900/30 transition-all hover:scale-105"
                                >
                                    {sub ? 'Review' : 'Initialize'}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
                
                {filteredAssignments.length === 0 && (
                    <div className="col-span-full py-40 sm:py-64 text-center opacity-10 italic select-none">
                         <span className="text-8xl sm:text-[15rem] block mb-10">📂</span>
                         <p className="text-xl sm:text-2xl font-black uppercase tracking-[2em]">Sector Clear</p>
                         <p className="text-xs sm:text-sm font-bold uppercase tracking-[1em] mt-4">No active protocols detected</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAssignments;