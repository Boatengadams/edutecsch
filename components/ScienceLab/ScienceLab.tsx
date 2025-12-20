
import React, { useState } from 'react';
import { UserProfile, LabType } from '../../types';
import PhysicsLab from './PhysicsLab';
import ChemistryLab from './ChemistryLab';
import BiologyLab from './BiologyLab';
import LabAssistant from './LabAssistant';
import WeatherWidget from '../common/WeatherWidget';

interface ScienceLabProps {
    userProfile: UserProfile;
}

const Classroom3D: React.FC<{ children: React.ReactNode; label: string; color: string }> = ({ children, label, color }) => (
    <div className="relative w-full h-full perspective-2000 overflow-hidden bg-[#e2e8f0] group select-none">
        <style>{`
            @keyframes microParallax {
                0% { transform: translateX(-15px) translateY(5px) scale(1.03); }
                50% { transform: translateX(15px) translateY(-5px) scale(1.03); }
                100% { transform: translateX(-15px) translateY(5px) scale(1.03); }
            }
            .animate-studio {
                animation: microParallax 30s ease-in-out infinite;
                transform-style: preserve-3d;
                will-change: transform;
            }
            .perspective-2000 { perspective: 2000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .glass-shine {
                background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%);
            }
        `}</style>

        {/* Studio-Quality 3D Environment */}
        <div className="absolute inset-0 animate-studio pointer-events-none">
            
            {/* Ceiling with High-Precision LED Panels */}
            <div className="absolute top-0 left-[-20%] right-[-20%] h-[40%] bg-[#f8fafc] origin-top transform rotateX(-90deg) translateZ(300px)"
                 style={{ 
                     backgroundImage: `
                        linear-gradient(to bottom, #ffffff, #e2e8f0),
                        repeating-linear-gradient(90deg, transparent, transparent 199px, rgba(0,0,0,0.03) 200px)
                     `
                 }}>
                 <div className="grid grid-cols-4 gap-32 p-20 opacity-100">
                    {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="h-48 bg-white shadow-[0_0_100px_rgba(255,255,255,1),inset_0_0_30px_rgba(59,130,246,0.05)] rounded-sm border border-slate-200 ring-1 ring-white"></div>
                    ))}
                 </div>
            </div>

            {/* Back Wall - Professional Research Interior */}
            <div className="absolute inset-0 bg-white flex flex-col items-center border-b-[4px] border-slate-300 translateZ(-500px) scale(1.5)">
                {/* Upper Modular Cabinetry with Glass Fronts */}
                <div className="w-full h-[40%] grid grid-cols-6 gap-1 p-6 bg-slate-100/50 border-b border-slate-200">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="h-full bg-white border border-slate-300 shadow-md relative overflow-hidden group/cabinet">
                            <div className="absolute inset-0 glass-shine opacity-60"></div>
                            {/* Visual internal shelving */}
                            <div className="absolute top-1/4 left-2 right-2 h-px bg-slate-200 shadow-sm"></div>
                            <div className="absolute top-2/4 left-2 right-2 h-px bg-slate-200 shadow-sm"></div>
                            <div className="absolute top-3/4 left-2 right-2 h-px bg-slate-200 shadow-sm"></div>
                            {/* Steel Handle */}
                            <div className="absolute bottom-6 right-3 w-1.5 h-10 bg-gradient-to-r from-slate-400 to-slate-200 rounded-full shadow-sm"></div>
                        </div>
                    ))}
                </div>

                {/* Midground Interior: Fume Hood, Sinks, Gas Valves */}
                <div className="w-full h-[40%] bg-white flex items-end justify-between px-16 pb-4">
                     {/* Fume Hood Left */}
                     <div className="w-1/4 h-full bg-slate-50 border-x border-t border-slate-300 rounded-t-xl shadow-inner relative flex flex-col items-center pt-4">
                        <div className="w-[85%] h-3/4 bg-blue-50/20 border border-blue-200 rounded-lg shadow-inner relative overflow-hidden">
                             <div className="absolute top-2 left-4 text-[10px] font-black text-blue-400/30 uppercase tracking-widest">Hood 01-A</div>
                             <div className="absolute inset-0 glass-shine opacity-20"></div>
                        </div>
                        <div className="w-full mt-auto h-8 bg-slate-200 border-t border-slate-300 flex items-center justify-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                        </div>
                     </div>

                     {/* Central Bench Backdrop (Sinks & Taps) */}
                     <div className="flex-grow h-full flex items-end justify-around px-10">
                        {Array.from({length: 3}).map((_, i) => (
                            <div key={i} className="flex flex-col items-center">
                                {/* Chrome Faucet SVG */}
                                <svg width="40" height="60" viewBox="0 0 40 60" className="opacity-60 drop-shadow-md">
                                    <path d="M10 60 L10 20 Q10 5 25 5 L35 10" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round"/>
                                    <rect x="5" y="50" width="10" height="10" rx="2" fill="#64748b"/>
                                </svg>
                                <div className="w-24 h-4 bg-slate-200 rounded-t-lg border-x border-t border-slate-300"></div>
                            </div>
                        ))}
                     </div>

                     {/* Right Side Tech Wall */}
                     <div className="w-1/5 h-3/4 bg-slate-100 border border-slate-300 rounded-lg p-4 flex flex-col gap-3">
                        <div className="w-full h-2 bg-slate-300 rounded-full opacity-50"></div>
                        <div className="w-full h-8 bg-white border border-slate-200 rounded shadow-sm flex items-center justify-center text-[8px] font-bold text-slate-400">DATA TERM</div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <div className="h-6 bg-blue-500/20 rounded border border-blue-400/30"></div>
                            <div className="h-6 bg-slate-300 rounded"></div>
                        </div>
                     </div>
                </div>

                {/* Base Cabinetry */}
                <div className="w-full h-[20%] grid grid-cols-12 gap-px bg-slate-300 p-0.5">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="h-full bg-white relative group/base">
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-slate-200 rounded-full group-hover/base:bg-blue-400 transition-colors"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hyper-Reflective Floor */}
            <div className="absolute bottom-0 left-[-50%] right-[-50%] h-[100%] bg-[#f1f5f9] origin-bottom transform rotateX(90deg) translateZ(-500px)"
                 style={{ 
                     backgroundImage: `
                        linear-gradient(to top, rgba(255,255,255,1), rgba(241, 245, 249, 0.4)),
                        repeating-linear-gradient(0deg, transparent, transparent 99px, rgba(203, 213, 225, 0.2) 100px),
                        repeating-linear-gradient(90deg, transparent, transparent 99px, rgba(203, 213, 225, 0.2) 100px)
                     `
                 }}>
                 {/* Intense Ceiling Light Reflections */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.6)_0%,transparent_80%)]"></div>
                 <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #fff 2px, transparent 2px)', backgroundSize: '100px 100px'}}></div>
            </div>

            {/* THE FOREGROUND BENCH - Professional Ceramic Top */}
            <div className="absolute bottom-0 left-[-20%] right-[-20%] h-[45%] bg-white border-t-[5px] border-slate-200 shadow-[0_-30px_80px_rgba(59,130,246,0.15),0_-10px_20px_rgba(0,0,0,0.02)] transform rotateX(5deg)">
                 {/* High Gloss Finish Layer */}
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-slate-100/50 pointer-events-none"></div>
                 {/* Sharp Beveled Edge */}
                 <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-slate-300/40 to-transparent border-t border-white/80"></div>
                 
                 {/* BENCH PROPS (High Realism Objects) */}
                 
                 {/* 1. Professional Compound Microscope (Left) */}
                 <div className="absolute left-[15%] top-[-140px] w-48 h-[350px] transform rotateY(15deg) scale(0.9)">
                    <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-[20px_40px_30px_rgba(0,0,0,0.2)]">
                        <path d="M20 140 L80 140 L75 130 L25 130 Z" fill="#e2e8f0" stroke="#94a3b8" /> {/* Base */}
                        <path d="M30 130 L30 100 Q30 40 60 40" fill="none" stroke="#f8fafc" strokeWidth="12" /> {/* Arm */}
                        <rect x="40" y="85" width="40" height="4" rx="1" fill="#334155" /> {/* Stage */}
                        <rect x="60" y="35" width="12" height="30" rx="2" fill="#cbd5e1" stroke="#94a3b8" /> {/* Eyepiece tube */}
                        <circle cx="66" cy="30" r="4" fill="#1e293b" /> {/* Eyepiece */}
                        <rect x="58" y="65" width="16" height="15" rx="1" fill="#cbd5e1" /> {/* Nosepiece */}
                        <rect x="62" y="80" width="4" height="10" fill="#94a3b8" /> {/* Objective */}
                    </svg>
                 </div>

                 {/* 2. Analytical Digital Balance (Right) */}
                 <div className="absolute right-[12%] top-[-80px] w-56 h-40 transform rotateY(-10deg)">
                    <div className="w-full h-full bg-slate-100 rounded-xl border-2 border-slate-300 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-40 h-2 bg-slate-300 rounded-full"></div>
                        <div className="mt-8 flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-400 to-slate-200 border-2 border-slate-500 shadow-inner flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-slate-100 shadow-lg"></div>
                            </div>
                            <div className="w-32 h-10 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center font-mono text-green-400 text-xl font-bold shadow-inner">
                                0.000g
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* 3. Glassware Assembly (Center Background of bench) */}
                 <div className="absolute left-1/2 top-[-100px] -translate-x-1/2 w-[40%] h-40 flex items-end justify-center gap-8 opacity-40 blur-[0.5px]">
                    {/* Beaker */}
                    <div className="w-16 h-20 border-2 border-slate-300/50 rounded-b-lg relative">
                        <div className="absolute bottom-0 w-full h-1/2 bg-blue-200/20 rounded-b-lg"></div>
                    </div>
                    {/* Erlenmeyer Flask */}
                    <div className="w-20 h-24 flex flex-col items-center">
                        <div className="w-4 h-12 border-x-2 border-t-2 border-slate-300/50"></div>
                        <div className="w-20 h-12 border-2 border-slate-300/50 rounded-b-full bg-white/5"></div>
                    </div>
                    {/* Graduated Cylinder */}
                    <div className="w-8 h-32 border-2 border-slate-300/50 rounded-b-md">
                        {Array.from({length: 10}).map((_,i) => <div key={i} className="h-px w-full bg-slate-300/30 mt-2"></div>)}
                    </div>
                 </div>
            </div>
        </div>

        {/* Lab Viewport (Interactive Layer) */}
        <div className="relative z-10 w-full h-full bg-transparent">
            {children}
        </div>
        
        {/* Cinematic Neutral White Lighting Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.25)_0%,transparent_60%)] mix-blend-screen"></div>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_70%,rgba(15,23,42,0.05)_100%)]"></div>
        {/* Soft Vignette for Professional Depth */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.05)]"></div>
    </div>
);

