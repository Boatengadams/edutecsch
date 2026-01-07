
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { UserProfile, AttendanceRecord } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';

const StudentAttendanceLog: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userProfile?.uid) return;

        const unsub = db.collection('attendance')
            .where('studentUids', 'array-contains', userProfile.uid)
            .orderBy('date', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
                setLoading(false);
            }, err => {
                console.warn("Attendance Log listener status:", err.message);
                setLoading(false);
            });
        return () => unsub();
    }, [userProfile.uid]);

    if (loading) return <div className="p-20 flex justify-center"><Spinner /></div>;

    const presentCount = records.filter(r => r.records[userProfile.uid] === 'Present').length;
    const rate = records.length > 0 ? (presentCount / records.length) * 100 : 100;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Attendance Log</h2>
                <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attendance Rate</p>
                    <p className="text-xl font-black text-blue-400">{rate.toFixed(1)}%</p>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {records.map(r => (
                            <tr key={r.id} className="hover:bg-white/[0.02]">
                                <td className="px-6 py-4 font-mono text-slate-300">{r.date}</td>
                                <td className="px-6 py-4 text-slate-400">{r.classId}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${r.records[userProfile.uid] === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {r.records[userProfile.uid]}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {records.length === 0 && <tr><td colSpan={3} className="p-20 text-center text-slate-600 italic">No attendance data recorded yet.</td></tr>}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default StudentAttendanceLog;
