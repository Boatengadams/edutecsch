import React, { useState, useEffect } from 'react';
import { db, firebase } from '../../services/firebase';
import { UserProfile, ElectionPosition, ElectionApplication, Vote } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

interface VotingFlowProps {
    userProfile: UserProfile;
    positions: ElectionPosition[];
    onComplete: () => void;
}

type VotingStep = 'intro' | 'ballot' | 'review' | 'securing';

const VotingFlow: React.FC<VotingFlowProps> = ({ userProfile, positions, onComplete }) => {
    const [step, setStep] = useState<VotingStep>('intro');
    const [currentPosIdx, setCurrentPosIdx] = useState(0);
    const [allCandidates, setAllCandidates] = useState<ElectionApplication[]>([]);
    const [selections, setSelections] = useState<Record<string, string>>({}); // positionId -> candidateId
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);

    useEffect(() => {
        const unsub = db.collection('electionApplications')
            .where('status', '==', 'approved')
            .onSnapshot(snap => {
                setAllCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ElectionApplication)));
                setIsLoadingCandidates(false);
            }, err => {
                console.error("Candidate load failed", err);
                setIsLoadingCandidates(false);
            });
        return () => unsub();
    }, []);

    const handleSelect = (candId: string) => {
        const pos = positions[currentPosIdx];
        if (!pos) return;

        setSelections(prev => ({ ...prev, [pos.id]: candId }));

        if (currentPosIdx < positions.length - 1) {
            setCurrentPosIdx(p => p + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setStep('review');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmitBallot = async () => {
        setStep('securing');
        try {
            const batch = db.batch();
            Object.entries(selections).forEach(([posId, cId]) => {
                const voteRef = db.collection('electionVotes').doc();
                batch.set(voteRef, {
                    voterId: userProfile.uid,
                    positionId: posId,
                    candidateId: cId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            await new Promise(res => setTimeout(res, 2000));
            onComplete();
        } catch (err) {
            console.error("Vote submission failed", err);
            setStep('review');
            alert("Vault submission failed. Please try again.");
        }
    };

    if (isLoadingCandidates) {
        return <div className="h-full flex items-center justify-center bg-[#020617] p-20"><Spinner /></div>;
    }

    if (!positions || positions.length === 0) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 space-y-8 animate-fade-in">
                <span className="text-6xl sm:text-8xl grayscale opacity-20">🗳️</span>
                <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">Empty Digital Ballot</h3>
                    <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto mt-4 font-bold uppercase tracking-widest leading-loose">
                        The registry shows no active positions for your current class level in this electoral cycle.
                    </p>
                </div>
                <Button onClick={onComplete} variant="secondary">Return to Hub</Button>
            </div>
        );
    }

    // --- INTRO STEP ---
    if (step === 'intro') {
        return (
            <div className="px-4 py-12 sm:p-8 max-w-6xl mx-auto space-y-10 sm:space-y-16 animate-fade-in">
                <div className="text-center space-y-4 sm:space-y-6">
                    <div className="inline-flex items-center gap-3 bg-blue-600/10 px-4 sm:px-6 py-2 rounded-full border border-blue-500/30">
                        <span className="text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Official Ballot Opening</span>
                    </div>
                    <h2 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-none">Meet the <span className="text-blue-500">Candidates</span></h2>
                    <p className="text-slate-500 max-w-2xl mx-auto text-xs sm:text-sm font-medium uppercase tracking-widest leading-relaxed">
                        Review the shortlisted candidates for each prefectural role before entering the secure voting vault.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {positions.map(pos => {
                        const candidates = allCandidates.filter(c => c.positionId === pos.id);
                        return (
                            <Card key={pos.id} className="!bg-slate-900/40 border-white/5 !p-6 sm:!p-8">
                                <h4 className="text-blue-500 font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-4 sm:mb-6 border-b border-white/5 pb-4">{pos.title}</h4>
                                <div className="space-y-4">
                                    {candidates.length > 0 ? candidates.map(c => (
                                        <div key={c.studentId} className="flex items-center gap-3 sm:gap-4 group">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                                                {c.studentPhoto ? <img src={c.studentPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 text-[10px]">?</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-200 text-xs sm:text-sm uppercase tracking-tight truncate">{c.studentName}</p>
                                                <p className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase tracking-widest italic truncate">{c.slogan || 'Candidate'}</p>
                                            </div>
                                        </div>
                                    )) : <p className="text-[10px] text-slate-600 italic">No candidates shortlisted.</p>}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="pt-6 sm:pt-10 flex justify-center">
                    <Button onClick={() => setStep('ballot')} className="w-full sm:w-auto sm:px-20 py-5 sm:py-6 text-sm sm:text-base font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] shadow-2xl shadow-blue-900/50 rounded-2xl sm:rounded-[2.5rem]">
                        Start Secure Vote 🗳️
                    </Button>
                </div>
            </div>
        );
    }

    // --- BALLOT STEP ---
    if (step === 'ballot') {
        const pos = positions[currentPosIdx];
        const candidates = allCandidates.filter(c => c.positionId === pos.id);

        return (
            <div className="p-4 sm:p-8 min-h-screen flex flex-col items-center max-w-6xl mx-auto space-y-12 sm:space-y-20 bg-[#020617] animate-fade-in pt-12 sm:pt-24 pb-20">
                <div className="text-center space-y-6 sm:space-y-12 w-full">
                    <div className="inline-flex items-center gap-4 sm:gap-6 bg-slate-900/80 px-6 sm:px-10 py-3 sm:py-4 rounded-full border border-white/5 shadow-2xl">
                        <span className="text-[8px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] sm:tracking-[0.6em]">Secure Session</span>
                        <div className="h-3 w-px bg-white/10"></div>
                        <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Vault: {currentPosIdx + 1} / {positions.length}</span>
                    </div>
                    <h2 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-none px-4">{pos.title}</h2>
                    <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-hidden">
                        {positions.map((_, i) => (
                            <div key={i} className={`h-1 sm:h-1.5 rounded-full transition-all duration-1000 ${i === currentPosIdx ? 'w-12 sm:w-24 bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,1)]' : i < currentPosIdx ? 'w-4 sm:w-8 bg-emerald-500' : 'w-4 sm:w-8 bg-slate-800'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12 w-full max-w-5xl">
                    {candidates.map(c => (
                        <button 
                            key={c.studentId} 
                            onClick={() => handleSelect(c.studentId)} 
                            className={`group relative p-8 sm:p-12 bg-slate-900 border-2 rounded-[2rem] sm:rounded-[4rem] transition-all duration-500 flex flex-col items-center overflow-hidden shadow-2xl active:scale-95 ${selections[pos.id] === c.studentId ? 'border-blue-500 bg-blue-900/10' : 'border-white/5 hover:border-blue-500/50 hover:bg-slate-800'}`}
                        >
                            <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-10 text-6xl sm:text-9xl">🗳️</div>
                            <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl sm:rounded-[3rem] bg-slate-800 border-4 border-white/10 overflow-hidden mb-6 sm:mb-12 group-hover:scale-105 transition-transform shadow-3xl ring-1 ring-blue-500/0 group-hover:ring-blue-500/50 transition-all">
                                {c.studentPhoto ? <img src={c.studentPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-700 text-4xl sm:text-6xl">?</div>}
                            </div>
                            <h4 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter text-center line-clamp-2">{c.studentName}</h4>
                            <p className="mt-4 sm:mt-6 text-blue-500 font-black text-[9px] sm:text-[11px] uppercase tracking-[0.5em] opacity-60 sm:opacity-40 group-hover:opacity-100 transition-opacity">Cast Digital Vote</p>
                        </button>
                    ))}
                    
                    <button onClick={() => handleSelect('abstained')} className={`p-8 sm:p-12 border-4 border-dashed rounded-[2rem] sm:rounded-[4rem] transition-all uppercase font-black tracking-[0.4em] sm:tracking-[0.5em] flex flex-col items-center justify-center gap-6 sm:gap-8 group ${selections[pos.id] === 'abstained' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-950/50 border-slate-800 text-slate-700 hover:text-white hover:border-slate-600'}`}>
                        <span className="text-4xl sm:text-6xl grayscale group-hover:grayscale-0 transition-all group-hover:scale-110">🕊️</span>
                        Abstain Ballot
                    </button>
                </div>

                <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => {
                        if (currentPosIdx > 0) setCurrentPosIdx(p => p - 1);
                        else setStep('intro');
                    }} className="text-slate-500 uppercase font-black tracking-widest text-[8px] sm:text-[10px]">
                        ← Back
                    </Button>
                </div>
            </div>
        );
    }

    // --- REVIEW STEP ---
    if (step === 'review') {
        return (
            <div className="px-4 py-12 sm:p-8 max-w-4xl mx-auto space-y-10 sm:space-y-16 animate-fade-in pb-20">
                <div className="text-center space-y-2 sm:space-y-4">
                    <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none">Ballot <span className="text-blue-500">Review</span></h2>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em]">Verify your digital signature</p>
                </div>

                <Card className="!bg-slate-900 border-white/5 !p-6 sm:!p-10 divide-y divide-white/5 shadow-3xl">
                    {positions.map(pos => {
                        const selectedId = selections[pos.id];
                        const candidate = allCandidates.find(c => c.studentId === selectedId);
                        return (
                            <div key={pos.id} className="py-6 sm:py-8 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 group">
                                <div className="text-center sm:text-left min-w-0">
                                    <h4 className="text-slate-500 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-1">{pos.title}</h4>
                                    <p className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter truncate">
                                        {selectedId === 'abstained' ? 'Abstained' : candidate?.studentName || 'Not Selected'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    {selectedId !== 'abstained' && candidate?.studentPhoto && (
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-blue-500/50 transition-colors">
                                            <img src={candidate.studentPhoto} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setCurrentPosIdx(positions.indexOf(pos));
                                            setStep('ballot');
                                        }}
                                        className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </Card>

                <div className="flex flex-col gap-6 items-center">
                    <div className="p-4 sm:p-6 bg-blue-600/5 rounded-2xl sm:rounded-3xl border border-blue-500/20 text-center max-w-md mx-2">
                        <p className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-loose">
                            Confirming will commit your ballot to the school's encrypted vault. This action is irreversible.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full justify-center px-4">
                        <Button variant="secondary" onClick={() => setStep('ballot')} className="w-full sm:w-auto px-10 py-4 sm:py-5 rounded-xl sm:rounded-[2rem] uppercase font-black tracking-widest text-xs">Back</Button>
                        <Button onClick={handleSubmitBallot} className="w-full sm:w-auto sm:px-16 py-5 sm:py-6 text-xs sm:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] shadow-2xl shadow-blue-900/50 rounded-xl sm:rounded-[2.5rem]">
                            🚀 Finalize & Save
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // --- SECURING STEP ---
    if (step === 'securing') {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center p-6 space-y-8 sm:space-y-10 bg-[#020617] animate-fade-in">
                <div className="relative w-40 h-40 sm:w-56 sm:h-56">
                    <div className="absolute inset-0 border-4 sm:border-8 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 sm:border-8 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]">🔒</div>
                </div>
                <div className="text-center space-y-3 sm:space-y-4">
                    <p className="text-blue-400 font-mono text-lg sm:text-2xl uppercase tracking-[0.5em] sm:tracking-[0.8em] animate-pulse">ENCRYPTING BALLOT</p>
                    <p className="text-slate-600 font-mono text-[8px] sm:text-[10px] uppercase tracking-widest px-8">Securing digital signature protocol...</p>
                </div>
            </div>
        );
    }

    return null;
};

export default VotingFlow;