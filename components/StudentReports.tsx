
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { UserProfile, TerminalReport, SchoolSettings } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import StudentReportCard from './common/StudentReportCard';

const StudentReports: React.FC<{ userProfile: UserProfile; schoolSettings: SchoolSettings | null }> = ({ userProfile, schoolSettings }) => {
    const [reports, setReports] = useState<TerminalReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingReport, setViewingReport] = useState<TerminalReport | null>(null);

    useEffect(() => {
        const unsub = db.collection('terminalReports')
            .where('classId', '==', userProfile.class)
            .where('published', '==', true)
            .onSnapshot(
                snap => {
                    setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TerminalReport)));
                    setLoading(false);
                },
                err => {
                    console.warn("Reports listener error:", err.message);
                    setLoading(false);
                }
            );
        return () => unsub();
    }, [userProfile.class]);

    if (loading) return <div className="p-20 flex justify-center"><Spinner /></div>;

    if (viewingReport) {
        return (
            <div className="animate-fade-in-up">
                <button onClick={() => setViewingReport(null)} className="mb-6 text-blue-500 font-bold flex items-center gap-2">← Back to List</button>
                <StudentReportCard student={userProfile} report={viewingReport} schoolSettings={schoolSettings} ranking={null} classSize={0} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-3xl font-bold">Terminal Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(r => (
                    <Card key={r.id} className="hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => setViewingReport(r)}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-2xl">📋</div>
                            <div>
                                <h4 className="font-bold text-white">Term {r.term} Report</h4>
                                <p className="text-xs text-slate-500">{r.academicYear}</p>
                            </div>
                        </div>
                        <p className="mt-6 text-xs text-blue-400 font-bold uppercase tracking-widest">Click to View Card →</p>
                    </Card>
                ))}
                {reports.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                        <span className="text-5xl opacity-20">📭</span>
                        <p className="text-slate-500 mt-4">No published reports found for your class.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentReports;
