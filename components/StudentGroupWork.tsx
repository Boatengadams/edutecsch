import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { UserProfile, Group } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';

const StudentGroupWork: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userProfile?.uid) return;
        const unsub = db.collection('groups')
            .where('memberUids', 'array-contains', userProfile.uid)
            .onSnapshot(snap => {
                setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
                setLoading(false);
            }, err => {
                console.warn("Group listener fault:", err.message);
                setLoading(false);
            });
        return () => unsub();
    }, [userProfile.uid]);

    if (loading) return <div className="p-20 flex justify-center h-full items-center"><Spinner /></div>;

    return (
        <div className="space-y-10 animate-fade-in-up pb-20">
            <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Collaboration <span className="text-blue-500">Units</span></h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Cross-Functional Strategy Teams</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {groups.map(group => (
                    <Card key={group.id} className="relative group !bg-slate-900/40 border-white/5 hover:border-blue-500/30 transition-all duration-500 p-8 sm:p-10 rounded-[3rem] shadow-3xl overflow-hidden flex flex-col min-h-[400px]">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-[10rem] font-black select-none pointer-events-none group-hover:scale-110 transition-transform">👥</div>
                        
                        <div className="mb-8 relative z-10">
                            <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-blue-600/10 text-blue-400 uppercase tracking-widest border border-blue-500/20">{group.subject}</span>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mt-4 mb-2 group-hover:text-blue-400 transition-colors truncate">{group.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {group.id.slice(-6).toUpperCase()}</p>
                        </div>

                        <div className="space-y-6 relative z-10 flex-grow">
                            <div className="p-5 bg-slate-950 rounded-2xl border border-white/5 shadow-inner">
                                <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Strategy Objective</h4>
                                <p className="text-sm text-slate-300 font-medium leading-relaxed italic">"{group.assignmentDescription}"</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex justify-between items-center px-1">
                                    <span>Team Members</span>
                                    <span className="text-blue-500">{group.members.length}</span>
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {group.members.map(m => (
                                        <span key={m.uid} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight border ${m.uid === userProfile.uid ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-900/20' : 'bg-slate-800 border-white/5 text-slate-400'}`}>
                                            {m.name.split(' ')[0]} {m.uid === userProfile.uid && '(YOU)'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-end relative z-10">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Protocol Status</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${group.isSubmitted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${group.isSubmitted ? 'text-emerald-400' : 'text-amber-500'}`}>
                                        {group.isSubmitted ? 'FINALIZED' : 'OPERATIONAL'}
                                    </span>
                                </div>
                            </div>
                            {group.grade && (
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Unit Score</p>
                                    <p className="text-2xl font-black text-white">{group.grade}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}

                {groups.length === 0 && (
                    <div className="col-span-full py-64 text-center opacity-10 select-none">
                         <span className="text-[12rem] block mb-10">👥</span>
                         <p className="text-xl font-black uppercase tracking-[1.5em]">No Squads Formed</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentGroupWork;