import React, { useState, useEffect } from 'react';
import { db, firebase } from '../services/firebase';
import { Assignment, Submission, UserProfile } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import AssignmentModal from './AssignmentModal';
import { useToast } from './common/Toast';

interface TeacherAssignmentsProps {
    user: firebase.User;
    userProfile: UserProfile;
    teacherClasses: string[];
}

const TeacherAssignments: React.FC<TeacherAssignmentsProps> = ({ user, userProfile, teacherClasses }) => {
    const { showToast } = useToast();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [forcePreview, setForcePreview] = useState(false);

    useEffect(() => {
        const unsub = db.collection('assignments')
            .where('teacherId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                snap => {
                    setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
                    setLoading(false);
                },
                err => {
                    console.warn("Assignments listener error:", err.message);
                    setLoading(false);
                }
            );
        return () => unsub();
    }, [user.uid]);

    const handleOpenPreview = (a: Assignment) => {
        setEditingAssignment(a);
        setForcePreview(true);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (a: Assignment) => {
        setEditingAssignment(a);
        setForcePreview(false);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Permanently purge this protocol? Submissions will be orphaned.")) {
            try {
                await db.collection('assignments').doc(id).delete();
                showToast("Registry updated: Protocol deleted.", "info");
            } catch (e: any) {
                showToast(e.message, "error");
            }
        }
    };

    return (
        <div className="space-y-10 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Academic <span className="text-blue-500">Protocols</span></h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Active Task Management Terminal</p>
                </div>
                <Button onClick={() => { setEditingAssignment(null); setForcePreview(false); setIsModalOpen(true); }} className="w-full md:w-auto py-4 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/30">
                    + Deploy New Task
                </Button>
            </div>

            {loading ? <div className="p-20 flex justify-center"><Spinner /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {assignments.map(a => (
                        <Card key={a.id} className="relative group !bg-slate-900/40 border-white/5 hover:border-blue-500/30 transition-all duration-500 p-8 sm:p-10 rounded-[2.5rem] shadow-3xl overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-8xl font-black select-none pointer-events-none group-hover:scale-125 transition-transform">
                                {a.type === 'Objective' ? '🧠' : '✍️'}
                            </div>
                            
                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                                    a.type === 'Objective' ? 'bg-indigo-600/10 border-indigo-400/50 text-indigo-400' : 'bg-emerald-600/10 border-emerald-400/50 text-emerald-400'
                                }`}>
                                    {a.type}
                                </div>
                                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform sm:translate-y-4 group-hover:translate-y-0">
                                    <button onClick={() => handleOpenPreview(a)} className="p-3 bg-slate-800 hover:bg-emerald-600 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl" title="Preview Student Experience">👁️</button>
                                    <button onClick={() => handleOpenEdit(a)} className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl" title="Edit Parameters">✏️</button>
                                    <button onClick={() => handleDelete(a.id)} className="p-3 bg-slate-800 hover:bg-red-600 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl" title="Delete Task">🗑️</button>
                                </div>
                            </div>

                            <div className="relative z-10 mb-8">
                                <h4 className="text-2xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-blue-400 transition-colors mb-2 line-clamp-1">{a.title}</h4>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest border-l-2 border-blue-600 pl-3">{a.subject} &bull; {a.classId}</p>
                            </div>

                            <p className="relative z-10 text-sm text-slate-400 line-clamp-2 mb-10 leading-relaxed font-medium">
                                {a.description}
                            </p>
                            
                            <div className="relative z-10 flex justify-between items-center pt-8 border-t border-white/5 mt-auto">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Expiration</p>
                                    <p className="text-xs font-bold text-slate-400">
                                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'No Deadline'}
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleOpenPreview(a)} className="!text-[10px] font-black uppercase tracking-[0.2em] hover:text-white">View Protocol</Button>
                            </div>
                        </Card>
                    ))}
                    
                    {assignments.length === 0 && (
                        <div className="col-span-full py-40 sm:py-64 text-center opacity-10 italic">
                             <span className="text-8xl sm:text-[12rem] block mb-10">📝</span>
                             <p className="text-lg sm:text-xl font-black uppercase tracking-[2em]">Vault Empty</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <AssignmentModal 
                    isOpen={isModalOpen} 
                    onClose={() => { setIsModalOpen(false); setForcePreview(false); }} 
                    assignment={editingAssignment} 
                    classes={teacherClasses} 
                    user={user} 
                    userProfile={userProfile} 
                    teacherSubjectsByClass={userProfile.subjectsByClass || {}} 
                />
            )}
        </div>
    );
};

export default TeacherAssignments;