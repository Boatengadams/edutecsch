import React, { useState, useEffect } from 'react';
import { rtdb } from '../services/firebase';
import { UserProfile } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';

interface TeacherStudentActivityProps {
    teacherClasses: string[];
}

interface PresenceData {
    uid: string;
    state: 'online' | 'offline';
    last_changed: number;
    name: string;
    role: string;
    class: string;
}

const TeacherStudentActivity: React.FC<TeacherStudentActivityProps> = ({ teacherClasses }) => {
    const [activeUsers, setActiveUsers] = useState<PresenceData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherClasses.length === 0) {
            setActiveUsers([]);
            setLoading(false);
            return;
        }

        const statusRef = rtdb.ref('/status');
        
        const onValueChange = statusRef.on('value', snapshot => {
            const data = snapshot.val();
            if (!data) {
                setActiveUsers([]);
                setLoading(false);
                return;
            }

            const users: PresenceData[] = Object.keys(data).map(key => ({
                uid: key,
                ...data[key]
            }));

            // Filter: Only students who are currently 'online' AND in this teacher's assigned sectors
            const liveStudents = users.filter(user => 
                user.role === 'student' && 
                user.state === 'online' && 
                user.class && 
                teacherClasses.includes(user.class)
            );
            
            // Sort by most recently changed status
            liveStudents.sort((a, b) => b.last_changed - a.last_changed);
            
            setActiveUsers(liveStudents);
            setLoading(false);
        }, (err) => {
            console.error("Presence kernel sync fault:", err);
            setLoading(false);
        });

        return () => statusRef.off('value', onValueChange);
    }, [teacherClasses]);

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

    return (
        <Card className="!bg-slate-900/60 border-emerald-500/10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Live Learning Pulse</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Authorized real-time presence feed</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">{activeUsers.length} Active Now</span>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-slate-400">
                    <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/50 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-black">Learner Identity</th>
                            <th className="px-6 py-4 font-black">Registry</th>
                            <th className="px-6 py-4 font-black text-right">Uplink State</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activeUsers.map((user) => {
                            const timeSince = Math.floor((Date.now() - user.last_changed) / 60000);
                            return (
                                <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black border border-emerald-500/20">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors uppercase">{user.name}</p>
                                            <p className="text-[9px] text-slate-600 font-mono tracking-tighter">{user.uid.slice(0, 12)}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black text-slate-400 uppercase border border-white/5">{user.class}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-emerald-400 font-black text-[9px] uppercase tracking-widest">Connected</span>
                                            <span className="text-[9px] font-mono text-slate-600 uppercase">{timeSince < 1 ? 'Live' : `${timeSince}m ago`}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {activeUsers.length === 0 && (
                             <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-600 italic">
                                    <span className="text-4xl block mb-2 opacity-10">📡</span>
                                    <p className="text-[10px] uppercase font-black tracking-widest">No active learners detected in assigned sectors.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default TeacherStudentActivity;
