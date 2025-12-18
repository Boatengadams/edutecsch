
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LabLevel, UserProfile, LabEquipment } from '../../types';
import { useToast } from '../common/Toast';
import { db, firebase } from '../../services/firebase';

// --- TYPES ---

type ContainerType = 'test_tube' | 'beaker' | 'conical_flask' | 'measuring_cylinder' | 'burette' | 'reagent_bottle' | 'bunsen_burner' | 'white_tile' | 'retort_stand';

interface Chemical {
    id: string;
    name: string;
    formula?: string;
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
    x: number;
    y: number;
    rotation: number; 
    isPouring?: boolean;
    zIndex?: number;
    lastX: number; // For direction detection
    label?: string; // Optional label for reagent bottles
}

interface ChemistryLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

// --- CONFIGURATION ---

const GLASS_DEFS: Record<ContainerType, { 
    width: number; 
    height: number; 
    mouthWidth: number; 
    spoutOffset: { x: number; y: number }; 
    capacity: number;
    icon: string;
}> = {
    'beaker': { width: 90, height: 110, mouthWidth: 80, spoutOffset: { x: -45, y: -55 }, capacity: 250, icon: '🥃' },
    'conical_flask': { width: 100, height: 130, mouthWidth: 35, spoutOffset: { x: 15, y: -65 }, capacity: 250, icon: '🏺' },
    'test_tube': { width: 30, height: 120, mouthWidth: 25, spoutOffset: { x: -12, y: -60 }, capacity: 50, icon: '🧪' },
    'measuring_cylinder': { width: 40, height: 180, mouthWidth: 35, spoutOffset: { x: -18, y: -90 }, capacity: 100, icon: '📏' },
    'burette': { width: 20, height: 350, mouthWidth: 15, spoutOffset: { x: 0, y: 175 }, capacity: 50, icon: '📐' },
    'reagent_bottle': { width: 70, height: 110, mouthWidth: 30, spoutOffset: { x: 30, y: -55 }, capacity: 250, icon: '🧴' },
    'bunsen_burner': { width: 80, height: 120, mouthWidth: 0, spoutOffset: { x: 0, y: 0 }, capacity: 0, icon: '🔥' },
    'white_tile': { width: 140, height: 20, mouthWidth: 0, spoutOffset: { x: 0, y: 0 }, capacity: 0, icon: '⬜' },
    'retort_stand': { width: 150, height: 400, mouthWidth: 0, spoutOffset: { x: 0, y: 0 }, capacity: 0, icon: '🏗️' },
};

