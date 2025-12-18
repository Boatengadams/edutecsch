import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LabLevel, UserProfile, LabEquipment } from '../../types';
import { useToast } from '../common/Toast';

// --- TYPES ---

type ContainerType = 'test_tube' | 'beaker' | 'conical_flask' | 'measuring_cylinder' | 'burette' | 'reagent_bottle' | 'bunsen_burner' | 'white_tile' | 'retort_stand';

interface Chemical {
    id: string;
    name: string;
    concentration: number;
    volume: number;
    color: string;
    type: 'acid' | 'base' | 'salt' | 'indicator' | 'solvent';
    ph: number;
}

interface LabContainer {
    id: string;
    type: ContainerType;
    name: string;
    capacity: number;
    currentVolume: number;
    contents: Chemical[]; 
    temperature: number;
    precipitate?: { color: string; name: string; amount: number }; 
    
    // Physics State
    x: number;
    y: number;
    rotation: number; 
    targetRotation: number;
    
    // Tool Specific
    isBurning?: boolean; // For Bunsen Burner
    buretteOpen?: boolean;
    zIndex?: number;
    snapTargetId?: string | null;
}

// --- CONFIGURATION ---

const STOCK_CHEMICALS: LabEquipment[] = [
    { id: 'water', name: 'Distilled Water', type: 'chemical', icon: '💧', description: 'H2O (pH 7.0)', properties: { color: '#ffffff10', volume: 1.0, ph: 7.0 } },
    { id: 'hcl', name: 'Hydrochloric Acid', type: 'chemical', icon: '🧪', description: '1.0M HCl', properties: { color: '#ffffff05', volume: 1.0, ph: 0.1 } },
    { id: 'naoh', name: 'Sodium Hydroxide', type: 'chemical', icon: '🧴', description: '1.0M NaOH', properties: { color: '#ffffff05', volume: 1.0, ph: 13.9 } },
    { id: 'cuso4', name: 'Copper(II) Sulfate', type: 'chemical', icon: '🔷', description: '0.5M CuSO4', properties: { color: '#0ea5e980', volume: 0.5, ph: 4.0 } },
    { id: 'kmno4', name: 'Potassium Permanganate', type: 'chemical', icon: '🟣', description: '0.1M KMnO4', properties: { color: '#a21caf90', volume: 0.1, ph: 7.0 } },
    { id: 'phenolphthalein', name: 'Phenolphthalein', type: 'chemical', icon: '⚪', description: 'Indicator (pH 8.2-10.0)', properties: { color: '#ffffff00', volume: 0, ph: 7.0 } },
];

const GLASSWARE: { type: ContainerType; name: string; capacity: number; icon: string }[] = [
    { type: 'bunsen_burner', name: 'Bunsen Burner', capacity: 0, icon: '🔥' },
    { type: 'retort_stand', name: 'Retort Stand', capacity: 0, icon: '🏗️' },
    { type: 'white_tile', name: 'White Tile', capacity: 0, icon: '⬜' },
    { type: 'conical_flask', name: 'Conical Flask', capacity: 250, icon: '🏺' },
    { type: 'beaker', name: 'Beaker', capacity: 250, icon: '🥃' },
    { type: 'test_tube', name: 'Test Tube', capacity: 20, icon: '🧪' },
    { type: 'burette', name: 'Burette', capacity: 50, icon: '📏' },
];

// --- PHYSICS & MATH HELPERS ---

