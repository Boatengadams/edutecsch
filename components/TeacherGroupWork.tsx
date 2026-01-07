
import React, { useState, useEffect } from 'react';
import { db, firebase } from '../services/firebase';
import { UserProfile, Group } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import { useAuthentication } from '../hooks/useAuth';

interface TeacherGroupWorkProps {
    teacherClasses: string[];
    students: UserProfile[];
}

const TeacherGroupWork: React.FC<TeacherGroupWorkProps> = ({ teacherClasses, students }) => {
    const { user } = useAuthentication();
    const { showToast } = useToast();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // Create Form State
    const [name, setName] = useState('');
    const [selectedClass, setSelectedClass] = useState(teacherClasses[0] || '');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [selectedUids, setSelectedUids] = useState<string[]>([]);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = db.collection('groups').where('teacherId', '==', user.uid).onSnapshot(
            snap => {
                setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
                setLoading(false);
            },
            err => {
                console.warn("Groups listener status:", err.message);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [user?.uid]);

    const handleCreate = async () => {
        if (!user || !name || selectedUids.length === 0) return;
        setIsCreating(true);
        try {
            const groupData: Omit<Group, 'id'> = {
                name,
                classId: selectedClass,
                subject,
                teacherId: user.uid,
                memberUids: selectedUids,
                members: students.filter(s => selectedUids.includes(s.uid)).map(s => ({ uid: s.uid, name: s.name })),
                assignmentTitle: topic,
                assignmentDescription: `Collaborative work on ${topic}`,
                dueDate: null,
                // FIX: Fixed typo in property name from isSubmited to isSubmitted.
                isSubmitted: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
            };
            await db.collection('groups').add(groupData);
            showToast("Group created!", "success");
            setName('');
            setSelectedUids([]);
            setTopic('');
        } catch (e: any) {
            showToast(e.message, "error");
        } finally {
            setIsCreating(false);
        }
    };

    const toggleStudent = (uid: string) => {
        setSelectedUids(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Group Work Hub</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="!bg-slate-900/80 border-blue-500/30">
                        <h3 className="text-lg font-bold mb-4">Create New Group</h3>
                        <div className="space-y-4">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Group Name (e.g. Science Team A)" className="w-full p-2 bg-slate-800 rounded border border-slate-700" />
                            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700">
                                {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic for Group Work" className="w-full p-2 bg-slate-800 rounded border border-slate-700" />
                            
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-4">Select Members</p>
                            <div className="max-h-48 overflow-y-auto border border-slate-700 rounded bg-slate-950 p-2 space-y-1">
                                {students.filter(s => s.class === selectedClass).map(s => (
                                    <label key={s.uid} className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer">
                                        <input type="checkbox" checked={selectedUids.includes(s.uid)} onChange={() => toggleStudent(s.uid)} className="rounded bg-slate-900 border-slate-500 text-blue-500" />
                                        <span className="text-xs text-slate-300 font-bold">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                            
                            <Button onClick={handleCreate} className="w-full" disabled={isCreating || !name}>{isCreating ? <Spinner /> : 'Create Group'}</Button>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold mb-4">Active Groups</h3>
                        {loading ? <Spinner /> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {groups.map(g => (
                                    <div key={g.id} className="p-4 bg-slate-800 rounded-xl border border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl">👥</div>
                                        <h4 className="font-bold text-blue-400">{g.name}</h4>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{g.classId} &bull; {g.subject}</p>
                                        <div className="mt-3 flex -space-x-2">
                                            {g.members.map(m => (
                                                <div key={m.uid} className="w-6 h-6 rounded-full bg-slate-600 border border-slate-900 flex items-center justify-center text-[8px] font-black" title={m.name}>{m.name.charAt(0)}</div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex justify-between items-center">
                                            {/* FIX: Corrected typo isSubmited -> isSubmitted to match current interface definition. */}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black ${g.isSubmitted ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                {g.isSubmitted ? 'Submitted' : 'In Progress'}
                                            </span>
                                            <button onClick={() => db.collection('groups').doc(g.id).delete()} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                                {groups.length === 0 && <p className="text-center py-20 text-slate-600 italic col-span-full">No groups formed yet.</p>}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TeacherGroupWork;
