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
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-8 space-y-12 animate-fade-in">
                <div className="relative">
                    <span className="text-7xl sm:text-9xl grayscale opacity-20 block">🗳️</span>
                    <div className="absolute inset-0 bg-red-500/10 blur-[100px] rounded-full"></div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter">Empty Digital <span className="text-red-500">Vault</span></h3>
                    <p className="text-slate-500 text-xs sm:text-base max-w-sm mx-auto mt-6 font-bold uppercase tracking-[0.3em] leading-relaxed opacity-60">
                        Registry audit: No authorized positions found for your account level.
                    </p>
                </div>
                <Button onClick={onComplete} variant="secondary" className="px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10">Abort Protocol</Button>
            </div>
        );
    }

    // --- INTRO STEP ---
    if (step === 'intro') {
        return (
            <div className="px-4 py-16 sm:p-12 max-w-6xl mx-auto space-y-16 sm:space-y-24 animate-fade-in pb-40">
                <div className="text-center space-y-6 sm:space-y-10">
                    <div className="inline-flex items-center gap-4 bg-blue-600/10 px-6 sm:px-10 py-3 rounded-full border-2 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div>
                        <span className="text-[10px] sm:text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] sm:tracking-[0.8em]">Secure Entry Authorization</span>
                    </div>
                    <h2 className="text-5xl sm:text-8xl md:text-9xl font-black text-white uppercase tracking-tighter leading-[0.85] sm:leading-[0.75]">Voter <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Verification</span></h2>
                    <p className="text-slate-400 max-w-3xl mx-auto text-sm sm:text-lg font-medium uppercase tracking-[0.2em] leading-relaxed opacity-80">
                        You are entering a secure voting session. Review the authorized candidate list below before proceeding to the digital ballot box.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
                    {positions.map((pos, idx) => {
                        const candidates = allCandidates.filter(c => c.positionId === pos.id);
                        return (
                            <Card key={pos.id} className="group !bg-slate-900/60 border-white/5 !p-8 sm:!p-12 rounded-[3rem] hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-9xl font-black pointer-events-none select-none group-hover:scale-125 transition-transform">0{idx+1}</div>
                                <h4 className="text-blue-500 font-black text-[10px] sm:text-xs uppercase tracking-[0.4em] mb-8 sm:mb-10 border-b border-white/10 pb-6 flex items-center justify-between">
                                    <span>{pos.title}</span>
                                    <span className="text-slate-600">ID-0{idx+1}</span>
                                </h4>
                                <div className="space-y-6">
                                    {candidates.length > 0 ? candidates.map(c => (
                                        <div key={c.studentId} className="flex items-center gap-4 sm:gap-6 group/item">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/10 group-hover/item:border-blue-500/50 transition-colors shadow-xl">
                                                {c.studentPhoto ? <img src={c.studentPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-600 text-xs">?</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-200 text-sm sm:text-lg uppercase tracking-tighter truncate group-hover/item:text-white transition-colors">{c.studentName}</p>
                                                <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest italic truncate opacity-60">"{c.slogan || 'Candidate Vision'}"</p>
                                            </div>
                                        </div>
                                    )) : <p className="text-[10px] text-slate-600 italic font-bold uppercase tracking-widest">No verified candidates found.</p>}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="pt-10 sm:pt-20 flex justify-center px-4">
                    <button onClick={() => setStep('ballot')} className="group w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white sm:px-32 py-6 sm:py-8 text-sm sm:text-xl font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] shadow-[0_30px_70px_-10px_rgba(59,130,246,0.5)] rounded-2xl sm:rounded-[3rem] transition-all hover:scale-[1.03] active:scale-95 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        Open Digital Ballot 🗳️
                    </button>
                </div>
            </div>
        );
    }

    // --- BALLOT STEP ---
    if (step === 'ballot') {
        const pos = positions[currentPosIdx];
        const candidates = allCandidates.filter(c => c.positionId === pos.id);

        return (
            <div className="p-4 sm:p-12 min-h-screen flex flex-col items-center max-w-7xl mx-auto space-y-16 sm:space-y-28 bg-[#020617] animate-fade-in pt-16 sm:pt-24 pb-32 overflow-hidden relative">
                {/* Visual Depth Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-[0.03]">
                    <h1 className="text-[40rem] font-black uppercase tracking-tighter transform -rotate-12 select-none">{pos.title}</h1>
                </div>

                <div className="text-center space-y-8 sm:space-y-14 w-full relative z-10">
                    <div className="inline-flex items-center gap-4 sm:gap-8 bg-slate-900/80 backdrop-blur-3xl px-8 sm:px-14 py-4 sm:py-6 rounded-full border border-white/5 shadow-3xl ring-1 ring-blue-500/10">
                        <div className="flex items-center gap-3">
                             <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-ping"></div>
                             <span className="text-[10px] sm:text-[12px] font-black text-red-500 uppercase tracking-[0.5em] sm:tracking-[0.8em]">SECURE BALLOT ACTIVE</span>
                        </div>
                        <div className="h-5 w-px bg-white/10"></div>
                        <span className="text-[10px] sm:text-[12px] font-black text-slate-500 uppercase tracking-[0.5em]">Vault Step: {currentPosIdx + 1} / {positions.length}</span>
                    </div>
                    
                    <div className="space-y-4 px-4">
                        <h2 className="text-5xl sm:text-8xl md:text-9xl font-black text-white uppercase tracking-tighter leading-[0.85]">{pos.title}</h2>
                        <p className="text-blue-500 font-black text-[10px] sm:text-sm uppercase tracking-[0.5em] opacity-80">Select exactly one authority</p>
                    </div>

                    <div className="flex items-center justify-center gap-3 sm:gap-6 overflow-x-hidden">
                        {positions.map((_, i) => (
                            <div key={i} className={`h-1.5 sm:h-2.5 rounded-full transition-all duration-1000 ${i === currentPosIdx ? 'w-16 sm:w-40 bg-blue-600 shadow-[0_0_30px_rgba(59,130,246,1)]' : i < currentPosIdx ? 'w-4 sm:w-10 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'w-4 sm:w-10 bg-slate-800'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-16 w-full max-w-6xl relative z-10">
                    {candidates.map(c => (
                        <button 
                            key={c.studentId} 
                            onClick={() => handleSelect(c.studentId)} 
                            className={`group relative p-10 sm:p-16 bg-slate-900/60 backdrop-blur-xl border-4 rounded-[3rem] sm:rounded-[5rem] transition-all duration-700 flex flex-col items-center overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] active:scale-95 ${selections[pos.id] === c.studentId ? 'border-blue-500 bg-blue-600/10' : 'border-white/5 hover:border-blue-500/40 hover:bg-slate-800/80 hover:-translate-y-4'}`}
                        >
                            <div className="absolute top-0 right-0 p-10 sm:p-14 opacity-5 text-9xl sm:text-[15rem] font-black transform translate-x-12 -translate-y-12 transition-transform group-hover:scale-110">V</div>
                            <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-3xl sm:rounded-[4rem] bg-slate-800 border-4 sm:border-8 border-white/10 overflow-hidden mb-10 sm:mb-16 group-hover:scale-110 transition-all duration-700 shadow-3xl group-hover:rotate-3 group-hover:border-blue-500/50">
                                {c.studentPhoto ? <img src={c.studentPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-700 text-5xl sm:text-8xl">?</div>}
                            </div>
                            <h4 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter text-center leading-none group-hover:text-blue-400 transition-colors">{c.studentName}</h4>
                            <p className="mt-8 sm:mt-12 text-blue-500 font-black text-[10px] sm:text-xs uppercase tracking-[0.5em] sm:tracking-[0.8em] bg-blue-500/10 px-6 py-2 rounded-full border border-blue-500/20 shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">COMMIT BALLOT</p>
                        </button>
                    ))}
                    
                    <button onClick={() => handleSelect('abstained')} className={`group p-10 sm:p-16 border-4 border-dashed rounded-[3rem] sm:rounded-[5rem] transition-all duration-700 uppercase font-black tracking-[0.5em] sm:tracking-[0.8em] flex flex-col items-center justify-center gap-8 sm:gap-12 hover:-translate-y-4 ${selections[pos.id] === 'abstained' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-950/20 border-slate-800 text-slate-700 hover:text-white hover:border-slate-500'}`}>
                        <div className="relative">
                            <span className="text-6xl sm:text-9xl filter grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-125 transform group-hover:-rotate-12 block">🕊️</span>
                            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <span className="text-xs sm:text-lg">Abstain Ballot</span>
                    </button>
                </div>

                <div className="flex gap-4 pt-10 sm:pt-20 relative z-10">
                    <button onClick={() => {
                        if (currentPosIdx > 0) setCurrentPosIdx(p => p - 1);
                        else setStep('intro');
                    }} className="px-10 py-4 sm:px-14 sm:py-5 bg-slate-900 border border-white/10 rounded-full text-slate-500 uppercase font-black tracking-[0.3em] text-[10px] sm:text-xs hover:text-white hover:border-white/30 transition-all">
                        ← Back Protocol
                    </button>
                </div>
            </div>
        );
    }

    // --- REVIEW STEP ---
    if (step === 'review') {
        return (
            <div className="px-4 py-20 sm:p-12 max-w-5xl mx-auto space-y-16 sm:space-y-24 animate-fade-in pb-40">
                <div className="text-center space-y-4 sm:space-y-8">
                    <div className="inline-flex items-center gap-4 bg-emerald-500/10 px-8 py-3 rounded-full border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                         <span className="text-[10px] sm:text-[12px] font-black text-emerald-400 uppercase tracking-[0.6em]">Session Integrity Audit</span>
                    </div>
                    <h2 className="text-5xl sm:text-8xl font-black text-white uppercase tracking-tighter leading-none">Ballot <span className="text-blue-500">Summary</span></h2>
                    <p className="text-slate-500 text-[10px] sm:text-sm font-black uppercase tracking-[0.4em] sm:tracking-[0.6em]">Verify your cryptographic signature before vault lock</p>
                </div>

                <Card className="!bg-slate-900/80 backdrop-blur-3xl border-white/5 !p-8 sm:!p-16 divide-y divide-white/5 shadow-[0_60px_120px_-20px_rgba(0,0,0,1)] rounded-[3rem] sm:rounded-[4rem]">
                    {positions.map((pos, idx) => {
                        const selectedId = selections[pos.id];
                        const candidate = allCandidates.find(c => c.studentId === selectedId);
                        return (
                            <div key={pos.id} className="py-8 sm:py-12 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-center gap-8 group">
                                <div className="text-center sm:text-left min-w-0">
                                    <h4 className="text-slate-600 font-black text-[10px] sm:text-[12px] uppercase tracking-[0.4em] mb-3 sm:mb-4 flex items-center justify-center sm:justify-start gap-3">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        {pos.title}
                                    </h4>
                                    <p className={`text-3xl sm:text-5xl font-black uppercase tracking-tighter truncate ${selectedId === 'abstained' ? 'text-slate-600' : 'text-white group-hover:text-blue-400 transition-colors'}`}>
                                        {selectedId === 'abstained' ? 'ABSTAINED' : candidate?.studentName || 'PROTOCOL ERROR'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 sm:gap-10">
                                    {selectedId !== 'abstained' && candidate?.studentPhoto && (
                                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] overflow-hidden border-4 border-white/10 group-hover:border-blue-500/50 transition-all duration-500 shadow-2xl group-hover:rotate-3">
                                            <img src={candidate.studentPhoto} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setCurrentPosIdx(positions.indexOf(pos));
                                            setStep('ballot');
                                        }}
                                        className="px-8 py-3.5 sm:px-10 sm:py-4 rounded-full bg-slate-800 text-slate-500 hover:text-white hover:bg-blue-600 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 shadow-xl active:scale-95"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </Card>

                <div className="flex flex-col gap-10 items-center">
                    <div className="p-8 sm:p-12 bg-blue-600/5 rounded-[2.5rem] sm:rounded-[4rem] border-2 border-blue-500/20 text-center max-w-2xl mx-4 shadow-inner relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] sm:text-sm text-blue-400 font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] leading-relaxed relative z-10">
                            Deploying this packet will permanently commit your data to the decentralized school ledger. Access will be strictly read-only after synchronization.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 w-full justify-center px-8">
                        <button onClick={() => setStep('ballot')} className="w-full sm:w-auto px-16 py-6 sm:py-8 bg-slate-900 border border-white/10 rounded-2xl sm:rounded-[3rem] text-slate-500 uppercase font-black tracking-[0.4em] text-xs hover:text-white transition-all shadow-2xl">Return</button>
                        <button onClick={handleSubmitBallot} className="group relative w-full sm:w-auto sm:px-24 py-6 sm:py-8 bg-blue-600 text-white text-xs sm:text-base font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] shadow-[0_30px_70px_-10px_rgba(59,130,246,0.6)] rounded-2xl sm:rounded-[3rem] transition-all hover:scale-[1.05] active:scale-95 overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s]"></div>
                             Commit to Vault 🚀
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- SECURING STEP ---
    if (step === 'securing') {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 space-y-12 sm:space-y-16 bg-[#020617] animate-fade-in fixed inset-0 z-[200]">
                <div className="relative w-56 h-56 sm:w-80 sm:h-80">
                    <div className="absolute inset-0 border-8 sm:border-[12px] border-blue-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-8 sm:border-[12px] border-t-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.3)]"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-7xl sm:text-9xl filter drop-shadow-[0_0_30px_rgba(59,130,246,1)] animate-pulse">🔒</div>
                </div>
                <div className="text-center space-y-6">
                    <p className="text-blue-400 font-mono text-2xl sm:text-4xl uppercase tracking-[0.6em] sm:tracking-[1em] animate-pulse font-black">VAULT SYNCHRONIZATION</p>
                    <p className="text-slate-600 font-mono text-[10px] sm:text-xs uppercase tracking-[0.5em] px-10">Encrypting digital credentials. Establishing secure packet link...</p>
                </div>
                <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden relative border border-white/5">
                    <div className="absolute top-0 left-0 h-full bg-blue-600 animate-[loading_2.5s_ease-in-out_infinite]"></div>
                </div>
                <style>{`
                    @keyframes loading {
                        0% { width: 0; left: 0; }
                        50% { width: 100%; left: 0; }
                        100% { width: 0; left: 100%; }
                    }
                `}</style>
            </div>
        );
    }

    return null;
};

export default VotingFlow;