const ScienceLab: React.FC<ScienceLabProps> = ({ userProfile }) => {
    const [slots, setSlots] = useState<[LabType, LabType]>(['Physics', 'Chemistry']);
    const [layout, setLayout] = useState<'split' | 'single_left' | 'single_right'>('split');
    const [showAssistant, setShowAssistant] = useState(false);

    const updateSlot = (index: 0 | 1, newType: LabType) => {
        const newSlots = [...slots] as [LabType, LabType];
        newSlots[index] = newType;
        setSlots(newSlots);
    };

    const renderLabInstance = (type: LabType) => {
        switch (type) {
            case 'Physics': return <PhysicsLab level="University" userProfile={userProfile} />;
            case 'Chemistry': return <ChemistryLab level="University" userProfile={userProfile} />;
            case 'Biology': return <BiologyLab level="University" userProfile={userProfile} />;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans absolute inset-0 z-50">
            <div className="flex-shrink-0 px-4 py-2 bg-white/95 backdrop-blur-xl border-b border-slate-200 flex justify-between items-center z-50 shadow-sm h-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white text-lg">🧪</span>
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 tracking-tight uppercase text-[10px] sm:text-xs">EduTec <span className="text-blue-600">Virtual Labs</span></h2>
                    </div>
                </div>
                 
                 <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button onClick={() => setLayout('single_left')} className={`p-1.5 rounded transition-all ${layout === 'single_left' ? 'bg-white text-blue-600 shadow-sm border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4z" /></svg></button>
                    <button onClick={() => setLayout('split')} className={`p-1.5 rounded transition-all ${layout === 'split' ? 'bg-white text-blue-600 shadow-sm border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h9v16H2V4zm11 0h9v16h-9V4z" /></svg></button>
                    <button onClick={() => setLayout('single_right')} className={`p-1.5 rounded transition-all ${layout === 'single_right' ? 'bg-white text-blue-600 shadow-sm border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4z" /></svg></button>
                 </div>

                 <button onClick={() => setShowAssistant(!showAssistant)} className={`text-[10px] flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all font-black uppercase tracking-widest ${showAssistant ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    <span>👩‍🔬</span><span className="hidden sm:inline">Lab Aide</span>
                 </button>
            </div>

            <div className="flex-grow flex overflow-hidden relative">
                <div className={`flex flex-col border-r border-slate-200 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${layout === 'split' ? 'w-1/2' : layout === 'single_left' ? 'w-full' : 'w-0 overflow-hidden'}`}>
                    <div className="h-8 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-4 z-10 flex-shrink-0">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Workbench A</span>
                        <select value={slots[0]} onChange={(e) => updateSlot(0, e.target.value as LabType)} className="bg-transparent text-[9px] text-slate-800 border-none rounded px-2 py-0.5 outline-none font-black uppercase tracking-tighter cursor-pointer hover:text-blue-600">
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>
                    <div className="flex-grow relative">
                        <Classroom3D label="A" color="#orange">
                            {renderLabInstance(slots[0])}
                        </Classroom3D>
                    </div>
                </div>

                <div className={`flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${layout === 'split' ? 'w-1/2' : layout === 'single_right' ? 'w-full' : 'w-0 overflow-hidden'}`}>
                    <div className="h-8 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-4 z-10 flex-shrink-0 border-l border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Workbench B</span>
                        <select value={slots[1]} onChange={(e) => updateSlot(1, e.target.value as LabType)} className="bg-transparent text-[9px] text-slate-800 border-none rounded px-2 py-0.5 outline-none font-black uppercase tracking-tighter cursor-pointer hover:text-blue-600">
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>
                    <div className="flex-grow relative">
                        <Classroom3D label="B" color="#purple">
                            {renderLabInstance(slots[1])}
                        </Classroom3D>
                    </div>
                </div>

                {showAssistant && (
                    <div className="absolute top-4 right-4 bottom-4 w-85 bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-50 flex flex-col animate-fade-in-left overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2"><span>👩‍🔬</span> Lab Assistant</h3>
                            <button onClick={() => setShowAssistant(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full p-1 border border-slate-200 shadow-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="px-4 pt-4 border-b border-slate-50 pb-4 scale-95"><WeatherWidget /></div>
                        <div className="flex-grow overflow-hidden flex flex-col"><LabAssistant activeLab={layout === 'single_right' ? slots[1] : slots[0]} level="University" /></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScienceLab;