const REAGENTS: Record<string, LabEquipment[]> = {
    'Acids': [
        { id: 'hcl', name: 'Hydrochloric Acid', type: 'chemical', icon: '🧪', description: 'Strong Acid (1.0M HCl)', properties: { color: 'rgba(230, 230, 230, 0.2)', volume: 200, ph: 0.1 } },
        { id: 'h2so4', name: 'Sulfuric Acid', type: 'chemical', icon: '🧪', description: 'Strong Acid (1.0M H2SO4)', properties: { color: 'rgba(240, 240, 240, 0.3)', volume: 200, ph: 0.3 } },
        { id: 'hno3', name: 'Nitric Acid', type: 'chemical', icon: '🧪', description: 'Strong Acid (1.0M HNO3)', properties: { color: 'rgba(255, 255, 200, 0.2)', volume: 200, ph: 0.5 } },
        { id: 'ch3cooh', name: 'Ethanoic Acid', type: 'chemical', icon: '🧪', description: 'Weak Acid (1.0M CH3COOH)', properties: { color: 'rgba(255, 255, 255, 0.1)', volume: 200, ph: 2.4 } },
    ],
    'Bases': [
        { id: 'naoh', name: 'Sodium Hydroxide', type: 'chemical', icon: '🧴', description: 'Strong Base (1.0M NaOH)', properties: { color: 'rgba(230, 230, 230, 0.2)', volume: 200, ph: 13.9 } },
        { id: 'koh', name: 'Potassium Hydroxide', type: 'chemical', icon: '🧴', description: 'Strong Base (1.0M KOH)', properties: { color: 'rgba(230, 230, 230, 0.2)', volume: 200, ph: 13.5 } },
        { id: 'nh3', name: 'Ammonia Solution', type: 'chemical', icon: '🧴', description: 'Weak Base (1.0M NH3)', properties: { color: 'rgba(200, 230, 255, 0.1)', volume: 200, ph: 11.6 } },
        { id: 'caoh2', name: 'Limewater', type: 'chemical', icon: '🧴', description: 'Ca(OH)2 Solution', properties: { color: 'rgba(255, 255, 255, 0.4)', volume: 200, ph: 12.4 } },
    ],
    'Salts & Others': [
        { id: 'water', name: 'Distilled Water', type: 'chemical', icon: '💧', description: 'H2O (pH 7.0)', properties: { color: 'rgba(186, 230, 253, 0.3)', volume: 200, ph: 7.0 } },
        { id: 'cuso4', name: 'Copper(II) Sulfate', type: 'chemical', icon: '🔷', description: '0.5M CuSO4', properties: { color: 'rgba(14, 165, 233, 0.6)', volume: 200, ph: 4.0 } },
        { id: 'kmno4', name: 'Potassium Permanganate', type: 'chemical', icon: '🟣', description: '0.1M KMnO4', properties: { color: 'rgba(162, 28, 175, 0.7)', volume: 200, ph: 7.0 } },
        { id: 'ki', name: 'Potassium Iodide', type: 'chemical', icon: '⚪', description: '0.1M KI', properties: { color: 'rgba(255, 255, 255, 0.1)', volume: 200, ph: 7.0 } },
        { id: 'agno3', name: 'Silver Nitrate', type: 'chemical', icon: '💎', description: '0.1M AgNO3', properties: { color: 'rgba(255, 255, 255, 0.05)', volume: 200, ph: 6.0 } },
    ],
    'Indicators': [
        { id: 'phenolphthalein', name: 'Phenolphthalein', type: 'chemical', icon: '⚪', description: 'pH 8.2-10.0', properties: { color: 'rgba(255, 255, 255, 0)', volume: 50, ph: 7.0 } },
        { id: 'methyl_orange', name: 'Methyl Orange', type: 'chemical', icon: '🟠', description: 'pH 3.1-4.4', properties: { color: 'rgba(251, 146, 60, 0.8)', volume: 50, ph: 7.0 } },
    ]
};

// --- CORE PHYSICS & LOGIC ---

const blendChemicals = (contents: Chemical[]) => {
    if (contents.length === 0) return { color: 'rgba(255,255,255,0.05)', ph: 7.0 };
    let totalVol = 0, r = 0, g = 0, b = 0, a = 0, phWeighted = 0;

    contents.forEach(c => {
        totalVol += c.volume;
        const match = c.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            r += parseInt(match[1]) * c.volume;
            g += parseInt(match[2]) * c.volume;
            b += parseInt(match[3]) * c.volume;
            a += (match[4] ? parseFloat(match[4]) : 1) * c.volume;
        }
        phWeighted += c.ph * c.volume;
    });

    const finalPh = phWeighted / totalVol;
    let finalColor = `rgba(${Math.round(r / totalVol)}, ${Math.round(g / totalVol)}, ${Math.round(b / totalVol)}, ${Math.min(0.8, a / totalVol)})`;
    
    // Indicator Reactivity
    if (contents.some(c => c.id === 'phenolphthalein')) {
        if (finalPh > 8.2) {
            const intensity = Math.min(1, (finalPh - 8.2) / 2);
            finalColor = `rgba(236, 72, 153, ${0.4 + intensity * 0.4})`; 
        }
    }
    if (contents.some(c => c.id === 'methyl_orange')) {
        if (finalPh < 3.1) {
            finalColor = `rgba(239, 68, 68, 0.8)`; // Red
        } else if (finalPh < 4.4) {
            finalColor = `rgba(249, 115, 22, 0.8)`; // Orange
        } else {
            finalColor = `rgba(234, 179, 8, 0.8)`; // Yellow
        }
    }
    return { color: finalColor, ph: finalPh };
};

