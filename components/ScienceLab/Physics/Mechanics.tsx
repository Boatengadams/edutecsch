
import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- TYPES ---

type ComponentType = 'retort_stand' | 'metre_rule' | 'spring' | 'string' | 'stopwatch' | 'protractor' | 'mass_5g' | 'mass_10g' | 'mass_20g' | 'mass_50g' | 'mass_100g' | 'pendulum_bob' | 'knife_edge' | 'beaker' | 'pulley' | 'optical_pin';

interface MechanicsComponent {
    id: string;
    type: ComponentType;
    name: string;
    x: number; 
    y: number; 
    rotation?: number; 
    mass?: number;        
    length?: number;      
    stiffness?: number;   
    density?: number;     
    volume?: number;      
    currentLength?: number; 
    angle?: number;         
    angularVelocity?: number; 
    velocity?: number;      
    isPaused?: boolean;     
    parentId?: string | null;
    attachmentMark?: number; 
    attachmentOffset?: number; 
    clampY?: number; 
    state?: { 
        isOpen?: boolean; 
        flipped?: boolean;
    };
    stopwatchTime?: number;
    stopwatchRunning?: boolean;
    targetOscillations?: number; 
    currentOscillationCount?: number; 
    locked?: boolean;
    visible?: boolean;
}

interface MechanicsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

// --- CONSTANTS & CONFIG ---
const PIXELS_PER_CM = 5; 
const RULER_WIDTH_PX = 500; 
const DEFAULT_STIFFNESS = 25; 
const DEFAULT_DAMPING = 0.3; 
const DEFAULT_GRAVITY = 9.81;
const SNAP_RADIUS = 40; 
const DETACH_THRESHOLD = 80; 

// --- TOOLBOX DEFINITIONS ---
const TOOLBOX_ITEMS: { id: ComponentType; label: string; icon: string; defaultProps?: Partial<MechanicsComponent> }[] = [
    { id: 'retort_stand', label: 'Retort Stand', icon: '🏗️', defaultProps: { clampY: 400, rotation: 0, state: { flipped: false, isOpen: false }, locked: false } },
    { id: 'metre_rule', label: 'Metre Rule', icon: '📏', defaultProps: { mass: 100, rotation: 0, angularVelocity: 0, length: 100 } },
    { id: 'knife_edge', label: 'Knife Edge', icon: '🔺', defaultProps: { rotation: 0, mass: 50 } },
    { id: 'spring', label: 'Spiral Spring', icon: '➰', defaultProps: { length: 15, stiffness: DEFAULT_STIFFNESS, currentLength: 15, rotation: 0, velocity: 0, angularVelocity: 0 } },
    { id: 'string', label: 'Thread / String', icon: '🧵', defaultProps: { length: 40, angle: 15, angularVelocity: 0, rotation: 0 } },
    { id: 'pendulum_bob', label: 'Pendulum Bob', icon: '⚫', defaultProps: { mass: 50, rotation: 0 } },
    { id: 'beaker', label: 'Beaker', icon: '🥃', defaultProps: { density: 1.0, volume: 500 } }, 
    { id: 'stopwatch', label: 'Stopwatch', icon: '⏱️', defaultProps: { rotation: 0, stopwatchTime: 0, stopwatchRunning: false } },
    { id: 'protractor', label: 'Protractor', icon: '📐', defaultProps: { rotation: 0 } },
    { id: 'pulley', label: 'Pulley', icon: '⚙️', defaultProps: { rotation: 0 } },
    { id: 'optical_pin', label: 'Optical Pin', icon: '📍', defaultProps: { rotation: 0 } },
];

const MASSES: { id: string; label: string; weight: number; color: string; size: number }[] = [
    { id: 'mass_5g', label: '5g', weight: 5, color: '#e2e8f0', size: 25 },
    { id: 'mass_10g', label: '10g', weight: 10, color: '#cbd5e1', size: 30 },
    { id: 'mass_20g', label: '20g', weight: 20, color: '#94a3b8', size: 35 }, 
    { id: 'mass_50g', label: '50g', weight: 50, color: '#fcd34d', size: 42 }, 
    { id: 'mass_100g', label: '100g', weight: 100, color: '#fbbf24', size: 50 }, 
];

