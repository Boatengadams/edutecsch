
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
    state: { isOpen?: boolean; voltage?: number; resistance?: number; cellCount?: number; length?: number; jockeyPos?: number; magneticField?: number }; 
}

interface Wire {
    id: string;
    fromCompId: string;
    fromTerminal: string;
    toCompId: string;
    toTerminal: string;
    color: string;
}

// VISUAL RENDERER
const ComponentVisual = ({ type, state, rotation }: { type: string, state: any, rotation: number }) => {
    const style = { transform: `translate(-50%, -50%) rotate(${rotation}deg)`, pointerEvents: 'none' as const };
    
    switch (type) {
        case 'battery':
            return (
                <div style={style} className="absolute w-24 h-10 flex items-center justify-center drop-shadow-xl">
                    {/* Main Body */}
                    <div className="w-20 h-10 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-sm border border-yellow-700 flex items-center justify-center shadow-inner relative overflow-hidden">
                         <div className="absolute top-0 left-0 right-0 h-2 bg-white/20"></div>
                         <span className="font-black text-xs text-yellow-900 tracking-widest z-10">VOLT</span>
                         <div className="absolute bottom-0 w-full h-1 bg-black/20"></div>
                    </div>
                    {/* Positive Nub */}
                    <div className="w-2 h-5 bg-gray-400 rounded-r-sm border-l border-gray-600 bg-gradient-to-b from-gray-300 to-gray-500"></div>
                </div>
            );
        case 'key':
            return (
                <div style={style} className="absolute w-16 h-16 bg-[#1a1a1a] rounded-xl border-2 border-gray-800 shadow-2xl flex items-center justify-center">
                     <div className="w-12 h-1.5 bg-gray-600 relative rounded-full">
                         {/* Switch Arm */}
                         <div className={`w-full h-1.5 bg-gradient-to-r from-gray-300 to-white absolute left-0 top-0 origin-left transition-transform duration-200 rounded-full shadow-sm ${state.isOpen ? 'rotate-[-30deg]' : 'rotate-0'}`}>
                             <div className="absolute right-0 -top-1 w-3 h-3 bg-black rounded-full"></div>
                         </div>
                     </div>
                     <div className="absolute bottom-1 text-[8px] text-gray-500 font-mono">SWITCH</div>
                </div>
            );
        case 'voltmeter':
        case 'ammeter':
        case 'galvanometer':
             const label = type === 'voltmeter' ? 'V' : type === 'ammeter' ? 'A' : 'G';
             const colorClass = type === 'voltmeter' ? 'text-green-600' : type === 'ammeter' ? 'text-blue-600' : 'text-yellow-600';
             return (
                 <div style={style} className="absolute w-24 h-24 bg-black rounded-full border-4 border-gray-600 shadow-2xl flex items-center justify-center ring-1 ring-white/10">
                     <div className="absolute inset-1 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                         {/* Dial Scale */}
                         <div className="w-16 h-8 border-t-2 border-gray-300 rounded-t-full mb-1 relative">
                             <div className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-red-600 origin-bottom transform -translate-x-1/2 rotate-[-45deg]"></div>
                         </div>
                         <span className={`font-black text-2xl ${colorClass}`}>{label}</span>
                     </div>
                     {/* Glass Reflection */}
                     <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
                 </div>
             );
        case 'potentiometer':
            return (
                <div style={style} className="absolute w-[350px] h-20 flex flex-col items-center justify-center">
                    <div className="w-full h-14 bg-gradient-to-b from-[#5d4037] to-[#3e2723] rounded-lg border border-[#2d1b18] relative shadow-xl flex items-center px-6">
                        {/* Resistance Wire */}
                        <div className="w-full h-0.5 bg-gray-300 shadow-[0_0_5px_rgba(255,255,255,0.5)]"></div>
                        {/* Ruler Markings */}
                        <div className="absolute bottom-1 left-6 right-6 h-2 flex justify-between">
                            {[...Array(11)].map((_,i) => <div key={i} className="w-px h-full bg-white/30"></div>)}
                        </div>
                        {/* Jockey */}
                        <div 
                            className="absolute top-[-5px] w-6 h-16 z-50 transition-all duration-75 drop-shadow-xl"
                            style={{ left: `${state.jockeyPos || 50}%` }}
                        >
                            <div className="w-2 h-full bg-black mx-auto rounded-full bg-gradient-to-r from-gray-700 to-black"></div>
                            <div className="w-6 h-4 bg-red-600 rounded absolute top-0 -ml-2"></div>
                        </div>
                    </div>
                </div>
            );
        case 'resistor_box':
            return (
                <div style={style} className="absolute w-28 h-16 bg-gradient-to-b from-[#4e342e] to-[#3e2723] rounded-lg border-b-4 border-[#1b110f] shadow-xl flex items-center justify-center gap-2 px-2">
                    {[1,2,3,4].map(k => (
                        <div key={k} className="w-4 h-4 rounded-full bg-black border border-gray-600 shadow-inner"></div>
                    ))}
                </div>
            );
        default: return <div style={style} className="w-10 h-10 bg-gray-500 rounded"></div>;
    }
};

