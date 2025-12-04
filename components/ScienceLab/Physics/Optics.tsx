
import React, { useState, useRef, useEffect } from 'react';

interface OpticsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface OpticsComponent {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    rotation: number;
}

const TOOLS = [
    { id: 'ray_box', name: 'Ray Box', icon: '🔦' },
    { id: 'converging_lens', name: 'Converging Lens', icon: '🔍' },
    { id: 'diverging_lens', name: 'Diverging Lens', icon: '👓' },
    { id: 'concave_mirror', name: 'Concave Mirror', icon: '🥣' },
    { id: 'convex_mirror', name: 'Convex Mirror', icon: '🥄' },
    { id: 'plane_mirror', name: 'Plane Mirror', icon: '🪞' },
    { id: 'screen', name: 'Screen', icon: '⬜' },
    { id: 'prism', name: 'Glass Prism', icon: '🔺' },
    { id: 'optical_pin', name: 'Optical Pin', icon: '📍' },
    { id: 'candle', name: 'Candle (Object)', icon: '🕯️' },
];

const ComponentVisual = ({ comp }: { comp: OpticsComponent }) => {
    const style = { transform: `translate(-50%, -50%) rotate(${comp.rotation}deg)`, pointerEvents: 'none' as const };

    switch(comp.type) {
        case 'ray_box':
            return (
                <div style={style} className="w-24 h-14 bg-zinc-800 border-2 border-zinc-600 rounded shadow-xl flex items-center justify-end relative">
                     {/* Light Cone */}
                     <div className="absolute right-[-30px] w-0 h-0 border-t-[30px] border-t-transparent border-b-[30px] border-b-transparent border-l-[60px] border-l-yellow-500/30 filter blur-xl"></div>
                     {/* Body Detail */}
                     <div className="absolute left-2 top-2 bottom-2 w-1 bg-black/30 rounded-full"></div>
                     {/* Slit */}
                     <div className="h-8 w-1 bg-yellow-300 absolute right-0 shadow-[0_0_10px_rgba(253,224,71,0.8)]"></div>
                     <span className="text-[8px] text-zinc-400 font-bold absolute bottom-1 left-2">RAY SOURCE</span>
                </div>
            );
        case 'converging_lens':
            return (
                <div style={style} className="flex flex-col items-center">
                    {/* Glass Lens */}
                    <div className="w-4 h-28 bg-blue-100/10 border border-blue-200/30 rounded-[50%] shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] backdrop-blur-[2px] relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50"></div>
                    </div>
                    {/* Holder Base */}
                    <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm border border-slate-600"></div> 
                </div>
            );
         case 'diverging_lens':
            return (
                <div style={style} className="flex flex-col items-center">
                    {/* Glass Shape */}
                    <div className="w-4 h-28 bg-blue-100/10 border border-blue-200/30 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] backdrop-blur-[2px] relative overflow-hidden" style={{clipPath: 'polygon(20% 0, 80% 0, 100% 10%, 100% 90%, 80% 100%, 20% 100%, 0% 90%, 0% 10%)'}}>
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-blue-200/20"></div>
                    </div>
                    <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm border border-slate-600"></div>
                </div>
            );
         case 'concave_mirror':
             return (
                 <div style={style} className="flex flex-col items-center">
                     {/* Mirror Surface */}
                     <div className="w-6 h-28 border-l-4 border-slate-300 rounded-l-[100%] bg-slate-800 relative overflow-hidden">
                         <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-white/10 via-white/40 to-white/10"></div>
                     </div>
                     <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm border border-slate-600"></div>
                 </div>
             );
         case 'convex_mirror':
             return (
                 <div style={style} className="flex flex-col items-center">
                     <div className="w-6 h-28 border-r-4 border-slate-300 rounded-r-[100%] bg-slate-800 relative overflow-hidden">
                         <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-white/10 via-white/40 to-white/10"></div>
                     </div>
                     <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm border border-slate-600"></div>
                 </div>
             );
        case 'plane_mirror':
            return (
                <div style={style} className="flex flex-col items-center">
                    <div className="w-2 h-28 bg-slate-400 border-l-2 border-blue-100 shadow-md relative">
                        {/* Reflection hint */}
                        <div className="absolute left-[-1px] top-0 w-0.5 h-full bg-white/50 blur-[1px]"></div>
                    </div>
                    <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm border border-slate-600"></div>
                </div>
            );
        case 'screen':
            return (
                <div style={style} className="w-2 h-32 bg-white border border-slate-300 shadow-[0_0_15px_rgba(255,255,255,0.3)] relative">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/50 rounded-full blur-sm"></div>
                </div>
            );
        case 'prism':
             return (
                 <div style={style} className="w-0 h-0 border-l-[35px] border-l-transparent border-r-[35px] border-r-transparent border-b-[70px] border-b-blue-100/30 backdrop-blur-sm relative drop-shadow-lg">
                     <div className="absolute top-[10px] left-[-10px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-white/20 blur-sm"></div>
                 </div>
             );
        case 'candle':
            return (
                <div style={style} className="flex flex-col items-center pb-4">
                    {/* Flame */}
                    <div className="w-3 h-5 bg-gradient-to-t from-orange-500 via-yellow-400 to-white rounded-full rounded-b-md animate-pulse shadow-[0_0_20px_rgba(255,165,0,0.8)] blur-[1px]"></div>
                    {/* Wick */}
                    <div className="w-0.5 h-2 bg-black"></div>
                    {/* Wax Body */}
                    <div className="w-6 h-16 bg-gradient-to-r from-slate-100 via-white to-slate-200 border border-slate-300 rounded-sm shadow-md relative">
                         <div className="absolute top-0 w-full h-2 bg-slate-100 rounded-full -mt-1"></div>
                    </div>
                </div>
            );
        case 'optical_pin':
            return (
                <div style={style} className="flex flex-col items-center pb-4">
                    <div className="w-1 h-20 bg-gradient-to-r from-gray-400 to-gray-200 shadow-sm"></div>
                    <div className="w-6 h-3 bg-slate-700 rounded shadow-md"></div>
                </div>
            );
        default:
            return <div style={style} className="w-6 h-6 bg-gray-500 rounded"></div>;
    }
}

