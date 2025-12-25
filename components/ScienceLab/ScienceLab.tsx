
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, LabType } from '../../types';
import PhysicsLab from './PhysicsLab';
import ChemistryLab from './ChemistryLab';
import BiologyLab from './BiologyLab';
import LabAssistant from './LabAssistant';
import WeatherWidget from '../common/WeatherWidget';

interface ScienceLabProps {
    userProfile: UserProfile;
}

const Classroom3D: React.FC<{ children: React.ReactNode; label: string; color: string; defaultTapOpen?: boolean }> = ({ children, label, color, defaultTapOpen = true }) => {
    const [isTapOpen, setIsTapOpen] = useState(defaultTapOpen);
    const [showHint, setShowHint] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync tap state with prop if the lab type changes
    useEffect(() => {
        setIsTapOpen(defaultTapOpen);
    }, [defaultTapOpen]);

    const toggleTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsTapOpen(!isTapOpen);
        setShowHint(false);
    };

    // Initial positioning to center the massive workspace and focus on the ultra-detailed front table area
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = (scrollRef.current.scrollWidth - scrollRef.current.clientWidth) / 2;
            scrollRef.current.scrollTop = 850; 
        }
    }, []);

    return (
        <div className="relative w-full h-full perspective-1000 overflow-hidden bg-[#010409] group select-none">
            <style>{`
                @keyframes waterMovement { from { stroke-dashoffset: 600; } to { stroke-dashoffset: 0; } }
                @keyframes heavyShimmer { 
                    0% { opacity: 0.4; transform: scaleX(1); } 
                    50% { opacity: 0.9; transform: scaleX(1.2); filter: brightness(1.2); } 
                    100% { opacity: 0.4; transform: scaleX(1); } 
                }
                @keyframes deepRipple { 
                    0% { transform: scale(0.1); opacity: 0.8; border-width: 10px; } 
                    100% { transform: scale(3.8); opacity: 0; border-width: 0.1px; } 
                }
                @keyframes cinematicSplash { 
                    0% { transform: translate(0, 0) scale(1); opacity: 1; } 
                    30% { transform: translate(var(--tx), -120px) scale(1.6); opacity: 1; } 
                    100% { transform: translate(var(--tx2), 140px) scale(0); opacity: 0; } 
                }
                .scroll-container-3d::-webkit-scrollbar { width: 8px; height: 8px; }
                .scroll-container-3d::-webkit-scrollbar-track { background: rgba(2, 6, 23, 0.9); }
                .scroll-container-3d::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.4); border-radius: 20px; border: 2px solid rgba(2, 6, 23, 0.9); }
                .scroll-container-3d::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.6); }
                
                .hyper-surface-elite-pro {
                    background-color: #0d1b2e;
                    background-image: 
                        radial-gradient(circle at 50% 115%, rgba(56, 189, 248, 0.3) 0%, transparent 85%),
                        linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
                    background-size: 100% 100%, 70px 70px, 70px 70px;
                    box-shadow: 
                        inset 0 0 250px rgba(0,0,0,1), 
                        inset 0 8px 30px rgba(56, 189, 248, 0.1);
                }

                .table-3d-body-massive {
                    transform-style: preserve-3d;
                }

                /* Deep 3D Front Face for a solid workbench feel */
                .table-front-face-massive {
                    position: absolute;
                    bottom: -100px;
                    left: 0;
                    width: 100%;
                    height: 100px;
                    background: linear-gradient(to bottom, #1e293b 0%, #0f172a 15%, #020617 100%);
                    border-top: 3px solid rgba(56, 189, 248, 0.3);
                    box-shadow: 0 50px 120px rgba(0,0,0,1);
                    transform: rotateX(-90deg);
                    transform-origin: top;
                }

                .rim-light-cyan {
                    height: 4px;
                    background: linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.6) 50%, transparent 100%);
                    box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
                }

                .glossy-layer {
                    background: linear-gradient(155deg, rgba(255,255,255,0.08) 0%, transparent 55%, rgba(255,255,255,0.01) 100%);
                }
            `}</style>

            <div ref={scrollRef} className="absolute inset-0 overflow-auto scroll-container-3d cursor-grab active:cursor-grabbing">
                <div className="relative w-[300%] h-[200%] transform-style-3d">
                    
                    <div className="absolute inset-0 pointer-events-none transform-style-3d overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900 translateZ(-1600px) scale(5) opacity-20">
                            <div className="w-full h-full grid grid-cols-24 gap-10 p-56">
                                {Array.from({length: 120}).map((_, i) => <div key={i} className="h-full bg-slate-800/60 border border-white/5 rounded-xl shadow-2xl"></div>)}
                            </div>
                        </div>

                        {/* MASSIVE 3D WORKBENCH */}
                        <div className="absolute top-0 left-0 w-full h-full table-3d-body-massive transform rotateX(8deg) transform-style-3d">
                            
                            <div className="absolute inset-0 hyper-surface-elite-pro border-t-[16px] border-slate-950 transform-style-3d">
                                <div className="absolute inset-0 glossy-layer opacity-80"></div>
                                
                                {/* HUD UI */}
                                <div className="absolute top-40 left-32 flex flex-col gap-3 opacity-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_cyan]"></div>
                                        <span className="font-black text-[13px] text-cyan-400 uppercase tracking-[1.8em]">PRO-LAB TERMINAL // ONLINE</span>
                                    </div>
                                    <div className="h-1 w-[500px] bg-gradient-to-r from-cyan-500/60 to-transparent"></div>
                                </div>

                                {/* SINK & TAP - Relocated to very corner for better 3D depth alignment */}
                                <div className="absolute bottom-[1%] right-[2%] w-[600px] h-[380px] transform-style-3d translateZ(140px)">
                                    {/* High-Gloss Bezel */}
                                    <div className="absolute inset-[-30px] bg-gradient-to-br from-slate-100 via-slate-500 to-slate-200 rounded-[90px] shadow-[0_80px_160px_-20px_rgba(0,0,0,1)] z-10 border-t-2 border-white/80"></div>
                                    
                                    {/* Deep Basin */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#020617] to-[#000] rounded-[65px] shadow-[inset_0_25px_60px_rgba(0,0,0,1)] border-2 border-slate-700 overflow-hidden z-20">
                                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-24 h-14 bg-slate-700 rounded-full border border-white/10 shadow-[inset_0_15px_25px_rgba(0,0,0,1)] flex items-center justify-center">
                                            <div className="grid grid-cols-4 gap-2">{Array.from({length: 8}).map((_, i) => <div key={i} className="w-2.5 h-2.5 bg-black rounded-full shadow-inner"></div>)}</div>
                                        </div>

                                        {/* WATER FLOW ACTIVE AS DEFAULT FOR CHEMISTRY */}
                                        {isTapOpen && (
                                            <div className="absolute inset-0 flex flex-col items-center">
                                                <svg className="w-40 h-full overflow-visible z-40" viewBox="0 0 100 300">
                                                    <defs>
                                                        <filter id="ultraRefraction">
                                                            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.08" numOctaves="5" seed="42">
                                                                <animate attributeName="seed" values="1;999" dur="1s" repeatCount="indefinite" />
                                                            </feTurbulence>
                                                            <feDisplacementMap in="SourceGraphic" scale="35" xChannelSelector="R" yChannelSelector="G" />
                                                        </filter>
                                                        <linearGradient id="ultraWaterFlow" x1="0" y1="0" x2="1" y2="0">
                                                            <stop offset="0%" stopColor="rgba(186, 230, 253, 0.4)" />
                                                            <stop offset="25%" stopColor="rgba(56, 189, 248, 0.9)" />
                                                            <stop offset="50%" stopColor="rgba(30, 64, 175, 1)" />
                                                            <stop offset="75%" stopColor="rgba(56, 189, 248, 0.9)" />
                                                            <stop offset="100%" stopColor="rgba(186, 230, 253, 0.4)" />
                                                        </linearGradient>
                                                    </defs>
                                                    <path d="M 50 0 L 50 300" stroke="url(#ultraWaterFlow)" strokeWidth="48" strokeLinecap="round" filter="url(#ultraRefraction)" opacity="0.35" />
                                                    <path d="M 50 0 L 50 300" stroke="url(#ultraWaterFlow)" strokeWidth="36" strokeLinecap="round" className="animate-[heavyShimmer_0.6s_infinite]" />
                                                    <path d="M 50 0 L 50 300" stroke="white" strokeWidth="10" opacity="0.6" strokeDasharray="10 30" className="animate-[waterMovement_0.15s_linear_infinite]" filter="url(#ultraRefraction)" />
                                                    <path d="M 50 0 L 50 300" stroke="rgba(255,255,255,1)" strokeWidth="2.5" strokeDasharray="3 80" className="animate-[waterMovement_0.1s_linear_infinite]" />
                                                </svg>
                                                <div className="absolute bottom-16 flex items-center justify-center">
                                                    <div className="absolute w-32 h-16 bg-white rounded-full opacity-80 blur-[40px] animate-pulse"></div>
                                                    <div className="absolute w-44 h-22 bg-blue-100 rounded-full opacity-40 blur-[20px] animate-bounce"></div>
                                                    {Array.from({length: 6}).map((_, i) => (
                                                        <div key={i} className="absolute w-72 h-36 border-[6px] border-blue-200/20 rounded-full" style={{ animation: `deepRipple ${1.2 + i * 0.4}s linear infinite`, animationDelay: `${i * 0.5}s` }}></div>
                                                    ))}
                                                    {Array.from({length: 75}).map((_, i) => {
                                                        const tx = (Math.random() - 0.5) * 360; const tx2 = tx + (Math.random() - 0.5) * 180;
                                                        return <div key={i} className="absolute w-3 h-3 bg-blue-50/95 rounded-full blur-[0.3px]" style={{ '--tx': `${tx}px`, '--tx2': `${tx2}px`, animation: `cinematicSplash ${0.3 + Math.random() * 0.6}s cubic-bezier(0.15, 0, 0.3, 1) infinite`, animationDelay: `${Math.random() * 2}s` } as any}></div>;
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* TAP COMPONENT */}
                                    <div onDoubleClick={toggleTap} className="absolute -top-48 left-1/2 -translate-x-1/2 w-36 h-72 pointer-events-auto z-50 transform-style-3d cursor-pointer group/tap">
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-16 bg-gradient-to-r from-slate-400 to-slate-700 rounded-full border-b-[12px] border-black shadow-2xl"></div>
                                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-12 h-40 bg-gradient-to-r from-slate-300 via-white to-slate-600 rounded-sm shadow-2xl border-x border-slate-400">
                                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-14 h-20 bg-black rounded-xl border border-slate-700 flex flex-col items-center justify-center p-1 shadow-inner">
                                                <div className={`text-[9px] font-black tracking-tighter ${isTapOpen ? 'text-blue-400' : 'text-slate-700'}`}>FLOW</div>
                                                <div className={`text-[14px] font-black transition-all ${isTapOpen ? 'text-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)]' : 'text-red-900'}`}>{isTapOpen ? 'ON' : 'OFF'}</div>
                                            </div>
                                        </div>
                                        <svg className="absolute bottom-[200px] left-1/2 -translate-x-1/2 w-56 h-48 overflow-visible pointer-events-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" viewBox="0 0 100 80">
                                            <path d="M 50 80 Q 50 15 25 15 L 10 15" fill="none" stroke="url(#chromie)" strokeWidth="26" strokeLinecap="round" />
                                            <defs><linearGradient id="chromie" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ffffff" /><stop offset="50%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#334155" /></linearGradient></defs>
                                        </svg>
                                        <div className="absolute top-0 left-[-48px] w-16 h-20 bg-gradient-to-b from-slate-100 to-slate-600 rounded-b-3xl border-b-[10px] border-black shadow-3xl"></div>
                                        <div className={`absolute bottom-48 right-[-70px] w-32 h-10 bg-gradient-to-r from-slate-300 to-slate-700 rounded-full transition-transform duration-1000 ease-[cubic-bezier(0.34,1.7,0.64,1)] ${isTapOpen ? 'rotate-[-80deg]' : 'rotate-0'}`}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 rounded-full border-4 border-white shadow-2xl animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="table-front-face-massive">
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="rim-light-cyan w-4/5 rounded-full opacity-50"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 z-30 w-full h-full bg-transparent">
                        {children}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-slate-950/90 backdrop-blur-3xl px-14 py-6 rounded-[3rem] border border-white/10 text-[11px] font-black uppercase tracking-[0.5em] text-blue-400 shadow-[0_30px_100px_-10px_rgba(0,0,0,0.9)] pointer-events-none animate-fade-in-up z-50">
                 <div className="flex items-center gap-4"><span className="text-xl animate-bounce">⬅️</span> NAVIGATE <span className="text-xl animate-bounce">➡️</span></div>
                 <div className="h-8 w-px bg-white/10"></div>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-white opacity-90 tracking-[0.2em]">EXPERIMENTAL ZONE ACTIVE</span>
                    <span className="text-[9px] text-slate-500 tracking-[1em]">DBL-CLICK TAP FOR WATER</span>
                 </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.15)_0%,transparent_70%)] mix-blend-screen"></div>
        </div>
    );
};

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
        <div className="h-full flex flex-col bg-[#010409] text-slate-100 overflow-hidden font-sans absolute inset-0 z-50">
            <div className="flex-shrink-0 px-8 py-3 bg-slate-950 border-b border-white/5 flex justify-between items-center z-50 shadow-2xl h-20">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-800 rounded-2xl flex items-center justify-center text-white text-3xl shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-white/10">
                        <span>🧪</span>
                    </div>
                    <div>
                        <h2 className="font-black text-white tracking-tighter uppercase text-base sm:text-lg">EduTec <span className="text-blue-500">PRO-LAB</span> <span className="ml-3 px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-[10px] border border-blue-500/30 font-mono tracking-normal">v5.6.0-PREMIUM</span></h2>
                    </div>
                </div>
                 
                 <div className="flex bg-slate-900/80 backdrop-blur-xl rounded-2xl p-2 border border-white/5 shadow-inner">
                    {[
                        { id: 'single_left', icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4z" /></svg>, title: 'Focus Workbench Alpha' },
                        { id: 'split', icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h9v16H2V4zm11 0h9v16h-9V4z" /></svg>, title: 'Dual Synchronization' },
                        { id: 'single_right', icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4z" /></svg>, title: 'Focus Workbench Beta' }
                    ].map(btn => (
                        <button key={btn.id} onClick={() => setLayout(btn.id as any)} className={`p-3 rounded-xl transition-all duration-300 ${layout === btn.id ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-slate-500 hover:text-slate-300'}`} title={btn.title}>{btn.icon}</button>
                    ))}
                 </div>

                 <button onClick={() => setShowAssistant(!showAssistant)} className={`text-[11px] flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest ${showAssistant ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-500/40' : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'}`}>
                    <span className="text-xl">👩‍🔬</span><span className="hidden sm:inline">Lab Intelligence</span>
                 </button>
            </div>

            <div className="flex-grow flex overflow-hidden relative">
                <div className={`flex flex-col border-r border-white/5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${layout === 'split' ? 'w-1/2' : layout === 'single_left' ? 'w-full' : 'w-0 overflow-hidden'}`}>
                    <div className="h-10 bg-slate-950/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center px-6 z-10 flex-shrink-0">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">ZONE ALPHA</span>
                        <select value={slots[0]} onChange={(e) => updateSlot(0, e.target.value as LabType)} className="bg-transparent text-[11px] text-white border-none rounded px-2 py-0.5 outline-none font-black uppercase tracking-tighter cursor-pointer hover:text-blue-500 transition-colors">
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>
                    <div className="flex-grow relative">
                        <Classroom3D label="A" color="#orange" defaultTapOpen={slots[0] === 'Chemistry'}>{renderLabInstance(slots[0])}</Classroom3D>
                    </div>
                </div>

                <div className={`flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${layout === 'split' ? 'w-1/2' : layout === 'single_right' ? 'w-full' : 'w-0 overflow-hidden'}`}>
                    <div className="h-10 bg-slate-950/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center px-6 z-10 flex-shrink-0 border-l border-white/5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">ZONE BETA</span>
                        <select value={slots[1]} onChange={(e) => updateSlot(1, e.target.value as LabType)} className="bg-transparent text-[11px] text-white border-none rounded px-2 py-0.5 outline-none font-black uppercase tracking-tighter cursor-pointer hover:text-blue-500 transition-colors">
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>
                    <div className="flex-grow relative">
                        <Classroom3D label="B" color="#purple" defaultTapOpen={slots[1] === 'Chemistry'}>{renderLabInstance(slots[1])}</Classroom3D>
                    </div>
                </div>

                {showAssistant && (
                    <div className="absolute top-4 right-4 bottom-4 w-[420px] bg-slate-900/98 backdrop-blur-3xl border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,1)] rounded-3xl z-50 flex flex-col animate-fade-in-left overflow-hidden ring-1 ring-white/10">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
                            <h3 className="font-black text-white text-xs uppercase tracking-[0.3em] flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                AI ADVISOR
                            </h3>
                            <button onClick={() => setShowAssistant(false)} className="text-slate-500 hover:text-white transition-all bg-white/5 rounded-full p-2.5 border border-white/5 shadow-inner hover:bg-red-600 hover:border-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="px-8 pt-8 border-b border-white/5 pb-8 scale-105 origin-top"><WeatherWidget /></div>
                        <div className="flex-grow overflow-hidden flex flex-col"><LabAssistant activeLab={layout === 'single_right' ? slots[1] : slots[0]} level="University" /></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScienceLab;
