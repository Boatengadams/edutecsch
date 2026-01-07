
import React from 'react';
import { useAllOnlineUsers } from '../hooks/useOnlineStatus';
import Card from './common/Card';
import Spinner from './common/Spinner';

const ActivityMonitor: React.FC = () => {
    const onlineUsers = useAllOnlineUsers();

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Activity Monitor</h2>
                    <p className="text-slate-400 text-sm">Real-time presence tracking across all portals</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">{onlineUsers.filter(u => u.state === 'online').length} Live Users</span>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-[10px] text-slate-500 uppercase tracking-[0.2em] bg-slate-900/80 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5 font-black">User</th>
                                <th className="px-6 py-5 font-black">Role</th>
                                <th className="px-6 py-5 font-black">Class/Section</th>
                                <th className="px-6 py-5 font-black">Status</th>
                                <th className="px-6 py-5 font-black text-right">Last Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {onlineUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center italic text-slate-600">No activity logs detected.</td>
                                </tr>
                            ) : (
                                onlineUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-black text-white">{(user.name || '?').charAt(0)}</div>
                                            <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{user.name || 'Anonymous User'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-lg bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/5">{user.role || 'User'}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{user.class || '--'}</td>
                                        <td className="px-6 py-4">
                                            {user.state === 'online' ? (
                                                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                                                    <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
                                                    Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[11px] text-slate-500">
                                            {new Date(user.last_changed).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ActivityMonitor;
