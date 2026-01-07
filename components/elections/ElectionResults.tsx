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
        const unsubVotes = db.collection('electionVotes').onSnapshot(snap => {
            setVotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vote)));
        }, err => {
            if (err.code !== 'permission-denied') {
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
    }, []);

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

    if (!isAdmin && !config.publishedResults) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6 sm:space-y-8 animate-fade-in">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-6xl shadow-2xl border border-white/5">⌛</div>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">Tabulation Phase</h2>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 max-w-xs mx-auto leading-loose">
                        The commission is currently auditing digital packets. Results will be broadcast shortly.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 sm:space-y-12 animate-fade-in-up pb-20 max-w-5xl mx-auto px-2 sm:px-4">
            <div className="text-center">
                <p className="text-[8px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] sm:tracking-[0.5em] mb-3 sm:mb-4">Official Declaration</p>
                <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter">Election <span className="text-blue-500">Results</span></h2>
                <div className="h-1 w-16 sm:w-20 bg-blue-600 mx-auto mt-4 sm:mt-6 rounded-full shadow-[0_0_15px_blue]"></div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-12">
                {positions.map(pos => {
                    const posResults = resultsByPosition[pos.id];
                    if (posResults.length === 0) return null;
                    const totalVotes = posResults.reduce((acc, curr) => acc + curr.count, 0);

                    return (
                        <Card key={pos.id} className="!bg-slate-900/60 border-white/5 !p-6 sm:!p-10 rounded-[2rem] sm:rounded-[3rem] shadow-3xl">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 sm:mb-12 gap-4 text-center md:text-left">
                                <div className="w-full">
                                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none mb-2 truncate">{pos.title}</h3>
                                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Valid Packets: {totalVotes}</p>
                                </div>
                                {isAdmin && (
                                    <div className="px-3 py-1 sm:px-4 sm:py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl whitespace-nowrap">
                                        Live Feed
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6 sm:space-y-8">
                                {posResults.map((res, idx) => (
                                    <div key={res.candidateId} className="group">
                                        <div className="flex items-center justify-between mb-2 sm:mb-3 px-1 sm:px-2">
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${idx === 0 ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/10'}`}>
                                                    {res.photo ? <img src={res.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center font-black text-white text-xs">{res.name.charAt(0)}</div>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs sm:text-sm font-black uppercase tracking-tight truncate ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>
                                                        {res.name} {idx === 0 && <span className="ml-1 text-yellow-500">🏆</span>}
                                                    </p>
                                                    <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">{res.count} Votes</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm sm:text-lg font-black font-mono ml-2 ${idx === 0 ? 'text-blue-400' : 'text-slate-600'}`}>{res.percentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 sm:h-3 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1500 ease-[cubic-bezier(0.23,1,0.32,1)] ${idx === 0 ? 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}
                                                style={{ width: `${res.percentage}%`, transitionDelay: `${idx * 150}ms` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default ElectionResults;