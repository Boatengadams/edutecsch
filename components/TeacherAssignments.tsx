
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

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this assignment and all submissions?")) {
            try {
                await db.collection('assignments').doc(id).delete();
                showToast("Assignment deleted.", "info");
            } catch (e: any) {
                showToast(e.message, "error");
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Academic Tasks</h2>
                <Button onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}>+ Create Assignment</Button>
            </div>

            {loading ? <Spinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assignments.map(a => (
                        <Card key={a.id} className="relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <span className="text-2xl">{a.type === 'Objective' ? '🧠' : '✍️'}</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingAssignment(a); setIsModalOpen(true); }} className="p-2 bg-slate-800 rounded-lg hover:text-blue-400">✏️</button>
                                    <button onClick={() => handleDelete(a.id)} className="p-2 bg-slate-800 rounded-lg hover:text-red-400">🗑️</button>
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-white">{a.title}</h4>
                            <p className="text-xs text-slate-500 uppercase font-black mb-4 tracking-widest">{a.subject} &bull; {a.classId}</p>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-6">{a.description}</p>
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <div className="text-xs text-slate-500">
                                    {a.dueDate ? `Due: ${new Date(a.dueDate).toLocaleDateString()}` : 'No due date'}
                                </div>
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black uppercase text-slate-400">{a.type}</span>
                            </div>
                        </Card>
                    ))}
                    {assignments.length === 0 && <div className="col-span-full py-20 text-center text-slate-600 italic">No tasks created.</div>}
                </div>
            )}

            {isModalOpen && (
                <AssignmentModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
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
