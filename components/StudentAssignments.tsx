
import React, { useState } from 'react';
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

    const filteredAssignments = assignments.filter(a => {
        const sub = submissions.find(s => s.assignmentId === a.id);
        if (filter === 'pending') return !sub || sub.status === 'Submitted';
        if (filter === 'graded') return sub?.status === 'Graded';
        return true;
    });

    if (activeAssignment) {
        return (
            <div className="animate-fade-in">
                <Button variant="secondary" onClick={() => setActiveAssignment(null)} className="mb-6">← Back to List</Button>
                <QuizInterface 
                    assignment={activeAssignment} 
                    userProfile={userProfile} 
                    onComplete={() => setActiveAssignment(null)} 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Academic Tasks</h2>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    {['pending', 'graded', 'all'].map(f => (
                        <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>{f}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssignments.map(a => {
                    const sub = submissions.find(s => s.assignmentId === a.id);
                    return (
                        <Card key={a.id} className="relative group overflow-hidden border-white/5 hover:border-blue-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-5 text-5xl">📝</div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase tracking-widest mb-3 inline-block">{a.type}</span>
                            <h3 className="text-lg font-bold text-white mb-1">{a.title}</h3>
                            <p className="text-xs text-slate-500 uppercase font-black mb-4 tracking-widest">{a.subject}</p>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-6 leading-relaxed">{a.description}</p>
                            
                            <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                                {sub ? (
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase ${sub.status === 'Graded' ? 'text-emerald-400' : 'text-yellow-500'}`}>{sub.status}</span>
                                        {sub.grade && <span className="text-lg font-black text-white">{sub.grade}</span>}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-500 font-bold">{a.dueDate ? `Due: ${a.dueDate}` : 'No deadline'}</span>
                                )}
                                <Button size="sm" onClick={() => setActiveAssignment(a)} disabled={!!sub && sub.status === 'Graded'}>{sub ? 'View Details' : 'Start Task'}</Button>
                            </div>
                        </Card>
                    );
                })}
                {filteredAssignments.length === 0 && <div className="col-span-full py-20 text-center text-slate-600 italic">No tasks found in this category.</div>}
            </div>
        </div>
    );
};

export default StudentAssignments;