// --- VISUAL COMPONENTS ---
const MetreRuleVisual = ({ rotation }: { rotation: number }) => {
    return (
        <div className="w-[500px] h-[40px] relative select-none group">
            <svg width="500" height="40" viewBox="0 0 500 40" className="drop-shadow-xl overflow-visible">
                <defs>
                    <linearGradient id="woodGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <filter id="woodGrain">
                        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0.2" />
                        <feBlend in="SourceGraphic" mode="multiply" />
                    </filter>
                </defs>
                {/* Main Body */}
                <rect x="0" y="0" width="500" height="40" rx="2" fill="url(#woodGradient)" stroke="#78350f" strokeWidth="1" />
                <rect x="0" y="0" width="500" height="40" rx="2" fill="#000" opacity="0.1" filter="url(#woodGrain)" />
                {/* Ends */}
                <rect x="0" y="0" width="10" height="40" rx="2" fill="#fcd34d" stroke="#b45309" />
                <rect x="490" y="0" width="10" height="40" rx="2" fill="#fcd34d" stroke="#b45309" />
                {/* Markings */}
                {Array.from({ length: 101 }).map((_, i) => {
                    const isDecimeter = i % 10 === 0;
                    const isMid = i % 5 === 0 && !isDecimeter;
                    const h = isDecimeter ? 15 : isMid ? 10 : 6;
                    const x = i * 5;
                    return (
                        <g key={i}>
                            <line x1={x} y1={0} x2={x} y2={h} stroke="#451a03" strokeWidth={isDecimeter ? 1.5 : 1} />
                            {isDecimeter && i !== 0 && i !== 100 && (
                                <text x={x} y={28} fontSize="9" textAnchor="middle" fontWeight="bold" fill="#451a03" fontFamily="monospace">{i}</text>
                            )}
                        </g>
                    );
                })}
                {/* Center Marker */}
                <circle cx="250" cy="20" r="2" fill="red" />
            </svg>
            {/* Torque Overlay */}
            {Math.abs(rotation) > 2 && (
                 <div className="absolute top-[-35px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 bg-white/90 px-3 py-1 rounded-full border border-red-200 shadow-sm whitespace-nowrap z-50">
                     {rotation > 0 ? '↻' : '↺'} {(Math.abs(rotation)).toFixed(1)}°
                 </div>
            )}
        </div>
    );
};

