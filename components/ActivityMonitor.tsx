import React, { useState, useEffect, useMemo } from 'react';
import { useAllOnlineUsers, OnlineUser } from '../hooks/useOnlineStatus';
import { db } from '../services/firebase';
import type { UserActivityLog } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';

const ActivityMonitor: React.FC = () => {
    const liveUsers = useAllOnlineUsers();
    const [historyLogs, setHistoryLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'live' | 'history'>('live');

    useEffect(() => {
        const unsub = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .onSnapshot(snap => {
                setHistoryLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog)));
                setLoading(false);
            }, err => {
                console.error("Activity log fault:", err);
                setLoading(false);
            });
        return () => unsub();
    }, []);

    const liveTable = () => (
        <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-[10px] text-slate-500 uppercase tracking-[0.2em] bg-slate-800/80 border-b border-white/5">
                <tr>
                    <th className="px-8 py-5 font-black">User Protocol</th>
                    <th className="px-8 py-5 font-black">Authority / Sector</th>
                    <th className="px-8 py-5 font-black text-center">Current State</th>
                    <th className="px-8 py-5 font-black text-right">Last Synchronized</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {liveUsers.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-8 py-20 text-center italic text-slate-600">
                            <div className="text-6xl mb-4 opacity-5">👁️‍🗨️</div>
                            <p className="font-black uppercase tracking-widest">No active terminal links detected.</p>
                        </td>
                    </tr>
                ) : (
                    liveUsers.map((user) => (
                        <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-slate-400 shadow-inner">{(user.name || '?').charAt(0).toUpperCase()}</div>
                                    <div>
                                        <p className="font-black text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{user.name || 'Anonymous'}</p>
                                        <p className="text-[9px] text-slate-600 font-mono tracking-tighter">{user.uid.substring(0, 16)}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-4">
                                <div className="flex flex-col gap-1">
                                    <span className={`px-2 py-0.5 w-fit rounded-md bg-slate-800 text-[9px] font-black uppercase tracking-widest border border-white/5 ${user.role === 'admin' ? 'text-purple-400' : 'text-slate-400'}`}>{user.role || 'User'}</span>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{user.class || 'No Sector'}</p>
                                </div>
                            </td>
                            <td className="px-8 py-4 text-center">
                                {user.state === 'online' ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></span>
                                        <span className="text-emerald-400 font-black text-[9px] uppercase tracking-widest">Active</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-white/5 rounded-full">
                                        <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span>
                                        <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Away</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-8 py-4 text-right">
                                <p className="font-mono text-[10px] text-slate-500">{new Date(user.last_changed).toLocaleDateString()}</p>
                                <p className="font-mono text-[11px] text-slate-400 font-bold uppercase">{new Date(user.last_changed).toLocaleTimeString()}</p>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );

    const historyTable = () => (
        <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-[10px] text-slate-500 uppercase tracking-[0.2em] bg-slate-800/80 border-b border-white/5">
                <tr>
                    <th className="px-8 py-5 font-black">Event Time</th>
                    <th className="px-8 py-5 font-black">User Protocol</th>
                    <th className="px-8 py-5 font-black">Terminal Activity</th>
                    <th className="px-8 py-5 font-black text-right">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-4">
                            <p className="font-mono text-[10px] text-slate-500">{log.timestamp?.toDate().toLocaleDateString()}</p>
                            <p className="font-mono text-[11px] text-slate-400 font-bold uppercase">{log.timestamp?.toDate().toLocaleTimeString()}</p>
                        </td>
                        <td className="px-8 py-4">
                            <p className="font-black text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{log.userName}</p>
                            <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">{log.userRole}</p>
                        </td>
                        <td className="px-8 py-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ACCESSING {log.userClass || 'SYSTEM ROOT'}</p>
                        </td>
                        <td className="px-8 py-4 text-right">
                             <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${log.action === 'login' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {log.action}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none">Activity <span className="text-blue-500">Monitor</span></h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Institutional Presence Protocol</p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto">
                    <button onClick={() => setViewMode('live')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Live Status</button>
                    <button onClick={() => setViewMode('history')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Log History</button>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden border-white/5 shadow-3xl rounded-[2rem]">
                {loading ? <div className="p-32 flex justify-center"><Spinner /></div> : (viewMode === 'live' ? liveTable() : historyTable())}
            </Card>
        </div>
    );
};

export default ActivityMonitor;
