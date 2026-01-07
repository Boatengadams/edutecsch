import React, { useState, useMemo } from 'react';
import { db, firebase } from '../../services/firebase';
import { UserProfile, ElectionApplication } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { useToast } from '../common/Toast';
import { GoogleGenAI } from '@google/genai';
import { useAuthentication } from '../../hooks/useAuth';

export interface TemplateDef {
    id: string;
    name: string;
    bg: string;
    textColor: string;
    accent: string;
    layout: 'vanguard' | 'auditor' | 'statesman' | 'visionary' | 'impact' | 'legacy' | 'brutalist' | 'editorial' | 'glass' | 'magazine' | 'stencil' | 'futuristic';
}

export const TEMPLATES: TemplateDef[] = [
    { id: 't1', name: 'Mustapha Elite', bg: 'bg-[#042f2e]', textColor: 'text-white', accent: 'bg-emerald-500', layout: 'vanguard' },
    { id: 't2', name: 'Grace Auditor', bg: 'bg-white', textColor: 'text-slate-900', accent: 'bg-orange-500', layout: 'auditor' },
    { id: 't3', name: 'Paul Patriot', bg: 'bg-slate-950', textColor: 'text-white', accent: 'bg-red-600', layout: 'statesman' },
    { id: 't4', name: 'Gallego Glow', bg: 'bg-[#f0f9ff]', textColor: 'text-slate-900', accent: 'bg-blue-600', layout: 'visionary' },
    { id: 't5', name: 'Mustapha Block', bg: 'bg-[#f97316]', textColor: 'text-black', accent: 'bg-red-600', layout: 'impact' },
    { id: 't6', name: 'Classic Dossier', bg: 'bg-[#fafaf9]', textColor: 'text-indigo-950', accent: 'bg-indigo-600', layout: 'legacy' },
    { id: 't7', name: 'Neo-Brutalist', bg: 'bg-yellow-400', textColor: 'text-black', accent: 'bg-black', layout: 'brutalist' },
    { id: 't8', name: 'Vogue Editorial', bg: 'bg-white', textColor: 'text-black', accent: 'bg-slate-200', layout: 'editorial' },
    { id: 't9', name: 'Glass Directive', bg: 'bg-indigo-950', textColor: 'text-white', accent: 'bg-white/10', layout: 'glass' },
    { id: 't10', name: 'The Frontpage', bg: 'bg-zinc-100', textColor: 'text-zinc-950', accent: 'bg-red-700', layout: 'magazine' },
    { id: 't11', name: 'Street Stencil', bg: 'bg-zinc-900', textColor: 'text-white', accent: 'bg-lime-400', layout: 'stencil' },
    { id: 't12', name: 'Cyber Horizon', bg: 'bg-black', textColor: 'text-cyan-400', accent: 'bg-cyan-500', layout: 'futuristic' },
];

const FingerprintPattern = () => (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" fill="currentColor">
        <path d="M100,20c-44.1,0-80,35.9-80,80s35.9,80,80,80s80-35.9,80-80S144.1,20,100,20z M100,150c-27.6,0-50-22.4-50-50s22.4-50,50-50s50,22.4,50,50S127.6,150,100,150z" />
    </svg>
);

