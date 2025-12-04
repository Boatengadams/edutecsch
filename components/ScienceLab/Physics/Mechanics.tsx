
import React, { useState, useRef, useEffect } from 'react';

interface MechanicsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface MechanicsComponent {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    rotation: number;
    // Physics properties
    state: { 
        length?: number;        // Current length (Spring/Pendulum)
        originalLength?: number;// L0 for Spring
        mass?: number;          // Attached mass (g)
        extension?: number;     // Current extension
        isOscillating?: boolean;// Is moving?
        amplitude?: number;     // Max displacement
        phase?: number;         // Animation phase
        period?: number;        // Time period T
    };
}

const TOOLS = [
    { id: 'retort_stand', name: 'Retort Stand', icon: '🏗️' },
    { id: 'metre_rule', name: 'Metre Rule', icon: '📏' },
    { id: 'spring', name: 'Spiral Spring', icon: '➰' },
    { id: 'pendulum', name: 'Pendulum', icon: '🧶' }, // Combined Pivot+Thread+Bob
    { id: 'beam_balance', name: 'Beam Balance', icon: '⚖️' },
    { id: 'stopwatch', name: 'Stopwatch', icon: '⏱️' },
    { id: 'knife_edge', name: 'Knife Edge', icon: '🔺' },
    { id: 'weight_hanger', name: 'Weight Hanger', icon: '⚓' },
];

const MASSES = [
    { id: 'mass_20g', name: '20g Mass', weight: 20, icon: '🔵' },
    { id: 'mass_50g', name: '50g Mass', weight: 50, icon: '🟤' },
    { id: 'mass_100g', name: '100g Mass', weight: 100, icon: '⚫' },
];

// Physics Constants
const SPRING_CONSTANT = 20; // N/m

// Helper to generate a 3D-looking spring path
const generateSpringPath = (width: number, height: number, coils: number) => {
    let d = `M ${width/2} 0 L ${width/2} 10 `; // Top hook
    const coilHeight = (height - 20) / coils;
    for (let i = 0; i < coils; i++) {
        const yStart = 10 + i * coilHeight;
        // Draw a loop resembling a 3D coil
        d += `C ${width} ${yStart + coilHeight * 0.2}, ${width} ${yStart + coilHeight * 0.8}, ${width/2} ${yStart + coilHeight} `;
        d += `C 0 ${yStart + coilHeight * 0.8}, 0 ${yStart + coilHeight * 0.2}, ${width/2} ${yStart} `;
    }
    d += `L ${width/2} ${height}`; // Bottom hook
    return d;
};

