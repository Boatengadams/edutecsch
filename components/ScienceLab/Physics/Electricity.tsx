
import React, { useState, useRef, useEffect } from 'react';

interface Point { x: number; y: number }

interface ElectricityProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface CircuitComponent {
    id: string;
    typeId: string;
    x: number;
    y: number;
    rotation: number; 
    state: { isOpen?: boolean; voltage?: number; resistance?: number; cellCount?: number; length?: number; jockeyPos?: number }; 
    voltageDrop?: number; 
    current?: number;
}

interface Wire {
    id: string;
    fromCompId: string;
    fromTerminal: string;
    toCompId: string;
    toTerminal: string;
    color: string;
}

// --- VISUALS ---
const ComponentVisual = ({ type, state, rotation }: { type: string, state: any, rotation: number }) => {
    const style = { transform: `translate(-50%, -50%) rotate(${rotation}deg)`, pointerEvents: 'none' as const };
    
    switch (type) {
        case 'potentiometer':
            return (
                <div style={style} className="absolute w-[400px] h-24 flex flex-col items-center justify-center group">
                    {/* Wooden Board */}
                    <div className="w-full h-16 bg-[#5d4037] rounded-md border-2 border-[#3e2723] relative shadow-xl">
                        {/* Ruler */}
                        <div className="absolute top-1 left-4 right-4 h-4 bg-[#fff8e1] flex justify-between px-1 opacity-90 border border-slate-300">
                            {[0, 20, 40, 60, 80, 100].map(m => <span key={m} className="text-[8px] text-black font-mono">{m}</span>)}
                            <div className="absolute bottom-0 w-full h-px bg-black opacity-20"></div>
                            {Array.from({length:20}).map((_,i) => <div key={i} className="absolute bottom-0 h-1 w-px bg-black" style={{left: `${i*5}%`}}></div>)}
                        </div>
                        {/* Wire */}
                        <div className="absolute top-8 left-4 right-4 h-0.5 bg-gradient-to-b from-slate-300 to-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
                        
                        {/* Terminals A and B */}
                        <div className="absolute top-6 left-2 w-6 h-6 bg-yellow-600 rounded-full border-2 border-yellow-800 shadow-inner flex items-center justify-center">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                        </div>
                         <div className="absolute top-12 left-2 text-[10px] font-bold text-white">A</div>

                        <div className="absolute top-6 right-2 w-6 h-6 bg-yellow-600 rounded-full border-2 border-yellow-800 shadow-inner flex items-center justify-center">
                             <div className="w-2 h-2 bg-black rounded-full"></div>
                        </div>
                        <div className="absolute top-12 right-2 text-[10px] font-bold text-white">B</div>
                        
                        {/* Jockey */}
                        <div 
                            className="absolute top-0 w-6 h-16 cursor-ew-resize pointer-events-auto z-50 transition-all duration-75 group-hover:brightness-110"
                            style={{ left: `${(state.jockeyPos || 50)}%`, transform: 'translateX(-50%)' }}
                            title="Jockey (Slide to adjust length)"
                        >
                            <div className="w-2 h-10 bg-black mx-auto rounded-t-md"></div>
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-black mx-auto"></div>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-500 rounded-full border border-yellow-700 shadow-sm"></div>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-bold bg-slate-900/80 px-2 rounded">Potentiometer Wire</span>
                </div>
            );
        case 'battery':
            const cells = state.cellCount || 2;
            return (
                <div style={style} className="absolute w-28 h-16 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center shadow-lg">
                    <div className="absolute top-1/2 left-[-5px] w-2 h-4 bg-gray-400 rounded-l"></div> {/* Neg Term */}
                    <div className="absolute top-1/2 right-[-5px] w-2 h-4 bg-red-500 rounded-r"></div> {/* Pos Term */}
                    <div className="flex gap-1">
                         {Array.from({length: cells}).map((_, i) => (
                             <div key={i} className="w-8 h-10 bg-yellow-500 rounded border border-yellow-600 flex items-center justify-center shadow-inner">
                                 <span className="text-[8px] font-bold opacity-50">1.5V</span>
                             </div>
                         ))}
                    </div>
                    <div className="absolute -bottom-4 text-[9px] text-slate-400">Battery Pack</div>
                </div>
            );
        case 'key':
            return (
                <div style={style} className="absolute w-16 h-16 bg-gray-800 rounded border border-gray-600 flex items-center justify-center shadow-md">
                     <div className="w-12 h-8 border-b-2 border-gray-400 relative">
                         <div className={`w-12 h-1 bg-gray-300 absolute bottom-0 origin-left transition-transform duration-200 ${state.isOpen ? 'rotate-[-30deg]' : 'rotate-0'}`}></div>
                         <div className="absolute left-0 bottom-0 w-2 h-2 bg-black rounded-full"></div>
                         <div className="absolute right-0 bottom-0 w-2 h-2 bg-black rounded-full"></div>
                     </div>
                     <div className="absolute -bottom-4 text-[9px] text-slate-400">Switch Key</div>
                </div>
            );
        case 'voltmeter':
             return (
                 <div style={style} className="absolute w-24 h-24 bg-black rounded-full border-4 border-slate-600 shadow-xl flex items-center justify-center">
                    <div className="relative w-full h-full p-2 flex flex-col items-center justify-center">
                         <div className="w-full h-1/2 border-b border-slate-600 relative overflow-hidden">
                             <div className="absolute bottom-0 left-1/2 w-0.5 h-full bg-red-500 origin-bottom transition-transform duration-500" style={{ transform: `rotate(${((state.voltageDrop || 0) / 3 * 90) - 45}deg)` }}></div>
                         </div>
                         <span className="text-sm font-mono text-green-400 mt-1">V</span>
                         <div className="absolute bottom-2 left-2 w-3 h-3 bg-black rounded-full border border-gray-500"></div>
                         <div className="absolute bottom-2 right-2 w-3 h-3 bg-red-600 rounded-full border border-red-800"></div>
                    </div>
                 </div>
             );
        case 'ammeter':
             return (
                 <div style={style} className="absolute w-24 h-24 bg-black rounded-full border-4 border-slate-600 shadow-xl flex items-center justify-center">
                    <div className="relative w-full h-full p-2 flex flex-col items-center justify-center">
                         <div className="w-full h-1/2 border-b border-slate-600 relative overflow-hidden">
                             <div className="absolute bottom-0 left-1/2 w-0.5 h-full bg-blue-500 origin-bottom transition-transform duration-500" style={{ transform: `rotate(${((state.current || 0) * 90) - 45}deg)` }}></div>
                         </div>
                         <span className="text-sm font-mono text-blue-400 mt-1">A</span>
                         <div className="absolute bottom-2 left-2 w-3 h-3 bg-black rounded-full border border-gray-500"></div>
                         <div className="absolute bottom-2 right-2 w-3 h-3 bg-red-600 rounded-full border border-red-800"></div>
                    </div>
                 </div>
             );
        case 'resistor_box':
            return (
                <div style={style} className="absolute w-28 h-20 bg-[#3e2723] rounded border border-[#281915] flex items-center justify-center shadow-lg">
                    <div className="grid grid-cols-4 gap-1">
                        {[1,2,5,10,20,50,100,200].map((v,i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="w-4 h-4 rounded-full bg-black border border-gray-600 shadow-inner cursor-pointer hover:bg-gray-800"></div>
                                <span className="text-[6px] text-white opacity-50">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="absolute -bottom-5 text-[9px] text-slate-400 bg-slate-900 px-1 rounded">Resistance Box</div>
                </div>
            );
        case 'standard_resistor':
            return (
                <div style={style} className="absolute w-20 h-8 bg-blue-900 rounded-full border-2 border-blue-700 flex items-center justify-center shadow-md">
                    <div className="w-full h-1 bg-gray-400 absolute"></div>
                    <div className="w-12 h-6 bg-stripes-white-transparent relative z-10 opacity-20"></div>
                    <span className="relative z-10 text-[9px] font-bold text-white bg-blue-800 px-1 rounded">2Ω</span>
                </div>
            );
        default: return null;
    }
};

// TOOL DEFINITIONS extracted from exam papers
const TOOLS: Record<string, any> = {
    'battery': { 
        name: 'Battery (E)', type: 'source', terminals: [{id: 'pos', x: 60, y: 0}, {id: 'neg', x: -60, y: 0}],
        defaultVoltage: 3.0, icon: '🔋'
    },
    'key': {
        name: 'Key (K)', type: 'control', terminals: [{id: 'in', x: -30, y: 0}, {id: 'out', x: 30, y: 0}],
        defaultResistance: 0, icon: '🔌'
    },
    'potentiometer': {
        name: 'Potentiometer (AB)', type: 'control', terminals: [{id: 'A', x: -190, y: 0}, {id: 'B', x: 190, y: 0}, {id: 'J', x: 0, y: -40}],
        defaultResistance: 100, icon: '📏'
    },
    'voltmeter': {
        name: 'Voltmeter (V)', type: 'meter', terminals: [{id: 'pos', x: 35, y: 35}, {id: 'neg', x: -35, y: 35}],
        defaultResistance: 10000, icon: '⏱️'
    },
    'ammeter': {
        name: 'Ammeter (A)', type: 'meter', terminals: [{id: 'pos', x: 35, y: 35}, {id: 'neg', x: -35, y: 35}],
        defaultResistance: 0.1, icon: '⏲️'
    },
    'resistor_box': {
        name: 'Resistance Box (R)', type: 'load', terminals: [{id: 't1', x: -50, y: 0}, {id: 't2', x: 50, y: 0}],
        defaultResistance: 10, icon: '🎛️'
    },
    'standard_resistor': {
        name: 'Standard Resistor', type: 'load', terminals: [{id: 't1', x: -35, y: 0}, {id: 't2', x: 35, y: 0}],
        defaultResistance: 2, icon: '💊'
    }
};

const Electricity: React.FC<ElectricityProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [drawingWireStart, setDrawingWireStart] = useState<{ compId: string, terminal: string, pos: Point } | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const workbenchRef = useRef<HTMLDivElement>(null);

    // Initial Setup Guide
    useEffect(() => {
        onUpdateChar('idle', "Welcome to the Electricity Lab. All apparatus mentioned in your questions are available in the sidebar. Drag them to the workbench to begin your experiment.");
    }, []);

    const addComponent = (typeId: string) => {
        const template = TOOLS[typeId];
        const newComp: CircuitComponent = {
            id: Math.random().toString(36).substr(2, 9),
            typeId,
            x: 300 + (Math.random() * 200),
            y: 200 + (Math.random() * 200),
            rotation: 0,
            state: { 
                voltage: template.defaultVoltage,
                resistance: template.defaultResistance,
                cellCount: typeId === 'battery' ? 2 : undefined,
                isOpen: typeId === 'key' ? true : undefined,
                jockeyPos: 50 // %
            } 
        };
        setComponents([...components, newComp]);
        onUpdateChar('thinking', `Placed ${template.name}. Connect it using wires (click terminals).`);
    };

    const getTerminalPos = (comp: CircuitComponent, terminalId: string): Point => {
        const tool = TOOLS[comp.typeId];
        const termDef = tool.terminals.find((t: any) => t.id === terminalId);
        
        if (comp.typeId === 'potentiometer' && terminalId === 'J') {
            // Dynamic Jockey Terminal Position based on slider
            const sliderXOffset = ((comp.state.jockeyPos || 50) - 50) * 3.8; // Approx width scaling
            return { x: comp.x + sliderXOffset, y: comp.y - 40 };
        }

        if (!termDef) return { x: comp.x, y: comp.y };
        return { x: comp.x + termDef.x, y: comp.y + termDef.y };
    };

    const handleTerminalClick = (compId: string, terminalId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const comp = components.find(c => c.id === compId);
        if (!comp) return;
        const pos = getTerminalPos(comp, terminalId);

        if (drawingWireStart) {
            if (drawingWireStart.compId === compId && drawingWireStart.terminal === terminalId) {
                setDrawingWireStart(null); // Cancel
                return;
            }
            // Create Wire
            const newWire: Wire = {
                id: Math.random().toString(36),
                fromCompId: drawingWireStart.compId,
                fromTerminal: drawingWireStart.terminal,
                toCompId: compId,
                toTerminal: terminalId,
                color: '#ef4444' // Red wire default
            };
            setWires([...wires, newWire]);
            setDrawingWireStart(null);
            
            onUpdateChar('success', "Connection made!");
        } else {
            setDrawingWireStart({ compId, terminal: terminalId, pos });
            onUpdateChar('thinking', "Select destination terminal...");
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const updateComponentState = (id: string, newState: any) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, state: { ...c.state, ...newState } } : c));
    };

    const toggleKey = (id: string) => {
        const comp = components.find(c => c.id === id);
        if(comp) {
            const newState = !comp.state.isOpen;
            updateComponentState(id, { isOpen: newState });
            onUpdateChar('idle', newState ? "Circuit Open (OFF)" : "Circuit Closed (ON)");
        }
    };

    const moveJockey = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const comp = components.find(c => c.id === id);
        if (!comp || !workbenchRef.current) return;
        
        const rect = workbenchRef.current.getBoundingClientRect();
        const compRectX = comp.x; // Approx center
        const startX = e.clientX - rect.left;
        
        const handleDrag = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.clientX - rect.left;
            // Pot width approx 380px
            const delta = currentX - compRectX;
            const newPercent = Math.max(0, Math.min(100, 50 + (delta / 3.8)));
            updateComponentState(id, { jockeyPos: newPercent });
        };

        const stopDrag = () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', stopDrag);
        };

        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', stopDrag);
    };

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleMouseMove}>
            {/* Sidebar Tools */}
            <div className="w-full md:w-56 bg-slate-900 border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
                    <span>⚡</span> Apparatus
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(TOOLS).map(([key, tool]) => (
                        <button 
                            key={key} 
                            onClick={() => addComponent(key)} 
                            className="flex flex-col items-center p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all active:scale-95 shadow-sm group"
                        >
                            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{tool.icon}</div>
                            <span className="text-[10px] text-slate-300 text-center font-medium leading-tight">{tool.name}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 border-t border-slate-800 pt-4">
                    <button 
                        onClick={() => { setComponents([]); setWires([]); onUpdateChar('warning', "Workbench cleared."); }}
                        className="w-full py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <span>🗑️</span> Clear Workbench
                    </button>
                </div>
            </div>

            {/* Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#1e293b] overflow-hidden cursor-crosshair shadow-inner">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10 pointer-events-none"></div>
                
                {/* Wire Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {wires.map(w => {
                        const c1 = components.find(c => c.id === w.fromCompId);
                        const c2 = components.find(c => c.id === w.toCompId);
                        if (!c1 || !c2) return null;
                        const p1 = getTerminalPos(c1, w.fromTerminal);
                        const p2 = getTerminalPos(c2, w.toTerminal);
                        return (
                            <g key={w.id}>
                                <path d={`M ${p1.x} ${p1.y} C ${p1.x + 50} ${p1.y}, ${p2.x - 50} ${p2.y}, ${p2.x} ${p2.y}`} stroke={w.color} strokeWidth="4" fill="none" strokeLinecap="round" className="filter drop-shadow-md" />
                                <circle cx={p1.x} cy={p1.y} r="4" fill="black" />
                                <circle cx={p2.x} cy={p2.y} r="4" fill="black" />
                            </g>
                        );
                    })}
                    {/* Active Drawing Wire */}
                    {drawingWireStart && (
                        <path 
                            d={`M ${drawingWireStart.pos.x} ${drawingWireStart.pos.y} L ${mousePos.x} ${mousePos.y}`} 
                            stroke="#ef4444" strokeWidth="4" strokeDasharray="5,5" fill="none" 
                        />
                    )}
                </svg>

                {/* Components Layer */}
                {components.map(comp => (
                    <div 
                        key={comp.id} 
                        style={{ left: comp.x, top: comp.y }} 
                        className="absolute z-20"
                        onMouseDown={(e) => { 
                            // Simple Drag logic (implementation omitted for brevity in this snippet, assumed standard drag)
                        }}
                    >
                        <ComponentVisual type={comp.typeId} state={comp.state} rotation={comp.rotation} />
                        
                        {/* Interactive Terminals Overlay */}
                        {TOOLS[comp.typeId].terminals.map((t: any) => {
                            // Adjust jockey terminal position dynamically
                            let tX = t.x;
                            let tY = t.y;
                            if (comp.typeId === 'potentiometer' && t.id === 'J') {
                                tX = ((comp.state.jockeyPos || 50) - 50) * 3.8;
                                tY = -40;
                            }

                            return (
                                <div
                                    key={t.id}
                                    className="absolute w-6 h-6 rounded-full cursor-pointer hover:bg-white/20 z-30 flex items-center justify-center"
                                    style={{ left: tX - 12, top: tY - 12 }}
                                    onMouseDown={(e) => {
                                        if (comp.typeId === 'potentiometer' && t.id === 'J') {
                                            // Special case: Drag Jockey Slider
                                            moveJockey(comp.id, e);
                                        } else {
                                            handleTerminalClick(comp.id, t.id, e);
                                        }
                                    }}
                                    title={t.id}
                                >
                                    <div className={`w-2 h-2 rounded-full bg-red-500 ${drawingWireStart ? 'animate-ping' : ''}`}></div>
                                </div>
                            );
                        })}

                        {/* Click handler for Key */}
                        {comp.typeId === 'key' && (
                            <div 
                                className="absolute inset-0 cursor-pointer z-20"
                                onClick={() => toggleKey(comp.id)}
                                title="Toggle Switch"
                            ></div>
                        )}
                    </div>
                ))}

                {components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="text-center">
                            <span className="text-6xl">⚡</span>
                            <p className="mt-4 text-xl font-bold text-slate-400">Workbench Empty</p>
                            <p className="text-sm">Drag components from the left to build your circuit.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Electricity;