const Optics: React.FC<OpticsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<OpticsComponent[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const benchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onUpdateChar('idle', "Optics Lab initialized. Drag lenses and mirrors to the Optical Bench. Use the rotation controls to experiment with reflection and refraction angles.");
    }, []);

    const addComponent = (tool: any) => {
        setComponents([...components, {
            id: Math.random().toString(36),
            type: tool.id,
            name: tool.name,
            x: 100 + (components.length * 50),
            y: 200,
            rotation: 0
        }]);
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        const comp = components.find(c => c.id === id);
        if (comp && benchRef.current) {
            const rect = benchRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            setDragOffset({
                x: mouseX - comp.x,
                y: mouseY - comp.y
            });
            
            setSelectedId(id);
            setDraggingId(id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && benchRef.current) {
            const rect = benchRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const newX = mouseX - dragOffset.x;
            const newY = mouseY - dragOffset.y;
            
            setComponents(prev => prev.map(c => c.id === draggingId ? { ...c, x: newX, y: newY } : c));
        }
    };

    const handleRotation = (delta: number) => {
        if (selectedId) {
            setComponents(prev => prev.map(c => c.id === selectedId ? { ...c, rotation: (c.rotation + delta) % 360 } : c));
        }
    };

    const selectedComponent = components.find(c => c.id === selectedId);

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)} onClick={() => setSelectedId(null)}>
             {/* Sidebar */}
             <div className="w-full md:w-64 bg-[#0B0F19] border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar shadow-xl">
                <h4 className="text-xs font-bold text-purple-400 uppercase mb-4 flex items-center gap-2">
                    <span>🔦</span> Optics Apparatus
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {TOOLS.map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => addComponent(tool)}
                            className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-purple-500 hover:bg-slate-700 transition-all active:scale-95 shadow-sm group"
                        >
                            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{tool.icon}</div>
                            <span className="text-[9px] text-slate-300 text-center font-medium">{tool.name}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 border-t border-slate-800 pt-4">
                    <button 
                        onClick={() => { setComponents([]); onUpdateChar('warning', "Optical bench cleared."); }}
                        className="w-full py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                    >
                        Clear Bench
                    </button>
                </div>
            </div>

            {/* Optical Bench */}
            <div ref={benchRef} className="flex-grow relative bg-[#020617] overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair">
                {/* Darkroom ambience */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none"></div>
                
                {/* Grid/Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-10 pointer-events-none"></div>
                
                {/* Principal Axis - Laser look */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-500/20 border-t border-dashed border-blue-400/30 pointer-events-none shadow-[0_0_10px_rgba(59,130,246,0.2)]"></div>

                {/* Bench Rail Visual - Metallic */}
                <div className="absolute top-1/2 left-10 right-10 h-8 bg-gradient-to-b from-slate-800 to-slate-900 border-x border-y border-slate-700 rounded transform translate-y-32 pointer-events-none shadow-lg">
                     {/* Ruler Markings */}
                     <div className="absolute top-0 left-0 w-full h-full flex justify-between px-4 items-start pt-1">
                         {Array.from({length: 21}).map((_,i) => (
                             <div key={i} className="flex flex-col items-center">
                                 <div className="w-px h-2 bg-slate-500"></div>
                                 {i % 5 === 0 && <span className="text-[8px] text-slate-500 mt-0.5 font-mono">{i * 5}</span>}
                             </div>
                         ))}
                     </div>
                </div>

                {components.map(comp => (
                    <div
                        key={comp.id}
                        className={`absolute cursor-grab active:cursor-grabbing ${selectedId === comp.id ? 'z-30' : 'z-20'}`}
                        style={{ left: comp.x, top: comp.y }}
                        onMouseDown={(e) => handleMouseDown(e, comp.id)}
                    >
                        <ComponentVisual comp={comp} />
                        {/* Position Label */}
                        <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-400 bg-black/80 px-1 rounded whitespace-nowrap pointer-events-none border border-slate-700">
                            {Math.round(comp.x / 5)}cm
                        </div>
                        {selectedId === comp.id && (
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                                {comp.name}
                            </div>
                        )}
                    </div>
                ))}

                {/* Rotation Control Overlay */}
                {selectedComponent && (
                     <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 flex items-center gap-3 shadow-2xl z-50" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-bold text-slate-300 uppercase">{selectedComponent.name}</span>
                         <div className="flex items-center gap-1">
                            <button onClick={() => handleRotation(-15)} className="p-1.5 bg-slate-800 rounded text-white hover:bg-slate-700">↺</button>
                            <span className="text-xs font-mono w-8 text-center">{Math.round(selectedComponent.rotation)}°</span>
                            <button onClick={() => handleRotation(15)} className="p-1.5 bg-slate-800 rounded text-white hover:bg-slate-700">↻</button>
                         </div>
                         <button onClick={() => { setComponents(prev => prev.filter(c => c.id !== selectedId)); setSelectedId(null); }} className="p-1.5 bg-red-900/50 text-red-200 rounded hover:bg-red-800">🗑️</button>
                     </div>
                )}

                {components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="text-center">
                            <span className="text-6xl text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">🔦</span>
                            <p className="mt-4 text-xl font-bold text-slate-300 tracking-widest">OPTICS LAB</p>
                            <p className="text-sm text-slate-500">Darkroom Enabled</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Optics;
