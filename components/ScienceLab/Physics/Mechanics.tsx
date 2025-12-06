
import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- TYPES ---

type ComponentType = 'retort_stand' | 'metre_rule' | 'spring' | 'string' | 'stopwatch' | 'protractor' | 'mass_5g' | 'mass_10g' | 'mass_20g' | 'mass_50g' | 'mass_100g' | 'pendulum_bob' | 'knife_edge';

interface MechanicsComponent {
    id: string;
    type: ComponentType;
    name: string;
    x: number; // World X (Anchor point / Center of Mass)
    y: number; // World Y (Anchor point / Center of Mass)
    rotation?: number; // Degrees
    
    // Physics Properties
    mass?: number;        // g
    length?: number;      // cm (rest length for spring/string)
    stiffness?: number;   // N/m (spring constant)
    
    // Dynamic State
    currentLength?: number; // cm (for springs)
    angle?: number;         // degrees (for pendulum string/ruler, 0 is vertical/horizontal)
    angularVelocity?: number; // rad/s
    velocity?: number;      // cm/s (vertical for spring)
    
    // Hierarchy & Attachment
    parentId?: string | null; // ID of the object this is attached to
    attachmentOffset?: number; // Distance from center (pixels) for rulers attached to pivots (Legacy, mapped from attachmentMark)
    attachmentMark?: number; // Specific CM mark (0-100) where attachment occurs on ruler
    
    // Specific Configs
    clampY?: number; // For Stand: Height of clamp relative to base (pixels from bottom)
    
    // Stopwatch
    stopwatchTime?: number;
    stopwatchRunning?: boolean;
    targetOscillations?: number;
    currentOscillationCount?: number;
    lastZeroCrossing?: number; 
    lastValue?: number;

    // PixelLab Features
    locked?: boolean;
    visible?: boolean;
    groupId?: string; 
}

interface MechanicsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

// --- CONSTANTS & CONFIG ---
const PIXELS_PER_CM = 5; 
const TIME_STEP = 1/60;
const DAMPING = 0.995; 
const SNAP_RADIUS = 40;

const TOOLBOX_ITEMS: { id: ComponentType; label: string; icon: string; defaultProps?: Partial<MechanicsComponent> }[] = [
    { id: 'retort_stand', label: 'Retort Stand', icon: '🏗️', defaultProps: { clampY: 400, rotation: 0 } },
    { id: 'spring', label: 'Spiral Spring', icon: '➰', defaultProps: { length: 20, stiffness: 15, currentLength: 20, rotation: 0 } },
    { id: 'string', label: 'Thread', icon: '🧵', defaultProps: { length: 40, angle: 0, angularVelocity: 0, rotation: 0 } },
    { id: 'metre_rule', label: 'Metre Rule', icon: '📏', defaultProps: { mass: 100, rotation: 0, angularVelocity: 0 } },
    { id: 'knife_edge', label: 'Knife Edge', icon: '🔺', defaultProps: { rotation: 0 } },
    { id: 'pendulum_bob', label: 'Pendulum Bob', icon: '⚫', defaultProps: { mass: 50, rotation: 0 } },
    { id: 'protractor', label: 'Protractor', icon: '📐', defaultProps: { rotation: 0 } },
    { id: 'stopwatch', label: 'Stopwatch', icon: '⏱️', defaultProps: { targetOscillations: 20, currentOscillationCount: 0, rotation: 0 } },
];

const MASSES = [
    { id: 'mass_5g', label: '5g', weight: 5, color: '#cbd5e1', size: 25 },
    { id: 'mass_10g', label: '10g', weight: 10, color: '#94a3b8', size: 30 },
    { id: 'mass_20g', label: '20g', weight: 20, color: '#fbbf24', size: 35 }, 
    { id: 'mass_50g', label: '50g', weight: 50, color: '#d97706', size: 42 }, 
    { id: 'mass_100g', label: '100g', weight: 100, color: '#92400e', size: 50 }, 
];

// --- VISUAL COMPONENTS ---

