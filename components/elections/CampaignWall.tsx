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
        <div className="space-y-8 sm:space-y-12 animate-fade-in pb-32 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6">
                <div className="text-center md:text-left">
                    <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">Billboard <span className="text-blue-500">Live</span></h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] mt-2">Active Candidates // Visual Feed</p>
                </div>
                <select 
                    value={filterPos} 
                    onChange={e => setFilterPos(e.target.value)}
                    className="w-full md:w-auto bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-blue-400 outline-none hover:border-blue-500 transition-colors"
                >
                    <option value="all">Global Display</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-12">
                {filteredCandidates.map(cand => {
                    const template = TEMPLATES.find(t => t.id === cand.templateId) || TEMPLATES[0];
                    const customPoster = (cand as any).customPosterUrl;

                    return (
                        <div 
                            key={cand.id} 
                            onClick={() => setSelectedCand(cand)}
                            className="group relative aspect-[3/4] rounded-[2rem] sm:rounded-[3rem] overflow-hidden border-4 border-slate-800 cursor-pointer transition-all duration-700 hover:scale-[1.03] sm:hover:scale-[1.05] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] hover:border-blue-500/50"
                        >
                            {customPoster ? (
                                <img src={customPoster} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
                            ) : (
                                <div className={`w-full h-full ${template.bg} p-6 sm:p-8 flex flex-col items-center justify-center text-center`}>
                                     <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-4 ${template.accent.split(' ')[0]} mb-4 sm:mb-6 transition-transform group-hover:rotate-6 shadow-xl`}>
                                        {cand.studentPhoto ? <img src={cand.studentPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl font-black text-slate-600">?</div>}
                                    </div>
                                    <h4 className={`text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-1 ${template.textColor}`}>{cand.studentName}</h4>
                                    <p className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-3 sm:mb-4 ${template.textColor} opacity-60`}>{cand.positionTitle}</p>
                                    <p className={`text-xs sm:text-sm italic font-medium ${template.textColor} line-clamp-3 px-2`}>"{cand.slogan || 'The future starts today.'}"</p>
                                </div>
                            )}

                            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
                                <span className="bg-blue-600 text-white text-[7px] sm:text-[8px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                                    ID #{cand.id.slice(-4).toUpperCase()}
                                </span>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 sm:p-8">
                                <Button size="sm" className="w-full !rounded-xl sm:!rounded-2xl shadow-2xl uppercase font-black text-[9px] sm:text-xs">Manifesto</Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredCandidates.length === 0 && (
                <div className="py-24 sm:py-40 text-center">
                    <span className="text-6xl sm:text-8xl block mb-6 animate-pulse opacity-20">📡</span>
                    <p className="text-[10px] sm:text-sm font-black uppercase tracking-widest sm:tracking-[1em] text-slate-700">Waiting for transmission...</p>
                </div>
            )}

            {selectedCand && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[150] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                    <Card className="w-full max-w-6xl max-h-[95vh] !p-0 overflow-hidden !bg-slate-900 border-white/5 shadow-3xl flex flex-col lg:flex-row">
                        <div className={`w-full lg:w-[400px] xl:w-[480px] aspect-[4/3] sm:aspect-[3/4] lg:aspect-auto relative flex flex-col items-center justify-center p-8 sm:p-12 text-center border-b lg:border-b-0 lg:border-r border-white/5 flex-shrink-0`}>
                             <div className="absolute inset-0 z-0">
                                {(selectedCand as any).customPosterUrl ? (
                                    <img src={(selectedCand as any).customPosterUrl} className="w-full h-full object-cover blur-xl opacity-30" />
                                ) : (
                                    <div className={`w-full h-full ${TEMPLATES.find(t => t.id === selectedCand.templateId)?.bg || 'bg-slate-950'} opacity-20`} />
                                )}
                             </div>
                             <button onClick={() => setSelectedCand(null)} className="absolute top-4 sm:top-8 left-4 sm:left-8 text-white/40 hover:text-white transition-all hover:rotate-90 z-20 p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                             <div className="relative z-10 w-full">
                                <div className="w-32 h-32 sm:w-56 sm:h-56 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden border-4 sm:border-8 border-white/10 shadow-3xl mb-6 sm:mb-8 mx-auto">
                                    {selectedCand.studentPhoto ? <img src={selectedCand.studentPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl sm:text-7xl font-black">?</div>}
                                </div>
                                <h3 className="text-2xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2 sm:mb-3">{selectedCand.studentName}</h3>
                                <div className="h-1 w-12 sm:w-16 bg-blue-500 mx-auto rounded-full mb-3 sm:mb-4"></div>
                                <p className="text-blue-400 text-[10px] sm:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] opacity-80 truncate">{selectedCand.positionTitle}</p>
                             </div>
                        </div>
                        <div className="flex-grow p-6 sm:p-10 lg:p-16 xl:p-24 overflow-y-auto space-y-8 sm:space-y-12 bg-slate-900/30 custom-scrollbar">
                             <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-[9px] sm:text-[11px] font-black text-blue-500 uppercase tracking-[0.5em] sm:tracking-[0.8em]">Core Vision</h4>
                                <p className="text-xl sm:text-4xl font-black text-white leading-tight italic tracking-tight">"{selectedCand.slogan || 'Excellence in Action.'}"</p>
                             </div>
                             <div className="h-px w-full bg-white/10"></div>
                             <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-[9px] sm:text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] sm:tracking-[0.8em]">Manifesto</h4>
                                <div className="text-slate-400 leading-relaxed sm:leading-loose text-sm sm:text-xl whitespace-pre-wrap font-medium">
                                    {selectedCand.manifesto || "Roadmap documentation finalized soon."}
                                </div>
                             </div>
                             <div className="pt-6 sm:pt-12 flex flex-col sm:flex-row gap-4">
                                <Button onClick={() => setSelectedCand(null)} className="flex-grow !py-4 sm:!py-6 rounded-xl sm:rounded-2xl uppercase font-black tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs shadow-2xl shadow-blue-600/20">Close Modal</Button>
                                <Button variant="secondary" className="px-10 border-white/10 hover:bg-white/5 py-4 sm:py-6 text-[10px] uppercase font-black tracking-widest hidden sm:flex">Export Vision</Button>
                             </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CampaignWall;