const RetortStandVisual = ({ clampY, isSelected, flipped, isOpen, onClampMouseDown }: any) => {
    const jawOffset = isOpen ? 12 : 0; 
    return (
        <div className="relative select-none w-40 h-[600px] flex flex-col justify-end items-center group">
            {/* Base */}
            <div className={`w-48 h-8 bg-[#334155] rounded-md shadow-2xl border-t border-slate-500 relative z-20 flex justify-center items-center ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                 <div className="absolute inset-0 bg-gradient-to-b from-slate-600 to-slate-800 rounded-md"></div>
                 <span className="absolute bottom-1 text-[8px] text-slate-400 font-mono tracking-widest">LAB-EQUIP</span>
            </div>
            {/* Rod */}
            <div className="absolute bottom-6 w-3 h-[580px] bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-t-full shadow-lg z-10 border-x border-slate-400"></div>
            {/* Clamp */}
            <div 
                className="absolute left-1/2 z-30 transition-transform duration-75 cursor-ns-resize group/clamp" 
                style={{ bottom: clampY, transform: `translateX(-50%) ${flipped ? 'scaleX(-1)' : ''}` }}
                onMouseDown={onClampMouseDown}
                onTouchStart={onClampMouseDown}
            >
                 <div className="absolute -left-6 -top-5 w-12 h-10 bg-slate-700 rounded shadow-xl flex items-center justify-center border border-slate-500">
                    <div className="w-3 h-3 bg-slate-400 rounded-full shadow-inner border border-slate-600"></div>
                 </div>
                 <div className="absolute left-0 top-0 w-28 h-3 bg-gradient-to-b from-slate-300 to-slate-500 rounded-r-sm shadow-md border border-slate-500"></div>
                 {/* Jaws */}
                 <div className="absolute left-[112px] top-[-10px] flex flex-col items-center">
                     <div className="w-6 h-4 bg-slate-600 border border-slate-500 rounded-t-md relative z-10 shadow-sm flex items-end justify-center"><div className="w-5 h-1 bg-[#8d6e63] rounded-sm opacity-90"></div></div>
                     <div className="w-1 h-6 bg-slate-400/50 absolute top-3 z-0"></div>
                     <div className="w-6 h-4 bg-slate-600 border border-slate-500 rounded-b-md relative z-10 shadow-sm flex items-start justify-center transition-all duration-300 ease-out" style={{ transform: `translateY(${jawOffset}px)` }}>
                          <div className="w-5 h-1 bg-[#8d6e63] rounded-sm opacity-90"></div>
                     </div>
                     <div className="absolute top-10 w-2 h-6 bg-slate-400 rounded-b-full transition-all duration-300" style={{ transform: `translateY(${jawOffset}px)` }}>
                         <div className="w-4 h-2 bg-slate-700 absolute bottom-0 -left-1 rounded-full"></div>
                     </div>
                 </div>
            </div>
        </div>
    );
};

const SpringSVG = ({ length }: { length: number }) => {
    const visualLength = Math.max(30, length);
    const coils = 12;
    const width = 24;
    const coilHeight = (visualLength - 20) / coils; 
    let d = `M ${width/2} -5 L ${width/2} 5 A 4 4 0 1 0 ${width/2 - 5} 8 L ${width/2} 10 `; 
    for(let i=0; i<coils; i++) {
        const y = 10 + i * coilHeight;
        d += `Q ${width} ${y + coilHeight/4} ${0} ${y + coilHeight/2} Q ${width} ${y + 3*coilHeight/4} ${width/2} ${y + coilHeight} `;
    }
    d += `L ${width/2} ${visualLength - 5} A 4 4 0 1 0 ${width/2 - 0.1} ${visualLength}`; 

    return (
        <div className="relative pointer-events-none group">
            <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 border border-red-500/0 rounded-full"></div>
            <svg width={width} height={visualLength + 10} className="overflow-visible drop-shadow-sm">
                <path d={d} fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
};

const PendulumBobVisual = ({ mass }: { mass: number }) => (
    <div className="relative flex flex-col items-center select-none pointer-events-none filter drop-shadow-2xl">
        <div className="w-2 h-3 -mb-1 bg-gradient-to-r from-yellow-700 to-yellow-500 rounded-t-sm z-10"></div>
        <div className="w-14 h-14 rounded-full relative z-20 bg-[radial-gradient(circle_at_30%_30%,#fde047,#eab308,#854d0e)] shadow-inner flex items-center justify-center">
             <div className="absolute top-3 left-3 w-5 h-3 bg-white/80 blur-[2px] rounded-full transform -rotate-45"></div>
             <span className="text-[10px] font-bold text-yellow-900/40 drop-shadow-[1px_1px_0_rgba(255,255,255,0.2)]">{mass}g</span>
        </div>
    </div>
);

const MassVisual = ({ mass }: { mass: number }) => (
    <div className="relative flex flex-col items-center group pointer-events-none select-none filter drop-shadow-md">
        <div className="w-1.5 h-4 bg-slate-500 -mb-2 z-0 mx-auto rounded-t"><div className="w-3 h-3 border-2 border-slate-500 rounded-full -mt-2 -ml-[3px]"></div></div>
        <div className="relative z-10 flex items-center justify-center" style={{ width: mass >= 50 ? 44 : 32, height: mass >= 50 ? 35 : 25 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 80" preserveAspectRatio="none">
                <path d="M10,0 L90,0 L100,20 L100,60 L90,80 L10,80 L0,60 L0,20 Z" fill={mass >= 50 ? "#eab308" : "#94a3b8"} stroke="#333" strokeWidth="1" />
                <text x="50" y="50" textAnchor="middle" fontSize="24" fill="#333" fontWeight="bold">{mass}</text>
            </svg>
        </div>
    </div>
);


const Mechanics: React.FC<MechanicsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<MechanicsComponent[]>([]);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const workbenchRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: string, startX: number, startY: number, initialX: number, initialY: number } | null>(null);

    const spawnComponent = (type: ComponentType) => {
        const item = TOOLBOX_ITEMS.find(i => i.id === type);
        const scrollX = workbenchRef.current?.scrollLeft || 0;
        const scrollY = workbenchRef.current?.scrollTop || 0;
        const newComp: MechanicsComponent = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            name: item?.label || 'Component',
            x: 400 + scrollX + (Math.random() * 50),
            y: 300 + scrollY + (Math.random() * 50),
            ...item?.defaultProps
        };
        setComponents([...components, newComp]);
    };

    // Basic drag implementation
    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const comp = components.find(c => c.id === id);
        if(comp) {
            dragRef.current = { 
                id, 
                startX: e.clientX, 
                startY: e.clientY,
                initialX: comp.x,
                initialY: comp.y
            };
            setSelectedId(id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if(dragRef.current) {
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setComponents(prev => prev.map(c => {
                if(c.id === dragRef.current?.id) {
                    return { ...c, x: dragRef.current.initialX + dx, y: dragRef.current.initialY + dy };
                }
                return c;
            }));
        }
    };

    const handleMouseUp = () => {
        dragRef.current = null;
    };
    
    const deleteSelected = () => {
        if(selectedId) {
            setComponents(prev => prev.filter(c => c.id !== selectedId));
            setSelectedId(null);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#0f172a] relative select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={() => { setSelectedId(null); setSidebarOpen(false); }}>
            
             <button 
                onClick={(e) => { e.stopPropagation(); setSidebarOpen(!isSidebarOpen); }} 
                className="absolute top-4 left-4 z-50 p-3 bg-slate-800 rounded-full text-white shadow-lg border border-slate-600 hover:bg-slate-700 transition-colors"
                title="Mechanics Tools"
            >
                {isSidebarOpen ? '✖️' : '🛠️'}
            </button>

            {/* Sidebar */}
             <div 
                className={`absolute top-0 left-0 h-full w-64 bg-[#1e293b] border-r border-slate-700 z-40 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="p-4 pt-16 flex flex-col gap-4 h-full overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Lab Equipment</h3>
                    <div className="grid grid-cols-2 gap-2">
                    {TOOLBOX_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => spawnComponent(item.id)}
                            className="flex flex-col items-center p-3 bg-slate-800 rounded-xl border border-slate-600 hover:border-blue-500 hover:bg-slate-700 transition-all shadow-md active:scale-95"
                        >
                            <span className="text-2xl mb-1">{item.icon}</span>
                            <span className="text-[10px] text-slate-300 font-bold text-center">{item.label}</span>
                        </button>
                    ))}
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4">Masses</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {MASSES.map(mass => (
                             <button
                                key={mass.id}
                                onClick={() => {
                                     const scrollX = workbenchRef.current?.scrollLeft || 0;
                                     const scrollY = workbenchRef.current?.scrollTop || 0;
                                     const newComp: MechanicsComponent = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: mass.id as any,
                                        name: mass.label,
                                        x: 400 + scrollX, y: 300 + scrollY,
                                        mass: mass.weight,
                                        rotation: 0
                                    };
                                    setComponents(prev => [...prev, newComp]);
                                }}
                                className="flex flex-col items-center p-2 bg-slate-800 rounded-lg border border-slate-600 hover:bg-slate-700"
                            >
                                <span className="text-xl">⚖️</span>
                                <span className="text-[10px] font-bold">{mass.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-grow"></div>
                    <button onClick={() => setComponents([])} className="w-full py-3 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center gap-2 transition-colors border border-red-500/30">
                        <span>🗑️</span> Clear Bench
                    </button>
                </div>
            </div>

            {/* Workspace */}
            <div ref={workbenchRef} className="flex-grow bg-[#0f172a] relative overflow-auto custom-scrollbar cursor-crosshair">
                <div className="absolute inset-0 bg-[radial-gradient(rgba(30,41,59,0.4)_1px,transparent_1px)] bg-[size:20px_20px] opacity-50 pointer-events-none" style={{width: '2000px', height: '1500px'}}></div>
                
                 {/* Floor / Table Surface visual */}
                 <div className="absolute bottom-0 w-full h-12 bg-slate-800 border-t border-slate-600" style={{width: '2000px', top: '1440px'}}></div>

                 {components.map(comp => (
                     <div
                        key={comp.id}
                        className={`absolute cursor-grab active:cursor-grabbing ${selectedId === comp.id ? 'z-50' : 'z-10'}`}
                        style={{ left: comp.x, top: comp.y, transform: 'translate(-50%, -50%)' }}
                        onMouseDown={(e) => handleMouseDown(e, comp.id)}
                     >
                        {/* Selection Highlight */}
                        {selectedId === comp.id && (
                             <>
                                <div className="absolute inset-[-10px] border-2 border-cyan-400 rounded-lg opacity-60 pointer-events-none animate-pulse"></div>
                                <button 
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600"
                                    onClick={(e) => { e.stopPropagation(); deleteSelected(); }}
                                >
                                    🗑️
                                </button>
                             </>
                        )}
                        
                        {/* Visuals */}
                        {comp.type === 'metre_rule' && <MetreRuleVisual rotation={comp.rotation || 0} />}
                        {comp.type === 'retort_stand' && <RetortStandVisual clampY={comp.clampY || 400} isSelected={selectedId === comp.id} />}
                        {comp.type === 'spring' && <SpringSVG length={comp.currentLength || 30} />}
                        {comp.type === 'pendulum_bob' && <PendulumBobVisual mass={comp.mass || 50} />}
                        {(comp.type.startsWith('mass_')) && <MassVisual mass={comp.mass || 0} />}
                        
                        {/* Fallback for others */}
                        {['stopwatch', 'protractor', 'knife_edge', 'string', 'beaker', 'pulley', 'optical_pin'].includes(comp.type) && (
                             <div className="bg-slate-700 p-2 rounded border border-slate-500 flex flex-col items-center">
                                 <span className="text-2xl">{TOOLBOX_ITEMS.find(t => t.id === comp.type)?.icon || '❓'}</span>
                             </div>
                        )}
                     </div>
                 ))}
            </div>
        </div>
    );
};

export default Mechanics;