const RetortStandVisual = ({ clampY, isSelected }: { clampY: number, isSelected: boolean }) => (
    <div className="relative select-none pointer-events-none w-32 h-[600px] flex flex-col justify-end items-center group">
        <div className="w-4 h-[580px] bg-gradient-to-r from-slate-400 via-slate-100 to-slate-500 rounded-t-full shadow-xl relative z-10 border-x border-slate-500"></div>
        <div className={`w-40 h-8 bg-[#2d3748] rounded-md shadow-2xl border-t border-slate-600 relative z-20 flex justify-center items-center ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
             <div className="w-32 h-full border-x border-slate-900/30"></div>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30"></div>
        </div>
        <div className="absolute left-1/2 pointer-events-auto z-30 cursor-ns-resize" style={{ bottom: clampY, transform: 'translateX(-50%)' }}>
             <div className="relative -left-4 w-10 h-10 bg-slate-700 rounded shadow-lg border border-slate-500 flex items-center justify-center">
                <div className="w-8 h-8 bg-slate-600 rounded-full border border-slate-800 shadow-inner"></div>
                <div className="absolute -right-3 w-4 h-2 bg-slate-400 rounded-sm"></div>
             </div>
             <div className="absolute left-4 top-3 w-24 h-3 bg-gradient-to-b from-slate-300 to-slate-500 rounded-r-full shadow-md border border-slate-600"></div>
             <div className="absolute left-[98px] top-[0px] w-2 h-8 bg-slate-600 rounded-b-full shadow-sm border border-slate-500 z-40 bg-gradient-to-b from-slate-400 to-slate-600">
                 <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 border-b-2 border-x-2 border-slate-400 rounded-b-full"></div>
             </div>
             <div className="absolute -left-6 -top-2 w-40 h-14 bg-transparent hover:bg-blue-400/10 rounded-lg transition-colors cursor-ns-resize group-hover:ring-1 ring-blue-400/30"></div>
        </div>
    </div>
);

const SpringSVG = ({ length, width = 24, isExpanded }: { length: number; width?: number; isExpanded: boolean }) => {
    const visualLength = Math.max(15, length);
    const coils = 16;
    const coilHeight = (visualLength - 20) / coils;
    let d = `M ${width/2} 0 L ${width/2} 10 `; 
    for(let i=0; i<coils; i++) {
        const y = 10 + i * coilHeight;
        d += `L ${width} ${y + coilHeight/4} L 0 ${y + 3*coilHeight/4} `;
    }
    d += `L ${width/2} ${visualLength - 10} L ${width/2} ${visualLength}`; 
    return (
        <svg width={width} height={visualLength} className="overflow-visible pointer-events-none filter drop-shadow-sm">
            <path d={`M ${width/2} 2 A 3 3 0 1 1 ${width/2 + 0.1} 2`} stroke="#475569" strokeWidth="2.5" fill="none" />
            <path d={d} fill="none" stroke="url(#springMetal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
                <linearGradient id="springMetal" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#64748b" /><stop offset="40%" stopColor="#e2e8f0" /><stop offset="60%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#475569" />
                </linearGradient>
            </defs>
            <path d={`M ${width/2} ${visualLength - 5} Q ${width/2} ${visualLength} ${width/2 + 5} ${visualLength - 2}`} stroke="#475569" strokeWidth="2.5" fill="none" />
        </svg>
    );
};

const ProtractorVisual = () => (
    <div className="w-[300px] h-[150px] relative select-none">
        <svg viewBox="0 0 300 150" className="w-full h-full drop-shadow-lg opacity-90">
            <path d="M 10 150 A 140 140 0 0 1 290 150 L 150 150 Z" fill="rgba(255, 255, 255, 0.4)" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="150" y1="145" x2="150" y2="155" stroke="black" strokeWidth="2" /> 
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180].map(deg => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 150 + 130 * Math.cos(rad);
                const y1 = 150 - 130 * Math.sin(rad);
                const x2 = 150 + 140 * Math.cos(rad);
                const y2 = 150 - 140 * Math.sin(rad);
                return (
                    <g key={deg}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth={deg % 90 === 0 ? 2 : 1} />
                        {deg % 10 === 0 && deg !== 180 && deg !== 0 && (
                             <text x={150 + 115 * Math.cos(rad)} y={150 - 115 * Math.sin(rad)} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#333">{180 - deg}</text>
                        )}
                    </g>
                )
            })}
        </svg>
    </div>
);

const KnifeEdgeVisual = () => (
    <div className="relative select-none pointer-events-none group">
        <svg width="50" height="60" viewBox="0 0 50 60" className="drop-shadow-xl">
             <defs>
                 <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#94a3b8" /> {/* slate-400 */}
                     <stop offset="50%" stopColor="#e2e8f0" /> {/* slate-200 highlight */}
                     <stop offset="100%" stopColor="#64748b" /> {/* slate-500 shadow */}
                 </linearGradient>
             </defs>
             <path d="M 25 0 L 50 50 L 0 50 Z" fill="url(#prismGrad)" stroke="#475569" strokeWidth="1" />
             <path d="M 25 0 L 25 50" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
        </svg>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
);

const PendulumBobVisual = ({ mass }: { mass: number }) => (
     <div className="relative flex flex-col items-center select-none pointer-events-none">
        <div className="w-2 h-3 border-2 border-slate-600 rounded-t-full -mb-1 bg-transparent relative z-0"></div>
        <div className="w-12 h-12 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#f1f5f9,_#475569,_#0f172a)] shadow-[inset_-2px_-2px_10px_rgba(0,0,0,0.5),5px_5px_15px_rgba(0,0,0,0.4)] z-10 flex items-center justify-center">
             <span className="text-[8px] font-bold text-slate-400 opacity-60">{mass}g</span>
        </div>
     </div>
);

const MassVisual = ({ mass }: { mass: number }) => {
    let color = '#cbd5e1'; 
    let size = 30;
    if (mass >= 100) { color = '#92400e'; size = 50; } 
    else if (mass >= 50) { color = '#d97706'; size = 42; } 
    else if (mass >= 20) { color = '#fbbf24'; size = 35; } 
    else if (mass >= 10) { color = '#94a3b8'; size = 30; } 

    return (
        <div className="relative flex flex-col items-center group pointer-events-none select-none">
            <div className="w-1 h-4 bg-slate-600 -mb-1 z-0 mx-auto">
                 <div className="w-4 h-4 border-2 border-slate-600 rounded-full -mt-3 -ml-[6px]"></div>
            </div>
            <div 
                className="relative z-10 rounded-sm shadow-[4px_4px_10px_rgba(0,0,0,0.4)] flex items-center justify-center border-b-2 border-black/20"
                style={{ 
                    background: `linear-gradient(90deg, ${color} 0%, #ffffff 20%, ${color} 40%, #000000 100%)`,
                    width: size, height: size * 0.9,
                }}
            >
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                <span className="text-[10px] font-black text-black/60 drop-shadow-sm z-20 tracking-tighter">{mass}g</span>
                 <div className="absolute right-0 top-1/2 w-[60%] h-[2px] bg-black/40 transform -translate-y-1/2"></div>
            </div>
            <div className="w-1 h-3 bg-slate-600 -mt-1 z-0 mx-auto">
                 <div className="w-4 h-4 border-2 border-slate-600 rounded-full -mb-3 -ml-[6px]"></div>
            </div>
        </div>
    );
};