const ChemistryLab: React.FC<ChemistryLabProps> = () => {
    const { showToast } = useToast();
    const [containers, setContainers] = useState<LabContainer[]>([]);
    const [heldId, setHeldId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [openReagentCategory, setOpenReagentCategory] = useState<string | null>(null);
    
    const workbenchRef = useRef<HTMLDivElement>(null);
    const mousePos = useRef({ x: 0, y: 0 });
    const requestRef = useRef<number | null>(null);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const updatePhysics = useCallback(() => {
        setContainers(prev => {
            const next = [...prev];
            const held = next.find(c => c.id === heldId);

            if (held) {
                const dx = mousePos.current.x - held.lastX;
                held.lastX = held.x;
                held.x = lerp(held.x, mousePos.current.x, 0.2);
                held.y = lerp(held.y, mousePos.current.y, 0.2);

                if (held.isPouring) {
                    // Turn left if moving left, right if moving right
                    const targetRot = dx < -1 ? -80 : dx > 1 ? 80 : held.rotation;
                    held.rotation = lerp(held.rotation, targetRot === 0 ? -80 : targetRot, 0.1);
                } else {
                    held.rotation = lerp(held.rotation, 0, 0.15);
                }

                // Handle Transfer
                if (held.isPouring && held.currentVolume > 0 && Math.abs(held.rotation) > 30) {
                    const def = GLASS_DEFS[held.type];
                    const rad = held.rotation * (Math.PI / 180);
                    
                    // Spout offset flips with rotation
                    const actualSpoutOffset = { 
                        x: held.rotation < 0 ? -def.spoutOffset.x : def.spoutOffset.x, 
                        y: def.spoutOffset.y 
                    };

                    const spoutX = held.x + (actualSpoutOffset.x * Math.cos(rad) - actualSpoutOffset.y * Math.sin(rad));
                    const spoutY = held.y + (actualSpoutOffset.x * Math.sin(rad) + actualSpoutOffset.y * Math.cos(rad));

                    const target = next.find(t => 
                        t.id !== held.id && 
                        Math.abs(t.x - spoutX) < 40 && 
                        t.y > spoutY && t.y < spoutY + 400
                    );

                    if (target && target.currentVolume < target.capacity) {
                        const flowRate = 1.5; 
                        const flow = Math.min(flowRate, held.currentVolume);
                        held.currentVolume -= flow;
                        target.currentVolume += flow;
                        
                        held.contents.forEach(chem => {
                            const transferAmount = (chem.volume / (held.currentVolume + flow)) * flow;
                            chem.volume -= transferAmount;
                            const existing = target.contents.find(tc => tc.id === chem.id);
                            if (existing) existing.volume += transferAmount;
                            else target.contents.push({ ...chem, volume: transferAmount });
                        });
                    }
                }
            }

            next.forEach(c => {
                if (c.id !== heldId) {
                    c.rotation = lerp(c.rotation, 0, 0.2);
                }
            });

            return next;
        });
        requestRef.current = requestAnimationFrame(updatePhysics);
    }, [heldId]);

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

    const spawn = (type: ContainerType) => {
        const def = GLASS_DEFS[type];
        const newC: LabContainer = {
            id: Math.random().toString(36).substr(2, 9),
            type, name: type.replace('_', ' ').toUpperCase(), 
            capacity: def.capacity, currentVolume: 0,
            contents: [], temperature: 25,
            x: 400, y: 300, rotation: 0, zIndex: 10,
            lastX: 400
        };
        setContainers(prev => [...prev, newC]);
        setSidebarOpen(false);
    };

    const spawnReagentBottle = (chem: LabEquipment) => {
        const type: ContainerType = 'reagent_bottle';
        const def = GLASS_DEFS[type];
        const props = chem.properties!;
        
        const newC: LabContainer = {
            id: Math.random().toString(36).substr(2, 9),
            type, 
            name: chem.name, 
            label: chem.name,
            capacity: def.capacity, 
            currentVolume: props.volume || 200,
            contents: [{ 
                id: chem.id, 
                name: chem.name, 
                volume: props.volume || 200, 
                concentration: 1.0, 
                color: props.color, 
                ph: props.ph, 
                type: 'solvent' 
            }], 
            temperature: 25,
            x: 400, y: 300, 
            rotation: 0, 
            zIndex: 15,
            lastX: 400
        };
        setContainers(prev => [...prev, newC]);
        setSidebarOpen(false);
        showToast(`Spawned bottle of ${chem.name}`, 'info');
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#080b12] overflow-hidden select-none relative font-sans" onMouseMove={handleMouseMove} onMouseUp={() => setHeldId(null)}>
            
            {/* HUD */}
            {selectedId && containers.find(c => c.id === selectedId) && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl flex gap-10 shadow-2xl border-b-blue-500/50">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Volume</p>
                            <p className="text-2xl font-mono text-blue-400 font-bold">{containers.find(c => c.id === selectedId)?.currentVolume.toFixed(1)}ml</p>
                        </div>
                        <div className="text-center border-x border-white/5 px-10">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">pH Level</p>
                            <p className="text-2xl font-mono text-emerald-400 font-bold">{blendChemicals(containers.find(c => c.id === selectedId)?.contents || []).ph.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className={`absolute top-0 left-0 h-full w-72 bg-slate-950/95 backdrop-blur-3xl border-r border-white/5 z-[60] transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 pt-24 space-y-8 overflow-y-auto h-full custom-scrollbar">
                    <section>
                        <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-6">APPARATUS</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {(Object.keys(GLASS_DEFS) as ContainerType[]).filter(t => t !== 'reagent_bottle' && GLASS_DEFS[t].capacity > 0).map(type => (
                                <button key={type} onClick={() => spawn(type)} className="flex flex-col items-center p-4 bg-white/5 hover:bg-blue-600/20 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all active:scale-95 group">
                                    <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{GLASS_DEFS[type].icon}</span>
                                    <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-tighter text-center">{type.replace('_', ' ')}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                    
                    <section>
                        <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-6">REAGENTS</h4>
                        <div className="space-y-4">
                            {Object.entries(REAGENTS).map(([category, items]) => (
                                <div key={category} className="space-y-2">
                                    <button 
                                        onClick={() => setOpenReagentCategory(openReagentCategory === category ? null : category)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-emerald-400">⚗️</span>
                                            <span className="text-xs font-bold text-slate-300">{category}</span>
                                        </div>
                                        <span className={`text-xs transition-transform ${openReagentCategory === category ? 'rotate-90' : ''}`}>▶</span>
                                    </button>
                                    
                                    {openReagentCategory === category && (
                                        <div className="grid grid-cols-1 gap-2 pl-2 animate-fade-in-down">
                                            {items.map(chem => (
                                                <button key={chem.id} onClick={() => spawnReagentBottle(chem)} className="w-full flex items-center gap-3 p-2.5 bg-white/5 hover:bg-slate-800 border border-white/5 rounded-xl text-left transition-all group">
                                                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-lg group-hover:bg-emerald-500/20 transition-colors shadow-inner">{chem.icon}</div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold text-slate-200 truncate">{chem.name}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-[70] p-4 bg-blue-600 rounded-2xl text-white shadow-2xl hover:bg-blue-500 transition-all">
                {isSidebarOpen ? '✕' : '🧪'}
            </button>

            {/* Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#04060a] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(37,99,235,0.1)_0%,transparent_70%)]"></div>
                <div className="absolute bottom-0 w-full h-40 bg-slate-900/40 border-t border-white/5 backdrop-blur-xl"></div>
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

                {containers.map(c => (
                    <div 
                        key={c.id} 
                        className={`absolute cursor-grab active:cursor-grabbing transition-transform duration-75`}
                        style={{ left: c.x, top: c.y, transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`, zIndex: c.zIndex }}
                        onMouseDown={() => { setHeldId(c.id); setSelectedId(c.id); }}
                    >
                        {selectedId === c.id && (
                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 flex gap-3 animate-fade-in-up">
                                <button onClick={() => setContainers(prev => prev.filter(x => x.id !== c.id))} className="bg-red-500/10 text-red-500 p-3 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-md">🗑️</button>
                                {GLASS_DEFS[c.type].capacity > 0 && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setContainers(prev => prev.map(x => x.id === c.id ? { ...x, isPouring: !x.isPouring } : x));
                                        }}
                                        className={`px-6 py-2 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all shadow-xl backdrop-blur-md border ${c.isPouring ? 'bg-blue-600 text-white border-blue-400 animate-pulse' : 'bg-slate-800/80 text-slate-300 border-white/10'}`}
                                    >
                                        {c.isPouring ? 'Pouring...' : 'Pour'}
                                    </button>
                                )}
                            </div>
                        )}
                        <GlassRenderer container={c} isHeld={heldId === c.id} />
                    </div>
                ))}

                {/* Pouring Stream Visualization */}
                {containers.map(c => c.isPouring && c.currentVolume > 0 && Math.abs(c.rotation) > 30 && (
                    <PouringStream key={`stream-${c.id}`} source={c} />
                ))}
            </div>
        </div>
    );
};