const TOOLS: Record<string, any> = {
    'battery': { name: 'Battery', terminals: [{id:'pos',x:45,y:0},{id:'neg',x:-45,y:0}], icon: '🔋' },
    'key': { name: 'Key', terminals: [{id:'in',x:-35,y:0},{id:'out',x:35,y:0}], icon: '🔌' },
    'potentiometer': { name: 'Potentiometer', terminals: [{id:'A',x:-170,y:0},{id:'B',x:170,y:0},{id:'J',x:0,y:-20}], icon: '📏' },
    'voltmeter': { name: 'Voltmeter', terminals: [{id:'pos',x:30,y:30},{id:'neg',x:-30,y:30}], icon: '⚡' },
    'ammeter': { name: 'Ammeter', terminals: [{id:'pos',x:30,y:30},{id:'neg',x:-30,y:30}], icon: '⏱️' },
    'resistor_box': { name: 'Resistor Box', terminals: [{id:'t1',x:-50,y:0},{id:'t2',x:50,y:0}], icon: '🎛️' },
};

const Electricity: React.FC<ElectricityProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [drawingWireStart, setDrawingWireStart] = useState<{ compId: string, terminal: string, pos: Point } | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const workbenchRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();

    const dragRef = useRef<{
        isDragging: boolean;
        id: string | null;
        type: 'move' | 'interact';
        mouseX: number;
        mouseY: number;
        offsetX: number;
        offsetY: number;
    }>({ isDragging: false, id: null, type: 'move', mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });

    // --- SMOOTH DRAG LOOP ---
    const animate = () => {
        if (dragRef.current.isDragging && dragRef.current.id) {
            const { id, type, mouseX, mouseY, offsetX, offsetY } = dragRef.current;
            
            setComponents(prev => prev.map(c => {
                if (c.id === id) {
                    if (type === 'move') {
                        let newX = mouseX - offsetX;
                        let newY = mouseY - offsetY;

                         // Boundary Checks
                         const benchRect = workbenchRef.current?.getBoundingClientRect();
                         if (benchRect) {
                            newX = Math.max(0, Math.min(benchRect.width, newX));
                            newY = Math.max(0, Math.min(benchRect.height, newY));
                         }

                        return { ...c, x: newX, y: newY };
                    } else if (type === 'interact' && c.typeId === 'potentiometer') {
                        const relX = mouseX - c.x;
                        const percent = Math.max(0, Math.min(100, ((relX + 170) / 340) * 100));
                        return { ...c, state: { ...c.state, jockeyPos: percent } };
                    }
                }
                return c;
            }));
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, []);


    const addComponent = (typeId: string) => {
        const template = TOOLS[typeId];
        const newComp = {
            id: Math.random().toString(36).substr(2, 9),
            typeId,
            name: template.name,
            x: 200 + Math.random() * 50,
            y: 200 + Math.random() * 50,
            rotation: 0,
            state: { jockeyPos: 50, isOpen: true }
        };
        setComponents(prev => [...prev, newComp]);
        setSelectedId(newComp.id);
    };

    const getTerminalPos = (comp: CircuitComponent, terminalId: string): Point => {
        const tool = TOOLS[comp.typeId];
        const termDef = tool.terminals.find((t: any) => t.id === terminalId);
        if (termDef) {
            const rad = comp.rotation * (Math.PI / 180);
            let tX = termDef.x;
            let tY = termDef.y;
            // Special Potentiometer Jockey Logic
            if (comp.typeId === 'potentiometer' && terminalId === 'J') {
                 tX = ((comp.state.jockeyPos || 50) - 50) * 3.4;
                 tY = -30;
            }
            const rotX = tX * Math.cos(rad) - tY * Math.sin(rad);
            const rotY = tX * Math.sin(rad) + tY * Math.cos(rad);
            return { x: comp.x + rotX, y: comp.y + rotY };
        }
        return { x: comp.x, y: comp.y };
    };

    const handleTerminalClick = (compId: string, terminalId: string, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        const comp = components.find(c => c.id === compId);
        if (!comp) return;
        const pos = getTerminalPos(comp, terminalId);

        if (drawingWireStart) {
            if (drawingWireStart.compId === compId && drawingWireStart.terminal === terminalId) {
                setDrawingWireStart(null); return;
            }
            setWires([...wires, {
                id: Math.random().toString(36),
                fromCompId: drawingWireStart.compId, fromTerminal: drawingWireStart.terminal,
                toCompId: compId, toTerminal: terminalId,
                color: '#ef4444' // Red wire
            }]);
            setDrawingWireStart(null);
        } else {
            setDrawingWireStart({ compId, terminal: terminalId, pos });
        }
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'move' | 'interact' = 'move') => {
        e.stopPropagation();
        if (type === 'move') e.preventDefault();
        
        const comp = components.find(c => c.id === id);
        if (!comp || !workbenchRef.current) return;

        // Bring to front
        setComponents(prev => [...prev.filter(c => c.id !== id), comp]);
        setSelectedId(id);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = workbenchRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        
        dragRef.current = {
            isDragging: true, id, type,
            mouseX, mouseY,
            offsetX: mouseX - comp.x,
            offsetY: mouseY - comp.y
        };
        
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
        window.addEventListener('touchmove', handleGlobalMove, { passive: false });
        window.addEventListener('touchend', handleGlobalUp);
    };

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!dragRef.current.isDragging || !workbenchRef.current) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        const rect = workbenchRef.current.getBoundingClientRect();
        
        // Simply update the ref coordinate, the animate loop handles the state update
        dragRef.current.mouseX = clientX - rect.left;
        dragRef.current.mouseY = clientY - rect.top;
    };

    const handleGlobalUp = () => {
        dragRef.current.isDragging = false;
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchmove', handleGlobalMove);
        window.removeEventListener('touchend', handleGlobalUp);
    };

    const handleWorkbenchMove = (e: React.MouseEvent) => {
        if (workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const deleteComponent = (id: string) => {
        setComponents(prev => prev.filter(c => c.id !== id));
        setWires(prev => prev.filter(w => w.fromCompId !== id && w.toCompId !== id));
        setSelectedId(null);
    };

    const updateRotation = (id: string, deg: number) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, rotation: deg } : c));
    };

    const filteredTools = Object.entries(TOOLS).filter(([key, tool]) => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleWorkbenchMove} onClick={() => setSelectedId(null)}>
            {/* Sidebar */}
            <div className="w-full md:w-64 h-48 md:h-full bg-[#0B0F19] border-r border-slate-800 p-4 flex flex-col gap-4 z-20 overflow-y-auto shadow-2xl">
                <div>
                    <input
                        type="text"
                        placeholder="Search components..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 bg-slate-800 rounded-lg text-xs text-white border border-slate-700 focus:border-blue-500 outline-none placeholder-slate-500"
                    />
                </div>
                
                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Electronics</h4>
                <div className="grid grid-cols-3 gap-2">
                    {filteredTools.map(([key, tool]) => (
                        <button key={key} onClick={() => addComponent(key)} className="flex flex-col items-center p-2 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-yellow-500 hover:bg-slate-700 transition-all active:scale-95">
                            <span className="text-2xl mb-1">{tool.icon}</span>
                            <span className="text-[9px] text-slate-300 font-bold text-center">{tool.name}</span>
                        </button>
                    ))}
                </div>
                <button onClick={() => {setComponents([]); setWires([])}} className="mt-auto w-full py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">Reset Board</button>
            </div>

            {/* Circuit Board */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#1e293b] overflow-hidden cursor-default touch-none">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')] opacity-20 pointer-events-none"></div>
                
                {/* Wires Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 filter drop-shadow-sm">
                    {wires.map(w => {
                        const c1 = components.find(c => c.id === w.fromCompId);
                        const c2 = components.find(c => c.id === w.toCompId);
                        if (!c1 || !c2) return null;
                        const p1 = getTerminalPos(c1, w.fromTerminal);
                        const p2 = getTerminalPos(c2, w.toTerminal);
                        return <path key={w.id} d={`M ${p1.x} ${p1.y} C ${p1.x+50} ${p1.y}, ${p2.x-50} ${p2.y}, ${p2.x} ${p2.y}`} stroke={w.color} strokeWidth="4" fill="none" strokeLinecap="round" />;
                    })}
                    {drawingWireStart && <path d={`M ${drawingWireStart.pos.x} ${drawingWireStart.pos.y} L ${mousePos.x} ${mousePos.y}`} stroke="#ef4444" strokeWidth="3" strokeDasharray="5,5" fill="none" opacity="0.8" />}
                </svg>

                {/* Components Layer */}
                {components.map(comp => {
                    const isSelected = selectedId === comp.id;
                    
                    return (
                        <div 
                            key={comp.id} 
                            style={{ left: comp.x, top: comp.y, zIndex: isSelected ? 100 : 20 }} 
                            className="absolute"
                            onMouseDown={(e) => handleMouseDown(e, comp.id)} 
                            onTouchStart={(e) => handleMouseDown(e, comp.id)}
                        >
                            {/* Control Panel (Popover) */}
                            {isSelected && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 bg-slate-800 p-2 rounded-xl border border-slate-600 shadow-xl z-50 flex gap-2 animate-fade-in-up" onMouseDown={e => e.stopPropagation()}>
                                    <button onClick={() => updateRotation(comp.id, comp.rotation - 45)} className="p-2 hover:bg-slate-700 rounded-lg text-white" title="Rotate Left">
                                        ↺
                                    </button>
                                    <div className="w-px bg-slate-600 mx-1"></div>
                                    <button onClick={() => updateRotation(comp.id, comp.rotation + 45)} className="p-2 hover:bg-slate-700 rounded-lg text-white" title="Rotate Right">
                                        ↻
                                    </button>
                                    <div className="w-px bg-slate-600 mx-1"></div>
                                    <button onClick={() => deleteComponent(comp.id)} className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg" title="Delete">
                                        🗑️
                                    </button>
                                </div>
                            )}

                            <div className={`${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}`}>
                                <ComponentVisual type={comp.typeId} state={comp.state} rotation={comp.rotation} />
                            </div>
                            
                            {/* Terminals */}
                            {TOOLS[comp.typeId].terminals.map((t: any) => {
                                let tPos = {x: t.x, y: t.y};
                                const rad = comp.rotation * (Math.PI / 180);
                                
                                if (comp.typeId === 'potentiometer' && t.id === 'J') {
                                    tPos.x = ((comp.state.jockeyPos || 50) - 50) * 3.4;
                                    tPos.y = -20;
                                }
                                const rotX = tPos.x * Math.cos(rad) - tPos.y * Math.sin(rad);
                                const rotY = tPos.x * Math.sin(rad) + tPos.y * Math.cos(rad);

                                return (
                                    <div key={t.id} className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-red-500/20 border-2 border-red-400 cursor-pointer z-40 hover:bg-red-500 hover:scale-125 transition-transform" style={{ transform: `translate(${rotX}px, ${rotY}px)` }} onMouseDown={(e) => handleTerminalClick(comp.id, t.id, e)} onTouchStart={(e) => handleTerminalClick(comp.id, t.id, e)} />
                                );
                            })}
                            
                            {/* Potentiometer Interaction Zone Override */}
                            {comp.typeId === 'potentiometer' && (
                                <div 
                                    className="absolute w-80 h-10 cursor-ew-resize z-50"
                                    style={{ transform: `translate(-50%, -50%) rotate(${comp.rotation}deg)`, top: -10 }}
                                    onMouseDown={(e) => handleMouseDown(e, comp.id, 'interact')}
                                    onTouchStart={(e) => handleMouseDown(e, comp.id, 'interact')}
                                />
                            )}
                            
                            {/* Switch Interaction */}
                            {comp.typeId === 'key' && (
                                <div className="absolute inset-0 cursor-pointer z-30" onClick={() => setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, state: { ...c.state, isOpen: !c.state.isOpen } } : c))} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Electricity;