const StopwatchVisual = ({ time, running, count, target, onSetTarget }: { time: number, running: boolean, count: number, target: number, onSetTarget: (v: number) => void }) => (
    <div className="w-32 h-40 relative drop-shadow-2xl group select-none transform transition-transform active:scale-95 flex flex-col items-center">
         <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-3 bg-slate-300 rounded-t-sm shadow-sm z-0"></div>
         <div className={`absolute top-5 left-1/2 -translate-x-1/2 w-6 h-2 bg-red-500 rounded-sm cursor-pointer shadow-md transition-transform ${running ? 'translate-y-1' : ''}`}></div> 
         <div className="absolute top-7 right-4 w-3 h-2 bg-blue-500 rounded-sm cursor-pointer shadow-md transform rotate-12"></div>
         <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-300 rounded-full border-4 border-slate-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] flex items-center justify-center relative z-10 ring-1 ring-black/20 mt-8">
             <div className="w-16 h-16 bg-[#c0d8d8] rounded-full flex flex-col items-center justify-center shadow-inner border border-slate-400/50">
                 <span className="font-mono text-lg font-bold text-slate-800 tracking-widest">{(time / 1000).toFixed(2)}</span>
                 <span className="text-[6px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">Count: {count}</span>
             </div>
         </div>
         <div className="absolute -bottom-10 bg-slate-800/90 backdrop-blur p-2 rounded-xl border border-slate-600 shadow-xl flex flex-col items-center gap-1 z-30 pointer-events-auto w-full" onMouseDown={e => e.stopPropagation()}>
             <div className="flex items-center justify-between w-full text-[8px] text-slate-400 uppercase font-bold px-1"><span>Target Osc.</span></div>
             <div className="flex items-center gap-2 w-full justify-center">
                 <input type="number" value={target} onChange={(e) => onSetTarget(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 h-6 bg-slate-900 text-white text-xs text-center border border-slate-700 rounded focus:border-blue-500 outline-none" />
             </div>
         </div>
    </div>
);

// --- MAIN COMPONENT ---

const Mechanics: React.FC<MechanicsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<MechanicsComponent[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isLayerPanelOpen, setLayerPanelOpen] = useState(false);
    const [gravity, setGravity] = useState(9.81);
    
    // Attachment Modal State
    const [attachModalOpen, setAttachModalOpen] = useState(false);
    const [pendingAttach, setPendingAttach] = useState<{ childId: string, parentId: string } | null>(null);
    const [attachMarkInput, setAttachMarkInput] = useState<string>('50');

    const compsRef = useRef<MechanicsComponent[]>([]); 
    const gravityRef = useRef(9.81); 
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    
    const dragRef = useRef<{
        active: boolean;
        id: string | null; 
        type: 'move' | 'clamp' | 'pull' | 'resize'; 
        startX: number;
        startY: number;
        initialVal: number; 
        offsetX: number; 
        offsetY: number;
        initialComponentPositions: Record<string, {x: number, y: number}>; 
    }>({ active: false, id: null, type: 'move', startX: 0, startY: 0, initialVal: 0, offsetX: 0, offsetY: 0, initialComponentPositions: {} });

    useEffect(() => { compsRef.current = components; }, [components]);
    useEffect(() => { gravityRef.current = gravity; }, [gravity]);

    // --- ATTACHMENT SYSTEM ---

    const getAttachmentPoint = (parent: MechanicsComponent): { x: number, y: number } | null => {
        if (parent.type === 'retort_stand') {
            const standCenter = parent.x;
            const standBottom = parent.y;
            const clampHeightFromBottom = parent.clampY || 400;
            const hookOffsetX = 62; 
            const hookOffsetY = -(clampHeightFromBottom + 5);
            return { x: standCenter + hookOffsetX, y: standBottom + hookOffsetY };
        }
        if (parent.type === 'spring') {
            const lenPx = (parent.currentLength || 20) * PIXELS_PER_CM;
            return { x: parent.x, y: parent.y + lenPx };
        }
        if (parent.type === 'string') {
            const lenPx = (parent.length || 50) * PIXELS_PER_CM;
            const rad = (parent.angle || 0) * (Math.PI / 180);
            return {
                x: parent.x + Math.sin(rad) * lenPx,
                y: parent.y + Math.cos(rad) * lenPx
            };
        }
        if (parent.type.startsWith('mass') || parent.type === 'pendulum_bob') {
            let size = 30;
            const massVal = parent.mass || 10;
            if (parent.type === 'pendulum_bob') size = 48;
            else if (massVal >= 100) size = 50;
            else if (massVal >= 50) size = 42;
            else if (massVal >= 20) size = 35;
            return { x: parent.x, y: parent.y + size * 0.9 + 5 };
        }
        if (parent.type === 'knife_edge') {
            return { x: parent.x, y: parent.y - 50 };
        }
        return null;
    };

    const updateChildPositions = (comps: MechanicsComponent[]) => {
        let moved = false;
        const compMap = new Map(comps.map(c => [c.id, c]));

        comps.forEach(comp => {
            if (comp.parentId) {
                const parent = compMap.get(comp.parentId);
                if (parent) {
                    // Logic for Ruler on Knife Edge (Balance)
                    if (comp.type === 'metre_rule' && parent.type === 'knife_edge') {
                        const pivot = getAttachmentPoint(parent);
                        if (pivot) {
                            const rad = (comp.rotation || 0) * (Math.PI / 180);
                            const offset = comp.attachmentOffset || 0;
                            
                            const newX = pivot.x - (offset * Math.cos(rad));
                            const newY = pivot.y - (offset * Math.sin(rad)); 
                            
                            if (Math.abs(comp.x - newX) > 0.01 || Math.abs(comp.y - newY) > 0.01) {
                                comp.x = newX;
                                comp.y = newY;
                                moved = true;
                            }
                        }
                        return;
                    }

                    // Logic for Ruler hanging on String
                    if (comp.type === 'metre_rule' && parent.type === 'string') {
                        const pivot = getAttachmentPoint(parent);
                        if (pivot) {
                             // attachmentMark is 0-100cm. Center is 50cm.
                             // Offset from center in pixels
                             const mark = comp.attachmentMark !== undefined ? comp.attachmentMark : 50;
                             const offsetCm = mark - 50; // e.g., 10 - 50 = -40cm
                             const offsetPx = offsetCm * PIXELS_PER_CM; // e.g., -200px
                             const rad = (comp.rotation || 0) * (Math.PI / 180);
                             
                             // Pivot X = CenterX + (offset * cos(theta))
                             // So CenterX = PivotX - (offset * cos(theta))
                             const newX = pivot.x - (offsetPx * Math.cos(rad));
                             const newY = pivot.y - (offsetPx * Math.sin(rad));

                             if (Math.abs(comp.x - newX) > 0.01 || Math.abs(comp.y - newY) > 0.01) {
                                comp.x = newX;
                                comp.y = newY;
                                moved = true;
                             }
                        }
                        return;
                    }

                    // Logic for Masses on Metre Rule (Moment)
                    if ((comp.type.startsWith('mass') || comp.type === 'pendulum_bob') && parent.type === 'metre_rule') {
                         // Use attachmentMark if set, else attachmentOffset (legacy)
                         let offset = comp.attachmentOffset || 0;
                         if (comp.attachmentMark !== undefined) {
                             offset = (comp.attachmentMark - 50) * PIXELS_PER_CM;
                         }

                         const rad = (parent.rotation || 0) * (Math.PI / 180);
                         const attachX = parent.x + offset * Math.cos(rad);
                         const attachY = parent.y + offset * Math.sin(rad);
                         
                         const hangDist = 20; 
                         const targetX = attachX + hangDist * Math.sin(rad); 
                         const targetY = attachY + hangDist * Math.cos(rad); 

                         if (Math.abs(comp.x - targetX) > 0.01 || Math.abs(comp.y - targetY) > 0.01) {
                            comp.x = targetX;
                            comp.y = targetY;
                            moved = true;
                         }
                         return;
                    }

                    // Default Attachment
                    const anchor = getAttachmentPoint(parent);
                    if (anchor) {
                        if (Math.abs(comp.x - anchor.x) > 0.01 || Math.abs(comp.y - anchor.y) > 0.01) {
                            comp.x = anchor.x;
                            comp.y = anchor.y;
                            moved = true;
                        }
                    }
                } else {
                    comp.parentId = null;
                }
            }
        });
        return moved;
    };

    // --- PHYSICS LOOP ---
    const updatePhysics = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const dt = TIME_STEP;
        lastTimeRef.current = time;
        const g = gravityRef.current;

        const currentComps = compsRef.current; 
        
        // 1. Update Kinematics (Attachments)
        for (let i = 0; i < 3; i++) {
            updateChildPositions(currentComps);
        }

        // 2. Dynamics
        currentComps.forEach(comp => {
            const loadMassG = currentComps
                .filter(c => c.parentId === comp.id)
                .reduce((sum, child) => sum + (child.mass || 0), 0);
            const m = loadMassG / 1000; 

            // SPRING DYNAMICS
            if (comp.type === 'spring' && comp.parentId) {
                if (dragRef.current.active && dragRef.current.id === comp.id && dragRef.current.type === 'pull') {
                    comp.velocity = 0;
                } else {
                    const k = comp.stiffness || 20;
                    const restLen = comp.length || 20;
                    const currLen = comp.currentLength || 20;
                    const extensionM = (currLen - restLen) / 100;
                    const fSpring = -k * extensionM;
                    const fGravity = m * g; 
                    const fDamping = -0.2 * (comp.velocity || 0);
                    const effectiveMass = m + 0.05; 
                    const accel = (fSpring + fGravity + fDamping) / effectiveMass;
                    let newVel = (comp.velocity || 0) + accel * dt;
                    newVel *= DAMPING;
                    const deltaLen = newVel * dt * 100; 
                    comp.velocity = newVel;
                    comp.currentLength = Math.max(5, currLen + deltaLen);
                    const displacement = currLen - restLen - (m * g / k) * 100; 
                    checkOscillation(currentComps, displacement, comp);
                }
            }
            
            // PENDULUM DYNAMICS
            if (comp.type === 'string' && comp.parentId) {
                 const parent = currentComps.find(p => p.id === comp.parentId);
                 // Calculate Effective Mass including any attached Ruler or Masses
                 let effectiveM = m;
                 // If Ruler attached, add its mass
                 const childRuler = currentComps.find(c => c.parentId === comp.id && c.type === 'metre_rule');
                 if (childRuler) effectiveM += (childRuler.mass || 0) / 1000;
                 
                 if (dragRef.current.active && dragRef.current.type === 'pull') {
                     // Drag logic override
                     const draggedChild = currentComps.find(c => c.id === dragRef.current.id && c.parentId === comp.id);
                     if (draggedChild) {
                         if (parent) {
                             const anchor = getAttachmentPoint(parent);
                             if (anchor) {
                                 const dx = dragRef.current.startX + (dragRef.current.offsetX || 0) - anchor.x;
                                 const dy = dragRef.current.startY + (dragRef.current.offsetY || 0) - anchor.y;
                                 const angleRad = Math.atan2(dx, dy); 
                                 comp.angle = angleRad * (180 / Math.PI);
                                 comp.angularVelocity = 0;
                             }
                         }
                     }
                } else if (effectiveM > 0) {
                    // Standard Pendulum Physics
                    const L = (comp.length || 50) / 100; 
                    const theta = (comp.angle || 0) * (Math.PI / 180);
                    const omega = comp.angularVelocity || 0;
                    const alpha = (-g / L) * Math.sin(theta);
                    let newOmega = omega + alpha * dt;
                    newOmega *= DAMPING; 
                    const newTheta = theta + newOmega * dt;
                    comp.angularVelocity = newOmega;
                    comp.angle = newTheta * (180 / Math.PI);
                    checkOscillation(currentComps, comp.angle, comp);
                } else if (childRuler) {
                     // Compound Pendulum Logic approximation
                     // Ruler pivots at attachment mark.
                     // If not swinging from drag, just decay
                     if (comp.angle && Math.abs(comp.angle) > 0.1) {
                         comp.angle *= DAMPING;
                     }
                }
            }
            
            // RULER MOMENTS
            if (comp.type === 'metre_rule' && comp.parentId) {
                const parent = currentComps.find(p => p.id === comp.parentId);
                
                // Balance on Knife Edge
                if (parent && parent.type === 'knife_edge') {
                    if (dragRef.current.active && dragRef.current.id === comp.id && dragRef.current.type === 'pull') {
                        comp.angularVelocity = 0;
                    } else {
                        const M = (comp.mass || 100) / 1000;
                        const offsetPx = comp.attachmentOffset || 0;
                        const offsetM = offsetPx * (1 / PIXELS_PER_CM) / 100; 
                        const theta = (comp.rotation || 0) * (Math.PI / 180);
                        
                        let netTorque = - (M * g * offsetM * Math.cos(theta)); 
                        
                        const children = currentComps.filter(c => c.parentId === comp.id);
                        let totalI = (1/12) * M * 1.0 * 1.0 + M * offsetM * offsetM; 
                        
                        children.forEach(child => {
                            const cm = (child.mass || 0) / 1000;
                            
                            let rCm = 0;
                            if (child.attachmentMark !== undefined) {
                                // Pivot is at `comp.attachmentOffset` from center (50cm).
                                // PivotMark = 50 + offsetCm.
                                const pivotMark = 50 + (comp.attachmentOffset || 0) / PIXELS_PER_CM;
                                rCm = child.attachmentMark - pivotMark;
                            } else {
                                // Legacy offset fallback
                                rCm = (child.attachmentOffset || 0) / PIXELS_PER_CM - (comp.attachmentOffset || 0) / PIXELS_PER_CM;
                            }
                            
                            const r = rCm / 100;
                            const torque = cm * g * r * Math.cos(theta);
                            netTorque += torque;
                            totalI += cm * r * r;
                        });
                        
                        const omega = comp.angularVelocity || 0;
                        netTorque -= 0.1 * omega; 
                        const alpha = netTorque / totalI;
                        let newOmega = omega + alpha * dt;
                        let newTheta = theta + newOmega * dt;
                        
                        const limit = 45 * (Math.PI / 180);
                        if (newTheta > limit) { newTheta = limit; newOmega = 0; }
                        if (newTheta < -limit) { newTheta = -limit; newOmega = 0; }
                        
                        comp.angularVelocity = newOmega;
                        comp.rotation = newTheta * (180 / Math.PI);
                    }
                } else if (parent && parent.type === 'string') {
                    // Ruler hanging on string -> Rotation matches string angle (simplified)
                    comp.rotation = parent.angle || 0;
                }
            }

            if (comp.type === 'stopwatch' && comp.stopwatchRunning) {
                comp.stopwatchTime = (comp.stopwatchTime || 0) + (dt * 1000);
            }
        });

        setComponents([...currentComps]);
        requestRef.current = requestAnimationFrame(updatePhysics);
    };
    
    const checkOscillation = (allComps: MechanicsComponent[], currentValue: number, sourceComp: MechanicsComponent) => {
         if (sourceComp.lastValue === undefined) {
             sourceComp.lastValue = currentValue;
             return;
         }
         const prevSign = Math.sign(sourceComp.lastValue);
         const currSign = Math.sign(currentValue);
         if (prevSign !== currSign && prevSign !== 0) {
              if (prevSign > 0 && currSign < 0) {
                   allComps.forEach(w => {
                        if (w.type === 'stopwatch' && w.stopwatchRunning) {
                            w.currentOscillationCount = (w.currentOscillationCount || 0) + 1;
                            if (w.currentOscillationCount >= (w.targetOscillations || 20)) {
                                w.stopwatchRunning = false; 
                                onUpdateChar('success', `Timer stopped at ${w.targetOscillations} oscillations!`, {x: w.x, y: w.y});
                            }
                        }
                    });
              }
         }
         sourceComp.lastValue = currentValue;
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updatePhysics);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, []);

    // --- INTERACTION HANDLERS ---

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'move' | 'clamp' | 'pull' | 'resize') => {
        e.stopPropagation();
        if (type !== 'clamp' && type !== 'pull' && type !== 'resize') e.preventDefault(); 

        const comp = compsRef.current.find(c => c.id === id);
        if (!comp) return;
        
        let actualType = type;
        // Auto-detect interaction based on context
        if (type === 'move') {
             if (comp.parentId) {
                 const parent = compsRef.current.find(p => p.id === comp.parentId);
                 // If moving ruler on a knife edge -> pull (slide)
                 if (parent && parent.type === 'knife_edge' && comp.type === 'metre_rule') {
                     actualType = 'pull'; 
                 }
                 // If moving mass on ruler -> pull (slide)
                 if (parent && parent.type === 'metre_rule' && (comp.type.startsWith('mass') || comp.type === 'pendulum_bob')) {
                     actualType = 'pull'; 
                 }
                 // If moving mass/ruler attached to string -> swing
                 if (parent && parent.type === 'string') {
                     actualType = 'pull';
                 }
             }
        }

        if (actualType === 'move') {
             if (isMultiSelectMode || e.shiftKey) {
                 const newSet = new Set(selectedIds);
                 if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                 setSelectedIds(newSet);
             } else {
                 if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
             }
        }
        if (comp.locked && actualType === 'move') return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        let initialVal = 0;
        if (actualType === 'clamp') initialVal = comp.clampY || 0;
        if (actualType === 'pull') {
            if (comp.type === 'spring') initialVal = comp.currentLength || 0;
            if (comp.type === 'metre_rule') initialVal = comp.attachmentOffset || 0;
        }
        if (actualType === 'resize') {
            initialVal = comp.length || 50;
        }
        
        const initialComponentPositions: Record<string, {x: number, y: number}> = {};
        compsRef.current.forEach(c => {
            initialComponentPositions[c.id] = { x: c.x, y: c.y };
        });

        dragRef.current = {
            active: true,
            id,
            type: actualType,
            startX: clientX,
            startY: clientY,
            initialVal,
            offsetX: clientX - comp.x,
            offsetY: clientY - comp.y,
            initialComponentPositions
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!dragRef.current.active || !dragRef.current.id) return;

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        
        const { id, type, startX, startY, initialVal, initialComponentPositions } = dragRef.current;
        const comp = compsRef.current.find(c => c.id === id);
        if (!comp) return;

        if (type === 'move') {
            const itemsToMove = new Set<string>();
            if (selectedIds.has(id)) selectedIds.forEach(sid => itemsToMove.add(sid));
            else itemsToMove.add(id);
            
            if (comp.groupId) compsRef.current.filter(c => c.groupId === comp.groupId).forEach(c => itemsToMove.add(c.id));
            
            compsRef.current.forEach(c => {
                if (itemsToMove.has(c.id) && !c.locked) {
                     const leaderDeltaX = clientX - startX;
                     const leaderDeltaY = clientY - startY;
                     const initialPos = initialComponentPositions[c.id];
                     if (initialPos) {
                         c.x = initialPos.x + leaderDeltaX;
                         c.y = initialPos.y + leaderDeltaY;
                     }
                     if (c.id === id && c.parentId) {
                         const parent = compsRef.current.find(p => p.id === c.parentId);
                         if (parent) {
                             const anchor = getAttachmentPoint(parent);
                             if (anchor && Math.hypot(c.x - anchor.x, c.y - anchor.y) > 60) {
                                 c.parentId = null;
                             }
                         }
                     }
                }
            });
        }
        else if (type === 'clamp') {
            const deltaY = startY - clientY; 
            comp.clampY = Math.max(100, Math.min(550, initialVal + deltaY));
        }
        else if (type === 'resize') {
            if (comp.type === 'string') {
                const deltaYPixels = clientY - startY;
                const deltaLen = deltaYPixels / PIXELS_PER_CM;
                comp.length = Math.max(10, initialVal + deltaLen);
            }
        }
        else if (type === 'pull') {
            if (comp.type === 'spring') {
                const deltaYPixels = clientY - startY;
                const deltaLen = deltaYPixels / PIXELS_PER_CM;
                comp.currentLength = Math.max(5, initialVal + deltaLen);
                comp.velocity = 0; 
            }
            else if (comp.type === 'metre_rule' && comp.parentId) {
                const parent = compsRef.current.find(p => p.id === comp.parentId);
                if (parent && parent.type === 'knife_edge') {
                    const deltaX = clientX - startX; 
                    const rad = (comp.rotation || 0) * (Math.PI / 180);
                    const deltaOffset = deltaX * Math.cos(rad) + (clientY - startY) * Math.sin(rad);
                    comp.attachmentOffset = initialVal - deltaOffset; // Sliding rule changes pivot offset
                    comp.angularVelocity = 0; 
                }
                // Swing attached to thread
                else if (parent && parent.type === 'string') {
                    // Logic handled in physics update via dragRef, just need to prevent move
                }
            }
        }
    }, [selectedIds]); 

    const handleMouseUp = useCallback(() => {
        if (dragRef.current.active && dragRef.current.type === 'move') {
            const movedItems = new Set<string>();
             if (selectedIds.has(dragRef.current.id!)) selectedIds.forEach(sid => movedItems.add(sid));
             else movedItems.add(dragRef.current.id!);
            
            const draggedComp = compsRef.current.find(c => c.id === dragRef.current.id);
            if (draggedComp?.groupId) compsRef.current.filter(c => c.groupId === draggedComp.groupId).forEach(c => movedItems.add(c.id));

            movedItems.forEach(id => {
                const comp = compsRef.current.find(c => c.id === id);
                if (comp && !comp.parentId) {
                    let bestParent: string | null = null;
                    let minDst = SNAP_RADIUS;
                    
                    compsRef.current.forEach(parent => {
                        if (parent.id === comp.id || movedItems.has(parent.id)) return;
                        
                        const anchor = getAttachmentPoint(parent);
                        if (anchor) {
                            const dist = Math.hypot(comp.x - anchor.x, comp.y - anchor.y);
                            if (dist < minDst) {
                                 const isValid = 
                                    (comp.type === 'spring' && parent.type === 'retort_stand') ||
                                    (comp.type === 'string' && parent.type === 'retort_stand') ||
                                    ((comp.type.startsWith('mass') || comp.type === 'pendulum_bob') && (parent.type === 'spring' || parent.type === 'string' || parent.type.startsWith('mass') || parent.type === 'pendulum_bob')) ||
                                    (comp.type === 'metre_rule' && parent.type === 'knife_edge') ||
                                    ((comp.type.startsWith('mass') || comp.type === 'pendulum_bob') && parent.type === 'metre_rule') ||
                                    (comp.type === 'metre_rule' && parent.type === 'string') || // Ruler on String
                                    (comp.type === 'knife_edge' && parent.type === 'retort_stand');
                                    
                                 if (isValid) {
                                     minDst = dist;
                                     bestParent = parent.id;
                                 }
                            }
                        }
                    });
                    
                    if (bestParent) {
                        const parentComp = compsRef.current.find(c => c.id === bestParent);
                        
                        if (comp.type.startsWith('mass') && parentComp && parentComp.type.startsWith('mass')) {
                             const newMass = (parentComp.mass || 0) + (comp.mass || 0);
                             parentComp.mass = newMass;
                             parentComp.name = `${newMass}g Mass`;
                             setComponents(prev => prev.filter(c => c.id !== comp.id).map(c => c.id === bestParent ? parentComp : c));
                             onUpdateChar('success', `Merged: ${newMass}g`, { x: parentComp.x, y: parentComp.y });
                        } else {
                            // Modal Check for specific attachments
                            const needsPosition = 
                                (parentComp?.type === 'metre_rule' && (comp.type.startsWith('mass') || comp.type === 'pendulum_bob')) ||
                                (comp.type === 'metre_rule' && parentComp?.type === 'string');
                            
                            if (needsPosition) {
                                setPendingAttach({ childId: comp.id, parentId: parentComp!.id });
                                setAttachModalOpen(true);
                                setAttachMarkInput('50');
                                return; // Wait for modal
                            }

                            // Standard Attachment
                            comp.parentId = bestParent;
                            comp.velocity = 0; 
                            comp.angularVelocity = 0;
                            if (parentComp?.type === 'string') parentComp.angle = 0; 
                            
                            if (comp.type === 'metre_rule' && parentComp?.type === 'knife_edge') {
                                const pivot = getAttachmentPoint(parentComp);
                                if (pivot) {
                                    const dx = pivot.x - comp.x;
                                    const dy = pivot.y - comp.y;
                                    const rad = (comp.rotation || 0) * (Math.PI / 180);
                                    comp.attachmentOffset = dx * Math.cos(rad) + dy * Math.sin(rad);
                                }
                            } else {
                                comp.attachmentOffset = 0;
                            }

                            onUpdateChar('success', 'Attached!', { x: comp.x, y: comp.y });
                        }
                    }
                }
            });
        }
        
        dragRef.current.active = false;
        dragRef.current.id = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    }, [selectedIds, onUpdateChar]);
    
    const handleConfirmAttachment = () => {
        if (!pendingAttach) return;
        const { childId, parentId } = pendingAttach;
        const mark = Math.min(100, Math.max(0, parseFloat(attachMarkInput) || 50));
        
        const comp = compsRef.current.find(c => c.id === childId);
        if (comp) {
            comp.parentId = parentId;
            comp.attachmentMark = mark;
            // Also set legacy offset for backward compatibility logic if needed, though we prefer Mark now
            // Offset is pixels from center. Mark is CM from 0. Center is 50.
            // OffsetCm = Mark - 50. OffsetPx = OffsetCm * 5.
            comp.attachmentOffset = (mark - 50) * PIXELS_PER_CM;
            comp.velocity = 0;
            comp.angularVelocity = 0;
            onUpdateChar('success', `Attached at ${mark}cm`, { x: comp.x, y: comp.y });
        }
        setAttachModalOpen(false);
        setPendingAttach(null);
        // Trigger a re-render/physics update
        setComponents([...compsRef.current]);
    };

    // --- TOOLBAR ACTIONS ---

    const spawnComponent = (type: ComponentType) => {
        const tool = [...TOOLBOX_ITEMS, ...MASSES].find(t => t.id === type);
        if (!tool) return;
        
        const newComp: MechanicsComponent = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            name: tool.label,
            x: 400 + Math.random() * 50,
            y: 300 + Math.random() * 50,
            visible: true,
            locked: false,
            rotation: 0,
            ...(tool as any).defaultProps || {},
            ...(tool as any).weight ? { mass: (tool as any).weight } : {}
        };
        setComponents(prev => [...prev, newComp]);
    };

    const handleDelete = () => {
        if (selectedIds.size === 0) return;
        setComponents(prev => prev.filter(c => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
    };
    
    const handleMerge = () => {
        if (selectedIds.size < 2) return;
        const newGroupId = Math.random().toString(36).substr(2, 9);
        setComponents(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, groupId: newGroupId } : c));
        onUpdateChar('success', 'Items Grouped!', { x: 0, y: 0 });
    };
    
    const handleRotationChange = (amount: number) => {
        setComponents(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, rotation: (c.rotation || 0) + amount } : c));
    };

    const handleStartStopwatch = (id: string) => {
        const watch = compsRef.current.find(c => c.id === id);
        if(watch) {
            watch.stopwatchRunning = !watch.stopwatchRunning;
            if (watch.stopwatchRunning) watch.currentOscillationCount = 0; 
        }
    };
    
    const handleResetStopwatch = (id: string) => {
         const watch = compsRef.current.find(c => c.id === id);
         if(watch) {
             watch.stopwatchRunning = false;
             watch.stopwatchTime = 0;
             watch.currentOscillationCount = 0;
         }
    };
    
    const handleUpdateStopwatchTarget = (id: string, target: number) => {
         const watch = compsRef.current.find(c => c.id === id);
         if(watch) {
             watch.targetOscillations = target;
             setComponents([...compsRef.current]);
         }
    };

    return (
        <div className="w-full h-full bg-[#1e293b] relative overflow-hidden select-none">
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            {/* LEFT TOOLBAR */}
            <div className={`absolute left-0 top-0 h-full w-20 bg-slate-900 border-r border-slate-700 z-50 flex flex-col items-center py-4 gap-4 shadow-xl transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="mb-2 font-bold text-blue-400 text-xs uppercase tracking-wider rotate-180" style={{ writingMode: 'vertical-rl' }}>TOOLS</div>
                {TOOLBOX_ITEMS.map(item => (
                    <button key={item.id} onClick={() => spawnComponent(item.id)} className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-600 hover:border-blue-500 hover:bg-slate-700 flex items-center justify-center text-2xl shadow-lg active:scale-95 transition-all" title={item.label}>
                        {item.icon}
                    </button>
                ))}
                <div className="w-10 h-1 bg-slate-700 rounded-full my-2"></div>
                {MASSES.map(mass => (
                    <button key={mass.id} onClick={() => spawnComponent(mass.id as ComponentType)} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform border border-slate-600" style={{ backgroundColor: mass.color }}>
                        <span className="text-[8px] font-bold text-black">{mass.label}</span>
                    </button>
                ))}
                <div className="mt-auto mb-12 w-full px-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase text-center block mb-1">Gravity</label>
                    <input type="range" min="1.6" max="20" step="0.1" value={gravity} onChange={(e) => setGravity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/>
                </div>
            </div>
            
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute bottom-4 left-4 z-50 p-3 bg-slate-800 rounded-full border border-slate-600 text-white shadow-lg hover:bg-slate-700">{isSidebarOpen ? '◀' : '▶'}</button>

            {/* RIGHT PROPERTIES PANEL */}
            <div id="layer-panel" className={`absolute right-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-50 transition-transform ${isLayerPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white">Layers & Controls</h3>
                    <button onClick={() => setLayerPanelOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
                </div>
                <div className="p-4 border-b border-slate-700 space-y-4">
                     <div className="flex gap-2">
                         <button onClick={() => setIsMultiSelectMode(!isMultiSelectMode)} className={`flex-1 py-2 text-xs font-bold rounded border ${isMultiSelectMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                             {isMultiSelectMode ? 'Multi-Select ON' : 'Multi-Select OFF'}
                         </button>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <button onClick={handleMerge} disabled={selectedIds.size < 2} className="py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded text-xs font-bold hover:bg-purple-500/30 disabled:opacity-50">🔗 Group</button>
                         <button onClick={handleDelete} disabled={selectedIds.size === 0} className="py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold hover:bg-red-500/30 disabled:opacity-50">🗑️ Delete</button>
                     </div>
                     <div className="flex flex-col gap-2 pt-2 border-t border-slate-700">
                         <label className="text-xs text-slate-400 font-bold uppercase">Rotation</label>
                         <div className="flex gap-2">
                             <button className="flex-1 p-2 bg-slate-800 rounded hover:bg-slate-700 text-xs" onClick={() => handleRotationChange(-15)}>↺ -15°</button>
                             <button className="flex-1 p-2 bg-slate-800 rounded hover:bg-slate-700 text-xs" onClick={() => handleRotationChange(15)}>↻ +15°</button>
                         </div>
                     </div>
                </div>
                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    {components.map(comp => (
                        <div key={comp.id} onClick={() => setSelectedIds(new Set([comp.id]))} className={`p-2 rounded flex items-center justify-between cursor-pointer text-sm ${selectedIds.has(comp.id) ? 'bg-blue-600/20 border border-blue-500 text-white' : 'bg-slate-800/50 border border-transparent text-slate-400 hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-2">
                                {comp.groupId && <span className="text-xs text-purple-400">🔗</span>}
                                <span>{comp.name}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={(e) => {e.stopPropagation(); comp.locked = !comp.locked;}}>{comp.locked ? '🔒' : '🔓'}</button>
                                <button onClick={(e) => {e.stopPropagation(); comp.visible = !comp.visible;}}>{comp.visible ? '👁️' : '🚫'}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button id="layer-toggle" onClick={() => setLayerPanelOpen(!isLayerPanelOpen)} className="absolute top-4 right-4 z-40 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl text-white hover:bg-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>

            {/* WORKSPACE */}
            <div className="w-full h-full relative" onMouseDown={() => { if(!isMultiSelectMode) setSelectedIds(new Set()); }}>
                {components.map(comp => {
                    if (!comp.visible) return null;
                    const isSelected = selectedIds.has(comp.id);
                    const style: React.CSSProperties = {
                        position: 'absolute',
                        left: comp.x,
                        top: comp.y,
                        transform: `translate(-50%, 0) rotate(${comp.rotation || 0}deg)`,
                        transformOrigin: 'top center',
                        zIndex: isSelected ? 100 : (comp.type === 'retort_stand' ? 10 : 50),
                        cursor: comp.locked ? 'default' : 'grab'
                    };
                    
                    if (comp.type === 'metre_rule') {
                        style.transformOrigin = 'center';
                        style.transform = `translate(-50%, -50%) rotate(${comp.rotation || 0}deg)`;
                    }

                    return (
                        <div key={comp.id} style={style} onMouseDown={(e) => handleMouseDown(e, comp.id, 'move')} onTouchStart={(e) => handleMouseDown(e, comp.id, 'move')}>
                            {isSelected && <div className="absolute -inset-2 border-2 border-blue-500 rounded-lg pointer-events-none z-50 animate-pulse"></div>}

                            {comp.type === 'retort_stand' && (
                                <div className="relative -translate-y-full">
                                    {!comp.locked && (
                                        <div className="absolute w-16 h-12 cursor-ns-resize z-50 rounded hover:bg-white/10" style={{ bottom: comp.clampY, left: '50%', transform: 'translate(-50%, 50%)' }} onMouseDown={(e) => handleMouseDown(e, comp.id, 'clamp')}></div>
                                    )}
                                    <RetortStandVisual clampY={comp.clampY || 400} isSelected={isSelected} />
                                </div>
                            )}

                            {comp.type === 'spring' && (
                                <div className="relative">
                                    {!comp.locked && <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 cursor-ns-resize z-50 bg-transparent hover:bg-blue-500/20 rounded-full" style={{ top: (comp.currentLength || 20) * PIXELS_PER_CM }} onMouseDown={(e) => handleMouseDown(e, comp.id, 'pull')}></div>}
                                    <SpringSVG length={(comp.currentLength || 20) * PIXELS_PER_CM} isExpanded={(comp.currentLength || 0) > (comp.length || 0)} />
                                </div>
                            )}
                            
                            {comp.type === 'protractor' && (
                                <div className="relative -translate-x-[0%] -translate-y-[10px]">
                                    <ProtractorVisual />
                                </div>
                            )}

                            {comp.type === 'string' && (
                                <div style={{ transform: `rotate(${comp.angle || 0}deg)`, transformOrigin: 'top center' }}>
                                    <div className="w-0.5 bg-white/90 mx-auto shadow-[0_0_2px_black]" style={{ height: (comp.length || 50) * PIXELS_PER_CM }}></div>
                                    {/* Resize Handle */}
                                    {!comp.parentId && (
                                        <div 
                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full cursor-ns-resize shadow-md hover:bg-blue-200" 
                                            onMouseDown={(e) => handleMouseDown(e, comp.id, 'resize')}
                                        ></div>
                                    )}
                                </div>
                            )}

                            {(comp.type.startsWith('mass') || comp.type === 'pendulum_bob') && (
                                <div onMouseDown={(e) => { 
                                    if (comp.parentId) {
                                        const parent = components.find(p => p.id === comp.parentId);
                                        if (parent && (parent.type === 'string' || parent.type === 'spring' || parent.type === 'metre_rule')) {
                                            e.stopPropagation();
                                            handleMouseDown(e, comp.id, 'pull');
                                            return;
                                        }
                                    }
                                }}>
                                    {comp.parentId && components.find(c => c.id === comp.parentId)?.type === 'metre_rule' && (
                                        <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 w-0.5 h-[20px] bg-white/50"></div>
                                    )}
                                    {comp.type === 'pendulum_bob' ? <PendulumBobVisual mass={comp.mass || 50} /> : <MassVisual mass={comp.mass || 0} />}
                                </div>
                            )}
                            
                            {comp.type === 'knife_edge' && (
                                <div className="relative -translate-y-full">
                                    <KnifeEdgeVisual />
                                </div>
                            )}

                            {comp.type === 'stopwatch' && (
                                <div className="relative -translate-y-1/2">
                                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-8 h-8 cursor-pointer z-50 hover:bg-green-500/20 rounded-full" onClick={(e) => { e.stopPropagation(); handleStartStopwatch(comp.id); }}></div>
                                    <div className="absolute top-5 right-2 w-6 h-6 cursor-pointer z-50 hover:bg-blue-500/20 rounded-full" onClick={(e) => { e.stopPropagation(); handleResetStopwatch(comp.id); }}></div>
                                    <StopwatchVisual 
                                        time={comp.stopwatchTime || 0} 
                                        running={!!comp.stopwatchRunning} 
                                        count={comp.currentOscillationCount || 0} 
                                        target={comp.targetOscillations || 20} 
                                        onSetTarget={(val) => handleUpdateStopwatchTarget(comp.id, val)} 
                                    />
                                </div>
                            )}

                            {comp.type === 'metre_rule' && (
                                <div className="w-[600px] h-10 bg-[#eab308] border border-yellow-700 shadow-xl flex flex-col justify-between relative rounded-sm group-hover:ring-1 ring-yellow-400/50">
                                     <div className="w-full h-full relative overflow-hidden">
                                         {[...Array(101)].map((_, i) => (
                                             <div key={i} className={`absolute top-0 border-l border-black/60 ${i%10===0 ? 'h-5 border-black/80' : i%5===0 ? 'h-3' : 'h-2'}`} style={{ left: `${i}%` }}>
                                                 {i%10===0 && <span className="absolute top-5 -left-1 text-[8px] font-bold text-black/70">{i}</span>}
                                             </div>
                                         ))}
                                     </div>
                                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 pointer-events-none"></div>
                                     <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500/50"></div>
                                     {/* Suspension Points / Knots Visualization */}
                                     {/* If ruler is attached to string, show loop at attachment point */}
                                     {comp.parentId && components.find(p => p.id === comp.parentId)?.type === 'string' && (
                                          <div 
                                            className="absolute -top-2 w-4 h-6 border-2 border-white/80 rounded-[50%] z-20 shadow-md" 
                                            style={{ 
                                                left: `${comp.attachmentMark || 50}%`, 
                                                transform: 'translateX(-50%)' 
                                            }}
                                          ></div>
                                     )}
                                     {/* If children (masses) attached to ruler, show loops */}
                                     {components.filter(c => c.parentId === comp.id).map(child => (
                                         <div key={'knot'+child.id} className="absolute top-0 w-2 h-3 bg-white/80 rounded-b-sm shadow-sm border border-gray-400 z-20" style={{ left: `${child.attachmentMark || 50}%`, transform: 'translateX(-50%)' }}></div>
                                     ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Attachment Point Modal */}
            {attachModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl max-w-sm w-full">
                        <h3 className="text-lg font-bold text-white mb-4">Attach Component</h3>
                        <p className="text-slate-400 text-sm mb-4">Enter the specific mark on the Metre Rule (0-100cm) where this should be attached.</p>
                        <div className="flex items-center gap-2 mb-6">
                            <input 
                                type="number" 
                                min="0" max="100" 
                                value={attachMarkInput} 
                                onChange={(e) => setAttachMarkInput(e.target.value)} 
                                className="flex-grow p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-xl"
                            />
                            <span className="text-slate-400 font-bold">cm</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setAttachModalOpen(false); setPendingAttach(null); }} className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-bold">Cancel</button>
                            <button onClick={handleConfirmAttachment} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-bold shadow-lg">Attach</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mechanics;