// --- VISUAL RENDERERS ---

const PouringStream: React.FC<{ source: LabContainer }> = ({ source }) => {
    const { color } = blendChemicals(source.contents);
    const def = GLASS_DEFS[source.type];
    const rad = source.rotation * (Math.PI / 180);
    
    // Spout offset flips with rotation
    const actualSpoutOffset = { 
        x: source.rotation < 0 ? -def.spoutOffset.x : def.spoutOffset.x, 
        y: def.spoutOffset.y 
    };

    const startX = source.x + (actualSpoutOffset.x * Math.cos(rad) - actualSpoutOffset.y * Math.sin(rad));
    const startY = source.y + (actualSpoutOffset.x * Math.sin(rad) + actualSpoutOffset.y * Math.cos(rad));
    
    const endX = startX + Math.sin(Date.now() / 150) * 3;
    const endY = startY + 300;

    return (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-40 overflow-visible">
            <defs>
                <filter id="streamGlow">
                    <feGaussianBlur stdDeviation="3" />
                    <feComposite in="SourceGraphic" operator="over" />
                </filter>
            </defs>
            <path 
                d={`M ${startX} ${startY} Q ${startX} ${startY + 80}, ${endX} ${endY}`}
                stroke={color}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                filter="url(#streamGlow)"
                className="animate-stream-flow"
                style={{ strokeDasharray: '12, 4' }}
            />
        </svg>
    );
};

