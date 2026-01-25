import React, { useState, useEffect, useMemo } from 'react';
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
    const { user, userProfile } = useAuthentication();
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

    const isOmni = useMemo(() => ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"].includes(user?.email || ""), [user]);

    // Authorized subjects for the selected class
    const authorizedSubjects = useMemo(() => {
        if (isOmni) return ["Integrated Science", "Mathematics", "English Language", "Social Studies", "Computing", "Creative Arts"];
        return userProfile?.subjectsByClass?.[selectedClass] || [];
    }, [selectedClass, userProfile, isOmni]);

    useEffect(() => {
        if (authorizedSubjects.length > 0 && !authorizedSubjects.includes(subject)) {
            setSubject(authorizedSubjects[0]);
        }
    }, [authorizedSubjects, subject]);

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
        if (!user || !name || selectedUids.length === 0 || !subject) return;
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
                assignmentDescription: `Collaborative strategy session on ${topic}`,
                dueDate: null,
                isSubmitted: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
            };
            await db.collection('groups').add(groupData);
            showToast("Collaboration Unit Established! 🚀", "success");
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
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Collaboration <span className="text-blue-500">Hub</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cross-Functional Team Architect</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                    <Card className="!bg-slate-900/80 border-blue-500/20 !p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl group-hover:scale-110 transition-transform">🏗️</div>
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-8">Establish New Collaboration Unit</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Team Identification</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Science Alpha Squad" className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Target Registry</label>
                                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-[11px] font-black text-white uppercase outline-none focus:border-blue-500">
                                        {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Academic Domain</label>
                                    <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-[11px] font-black text-blue-400 uppercase outline-none focus:border-blue-500">
                                        {authorizedSubjects.length > 0 ? authorizedSubjects.map(s => <option key={s} value={s}>{s}</option>) : <option disabled>Unauthorized</option>}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Research Directive</label>
                                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Plate Tectonics Analysis" className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500" />
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-3 ml-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Operatives ({selectedUids.length})</label>
                                </div>
                                <div className="max-h-56 overflow-y-auto border-2 border-slate-800 rounded-3xl bg-slate-950/50 p-3 space-y-1 shadow-inner custom-scrollbar">
                                    {students.filter(s => s.class === selectedClass).map(s => (
                                        <label key={s.uid} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${selectedUids.includes(s.uid) ? 'bg-blue-600/20 border-2 border-blue-500/40 shadow-lg' : 'hover:bg-slate-800 border-2 border-transparent'}`}>
                                            <input type="checkbox" checked={selectedUids.includes(s.uid)} onChange={() => toggleStudent(s.uid)} className="sr-only" />
                                            <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${selectedUids.includes(s.uid) ? 'bg-blue-500 border-blue-400' : 'border-slate-700'}`}>
                                                {selectedUids.includes(s.uid) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            </div>
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${selectedUids.includes(s.uid) ? 'text-white' : 'text-slate-500'}`}>{s.name}</span>
                                        </label>
                                    ))}
                                    {students.filter(s => s.class === selectedClass).length === 0 && <p className="text-[9px] text-slate-600 uppercase font-black text-center py-10 tracking-[0.2em]">Sector empty: No learners found.</p>}
                                </div>
                            </div>
                            
                            <Button onClick={handleCreate} className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/30" disabled={isCreating || !name || !subject || selectedUids.length === 0}>
                                {isCreating ? <Spinner /> : '🚀 Deploy Collaboration Unit'}
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-7">
                    <Card className="h-full !p-8 sm:!p-10">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Active Collaboration Matrix</h3>
                        {loading ? <div className="py-20 flex justify-center"><Spinner /></div> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {groups.map(g => (
                                    <div key={g.id} className="p-6 bg-slate-950 border border-white/5 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-xl">
                                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-6xl group-hover:scale-125 transition-transform pointer-events-none">👥</div>
                                        <div className="relative z-10">
                                            <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1 truncate">{g.name}</h4>
                                            <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.3em]">{g.classId} &bull; {g.subject}</p>
                                            
                                            <div className="mt-8 flex -space-x-3">
                                                {g.members.slice(0, 5).map(m => (
                                                    <div key={m.uid} className="w-10 h-10 rounded-2xl bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-xl" title={m.name}>{m.name.charAt(0)}</div>
                                                ))}
                                                {g.members.length > 5 && (
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-900 border-4 border-slate-950 flex items-center justify-center text-[9px] font-black text-slate-500 shadow-xl">+{g.members.length - 5}</div>
                                                )}
                                            </div>

                                            <div className="mt-10 flex justify-between items-center">
                                                <span className={`text-[8px] px-3 py-1 rounded-full uppercase font-black tracking-widest ${g.isSubmitted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                                                    {g.isSubmitted ? 'Protocol Finalized' : 'Operational'}
                                                </span>
                                                <button onClick={() => { if(window.confirm("Purge collaboration unit?")) db.collection('groups').doc(g.id).delete(); }} className="p-2 text-slate-700 hover:text-red-500 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {groups.length === 0 && (
                                    <div className="col-span-full py-40 text-center opacity-10 italic">
                                         <p className="text-xl font-black uppercase tracking-[1em]">Matrix Empty</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TeacherGroupWork;