const CampaignDesigner: React.FC<{ userProfile: UserProfile, application: ElectionApplication }> = ({ userProfile, application }) => {
    const { showToast } = useToast();
    const { schoolSettings } = useAuthentication();
    const [slogan, setSlogan] = useState(application.slogan || '');
    const [templateId, setTemplateId] = useState(application.templateId || 't1');
    const [isSaving, setIsSaving] = useState(false);
    const [isAiGenMode, setIsAiGenMode] = useState(false);
    const [aiConcepts, setAiConcepts] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const activeIndex = useMemo(() => TEMPLATES.findIndex(t => t.id === templateId), [templateId]);
    const activeTemplate = TEMPLATES[activeIndex] || TEMPLATES[0];

    const navigate = (direction: 'next' | 'prev') => {
        let nextIdx = direction === 'next' ? activeIndex + 1 : activeIndex - 1;
        if (nextIdx >= TEMPLATES.length) nextIdx = 0;
        if (nextIdx < 0) nextIdx = TEMPLATES.length - 1;
        setTemplateId(TEMPLATES[nextIdx].id);
    };

    const handleSave = async (aiImgUrl?: string) => {
        setIsSaving(true);
        try {
            const updateData: any = { slogan, templateId };
            if (aiImgUrl) updateData.customPosterUrl = aiImgUrl;
            await db.collection('electionApplications').doc(application.id).update(updateData);
            showToast("Global billboard synchronized! 🚀", "success");
        } catch (e) { 
            console.error("Save Error:", e);
            showToast("Sync Error: Please ensure you are logged in.", "error"); 
        } finally { setIsSaving(false); }
    };

    const renderPosterContent = () => {
        const t = activeTemplate;
        const names = userProfile.name.split(' ');
        const firstName = names[0].toUpperCase();
        const lastName = names.slice(1).join(' ').toUpperCase();
        const logo = schoolSettings?.schoolLogoUrl;

        return (
            <div className={`relative h-full w-full flex flex-col overflow-hidden ${t.bg} transition-all duration-700 font-sans shadow-inner group/canvas`}>
                
                {/* 1. VANGUARD */}
                {t.layout === 'vanguard' && (
                    <div className="h-full flex flex-col relative bg-gradient-to-br from-[#022c22] via-[#064e3b] to-black">
                        <div className="absolute -bottom-10 -right-10 w-40 sm:w-[400px] h-40 sm:h-[400px] border-[20px] sm:border-[50px] border-emerald-500/10 rounded-full blur-sm"></div>
                        {logo && (
                            <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-40 bg-white rounded-full px-3 sm:px-5 py-1 sm:py-2.5 flex items-center gap-2 sm:gap-3 shadow-2xl border border-white/40 backdrop-blur-md">
                                <img src={logo} className="w-6 h-6 sm:w-10 sm:h-10 object-contain" />
                                <span className="text-[6px] sm:text-[9px] font-black text-slate-800 uppercase tracking-tighter leading-none hidden sm:inline">{schoolSettings?.schoolName}</span>
                            </div>
                        )}
                        <div className="p-6 sm:p-12 flex-grow relative z-10 flex flex-col">
                            <span className="text-emerald-400 font-kalam text-3xl sm:text-6xl mb-2 sm:mb-4 italic drop-shadow-md">Vote</span>
                            <h1 className="text-4xl sm:text-8xl font-black text-white leading-[0.8] sm:leading-[0.75] tracking-tighter uppercase mb-4 sm:mb-10 font-heading">
                                {firstName}<br/><span className="text-emerald-300 drop-shadow-2xl">{lastName}</span>
                            </h1>
                            <div className="bg-emerald-600/80 backdrop-blur-xl px-4 sm:px-8 py-2 sm:py-5 rounded-xl sm:rounded-[2rem] border-t-2 border-emerald-400/50 self-start shadow-3xl">
                                <p className="text-white font-black text-xs sm:text-2xl uppercase tracking-tighter leading-none">{application.positionTitle}</p>
                            </div>
                        </div>
                        <div className="relative h-[40%] sm:h-[48%] w-full flex justify-center items-end overflow-hidden">
                            <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                            {userProfile.photoURL ? (
                                <img src={userProfile.photoURL} className="h-[120%] w-auto object-cover relative z-0 contrast-110 saturate-110 drop-shadow-[0_0_40px_rgba(0,0,0,0.5)]" />
                            ) : <div className="h-full w-full bg-emerald-950" />}
                        </div>
                        <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-12 z-20 pr-4">
                             <p className="text-white font-black text-[8px] sm:text-[12px] uppercase tracking-[0.4em] opacity-60">MOTTO:</p>
                             <p className="text-white font-black text-sm sm:text-3xl uppercase tracking-tighter italic border-l-2 sm:border-l-4 border-red-500 pl-3 sm:pl-4 line-clamp-2">{slogan || 'EXCELLENCE'}</p>
                        </div>
                    </div>
                )}

                {/* Simplified layouts for other modes on mobile */}
                {t.layout !== 'vanguard' && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-24 h-24 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-white shadow-xl mb-4 sm:mb-8">
                             {userProfile.photoURL ? <img src={userProfile.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                        </div>
                        <h2 className={`text-3xl sm:text-6xl font-black uppercase tracking-tighter leading-none mb-2 ${t.textColor}`}>{userProfile.name}</h2>
                        <div className={`mt-4 px-4 py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest ${t.accent} text-white`}>FOR {application.positionTitle}</div>
                        <p className={`mt-6 italic font-medium text-sm sm:text-xl line-clamp-3 ${t.textColor} opacity-80`}>"{slogan || 'Leadership that delivers.'}"</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 sm:gap-12 bg-slate-950 animate-fade-in overflow-y-auto custom-scrollbar px-4 sm:px-8 py-6 sm:py-12">
            <div className="flex-grow space-y-6 sm:space-y-10">
                <div className="flex flex-col items-center sm:items-end justify-between gap-6 text-center sm:text-left">
                    <div className="w-full">
                        <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none">Campaign <span className="text-blue-500">Studio</span></h2>
                        <p className="text-slate-500 text-[8px] sm:text-[11px] font-black uppercase tracking-[0.4em] sm:tracking-[0.8em] mt-3 sm:mt-4">Signature Elite V12.0</p>
                    </div>
                    <div className="flex bg-slate-900 p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5 w-full sm:w-auto">
                        <button onClick={() => setIsAiGenMode(false)} className={`flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${!isAiGenMode ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Vault</button>
                        <button onClick={() => setIsAiGenMode(true)} className={`flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${isAiGenMode ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Neural Render ✨</button>
                    </div>
                </div>

                <div className="relative w-full max-w-xl mx-auto aspect-[3/4] group/container">
                    {!isAiGenMode && (
                        <div className="absolute inset-x-0 -bottom-16 sm:inset-auto sm:top-1/2 sm:-translate-y-1/2 sm:-left-16 sm:-right-16 flex justify-center sm:block gap-4 z-[90]">
                            <button 
                                onClick={() => navigate('prev')} 
                                className="p-4 sm:p-6 bg-slate-900/90 sm:absolute sm:left-0 sm:top-0 backdrop-blur-3xl rounded-full sm:rounded-[2rem] border border-white/10 text-white hover:bg-blue-600 transition-all shadow-3xl sm:opacity-0 sm:group-hover/container:opacity-100"
                                title="Previous"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 sm:w-8 sm:h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                            </button>
                            <button 
                                onClick={() => navigate('next')} 
                                className="p-4 sm:p-6 bg-slate-900/90 sm:absolute sm:right-0 sm:top-0 backdrop-blur-3xl rounded-full sm:rounded-[2rem] border border-white/10 text-white hover:bg-blue-600 transition-all shadow-3xl sm:opacity-0 sm:group-hover/container:opacity-100"
                                title="Next"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 sm:w-8 sm:h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                            </button>
                        </div>
                    )}

                    <div className="w-full h-full rounded-[2.5rem] sm:rounded-[5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] border-8 sm:border-[20px] border-slate-900 bg-slate-900 flex items-center justify-center transition-all duration-1000">
                        {!isAiGenMode ? renderPosterContent() : (
                            aiConcepts.length > 0 ? (
                                <div className="w-full h-full relative group/render">
                                    <img src={aiConcepts[0]} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-8 sm:p-16 text-center gap-6 sm:gap-8">
                                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-blue-600 flex items-center justify-center text-4xl sm:text-6xl shadow-3xl">🎨</div>
                                        <Button onClick={() => handleSave(aiConcepts[0])} className="w-full py-4 sm:py-6 text-[10px] sm:text-[12px] font-black uppercase tracking-widest shadow-[0_20px_40px_rgba(59,130,246,0.3)]">Deploy Final Asset 🚀</Button>
                                        <button onClick={() => setAiConcepts([])} className="text-slate-400 text-[10px] uppercase font-bold hover:text-white transition-colors">Start Over</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-8 sm:p-20 space-y-8 sm:space-y-16">
                                    <div className="w-24 h-24 sm:w-44 sm:h-44 bg-blue-500/10 rounded-[2rem] sm:rounded-[5rem] flex items-center justify-center text-5xl sm:text-8xl mx-auto shadow-inner border border-blue-500/20 rotate-12">🎨</div>
                                    <div className="space-y-3 sm:space-y-4">
                                        <h4 className="text-white font-black text-2xl sm:text-4xl uppercase tracking-tighter">AI Studio</h4>
                                        <p className="text-slate-500 text-[9px] sm:text-sm uppercase tracking-[0.3em] font-medium max-w-sm mx-auto opacity-60">Synthesizing ultra-high fidelity campaign materials.</p>
                                    </div>
                                    <Button onClick={async () => {
                                        setIsGenerating(true);
                                        try {
                                            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                                            const res = await ai.models.generateContent({
                                                model: 'gemini-2.5-flash-image',
                                                contents: [{ text: `Student election poster for ${userProfile.name} running for ${application.positionTitle}. Bold, modern, political branding, 4k.` }]
                                            });
                                            const data = res.candidates[0].content.parts.find(p => p.inlineData)?.inlineData.data;
                                            if (data) setAiConcepts([`data:image/png;base64,${data}`]);
                                        } finally { setIsGenerating(false); }
                                    }} disabled={isGenerating} className="w-full py-6 sm:py-8 text-[9px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xl rounded-2xl sm:rounded-[2.5rem]">
                                        {isGenerating ? <Spinner /> : 'Launch Engine'}
                                    </Button>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            <aside className="w-full lg:w-[420px] xl:w-[480px] space-y-6 sm:space-y-8 flex flex-col z-10 pt-12 lg:pt-0">
                <Card className="!bg-slate-900/40 border-white/5 !p-6 sm:!p-12 flex-grow flex flex-col shadow-3xl backdrop-blur-3xl">
                    {!isAiGenMode ? (
                        <>
                            <h3 className="text-[10px] sm:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] sm:tracking-[0.8em] mb-6 sm:mb-12 flex items-center gap-4 sm:gap-5">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                Templates: {activeIndex + 1} / {TEMPLATES.length}
                            </h3>
                            <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-8 sm:mb-12">
                                {TEMPLATES.map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => setTemplateId(t.id)} 
                                        className={`p-1.5 sm:p-3.5 rounded-xl sm:rounded-3xl border-2 transition-all group ${templateId === t.id ? 'bg-blue-600/20 border-blue-400 scale-105' : 'bg-slate-800 border-white/5 hover:bg-slate-700'}`}
                                    >
                                        <div className={`aspect-square rounded-lg sm:rounded-2xl ${t.bg} border border-white/10`}></div>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                         <div className="space-y-6 sm:space-y-10">
                            <h3 className="text-[10px] sm:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] sm:tracking-[0.8em] mb-6">Neural Outputs</h3>
                            {aiConcepts.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                                    {aiConcepts.map((img, i) => (
                                        <div key={i} className="aspect-[3/4] rounded-2xl sm:rounded-[2.5rem] overflow-hidden border-2 border-white/5 hover:border-blue-500 cursor-pointer transition-all shadow-3xl" onClick={() => handleSave(img)}>
                                            <img src={img} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 sm:py-24 text-center">
                                    <p className="text-[9px] font-black uppercase text-slate-700 tracking-widest">Waiting for Render...</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-px bg-white/5 my-8 sm:my-14"></div>

                    <div className="space-y-6 sm:space-y-10">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[10px] sm:text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] sm:tracking-[0.8em]">Core Declaration</h3>
                            <button onClick={async () => {
                                setIsGenerating(true);
                                try {
                                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                                    const res = await ai.models.generateContent({ 
                                        model: 'gemini-3-flash-preview', 
                                        contents: `Generate 1 campaign slogan for ${userProfile.name} running for ${application.positionTitle}. Max 6 words.` 
                                    });
                                    setSlogan(res.text.replace(/"/g, ''));
                                } catch(e) {} finally { setIsGenerating(false); }
                            }} className="text-blue-400 text-[9px] sm:text-[11px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2">
                                ✨ AI Draft
                            </button>
                        </div>
                        <textarea 
                            value={slogan} 
                            onChange={e => setSlogan(e.target.value)} 
                            placeholder="Type your vision statement..." 
                            className="w-full h-24 sm:h-40 bg-slate-950 border border-white/10 rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 text-sm sm:text-lg text-white outline-none focus:ring-2 ring-blue-500/10 resize-none shadow-inner"
                        />
                    </div>
                    
                    {!isAiGenMode && (
                        <Button onClick={() => handleSave()} disabled={isSaving} className="w-full mt-8 sm:mt-16 py-5 sm:py-8 font-black uppercase tracking-widest text-[10px] sm:text-[12px] rounded-2xl sm:rounded-[3rem] shadow-2xl">
                            {isSaving ? 'Syncing...' : 'Sync to Billboard 🚀'}
                        </Button>
                    )}
                </Card>
            </aside>
        </div>
    );
};

export default CampaignDesigner;