// Visual Renderer
const ComponentVisual = ({ comp, isSelected, onRulerInteract, time }: { comp: MechanicsComponent, isSelected: boolean, onRulerInteract?: (cm: number, e: React.MouseEvent) => void, time: number }) => {
    const style = { 
        transform: `translate(-50%, -50%) rotate(${comp.rotation}deg)`, 
        pointerEvents: 'none' as const 
    };

    const interactiveStyle = { ...style, pointerEvents: 'auto' as const };

    switch(comp.type) {
        case 'retort_stand':
            return (
                <div style={style} className="w-40 h-[450px] flex flex-col items-center justify-end pb-4 relative pointer-events-none">
                    {/* Base - Cast Iron effect */}
                    <div className="absolute bottom-0 w-40 h-8 bg-[#2d3748] rounded-lg border-b-4 border-[#1a202c] shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-10">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)]"></div>
                    </div>
                    {/* Rod - Chrome/Steel effect */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-4 h-[420px] bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 rounded-t-md shadow-md"></div>
                    
                    {/* Clamp Boss - Movable looking */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 w-8 h-10 bg-slate-500 rounded-sm shadow-lg flex items-center justify-center border border-slate-600">
                         <div className="w-2 h-2 bg-black rounded-full"></div>
                         {/* Clamp Arm */}
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 w-24 h-3 bg-gradient-to-b from-slate-300 to-slate-500 rounded-r-sm shadow-md origin-left"></div>
                         {/* Cork Jaws */}
                         <div className="absolute left-24 top-1/2 -translate-y-1/2 -ml-2 w-4 h-8 bg-[#a16207] rounded-sm border border-[#713f12] shadow-sm"></div>
                    </div>
                </div>
            );
        case 'metre_rule':
             return (
                 <div 
                    style={interactiveStyle} 
                    className={`w-[600px] h-12 bg-[#f59e0b] flex items-end relative shadow-[0_4px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] select-none group cursor-pointer overflow-hidden rounded-[2px] ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                    onClick={(e) => {
                        if (onRulerInteract) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const cm = (clickX / rect.width) * 100;
                            onRulerInteract(cm, e);
                        }
                    }}
                 >
                     {/* Wood Texture */}
                     <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none mix-blend-multiply"></div>
                     {/* Scale Markings */}
                     <div className="absolute inset-0 flex items-end justify-between px-[2px]">
                        {Array.from({length: 101}).map((_,i) => {
                             const isMajor = i % 10 === 0;
                             const isMid = i % 5 === 0 && !isMajor;
                             return (
                                 <div key={i} className={`w-px bg-black/80 ${isMajor ? 'h-5' : isMid ? 'h-3' : 'h-1.5'} relative`}>
                                     {isMajor && <span className="absolute bottom-5 -translate-x-1/2 text-[8px] font-bold text-black/90 font-mono">{i}</span>}
                                 </div>
                             );
                        })}
                     </div>
                     <div className="absolute top-0 left-0 right-0 h-full bg-blue-500/0 hover:bg-blue-500/10 transition-colors pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-black/75 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">Set Pos</span>
                     </div>
                 </div>
             );
        case 'spring':
             // Physics Calculation for Visuals
             const L0 = comp.state.originalLength || 100; 
             const mass = comp.state.mass || 0;
             const staticExtension = mass * 1.5; 
             
             let oscillation = 0;
             if (comp.state.isOscillating) {
                 const angularFreq = Math.sqrt(SPRING_CONSTANT / ((mass || 50) / 1000)); 
                 oscillation = (comp.state.amplitude || 20) * Math.cos(angularFreq * time * 0.005); 
             }
             
             const currentLength = L0 + staticExtension + oscillation;
             
             return (
                 <div style={style} className="w-20 flex flex-col items-center origin-top" >
                     {/* Support Hook */}
                     <div className="w-8 h-2 bg-slate-400 rounded mb-[-2px] z-10 shadow-sm"></div>
                     
                     {/* 3D Spiral Spring SVG */}
                     <div className="relative" style={{ height: currentLength, width: 40 }}>
                         <svg width="40" height={currentLength} className="overflow-visible z-0 drop-shadow-sm" preserveAspectRatio="none">
                            {/* Front Coils (lighter) */}
                            <path 
                                d={generateSpringPath(40, currentLength, 15)}
                                fill="none" 
                                stroke="#cbd5e1" 
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                            {/* Back/Shadow Coils (darker for depth) */}
                             <path 
                                d={generateSpringPath(40, currentLength, 15)}
                                fill="none" 
                                stroke="#64748b" 
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray="10 15" // Dashed effect to simulate back of coil
                                className="opacity-50"
                            />
                         </svg>
                     </div>
                     
                     {/* Mass Hanger */}
                     <div className="w-16 h-4 bg-gradient-to-b from-slate-300 to-slate-500 rounded-sm shadow-md mt-[-2px] relative flex justify-center">
                         {/* Hook */}
                         <div className="absolute -top-4 w-1 h-4 bg-slate-400"></div>
                         {mass > 0 && (
                             <div className="absolute top-4 w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-800 rounded-sm border border-amber-900 shadow-lg flex items-center justify-center text-[10px] font-bold text-white z-20">
                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-sm"></div>
                                 {mass}g
                             </div>
                         )}
                     </div>
                 </div>
             );
        case 'pendulum':
            const threadLen = comp.state.length || 150; 
            let angle = 0;
            
            if (comp.state.isOscillating) {
                const period = 2 * Math.PI * Math.sqrt((threadLen / 200) / 9.8); 
                const w = (2 * Math.PI) / period;
                angle = (comp.state.amplitude || 30) * Math.cos(w * time * 0.005) * (Math.PI / 180);
            }

            return (
                <div style={{...style, transform: `translate(-50%, -50%)`}} className="w-20 flex flex-col items-center origin-top">
                     {/* Cork Split Support */}
                     <div className="w-6 h-6 bg-[#78350f] rounded-sm mb-[-2px] z-20 relative border border-[#451a03] shadow-sm flex items-center justify-center">
                        <div className="w-1 h-full bg-black/50 absolute"></div>
                     </div>

                     {/* Thread & Bob Group */}
                     <div 
                        className="origin-top flex flex-col items-center" 
                        style={{ height: threadLen, transform: `rotate(${angle}rad)` }}
                     >
                         <div className="w-[1px] bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" style={{ height: threadLen }}></div>
                         {/* Photorealistic Bob */}
                         <div className="w-8 h-8 rounded-full shadow-[2px_4px_6px_rgba(0,0,0,0.6)] z-10 relative bg-[radial-gradient(circle_at_30%_30%,#94a3b8,#475569,#0f172a)]">
                             {/* High Specular Highlight */}
                             <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-white rounded-full blur-[1px] opacity-80"></div>
                         </div>
                     </div>
                </div>
            );
        case 'stopwatch':
             return (
                 <div style={interactiveStyle} className="w-24 h-28 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full border-[6px] border-slate-400 flex flex-col items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative group cursor-pointer">
                     {/* Button */}
                     <div className="absolute -top-3 w-4 h-5 bg-slate-300 rounded-sm border-b-2 border-slate-500 active:h-4 transition-all"></div>
                     {/* Screen */}
                     <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center border-2 border-slate-600 shadow-inner relative overflow-hidden">
                         <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%)] pointer-events-none"></div>
                         <span className="text-xl font-mono text-green-500 font-bold drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                             {(time / 1000).toFixed(2)}
                         </span>
                     </div>
                 </div>
             );
        case 'beam_balance':
            return (
                <div style={style} className="w-72 h-40 relative flex flex-col items-center">
                    {/* Central Pillar */}
                    <div className="absolute bottom-0 w-4 h-32 bg-gradient-to-r from-slate-400 to-slate-600 rounded-t-md border border-slate-500 z-0"></div>
                    {/* Base */}
                    <div className="absolute bottom-0 w-32 h-4 bg-slate-800 rounded-md shadow-lg z-10"></div>
                    
                    {/* Beam */}
                    <div className="w-72 h-3 bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-500 relative z-20 rounded-sm shadow-sm flex justify-between items-center px-2">
                         {/* Hanger Chains */}
                         <div className="w-[1px] h-16 bg-slate-400 absolute left-4 top-2"></div>
                         <div className="w-[1px] h-16 bg-slate-400 absolute right-4 top-2"></div>
                    </div>
                    
                    {/* Pans */}
                    <div className="absolute top-20 left-0 w-16 h-4 bg-gradient-to-b from-slate-300 to-slate-500 rounded-b-full shadow-md flex items-center justify-center border-t border-slate-600"></div>
                    <div className="absolute top-20 right-0 w-16 h-4 bg-gradient-to-b from-slate-300 to-slate-500 rounded-b-full shadow-md flex items-center justify-center border-t border-slate-600"></div>
                    
                    {/* Pointer */}
                    <div className="absolute top-2 w-1 h-12 bg-red-500 z-10 origin-top"></div>
                    <div className="absolute bottom-10 w-16 h-8 bg-white/80 rounded-t-full border border-slate-300 flex justify-center items-end pb-1 z-0">
                        <div className="w-0.5 h-2 bg-black"></div>
                    </div>
                </div>
            );
        case 'knife_edge':
            return (
                <div style={style} className="relative drop-shadow-xl">
                    <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-transparent relative">
                        {/* Prism look */}
                        <div className="absolute top-2 -left-[20px] w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-[#fcd34d]"></div>
                        <div className="absolute top-2 -left-[20px] w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-[#f59e0b] opacity-50" style={{clipPath: 'polygon(50% 0, 100% 100%, 50% 100%)'}}></div>
                    </div>
                </div>
            );
        // 3D Masses
        case 'mass_20g': return (
            <div style={style} className="w-8 h-6 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 rounded-sm shadow-md flex items-center justify-center border-t border-white/50 border-b border-black/30">
                <span className="text-[8px] font-bold text-slate-700 drop-shadow-sm">20g</span>
            </div>
        );
        case 'mass_50g': return (
            <div style={style} className="w-10 h-8 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 rounded-sm shadow-md flex items-center justify-center border-t border-white/40 border-b border-black/30">
                <span className="text-[9px] font-bold text-amber-900 drop-shadow-sm">50g</span>
            </div>
        );
        case 'mass_100g': return (
            <div style={style} className="w-12 h-10 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-900 rounded-sm shadow-lg flex items-center justify-center border-t border-slate-500 border-b border-black">
                <span className="text-[10px] font-bold text-white drop-shadow-md">100g</span>
            </div>
        );
        
        default: 
            return <div className="w-8 h-8 bg-gray-500 rounded-full"></div>;
    }
}

const Mechanics: React.FC<MechanicsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<MechanicsComponent[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(true); 
    
    const workbenchRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();

    // Physics Loop
    const animate = (now: number) => {
        if (isRunning) {
            setTime(prev => prev + 16); 
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        onUpdateChar('idle', "Mechanics Lab ready. I've prepared the Pendulum and Spring systems as requested. You can adjust lengths and masses using the control panel.");
        return () => cancelAnimationFrame(requestRef.current!);
    }, [isRunning]);

    const addComponent = (tool: any) => {
        // Default States
        let initialState = {};
        if (tool.id === 'spring') {
            initialState = { length: 100, originalLength: 100, mass: 0, isOscillating: false, amplitude: 0 };
        } else if (tool.id === 'pendulum') {
            initialState = { length: 200, isOscillating: false, amplitude: 0 };
        } else if (tool.weight) {
            initialState = { mass: tool.weight };
        }

        const newComp = {
            id: Math.random().toString(36),
            type: tool.id,
            name: tool.name,
            x: 400 + (Math.random() * 50),
            y: 200 + (Math.random() * 50),
            rotation: 0,
            state: initialState
        };
        
        setComponents([...components, newComp]);
        setSelectedId(newComp.id);
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        const comp = components.find(c => c.id === id);
        if (comp && workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            setDragOffset({ x: mouseX - comp.x, y: mouseY - comp.y });
            setDraggingId(id);
            setSelectedId(id);
            
            if (comp.type === 'pendulum') onUpdateChar('thinking', `Pendulum selected. Length: ${Math.round(comp.state.length || 0)}px.`);
            if (comp.type === 'spring') onUpdateChar('thinking', `Spring selected. Mass: ${comp.state.mass}g.`);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            setComponents(prev => prev.map(c => c.id === draggingId ? { ...c, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y } : c));
        }
    };

    const updateComponentState = (id: string, newState: any) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, state: { ...c.state, ...newState } } : c));
    };

    const handleRulerClick = (rulerComp: MechanicsComponent, cm: number) => {
        if (selectedId && selectedId !== rulerComp.id) {
             const subject = components.find(c => c.id === selectedId);
             if (subject) {
                 const rulerWidth = 600;
                 const leftEdge = rulerComp.x - (rulerWidth / 2);
                 const targetX = leftEdge + (cm / 100 * rulerWidth);
                 const targetY = rulerComp.y - 60; 
                 
                 setComponents(prev => prev.map(c => c.id === selectedId ? { ...c, x: targetX, y: targetY } : c));
                 onUpdateChar('success', `Placed ${subject.name} precisely at ${Math.round(cm)}cm.`);
             }
        } else {
            setSelectedId(rulerComp.id);
        }
    };

    const selectedComponent = components.find(c => c.id === selectedId);

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)} onClick={() => setSelectedId(null)}>
             {/* Sidebar */}
             <div className="w-full md:w-64 bg-[#0B0F19] border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar flex flex-col gap-6 shadow-xl">
                <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase mb-3 flex items-center gap-2"><span>🏗️</span> Apparatus</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {TOOLS.map(tool => (
                            <button key={tool.id} onClick={() => addComponent(tool)} className="flex flex-col items-center p-2 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-amber-500 hover:bg-slate-700 transition-all active:scale-95 shadow-sm group">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{tool.icon}</div>
                                <span className="text-[9px] text-slate-300 text-center font-medium leading-tight">{tool.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><span>⚖️</span> Masses</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {MASSES.map(mass => (
                            <button key={mass.id} onClick={() => addComponent({ ...mass, type: mass.id })} className="flex flex-col items-center p-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all active:scale-95">
                                <div className="text-xl mb-1">{mass.icon}</div>
                                <span className="text-[9px] text-slate-300">{mass.weight}g</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-auto border-t border-slate-800 pt-4">
                    <button onClick={() => setComponents([])} className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">Clear Workbench</button>
                </div>
            </div>

            {/* Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#1e293b] overflow-hidden shadow-inner cursor-default">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-5 pointer-events-none"></div>
                <div className="absolute bottom-0 w-full h-1 bg-[#334155] border-t-4 border-[#475569]"></div>

                {components.map(comp => (
                    <div
                        key={comp.id}
                        className={`absolute ${selectedId === comp.id ? 'z-30' : 'z-10'} ${comp.type !== 'metre_rule' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        style={{ left: comp.x, top: comp.y }}
                        onMouseDown={(e) => handleMouseDown(e, comp.id)}
                    >
                        <ComponentVisual 
                            comp={comp} 
                            isSelected={selectedId === comp.id} 
                            onRulerInteract={(cm, e) => handleRulerClick(comp, cm)}
                            time={time}
                        />
                    </div>
                ))}

                {/* Context Controls */}
                {selectedComponent && (
                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl z-50 flex flex-col gap-3 min-w-[280px]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                            <span className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                {selectedComponent.name}
                            </span>
                            <button onClick={() => setComponents(prev => prev.filter(c => c.id !== selectedId))} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                        </div>

                        {/* Pendulum Controls */}
                        {selectedComponent.type === 'pendulum' && (
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Thread Length</span>
                                        <span>{Math.round(selectedComponent.state.length || 0)}px</span>
                                    </div>
                                    <input 
                                        type="range" min="50" max="400" 
                                        value={selectedComponent.state.length || 200} 
                                        onChange={(e) => updateComponentState(selectedComponent.id, { length: Number(e.target.value) })}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => updateComponentState(selectedComponent.id, { isOscillating: true, amplitude: 30 })}
                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold shadow-sm"
                                    >
                                        ▶ Displace
                                    </button>
                                    <button 
                                        onClick={() => updateComponentState(selectedComponent.id, { isOscillating: false, amplitude: 0 })}
                                        className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold shadow-sm"
                                    >
                                        ⏹ Stop
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Spring Controls */}
                        {selectedComponent.type === 'spring' && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Current Mass: {selectedComponent.state.mass}g</span>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Add Mass</label>
                                    <div className="flex gap-1">
                                        {[0, 20, 50, 100].map(m => (
                                            <button 
                                                key={m} 
                                                onClick={() => updateComponentState(selectedComponent.id, { mass: m })}
                                                className={`flex-1 py-1 rounded text-xs border ${selectedComponent.state.mass === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                                            >
                                                {m}g
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button 
                                        onClick={() => updateComponentState(selectedComponent.id, { isOscillating: true, amplitude: 20 })}
                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold"
                                        disabled={!selectedComponent.state.mass}
                                    >
                                        ↕ Oscillate
                                    </button>
                                    <button 
                                        onClick={() => updateComponentState(selectedComponent.id, { isOscillating: false, amplitude: 0 })}
                                        className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold"
                                    >
                                        ⏹ Stop
                                    </button>
                                </div>
                            </div>
                        )}

                         {/* General Rotation */}
                         <div className="flex items-center justify-between bg-slate-800 p-2 rounded-lg">
                            <span className="text-xs text-slate-400">Rotate</span>
                            <div className="flex gap-2">
                                <button onClick={() => updateComponentState(selectedComponent.id, { rotation: (selectedComponent.rotation - 45) % 360 })} className="w-6 h-6 bg-slate-700 rounded text-white text-xs">↺</button>
                                <button onClick={() => updateComponentState(selectedComponent.id, { rotation: (selectedComponent.rotation + 45) % 360 })} className="w-6 h-6 bg-slate-700 rounded text-white text-xs">↻</button>
                            </div>
                         </div>
                    </div>
                )}

                {components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="text-center">
                            <span className="text-6xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">🏗️</span>
                            <p className="mt-4 text-xl font-bold text-slate-300 tracking-wider">MECHANICS LAB</p>
                            <p className="text-sm text-slate-500">Drag apparatus from the shelf to start.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Mechanics;
