import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ElectionApplication, ElectionPosition, UserProfile } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import { TEMPLATES } from './CampaignDesigner';

interface CampaignWallProps {
    userProfile: UserProfile;
    positions: ElectionPosition[];
}

const CampaignWall: React.FC<CampaignWallProps> = ({ userProfile, positions }) => {
    const [candidates, setCandidates] = useState<ElectionApplication[]>([]);
    const [selectedCand, setSelectedCand] = useState<ElectionApplication | null>(null);
    const [filterPos, setFilterPos] = useState<string>('all');

    useEffect(() => {
        const unsub = db.collection('electionApplications')
            .where('status', '==', 'approved')
            .onSnapshot(snap => {
                setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ElectionApplication)));
            }, err => {
                if (err.code !== 'permission-denied') {
                    console.error("Wall signal lost:", err);
                }
            });
        return () => unsub();
    }, []);

    const filteredCandidates = filterPos === 'all' 
        ? candidates 
        : candidates.filter(c => c.positionId === filterPos);

    return (
        <div className="space-y-12 sm:space-y-20 animate-fade-in pb-40 px-4 sm:px-8 relative">
            {/* Gallery Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-10 sm:pt-16">
                <div className="text-center md:text-left space-y-2">
                    <h2 className="text-5xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-none">The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Arena</span></h2>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.6em] sm:tracking-[0.8em]">Live Billboard // Active Candidates</p>
                </div>
                
                <div className="w-full md:w-auto relative group">
                    <div className="absolute inset-0 bg-blue-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <select 
                        value={filterPos} 
                        onChange={e => setFilterPos(e.target.value)}
                        className="relative z-10 w-full md:w-[320px] bg-slate-900 border-2 border-white/5 rounded-[2rem] px-8 py-5 text-[11px] font-black uppercase tracking-widest text-blue-400 outline-none hover:border-blue-500/40 transition-all cursor-pointer shadow-3xl appearance-none"
                    >
                        <option value="all">Display All Divisions</option>
                        {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* Poster Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 sm:gap-16">
                {filteredCandidates.map(cand => {
                    const template = TEMPLATES.find(t => t.id === cand.templateId) || TEMPLATES[0];
                    const customPoster = (cand as any).customPosterUrl;

                    return (
                        <div 
                            key={cand.id} 
                            onClick={() => setSelectedCand(cand)}
                            className="group relative aspect-[3/4] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden border-[6px] border-slate-900 cursor-pointer transition-all duration-700 hover:scale-[1.04] hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.9)] hover:border-blue-500/30 animate-fade-in-up shadow-3xl"
                        >
                            {/* Visual Asset Layer */}
                            {customPoster ? (
                                <div className="h-full w-full relative">
                                    <img src={customPoster} className="w-full h-full object-cover transition-transform duration-[4s] ease-out group-hover:scale-125" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                    <div className="absolute bottom-10 inset-x-8 z-10 text-center">
                                        <h4 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">{cand.studentName}</h4>
                                        <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 py-1.5 rounded-full backdrop-blur-md">{cand.positionTitle}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className={`w-full h-full ${template.bg} p-8 sm:p-12 flex flex-col items-center justify-center text-center transition-all duration-700`}>
                                     <div className={`w-32 h-32 sm:w-44 sm:h-44 rounded-[2rem] sm:rounded-[3rem] overflow-hidden border-4 sm:border-8 ${template.accent.split(' ')[0]} mb-8 sm:mb-12 transition-all duration-700 group-hover:rotate-6 group-hover:scale-110 shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}>
                                        {cand.studentPhoto ? <img src={cand.studentPhoto} className="w-full h-full object-cover contrast-110 saturate-125" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-5xl font-black text-slate-700">?</div>}
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <h4 className={`text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none ${template.textColor}`}>{cand.studentName}</h4>
                                        <div className={`h-1 w-12 mx-auto rounded-full ${template.accent} opacity-40 group-hover:w-20 group-hover:opacity-100 transition-all`}></div>
                                        <p className={`text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] ${template.textColor} opacity-60`}>{cand.positionTitle}</p>
                                    </div>
                                    <p className={`text-sm sm:text-lg italic font-bold ${template.textColor} line-clamp-3 px-4 leading-snug drop-shadow-sm`}>"{cand.slogan || 'The future belongs to the visionary.'}"</p>
                                </div>
                            )}

                            {/* ID Badge */}
                            <div className="absolute top-6 sm:top-8 left-6 sm:left-8 z-10">
                                <span className="bg-slate-900/80 backdrop-blur-xl text-white text-[9px] font-black px-4 py-2 rounded-2xl uppercase tracking-[0.2em] shadow-2xl border border-white/10">
                                    AUTH CODE: {cand.id.slice(-4).toUpperCase()}
                                </span>
                            </div>

                            {/* Interactive Overlay */}
                            <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8 sm:p-12 z-20">
                                <button className="w-full py-5 bg-white text-blue-600 rounded-[2rem] shadow-3xl uppercase font-black text-xs tracking-[0.4em] transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500 active:scale-95">
                                    Open Manifesto
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredCandidates.length === 0 && (
                <div className="py-40 sm:py-64 text-center space-y-10">
                    <div className="relative inline-block">
                        <span className="text-8xl sm:text-[12rem] block animate-pulse opacity-10">🛰️</span>
                        <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full animate-ping"></div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm sm:text-2xl font-black uppercase tracking-[1em] text-slate-800">Searching Archive...</p>
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No active transmissions in this sector.</p>
                    </div>
                </div>
            )}

            {/* Immersive Detail Modal */}
            {selectedCand && (
                <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-[150] flex items-center justify-center p-2 sm:p-10 animate-fade-in">
                    <Card className="w-full max-w-7xl max-h-[90vh] !p-0 overflow-hidden !bg-slate-900 border-2 border-white/5 shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] flex flex-col lg:row rounded-[3rem] sm:rounded-[5rem]">
                        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                            
                            {/* Profile Sidebar */}
                            <div className={`w-full lg:w-[450px] xl:w-[550px] relative flex flex-col items-center justify-center p-12 sm:p-20 text-center border-b lg:border-b-0 lg:border-r border-white/10 flex-shrink-0 bg-[#050b1a]`}>
                                <div className="absolute inset-0 z-0 overflow-hidden">
                                    {(selectedCand as any).customPosterUrl ? (
                                        <img src={(selectedCand as any).customPosterUrl} className="w-full h-full object-cover blur-[80px] opacity-40 scale-150" />
                                    ) : (
                                        <div className={`w-full h-full ${TEMPLATES.find(t => t.id === selectedCand.templateId)?.bg || 'bg-slate-950'} opacity-20 blur-3xl`} />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#050b1a] via-transparent to-transparent"></div>
                                </div>
                                
                                <button 
                                    onClick={() => setSelectedCand(null)} 
                                    className="absolute top-8 left-8 sm:top-12 sm:left-12 text-white/30 hover:text-white transition-all hover:rotate-90 z-50 p-4 bg-white/5 rounded-full border border-white/10 shadow-inner group"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                
                                <div className="relative z-10 w-full space-y-10">
                                    <div className="w-48 h-48 sm:w-80 sm:h-80 rounded-[3rem] sm:rounded-[5rem] overflow-hidden border-8 border-white/10 shadow-3xl mx-auto ring-1 ring-blue-500/20 transform hover:scale-105 transition-transform duration-700">
                                        {selectedCand.studentPhoto ? <img src={selectedCand.studentPhoto} className="w-full h-full object-cover contrast-110" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-5xl sm:text-9xl font-black text-slate-700">?</div>}
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-[0.8]">{selectedCand.studentName}</h3>
                                        <div className="h-1.5 w-20 sm:w-32 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full shadow-[0_0_20px_blue]"></div>
                                        <p className="text-blue-500 text-xs sm:text-xl font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] opacity-90">{selectedCand.positionTitle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Manifesto Content */}
                            <div className="flex-grow p-10 sm:p-20 lg:p-24 overflow-y-auto space-y-12 sm:space-y-20 bg-slate-900/50 custom-scrollbar relative">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-[20rem] font-black select-none pointer-events-none uppercase tracking-tighter">Manifesto</div>
                                
                                 <div className="space-y-6 sm:space-y-8 relative z-10">
                                    <h4 className="text-[10px] sm:text-[12px] font-black text-blue-500 uppercase tracking-[0.6em] sm:tracking-[1em] border-l-4 border-blue-600 pl-6">Core Mandate & Vision</h4>
                                    <p className="text-3xl sm:text-6xl font-black text-white leading-[0.95] tracking-tighter italic">"{selectedCand.slogan || 'Transformative Leadership through Collective Action.'}"</p>
                                 </div>
                                 
                                 <div className="h-px w-full bg-white/10 relative z-10"></div>
                                 
                                 <div className="space-y-8 sm:space-y-12 relative z-10 pb-10">
                                    <h4 className="text-[10px] sm:text-[12px] font-black text-slate-600 uppercase tracking-[0.6em] sm:tracking-[1em] border-l-4 border-slate-700 pl-6">Legislative Proposal</h4>
                                    <div className="text-slate-300 leading-relaxed sm:leading-[1.7] text-lg sm:text-3xl font-medium prose-styles max-w-4xl">
                                        {selectedCand.manifesto || "Protocol expansion documentation is currently undergoing final verification. Strategy briefing will follow shortly."}
                                    </div>
                                 </div>

                                 <div className="pt-10 sm:pt-20 flex flex-col sm:flex-row gap-6 relative z-10 sticky bottom-0">
                                    <Button onClick={() => setSelectedCand(null)} className="flex-grow !py-6 sm:!py-8 rounded-[2rem] sm:rounded-[3rem] uppercase font-black tracking-[0.4em] text-[10px] sm:text-sm shadow-[0_30px_70px_rgba(59,130,246,0.3)] bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all">Close Digital Vault</Button>
                                    <button className="px-12 sm:px-16 py-6 sm:py-8 bg-slate-800 hover:bg-slate-700 text-white rounded-[2rem] sm:rounded-[3rem] text-[10px] sm:text-sm font-black uppercase tracking-widest border border-white/10 shadow-2xl transition-all hover:scale-[1.02] hidden sm:flex items-center justify-center">Download PDF</button>
                                 </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CampaignWall;