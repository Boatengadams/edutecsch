import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { ElectionConfig, ElectionPosition, ElectionApplication, Vote } from '../../types';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

interface ElectionResultsProps {
    config: ElectionConfig;
    positions: ElectionPosition[];
    isAdmin?: boolean;
}

const ElectionResults: React.FC<ElectionResultsProps> = ({ config, positions, isAdmin = false }) => {
    const [votes, setVotes] = useState<Vote[]>([]);
    const [candidates, setCandidates] = useState<ElectionApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // SECURITY GUARD: Only listen to votes if authorized (Admin or Results are public)
        // This prevents the permission-denied error from firing before rules can allow access.
        if (!isAdmin && config.status !== 'results' && !config.publishedResults) {
            setLoading(false);
            return;
        }

        const unsubVotes = db.collection('electionVotes').onSnapshot(snap => {
            setVotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vote)));
        }, err => {
            // Gracefully handle permission errors which may occur during phase transitions
            if (err.code === 'permission-denied') {
                console.warn("Election votes vault is currently locked.");
            } else {
                console.error("Election votes listener error:", err);
            }
        });

        const unsubCand = db.collection('electionApplications').where('status', '==', 'approved').onSnapshot(snap => {
            setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ElectionApplication)));
            setLoading(false);
        }, err => {
            if (err.code !== 'permission-denied') {
                console.error("Election candidates listener error:", err);
            }
            setLoading(false);
        });

        return () => { unsubVotes(); unsubCand(); };
    }, [isAdmin, config.status, config.publishedResults]);

    const resultsByPosition = useMemo(() => {
        const results: Record<string, Array<{ candidateId: string, name: string, photo?: string, count: number, percentage: number }>> = {};
        
        positions.forEach(pos => {
            const posVotes = votes.filter(v => v.positionId === pos.id);
            const total = posVotes.length;
            const posCandidates = candidates.filter(c => c.positionId === pos.id);
            
            results[pos.id] = posCandidates.map(cand => {
                const count = posVotes.filter(v => v.candidateId === cand.studentId).length;
                return {
                    candidateId: cand.studentId,
                    name: cand.studentName,
                    photo: cand.studentPhoto,
                    count,
                    percentage: total > 0 ? (count / total) * 100 : 0
                };
            }).sort((a, b) => b.count - a.count);
        });
        
        return results;
    }, [votes, candidates, positions]);

    if (loading) return <div className="p-10 flex justify-center items-center h-full"><Spinner /></div>;

    if (!isAdmin && !config.publishedResults && config.status !== 'results') {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-10 space-y-12 animate-fade-in">
                <div className="relative">
                    <div className="w-32 h-32 sm:w-44 sm:h-44 bg-slate-900 rounded-[3rem] sm:rounded-[4rem] flex items-center justify-center text-5xl sm:text-7xl shadow-3xl border border-white/5 animate-pulse">⌛</div>
                    <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full animate-ping"></div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none">The <span className="text-blue-500">Wait</span></h2>
                    <p className="text-slate-500 text-[10px] sm:text-sm font-black uppercase tracking-[0.5em] mt-6 max-w-sm mx-auto leading-loose opacity-60">
                        Tabulation Phase Active. The Electoral Commission is certifying the digital vault. 
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-16 sm:space-y-32 animate-fade-in-up pb-64 max-w-6xl mx-auto px-4 relative">
             {/* Background Decoration */}
             <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-[0.02] z-0">
                <h1 className="text-[30vw] font-black uppercase tracking-tighter transform rotate-90 select-none">POLLS</h1>
            </div>

            <div className="text-center space-y-6 sm:space-y-10 relative z-10">
                <div className="inline-flex items-center gap-4 bg-emerald-500/10 px-8 py-3 rounded-full border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                     <span className="text-[10px] sm:text-[12px] font-black text-emerald-400 uppercase tracking-[0.6em]">Verified Declaration Room</span>
                </div>
                <h2 className="text-5xl sm:text-9xl font-black text-white uppercase tracking-tighter leading-[0.8] text-shadow-2xl">Certified <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Results</span></h2>
                <div className="h-1.5 w-24 sm:w-40 bg-gradient-to-r from-emerald-500 to-blue-600 mx-auto rounded-full shadow-[0_0_30px_rgba(16,185,129,0.8)]"></div>
            </div>

            <div className="grid grid-cols-1 gap-12 sm:gap-24 relative z-10">
                {positions.map((pos, pIdx) => {
                    const posResults = resultsByPosition[pos.id];
                    if (posResults.length === 0) return null;
                    const totalVotes = posResults.reduce((acc, curr) => acc + curr.count, 0);

                    return (
                        <Card key={pos.id} className="!bg-slate-900/60 backdrop-blur-3xl border-white/5 !p-10 sm:!p-20 rounded-[3rem] sm:rounded-[5rem] shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-16 opacity-[0.02] text-[20rem] font-black pointer-events-none select-none uppercase tracking-tighter transform translate-x-20 -translate-y-20">{pIdx+1}</div>
                            
                            <div className="flex flex-col md:flex-row justify-between items-start mb-12 sm:mb-20 gap-10 text-center md:text-left relative z-10 border-b border-white/10 pb-12 sm:pb-16">
                                <div className="w-full space-y-4">
                                    <h3 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-blue-400 transition-colors">{pos.title}</h3>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                         <p className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.4em]">Audit Trail: <span className="text-white">#{pos.id.slice(0,8).toUpperCase()}</span></p>
                                         <div className="h-1 w-1 bg-slate-800 rounded-full"></div>
                                         <p className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.4em]">Quota: <span className="text-emerald-500">{totalVotes} Ballots</span></p>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="self-center md:self-start px-6 py-2.5 bg-blue-600/10 border-2 border-blue-500/30 text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl animate-pulse whitespace-nowrap">
                                        Tabulation Locked
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-10 sm:gap-14 relative z-10">
                                {posResults.map((res, idx) => {
                                    const isWinner = idx === 0;
                                    return (
                                        <div key={res.candidateId} className={`relative flex flex-col sm:flex-row items-center gap-8 sm:gap-12 transition-all duration-700 ${isWinner ? 'p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent border border-yellow-500/20 shadow-inner' : 'px-4 opacity-70 hover:opacity-100'}`}>
                                            
                                            {/* Rank Number */}
                                            <div className={`hidden sm:flex w-16 h-16 rounded-full items-center justify-center font-black text-2xl border-4 ${isWinner ? 'bg-yellow-500 border-yellow-300 text-slate-900 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                                                {idx + 1}
                                            </div>

                                            {/* Candidate Avatar */}
                                            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-4 flex-shrink-0 transition-all duration-500 ${isWinner ? 'border-yellow-500 shadow-[0_20px_50px_rgba(234,179,8,0.4)] scale-110' : 'border-white/10'}`}>
                                                {res.photo ? <img src={res.photo} className="w-full h-full object-cover contrast-110 saturate-125" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center font-black text-white text-2xl">{res.name.charAt(0)}</div>}
                                            </div>

                                            {/* Stats Column */}
                                            <div className="flex-grow w-full space-y-6">
                                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-center sm:text-left">
                                                    <div className="space-y-1">
                                                        <h4 className={`text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-none ${isWinner ? 'text-white' : 'text-slate-400'}`}>
                                                            {res.name} {isWinner && <span className="ml-2 text-yellow-500 filter drop-shadow-lg">🏆</span>}
                                                        </h4>
                                                        {isWinner && <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] leading-none pt-2">Elected Authority</p>}
                                                    </div>
                                                    <div className="flex flex-col items-center sm:items-end">
                                                         <span className={`text-4xl sm:text-6xl font-black font-mono leading-none ${isWinner ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                            {res.percentage.toFixed(1)}<span className="text-xl sm:text-2xl opacity-40">%</span>
                                                        </span>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{res.count} Certified Votes</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Gauge Meter */}
                                                <div className="h-4 sm:h-6 bg-slate-950 rounded-full overflow-hidden border-2 border-white/5 p-1 shadow-inner group/meter">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-2000 ease-[cubic-bezier(0.23,1,0.32,1)] relative ${isWinner ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-blue-500 shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'bg-slate-800'}`}
                                                        style={{ width: `${res.percentage}%`, transitionDelay: `${idx * 200}ms` }}
                                                    >
                                                        {isWinner && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total Banner */}
                            <div className="mt-16 sm:mt-24 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-4">
                                     <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm">✓</div>
                                     <span className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Official Declaration CERT-A0{pIdx+1}</span>
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-700 font-mono tracking-widest uppercase">{new Date().toDateString()} // EDUTEC SECURE</span>
                            </div>
                        </Card>
                    );
                })}
            </div>
            
            {/* Final Footer Stats */}
            <div className="text-center py-20 sm:py-32 relative z-10 border-t border-white/5">
                <div className="inline-grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-24">
                     <div className="space-y-2">
                        <p className="text-4xl sm:text-6xl font-black text-white font-mono">{votes.length}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Total Turnout</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-4xl sm:text-6xl font-black text-blue-500 font-mono">{positions.length}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Decided Roles</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-4xl sm:text-6xl font-black text-emerald-500 font-mono">100%</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Integrity Level</p>
                     </div>
                </div>
                <div className="mt-20 sm:mt-32">
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-700 uppercase tracking-[1em] mb-4">Official Transmission Terminated</p>
                    <div className="w-12 h-1 bg-slate-900 mx-auto rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

export default ElectionResults;