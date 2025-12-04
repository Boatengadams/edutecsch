
import React, { useState, useRef, useEffect } from 'react';

interface Point { x: number; y: number }

interface ElectricityProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface CircuitComponent {
    id: string;
    typeId: string;
    name: string;
    x: number;
    y: number;
    rotation: number; 
    state: { isOpen?: boolean; voltage?: number; resistance?: number; cellCount?: number; length?: number; jockeyPos?: number }; 
}

interface Wire {
    id: string;
    fromCompId: string;
    fromTerminal: string;
    toCompId: string;
    toTerminal: string;
    color: string;
}

// COMPONENT VISUAL RENDERER
const ComponentVisual = ({ type, state, rotation }: { type: string, state: any, rotation: number }) => {
    const style = { transform: `translate(-50%, -50%) rotate(${rotation}deg)`, pointerEvents: 'none' as const };
    
    switch (type) {
        case 'potentiometer':
            return (
                <div style={style} className="absolute w-[400px] h-24 flex flex-col items-center justify-center">
                    <div className="w-full h-16 bg-[#5d4037] rounded-md border border-[#3e2723] relative shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                        {/* Wood Grain Effect */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] rounded-md"></div>
                        
                        {/* Ruler markings */}
                        <div className="absolute top-1 left-4 right-4 h-6 bg-[#fef3c7] flex justify-between px-1 opacity-90 border border-amber-200 shadow-inner rounded-sm">
                            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(m => (
                                <div key={m} className="flex flex-col items-center h-full justify-end pb-0.5">
                                    <div className="w-px h-2 bg-black/50"></div>
                                    <span className="text-[6px] text-black/70 font-mono leading-none">{m}</span>
                                </div>
                            ))}
                        </div>
                        
                        {/* Resistive Wire */}
                        <div className="absolute top-10 left-4 right-4 h-0.5 bg-gradient-to-b from-slate-300 to-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
                        
                        {/* Terminals */}
                        <div className="absolute top-8 left-2 w-4 h-4 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full border border-yellow-900 shadow-lg flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black rounded-full opacity-50"></div></div>
                        <div className="absolute top-8 right-2 w-4 h-4 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full border border-yellow-900 shadow-lg flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black rounded-full opacity-50"></div></div>
                        
                        {/* Jockey Visual */}
                        <div 
                            className="absolute top-2 w-6 h-16 z-50 transition-all duration-75 drop-shadow-xl"
                            style={{ left: `${state.jockeyPos || 50}%`, transform: 'translateX(-50%)' }}
                        >
                            <div className="w-2 h-12 bg-gradient-to-r from-gray-700 to-black rounded-t mx-auto border-x border-gray-600"></div>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[8px] border-t-gray-800"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full border-2 border-red-800 shadow-inner"></div>
                        </div>
                    </div>
                </div>
            );
        case 'battery':
            return (
                <div style={style} className="absolute w-24 h-10 flex items-center justify-center drop-shadow-lg">
                    {/* Battery Body */}
                    <div className="w-20 h-10 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-sm border border-yellow-700 relative overflow-hidden flex items-center justify-center shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10"></div>
                        <div className="absolute top-1 bottom-1 left-1 right-1 border border-yellow-700/30 rounded-sm"></div>
                        <span className="font-black text-yellow-900/40 text-lg italic tracking-tighter">POWER CELL</span>
                        <div className="absolute right-2 text-[8px] font-bold text-black">1.5V</div>
                    </div>
                    {/* Positive Terminal (Nub) */}
                    <div className="w-2 h-5 bg-gradient-to-b from-gray-300 to-gray-500 rounded-r-sm border-l border-gray-600"></div>
                    {/* Negative Terminal (Flat) */}
                    <div className="absolute left-0 w-1 h-8 bg-gray-400 rounded-l-sm"></div>
                </div>
            );
        case 'key':
            return (
                <div style={style} className="absolute w-16 h-16 bg-[#262626] rounded-lg border-2 border-black flex items-center justify-center shadow-[0_5px_10px_black]">
                     <div className="w-12 h-8 border-2 border-gray-600 bg-black/50 rounded flex justify-between px-1 items-center relative">
                         <div className="w-2 h-2 rounded-full bg-yellow-600 shadow-inner"></div>
                         <div className="w-2 h-2 rounded-full bg-yellow-600 shadow-inner"></div>
                         {/* Switch Arm */}
                         <div className={`w-10 h-1.5 bg-gradient-to-b from-gray-300 to-gray-500 absolute left-1 top-1/2 -translate-y-1/2 origin-left transition-transform duration-200 rounded-full shadow-sm ${state.isOpen ? 'rotate-[-25deg]' : 'rotate-0'}`}></div>
                     </div>
                     <span className="absolute bottom-1 text-[6px] text-gray-500 font-mono">{state.isOpen ? 'OFF' : 'ON'}</span>
                </div>
            );
        case 'voltmeter':
        case 'ammeter':
        case 'galvanometer':
             const label = type === 'voltmeter' ? 'V' : type === 'ammeter' ? 'A' : 'G';
             const labelColor = type === 'voltmeter' ? 'text-green-500' : type === 'ammeter' ? 'text-blue-500' : 'text-yellow-500';
             return (
                 <div style={style} className="absolute w-24 h-24 bg-[#111] rounded-full border-4 border-gray-700 shadow-[0_10px_25px_black] flex items-center justify-center relative">
                     {/* Dial Face */}
                     <div className="absolute inset-2 bg-white rounded-full shadow-inner flex items-center justify-center overflow-hidden">
                         {/* Scale */}
                         <div className="absolute top-2 w-full text-center">
                             <svg width="80" height="40" viewBox="0 0 100 50">
                                 <path d="M10 45 A 40 40 0 0 1 90 45" fill="none" stroke="black" strokeWidth="1" />
                                 {[...Array(11)].map((_, i) => {
                                     const angle = (i * 18) - 90;
                                     const rad = (angle * Math.PI) / 180;
                                     const x1 = 50 + 35 * Math.sin(rad);
                                     const y1 = 45 - 35 * Math.cos(rad);
                                     const x2 = 50 + 40 * Math.sin(rad);
                                     const y2 = 45 - 40 * Math.cos(rad);
                                     return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="1" />;
                                 })}
                             </svg>
                         </div>
                         {/* Needle */}
                         <div className="absolute bottom-4 left-1/2 w-0.5 h-10 bg-red-600 origin-bottom transform -translate-x-1/2 rotate-[-45deg] z-10 shadow-sm"></div>
                         {/* Pivot */}
                         <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 rounded-full border border-gray-500 z-20"></div>
                         <div className={`absolute bottom-8 font-black text-xl ${labelColor}`}>{label}</div>
                     </div>
                     {/* Glass Reflection */}
                     <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
                 </div>
             );
        case 'resistor_box':
            return (
                <div style={style} className="absolute w-28 h-16 bg-[#3e2723] rounded-lg border-b-4 border-[#1b110f] shadow-xl flex flex-col items-center p-2">
                    <div className="w-full h-full grid grid-cols-4 gap-2">
                        {[...Array(8)].map((_,i) => (
                            <div key={i} className="bg-black rounded-full w-full h-full border-2 border-gray-700 shadow-inner relative">
                                <div className="absolute inset-1 bg-black rounded-full border border-gray-600"></div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'resistor_2':
        case 'resistor_5':
        case 'resistor_10':
             const val = type.split('_')[1];
             // Ceramic Resistor Look
             return (
                 <div style={style} className="absolute w-20 h-8 flex items-center justify-center drop-shadow-md">
                     <div className="w-16 h-6 bg-stone-100 rounded-full border border-stone-300 relative overflow-hidden flex items-center justify-center shadow-inner">
                         {/* Bands */}
                         <div className="absolute left-3 w-1.5 h-full bg-amber-600"></div>
                         <div className="absolute left-6 w-1.5 h-full bg-blue-600"></div>
                         <div className="absolute left-9 w-1.5 h-full bg-red-600"></div>
                         <div className="absolute right-3 w-1.5 h-full bg-yellow-500"></div>
                         <span className="relative z-10 text-[9px] font-bold text-black bg-white/80 px-1 rounded border border-stone-300">{val}Ω</span>
                     </div>
                     {/* Leads */}
                     <div className="absolute left-0 w-2 h-0.5 bg-gray-400"></div>
                     <div className="absolute right-0 w-2 h-0.5 bg-gray-400"></div>
                 </div>
             );
        default: return null;
    }
};

const TOOLS: Record<string, any> = {
    'battery': { name: 'Battery', type: 'source', terminals: [{id:'pos',x:50,y:0},{id:'neg',x:-50,y:0}], icon: '🔋' },
    'key': { name: 'Key (Switch)', type: 'control', terminals: [{id:'in',x:-35,y:0},{id:'out',x:35,y:0}], icon: '🔌' },
    'potentiometer': { name: 'Potentiometer', type: 'control', terminals: [{id:'A',x:-190,y:8},{id:'B',x:190,y:8},{id:'J',x:0,y:-30}], icon: '📏' },
    'voltmeter': { name: 'Voltmeter', type: 'meter', terminals: [{id:'pos',x:35,y:35},{id:'neg',x:-35,y:35}], icon: '⚡' },
    'ammeter': { name: 'Ammeter', type: 'meter', terminals: [{id:'pos',x:35,y:35},{id:'neg',x:-35,y:35}], icon: '⏱️' },
    'galvanometer': { name: 'Galvanometer', type: 'meter', terminals: [{id:'pos',x:35,y:35},{id:'neg',x:-35,y:35}], icon: '🧭' },
    'resistor_box': { name: 'Resistor Box', type: 'load', terminals: [{id:'t1',x:-60,y:0},{id:'t2',x:60,y:0}], icon: '🎛️' },
    'resistor_2': { name: '2Ω Resistor', type: 'load', terminals: [{id:'t1',x:-40,y:0},{id:'t2',x:40,y:0}], icon: '2️⃣' },
    'resistor_5': { name: '5Ω Resistor', type: 'load', terminals: [{id:'t1',x:-40,y:0},{id:'t2',x:40,y:0}], icon: '5️⃣' },
    'resistor_10': { name: '10Ω Resistor', type: 'load', terminals: [{id:'t1',x:-40,y:0},{id:'t2',x:40,y:0}], icon: '🔟' },
};

const Electricity: React.FC<ElectricityProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [drawingWireStart, setDrawingWireStart] = useState<{ compId: string, terminal: string, pos: Point } | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const workbenchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onUpdateChar('idle', "Electricity Lab ready. Drag components to the board and click terminals to wire them.");
    }, []);

    const addComponent = (typeId: string) => {
        const template = TOOLS[typeId];
        setComponents([...components, {
            id: Math.random().toString(36).substr(2, 9),
            typeId,
            name: template.name,
            x: 300 + (Math.random() * 100),
            y: 200 + (Math.random() * 100),
            rotation: 0,
            state: { jockeyPos: 50, isOpen: true }
        }]);
    };

    const getTerminalPos = (comp: CircuitComponent, terminalId: string): Point => {
        const tool = TOOLS[comp.typeId];
        const termDef = tool.terminals.find((t: any) => t.id === terminalId);
        
        if (termDef) {
            const rad = comp.rotation * (Math.PI / 180);
            let tX = termDef.x;
            let tY = termDef.y;
            
            if (comp.typeId === 'potentiometer' && terminalId === 'J') {
                tX = ((comp.state.jockeyPos || 50) - 50) * 3.8;
                tY = -30;
            }

            const rotX = tX * Math.cos(rad) - tY * Math.sin(rad);
            const rotY = tX * Math.sin(rad) + tY * Math.cos(rad);
            return { x: comp.x + rotX, y: comp.y + rotY };
        }
        return { x: comp.x, y: comp.y };
    };

    const handleTerminalClick = (compId: string, terminalId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const comp = components.find(c => c.id === compId);
        if (!comp) return;
        const pos = getTerminalPos(comp, terminalId);

        if (drawingWireStart) {
            if (drawingWireStart.compId === compId && drawingWireStart.terminal === terminalId) {
                setDrawingWireStart(null);
                return;
            }
            setWires([...wires, {
                id: Math.random().toString(36),
                fromCompId: drawingWireStart.compId,
                fromTerminal: drawingWireStart.terminal,
                toCompId: compId,
                toTerminal: terminalId,
                color: '#dc2626' // Red wire
            }]);
            setDrawingWireStart(null);
        } else {
            setDrawingWireStart({ compId, terminal: terminalId, pos });
        }
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        const comp = components.find(c => c.id === id);
        if (comp && workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            setDragOffset({
                x: mouseX - comp.x,
                y: mouseY - comp.y
            });
            
            setDraggingId(id);
            setSelectedId(id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setMousePos({ x: mouseX, y: mouseY });

            if (draggingId) {
                const newX = mouseX - dragOffset.x;
                const newY = mouseY - dragOffset.y;
                setComponents(prev => prev.map(c => c.id === draggingId ? { ...c, x: newX, y: newY } : c));
            }
        }
    };
    
    const handleRotation = (delta: number) => {
        if (selectedId) {
            setComponents(prev => prev.map(c => c.id === selectedId ? { ...c, rotation: (c.rotation + delta) % 360 } : c));
        }
    };

    const moveJockey = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const comp = components.find(c => c.id === id);
        if (!comp || !workbenchRef.current) return;
        
        const handleDrag = (moveEvent: MouseEvent) => {
            const rect = workbenchRef.current!.getBoundingClientRect();
            const currentX = moveEvent.clientX - rect.left;
            // Only horizontal drag relative to rotation 0 for simplicity in this demo
            const delta = currentX - comp.x;
            const newPercent = Math.max(0, Math.min(100, 50 + (delta / 3.8)));
            setComponents(prev => prev.map(c => c.id === id ? { ...c, state: { ...c.state, jockeyPos: newPercent } } : c));
        };

        const stopDrag = () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', stopDrag);
        };

        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', stopDrag);
    };

    const selectedComponent = components.find(c => c.id === selectedId);

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)} onClick={() => setSelectedId(null)}>
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-[#0B0F19] border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar shadow-xl">
                <h4 className="text-xs font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
                    <span>⚡</span> Components
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(TOOLS).map(([key, tool]) => (
                        <button key={key} onClick={() => addComponent(key)} className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all active:scale-95 group shadow-sm">
                            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{tool.icon}</div>
                            <span className="text-[9px] text-slate-300 text-center font-medium">{tool.name}</span>
                        </button>
                    ))}
                </div>
                 <div className="mt-8 border-t border-slate-800 pt-4">
                    <button onClick={() => { setComponents([]); setWires([]); }} className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">Clear Workbench</button>
                </div>
            </div>

            {/* Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#1e293b] overflow-hidden shadow-inner cursor-crosshair">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')] opacity-20 pointer-events-none"></div>
                
                {/* Wires */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 drop-shadow-md">
                    {wires.map(w => {
                        const c1 = components.find(c => c.id === w.fromCompId);
                        const c2 = components.find(c => c.id === w.toCompId);
                        if (!c1 || !c2) return null;
                        const p1 = getTerminalPos(c1, w.fromTerminal);
                        const p2 = getTerminalPos(c2, w.toTerminal);
                        return (
                            <g key={w.id}>
                                {/* Wire Insulation */}
                                <path d={`M ${p1.x} ${p1.y} C ${p1.x + 40} ${p1.y}, ${p2.x - 40} ${p2.y}, ${p2.x} ${p2.y}`} stroke="#b91c1c" strokeWidth="4" fill="none" strokeLinecap="round" />
                                {/* Wire Highlight */}
                                <path d={`M ${p1.x} ${p1.y} C ${p1.x + 40} ${p1.y}, ${p2.x - 40} ${p2.y}, ${p2.x} ${p2.y}`} stroke="#fca5a5" strokeWidth="1" fill="none" strokeLinecap="round" className="opacity-40" />
                                <circle cx={p1.x} cy={p1.y} r="3" fill="#7f1d1d" />
                                <circle cx={p2.x} cy={p2.y} r="3" fill="#7f1d1d" />
                            </g>
                        );
                    })}
                    {drawingWireStart && <path d={`M ${drawingWireStart.pos.x} ${drawingWireStart.pos.y} L ${mousePos.x} ${mousePos.y}`} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" fill="none" />}
                </svg>

                {/* Components */}
                {components.map(comp => (
                    <div 
                        key={comp.id} 
                        style={{ left: comp.x, top: comp.y }} 
                        className={`absolute ${selectedId === comp.id ? 'z-30' : 'z-20'} cursor-grab active:cursor-grabbing`}
                        onMouseDown={(e) => handleMouseDown(e, comp.id)}
                    >
                        <ComponentVisual type={comp.typeId} state={comp.state} rotation={comp.rotation} />
                        
                        {/* Terminals */}
                        {TOOLS[comp.typeId].terminals.map((t: any) => {
                            let tPos = {x: t.x, y: t.y};
                            const rad = comp.rotation * (Math.PI / 180);
                            
                            if (comp.typeId === 'potentiometer' && t.id === 'J') {
                                tPos.x = ((comp.state.jockeyPos || 50) - 50) * 3.8;
                                tPos.y = -30;
                            }

                            const rotX = tPos.x * Math.cos(rad) - tPos.y * Math.sin(rad);
                            const rotY = tPos.x * Math.sin(rad) + tPos.y * Math.cos(rad);

                            return (
                                <div
                                    key={t.id}
                                    className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-white/10 border border-white/30 hover:bg-red-500/30 cursor-pointer flex items-center justify-center z-40 transition-all scale-0 group-hover:scale-100"
                                    style={{ transform: `translate(${rotX}px, ${rotY}px)` }}
                                    onMouseDown={(e) => {
                                        if (comp.typeId === 'potentiometer' && t.id === 'J') moveJockey(comp.id, e);
                                        else handleTerminalClick(comp.id, t.id, e);
                                    }}
                                    title={`Connect ${t.id}`}
                                >
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></div>
                                </div>
                            );
                        })}
                        
                        {/* Key Toggle */}
                        {comp.typeId === 'key' && (
                            <div className="absolute inset-0 cursor-pointer z-30" onClick={() => setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, state: { ...c.state, isOpen: !c.state.isOpen } } : c))} />
                        )}
                        
                         {selectedId === comp.id && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-50">
                                {comp.name}
                            </div>
                        )}
                    </div>
                ))}

                {/* Controls Overlay */}
                {selectedComponent && (
                     <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 flex items-center gap-3 shadow-2xl z-50" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-bold text-slate-300 uppercase">{selectedComponent.name}</span>
                         <div className="flex items-center gap-1">
                            <button onClick={() => handleRotation(-15)} className="p-1.5 bg-slate-800 rounded text-white hover:bg-slate-700">↺</button>
                            <span className="text-xs w-8 text-center font-mono">{Math.round(selectedComponent.rotation)}°</span>
                            <button onClick={() => handleRotation(15)} className="p-1.5 bg-slate-800 rounded text-white hover:bg-slate-700">↻</button>
                         </div>
                         <button onClick={() => { setComponents(prev => prev.filter(c => c.id !== selectedId)); setSelectedId(null); }} className="p-1.5 bg-red-900/50 text-red-200 rounded hover:bg-red-800">🗑️</button>
                     </div>
                )}
            </div>
        </div>
    );
};

export default Electricity;