const blendChemicals = (contents: Chemical[]) => {
    if (contents.length === 0) return { color: 'rgba(255,255,255,0.05)', ph: 7.0 };
    
    let totalVol = 0;
    let r = 0, g = 0, b = 0, a = 0;
    let phWeighted = 0;

    contents.forEach(c => {
        totalVol += c.volume;
        // Simple hex/rgba parse
        const color = c.color.startsWith('#') ? c.color : '#ffffff10';
        const cr = parseInt(color.substring(1, 3), 16) || 255;
        const cg = parseInt(color.substring(3, 5), 16) || 255;
        const cb = parseInt(color.substring(5, 7), 16) || 255;
        const ca = color.length > 7 ? parseInt(color.substring(7, 9), 16) / 255 : 0.5;

        r += cr * c.volume;
        g += cg * c.volume;
        b += cb * c.volume;
        a += ca * c.volume;
        phWeighted += c.ph * c.volume;
    });

    const finalPh = phWeighted / totalVol;
    // Indicator logic
    let finalColor = `rgba(${Math.round(r / totalVol)}, ${Math.round(g / totalVol)}, ${Math.round(b / totalVol)}, ${a / totalVol})`;
    
    const hasPhenol = contents.some(c => c.id === 'phenolphthalein');
    if (hasPhenol) {
        if (finalPh > 8.2) {
            const intensity = Math.min(1, (finalPh - 8.2) / 2);
            finalColor = `rgba(236, 72, 153, ${0.3 + intensity * 0.5})`; // Pink
        }
    }

    return { color: finalColor, ph: finalPh };
};

// FIX: Defined ChemistryLabProps interface to resolve 'Cannot find name' error
interface ChemistryLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