const GlassRenderer: React.FC<{ container: LabContainer; isHeld: boolean }> = ({ container, isHeld }) => {
    const { color } = blendChemicals(container.contents);
    const fill = (container.currentVolume / container.capacity) * 100;
    const def = GLASS_DEFS[container.type];

    const renderGlassBody = () => {
        const glassFill = "rgba(255, 255, 255, 0.04)";
        const glassStroke = "rgba(255, 255, 255, 0.25)";
        
        switch (container.type) {
            case 'beaker':
                return (
                    <g>
                        <rect x="-45" y="-55" width="90" height="110" rx="8" fill={glassFill} stroke={glassStroke} strokeWidth="3" />
                        <rect x="-45" y={55 - (fill * 1.1)} width="90" height={fill * 1.1} rx="2" fill={color} className="transition-all duration-500" />
                        {Array.from({length: 6}).map((_, i) => <line key={i} x1="20" y1={40 - i * 18} x2="40" y2={40 - i * 18} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />)}
                    </g>
                );
            case 'conical_flask':
                const path = "M -15 -65 L 15 -65 L 18 -40 L 50 65 L -50 65 L -18 -40 Z";
                return (
                    <g>
                        <path d={path} fill={glassFill} stroke={glassStroke} strokeWidth="3" />
                        <clipPath id={`fill-${container.id}`}><path d={path} /></clipPath>
                        <rect x="-50" y={65 - (fill * 1.3)} width="100" height={fill * 1.3} fill={color} clipPath={`url(#fill-${container.id})`} className="transition-all duration-500" />
                    </g>
                );
            case 'test_tube':
                return (
                    <g>
                        <path d="M -15 -60 L 15 -60 L 15 45 A 15 15 0 0 1 -15 45 Z" fill={glassFill} stroke={glassStroke} strokeWidth="3" />
                        <clipPath id={`tube-${container.id}`}><path d="M -15 -60 L 15 -60 L 15 45 A 15 15 0 0 1 -15 45 Z" /></clipPath>
                        <rect x="-15" y={60 - (fill * 1.2)} width="30" height={fill * 1.2} fill={color} clipPath={`url(#tube-${container.id})`} className="transition-all duration-500" />
                    </g>
                );
            case 'reagent_bottle':
                return (
                    <g>
                        <rect x="-35" y="-55" width="70" height="110" rx="12" fill="rgba(80, 40, 20, 0.7)" stroke="rgba(0,0,0,0.4)" strokeWidth="3" />
                        <rect x="-35" y={55 - fill} width="70" height={fill} rx="4" fill={color} className="mix-blend-overlay" />
                        <rect x="-20" y="-68" width="40" height="14" rx="2" fill="#111" />
                        <rect x="-25" y="-15" width="50" height="40" rx="4" fill="#fff" />
                        <text x="0" y="8" textAnchor="middle" fontSize="7" fill="#222" fontWeight="900" className="uppercase tracking-tighter" style={{ pointerEvents: 'none' }}>
                             {container.label?.split(' ').slice(0, 2).join(' ') || container.name.split(' ')[0]}
                        </text>
                    </g>
                );
            case 'measuring_cylinder':
                return (
                    <g>
                        <rect x="-20" y="-90" width="40" height="180" rx="4" fill={glassFill} stroke={glassStroke} strokeWidth="3" />
                        <rect x="-20" y={90 - (fill * 1.8)} width="40" height={fill * 1.8} fill={color} className="transition-all duration-500" />
                        {Array.from({length: 10}).map((_, i) => <line key={i} x1="-10" y1={80 - i * 16} x2="10" y2={80 - i * 16} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />)}
                    </g>
                );
            case 'burette':
                return (
                    <g>
                        <rect x="-10" y="-175" width="20" height="350" rx="4" fill={glassFill} stroke={glassStroke} strokeWidth="2" />
                        <rect x="-10" y={175 - (fill * 3.5)} width="20" height={fill * 3.5} fill={color} className="transition-all duration-500" />
                        <circle cx="0" cy="140" r="10" fill="#333" stroke="#555" strokeWidth="2" />
                    </g>
                );
            case 'bunsen_burner':
                return (
                    <g>
                        <rect x="-40" y="55" width="80" height="10" rx="2" fill="#1e293b" />
                        <rect x="-10" y="-40" width="20" height="100" fill="#64748b" stroke="#475569" strokeWidth="2" />
                        <circle cx="0" cy="55" r="14" fill="#334155" />
                    </g>
                );
            case 'retort_stand':
                return (
                    <g>
                        <rect x="-75" y="190" width="150" height="10" rx="2" fill="#1e293b" />
                        <rect x="-5" y="-200" width="10" height="400" rx="2" fill="#94a3b8" />
                        <rect x="-60" y="-80" width="120" height="4" rx="2" fill="#475569" />
                    </g>
                );
            default: return null;
        }
    };

    return (
        <div className={`relative transition-all duration-500 ${isHeld ? 'drop-shadow-[0_40px_60px_rgba(0,0,0,0.8)] scale-110' : 'drop-shadow-2xl'}`}>
            <svg width={def.width} height={def.height} viewBox={`-${def.width/2} -${def.height/2} ${def.width} ${def.height}`} style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="glassShiny" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                        <stop offset="40%" stopColor="white" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {renderGlassBody()}
                <path d={`M -${def.width/2.5} -${def.height/2.5} Q -${def.width/3} 0 -${def.width/2.5} ${def.height/2.5}`} stroke="url(#glassShiny)" strokeWidth="6" fill="none" opacity="0.8" strokeLinecap="round" />
            </svg>
        </div>
    );
};

export default ChemistryLab;