// FIX: Updated component signature to use ChemistryLabProps
const ChemistryLab: React.FC<ChemistryLabProps> = ({ level, userProfile }) => {
    const { showToast } = useToast();
    const [containers, setContainers] = useState<LabContainer[]>([]);
    const [heldId, setHeldId] = useState<string | null>(null);
    const [isPouring, setIsPouring] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    const workbenchRef = useRef<HTMLDivElement>(null);
    const mousePos = useRef({ x: 0, y: 0 });
    const requestRef = useRef<number | null>(null);

    const updatePhysics = useCallback(() => {
        setContainers(prev => {
            const next = [...prev];
            const held = next.find(c => c.id === heldId);

            // 1. Move held items
            if (held) {
                held.x = mousePos.current.x;
                held.y = mousePos.current.y;
                
                // Tilt logic
                if (isPouring && held.type !== 'bunsen_burner' && held.type !== 'retort_stand') {
                    held.rotation = -75;
                } else {
                    held.rotation = 0;
                }

                // Snap Detection
                next.forEach(other => {
                    if (other.id === held.id) return;
                    const dist = Math.hypot(other.x - held.x, other.y - held.y);
                    
                    if (held.type === 'conical_flask' && other.type === 'white_tile' && dist < 50) {
                        held.x = other.x;
                        held.y = other.y - 10;
                    }
                    if (held.type === 'burette' && other.type === 'retort_stand' && dist < 80) {
                        held.x = other.x + 25;
                        held.y = other.y - 150;
                    }
                });
            }

            // 2. Transfer Liquids & Heat
            next.forEach(c => {
                // Heating logic
                const burnerBelow = next.find(b => 
                    b.type === 'bunsen_burner' && 
                    b.isBurning && 
                    Math.abs(b.x - c.x) < 40 && 
                    b.y > c.y && b.y < c.y + 150
                );
                
                if (burnerBelow) {
                    c.temperature = Math.min(110, c.temperature + 0.5);
                } else {
                    c.temperature = Math.max(25, c.temperature - 0.05);
                }

                // Pouring logic
                if (c.id === heldId && isPouring && c.currentVolume > 0) {
                    const target = next.find(t => 
                        t.id !== c.id && 
                        Math.abs(t.x - (c.x - 40)) < 50 && 
                        t.y > c.y && t.y < c.y + 200
                    );
                    
                    if (target && target.currentVolume < target.capacity) {
                        const flow = Math.min(2.5, c.currentVolume);
                        c.currentVolume -= flow;
                        target.currentVolume += flow;
                        
                        // Transfer contents proportionally
                        c.contents.forEach(chem => {
                            const transferAmount = (chem.volume / (c.currentVolume + flow)) * flow;
                            chem.volume -= transferAmount;
                            
                            const existing = target.contents.find(tc => tc.id === chem.id);
                            if (existing) existing.volume += transferAmount;
                            else target.contents.push({ ...chem, volume: transferAmount });
                        });
                    }
                }
                
                // Burette dripping
                if (c.type === 'burette' && c.buretteOpen && c.currentVolume > 0) {
                    const drop = 0.2;
                    c.currentVolume -= drop;
                    const target = next.find(t => 
                        t.id !== c.id && 
                        Math.abs(t.x - c.x) < 20 && 
                        t.y > c.y + 200 && t.y < c.y + 500
                    );
                    if (target && target.currentVolume < target.capacity) {
                        target.currentVolume += drop;
                        // Content transfer logic...
                    }
                }
            });

            return next;
        });
        requestRef.current = requestAnimationFrame(updatePhysics);
    }, [heldId, isPouring]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updatePhysics);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [updatePhysics]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = workbenchRef.current?.getBoundingClientRect();
        if (rect) {
            mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };

    const spawn = (type: ContainerType, name: string, cap: number) => {
        const newC: LabContainer = {
            id: Math.random().toString(36).substr(2, 9),
            type, name, capacity: cap, currentVolume: 0,
            contents: [], temperature: 25,
            x: 400, y: 300, rotation: 0, targetRotation: 0, zIndex: 10
        };
        setContainers(prev => [...prev, newC]);
        setSidebarOpen(false);
    };

    const addStock = (cId: string, chem: LabEquipment) => {
        setContainers(prev => prev.map(c => {
            if (c.id === cId) {
                const props = chem.properties!;
                const newChem: Chemical = {
                    id: chem.id,
                    name: chem.name,
                    volume: 20,
                    concentration: 1.0,
                    color: props.color,
                    ph: props.ph,
                    type: chem.id === 'hcl' ? 'acid' : chem.id === 'naoh' ? 'base' : 'solvent'
                };
                c.currentVolume = Math.min(c.capacity, c.currentVolume + 20);
                const existing = c.contents.find(x => x.id === chem.id);
                if (existing) existing.volume += 20;
                else c.contents.push(newChem);
            }
            return c;
        }));
    };

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const activeContainer = containers.find(c => c.id === heldId) || containers.find(c => c.id === selectedId);

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#0a0a0c] overflow-hidden select-none relative" onMouseMove={handleMouseMove} onMouseUp={() => { setHeldId(null); setIsPouring(false); }}>
            
            {/* HUD Overlay */}
            {activeContainer && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-2xl flex gap-6 shadow-2xl">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Volume</p>
                            <p className="text-lg font-mono text-blue-400">{activeContainer.currentVolume.toFixed(1)}ml</p>
                        </div>
                        <div className="text-center border-x border-slate-800 px-6">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Temp</p>
                            <p className={`text-lg font-mono ${activeContainer.temperature > 80 ? 'text-orange-500 animate-pulse' : 'text-slate-200'}`}>
                                {activeContainer.temperature.toFixed(1)}°C
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">pH</p>
                            <p className="text-lg font-mono text-green-400">{blendChemicals(activeContainer.contents).ph.toFixed(1)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Apparatus Dock */}
            <div className={`absolute top-0 left-0 h-full w-64 bg-slate-900/95 border-r border-slate-800 z-[60] transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 pt-16 space-y-8 h-full overflow-y-auto custom-scrollbar">
                    <section>
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Glassware</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {GLASSWARE.map(g => (
                                <button key={g.type} onClick={() => spawn(g.type, g.name, g.capacity)} className="flex flex-col items-center p-3 bg-slate-800/50 hover:bg-blue-600 rounded-xl border border-slate-700 transition-all active:scale-95">
                                    <span className="text-2xl mb-1">{g.icon}</span>
                                    <span className="text-[9px] font-bold text-slate-300">{g.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h4 className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4">Stock Reagents</h4>
                        <div className="space-y-2">
                            {STOCK_CHEMICALS.map(chem => (
                                <button key={chem.id} disabled={!selectedId} onClick={() => addStock(selectedId!, chem)} className="w-full flex items-center gap-3 p-2 bg-slate-800/30 hover:bg-slate-700 border border-slate-700 rounded-lg text-left disabled:opacity-30">
                                    <span className="text-lg">{chem.icon}</span>
                                    <div>
                                        <p className="text-xs font-bold">{chem.name}</p>
                                        <p className="text-[9px] text-slate-500">{chem.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-[70] p-3 bg-blue-600 rounded-full text-white shadow-xl hover:bg-blue-500 transition-all">
                {isSidebarOpen ? '✕' : '🧪'}
            </button>

            {/* Interactive Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#0f1115] overflow-hidden">
                {/* Visual Environment */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.2)_0%,#000_100%)]"></div>
                <div className="absolute bottom-0 w-full h-24 bg-slate-900/40 border-t border-slate-800 backdrop-blur-sm"></div>

                {containers.map(c => (
                    <div 
                        key={c.id} 
                        className="absolute cursor-grab active:cursor-grabbing group"
                        style={{ 
                            left: c.x, top: c.y, 
                            transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
                            zIndex: c.zIndex,
                            transition: 'transform 0.1s ease-out'
                        }}
                        onMouseDown={(e) => {
                            setHeldId(c.id);
                            setSelectedId(c.id);
                        }}
                    >
                        {selectedId === c.id && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 animate-fade-in-up">
                                <button onClick={() => setContainers(prev => prev.filter(x => x.id !== c.id))} className="bg-red-500/20 text-red-500 p-1 rounded-md border border-red-500/50 hover:bg-red-500 hover:text-white">🗑️</button>
                                {c.type === 'bunsen_burner' && (
                                    <button onClick={() => setContainers(prev => prev.map(x => x.id === c.id ? {...x, isBurning: !x.isBurning} : x))} className={`px-2 rounded-md font-bold text-xs ${c.isBurning ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                        {c.isBurning ? 'STOP' : 'IGNITE'}
                                    </button>
                                )}
                                {c.type === 'burette' && (
                                    <button onClick={() => setContainers(prev => prev.map(x => x.id === c.id ? {...x, buretteOpen: !x.buretteOpen} : x))} className={`px-2 rounded-md font-bold text-xs ${c.buretteOpen ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                        VALVE
                                    </button>
                                )}
                            </div>
                        )}
                        <GlasswareVisual container={c} />
                    </div>
                ))}
                
                {isPouring && heldId && (
                    <div className="pointer-events-none absolute z-40" style={{ left: mousePos.current.x - 30, top: mousePos.current.y }}>
                         <svg width="20" height="200" className="overflow-visible">
                            <path 
                                d="M 0 0 Q 0 50, 2 200" 
                                stroke={blendChemicals(containers.find(c => c.id === heldId)?.contents || []).color} 
                                strokeWidth="4" fill="none" strokeLinecap="round" className="animate-pulse"
                            />
                         </svg>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- VISUAL RENDERER ---

const GlasswareVisual = ({ container }: { container: LabContainer }) => {
    const { color, ph } = blendChemicals(container.contents);
    const fillPercent = (container.currentVolume / container.capacity) * 100;
    const isBoiling = container.temperature >= 100;

    const renderGlass = (type: ContainerType) => {
        const commonProps = "stroke-white/30 stroke-2 fill-white/5 backdrop-blur-[2px]";
        
        switch (type) {
            case 'beaker':
                return (
                    <div className="relative w-24 h-32">
                        <div className={`absolute bottom-0 left-0 right-0 rounded-b-lg border-x-2 border-b-4 ${commonProps}`} style={{ height: '100%' }}>
                            {/* Liquid */}
                            <div className="absolute bottom-0 left-0 right-0 transition-all duration-300 rounded-b-sm" style={{ height: `${fillPercent}%`, background: color }}>
                                {isBoiling && <BoilingAnimation />}
                            </div>
                            <div className="absolute inset-0 flex flex-col justify-end p-2 opacity-20 pointer-events-none">
                                {[1,2,3,4].map(i => <div key={i} className="border-b border-white w-1/4 mb-6"></div>)}
                            </div>
                        </div>
                    </div>
                );
            case 'conical_flask':
                return (
                    <div className="relative w-28 h-36 flex flex-col items-center">
                        <div className="w-10 h-10 border-x-2 border-t-2 border-white/20 rounded-t-sm bg-white/5"></div>
                        <div className={`w-full h-28 clip-flask border-b-4 ${commonProps} relative overflow-hidden`}>
                             <div className="absolute bottom-0 left-0 right-0 transition-all duration-300" style={{ height: `${fillPercent}%`, background: color }}>
                                {isBoiling && <BoilingAnimation />}
                             </div>
                        </div>
                    </div>
                );
            case 'bunsen_burner':
                return (
                    <div className="flex flex-col items-center">
                        {container.isBurning && (
                            <div className="relative mb-[-10px] z-10">
                                <div className="w-4 h-12 bg-blue-500 rounded-full blur-[4px] animate-pulse"></div>
                                <div className="w-2 h-10 bg-white rounded-full blur-[1px] absolute top-1 left-1 opacity-80"></div>
                            </div>
                        )}
                        <div className="w-4 h-16 bg-slate-400 border-x border-slate-500"></div>
                        <div className="w-16 h-4 bg-slate-600 rounded-t-lg"></div>
                        <div className="w-24 h-4 bg-slate-700 rounded-lg shadow-xl"></div>
                    </div>
                );
            case 'retort_stand':
                return (
                    <div className="flex flex-col items-center">
                        <div className="w-2 h-[400px] bg-slate-400 border-x border-slate-500 rounded-t-full"></div>
                        <div className="w-32 h-6 bg-slate-800 rounded shadow-xl border-t border-slate-600"></div>
                        <div className="absolute top-20 left-1 w-20 h-2 bg-slate-600 rounded-l shadow-md"></div>
                    </div>
                );
            case 'white_tile':
                return <div className="w-32 h-20 bg-white border border-slate-300 shadow-lg rounded-sm transform skew-x-12"></div>;
            case 'burette':
                return (
                    <div className="flex flex-col items-center h-[400px]">
                        <div className="w-3 h-80 bg-blue-100/10 border border-white/30 rounded-full relative overflow-hidden">
                             <div className="absolute bottom-0 w-full bg-blue-400/20" style={{ height: `${fillPercent}%`, background: color }}></div>
                        </div>
                        <div className="w-1 h-12 bg-white/20 border-x border-white/20"></div>
                        <div className={`w-6 h-6 rounded-full ${container.buretteOpen ? 'bg-blue-600' : 'bg-slate-700'} flex items-center justify-center border border-white/20`}>
                            <div className={`w-4 h-1 bg-white transition-transform ${container.buretteOpen ? 'rotate-90' : 'rotate-0'}`}></div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="relative">
            {renderGlass(container.type)}
            <style>{`
                .clip-flask { clip-path: polygon(30% 0, 70% 0, 100% 100%, 0% 100%); }
            `}</style>
        </div>
    );
};

const BoilingAnimation = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="bubble bg-white/40 rounded-full absolute bottom-0" 
                style={{ 
                    left: `${10 + Math.random() * 80}%`,
                    width: `${2 + Math.random() * 4}px`,
                    height: `${2 + Math.random() * 4}px`,
                    animation: `rise ${1 + Math.random()}s infinite linear`,
                    animationDelay: `${Math.random()}s`
                }} 
            />
        ))}
        <style>{`
            @keyframes rise {
                0% { transform: translateY(0) scale(1); opacity: 0.8; }
                100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
            }
        `}</style>
    </div>
);

export default ChemistryLab;