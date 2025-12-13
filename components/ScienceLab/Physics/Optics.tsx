
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
    { id: 'screen', name: 'Screen', icon: '⬜' },
    { id: 'candle', name: 'Candle', icon: '🕯️' },
];

const ComponentVisual = ({ comp }: { comp: OpticsComponent }) => {
    const style = { transform: `translate(-50%, -50%) rotate(${comp.rotation}deg)`, pointerEvents: 'none' as const };
    switch(comp.type) {
        case 'ray_box':
            return (
                <div style={style} className="w-24 h-12 bg-zinc-800 border border-zinc-600 rounded shadow-xl flex items-center justify-end relative z-20">
                     <div className="absolute right-[-50px] w-0 h-0 border-t-[30px] border-t-transparent border-b-[30px] border-b-transparent border-l-[60px] border-l-yellow-500/20 filter blur-xl"></div>
                     <div className="h-8 w-1 bg-yellow-400 absolute right-0 shadow-[0_0_15px_rgba(250,204,21,0.9)]"></div>
                </div>
            );
        case 'converging_lens':
            return (
                <div style={style} className="flex flex-col items-center">
                    <div className="w-4 h-28 bg-blue-100/20 border border-blue-300/40 rounded-[100%] backdrop-blur-sm shadow-inner"></div>
                    <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm shadow-md"></div> 
                </div>
            );
        case 'diverging_lens':
             return (
                <div style={style} className="flex flex-col items-center">
                    <div className="w-4 h-28 bg-blue-100/20 border-x border-blue-300/40 backdrop-blur-sm" style={{clipPath: 'polygon(20% 0, 80% 0, 100% 10%, 100% 90%, 80% 100%, 20% 100%, 0% 90%, 0% 10%)'}}></div>
                    <div className="w-8 h-3 bg-slate-700 mt-1 rounded-sm shadow-md"></div>
                </div>
             );
        case 'screen':
            return <div style={style} className="w-2 h-32 bg-white border border-gray-300 shadow-lg rounded-sm"></div>;
        case 'candle':
            return (
                <div style={style} className="flex flex-col items-center pb-2">
                    <div className="w-3 h-6 bg-orange-500 rounded-full rounded-b-lg animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.8)] blur-[1px]"></div>
                    <div className="w-1 h-2 bg-black"></div>
                    <div className="w-6 h-16 bg-gradient-to-b from-white to-gray-200 border border-gray-300 rounded-sm shadow-md"></div>
                </div>
            );
        default: return <div style={style} className="w-8 h-8 bg-gray-500 rounded"></div>;
    }
}

const Optics: React.FC<OpticsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<OpticsComponent[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    const benchRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    
    const dragRef = useRef<{ isDragging: boolean; id: string | null; mouseX: number; mouseY: number; offsetX: number; offsetY: number; }>({ 
        isDragging: false, id: null, mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 
    });

    // --- SMOOTH DRAG LOOP ---
    const animate = (time: number) => {
        if (dragRef.current.isDragging && dragRef.current.id) {
            const { id, mouseX, mouseY, offsetX, offsetY } = dragRef.current;
            setComponents(prev => prev.map(c => {
                if (c.id === id) {
                     let newX = mouseX - offsetX;
                     let newY = mouseY - offsetY;

                     // Boundary Checks for visible area + scroll
                     // Since we now allow scrolling, bounds might be larger than view,
                     // but limiting to benchRect prevents dragging totally out of sight.
                     const benchRect = benchRef.current?.getBoundingClientRect();
                     const scrollWidth = benchRef.current?.scrollWidth || 0;
                     const scrollHeight = benchRef.current?.scrollHeight || 0;
                     
                     if (benchRect) {
                         newX = Math.max(0, Math.min(scrollWidth, newX));
                         newY = Math.max(0, Math.min(scrollHeight, newY));
                     }
                     return { ...c, x: newX, y: newY };
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

    const addComponent = (tool: any) => {
        const scrollX = benchRef.current?.scrollLeft || 0;
        const scrollY = benchRef.current?.scrollTop || 0;
        const newComp = {
            id: Math.random().toString(36),
            type: tool.id, name: tool.name,
            x: 100 + scrollX + Math.random() * 100, 
            y: 200 + scrollY, 
            rotation: 0
        };
        setComponents([...components, newComp]);
        setSelectedId(newComp.id);
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        const comp = components.find(c => c.id === id);
        if (!comp || !benchRef.current) return;

        // Bring to front
        setComponents(prev => [...prev.filter(c => c.id !== id), comp]);
        setSelectedId(id);
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = benchRef.current.getBoundingClientRect();
        
        // Account for scrolling
        const scrollX = benchRef.current.scrollLeft;
        const scrollY = benchRef.current.scrollTop;
        
        const mouseX = clientX - rect.left + scrollX;
        const mouseY = clientY - rect.top + scrollY;
        
        dragRef.current = {
            isDragging: true, id,
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
        if (!dragRef.current.isDragging || !dragRef.current.id || !benchRef.current) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        const rect = benchRef.current.getBoundingClientRect();
        const scrollX = benchRef.current.scrollLeft;
        const scrollY = benchRef.current.scrollTop;
        
        dragRef.current.mouseX = clientX - rect.left + scrollX;
        dragRef.current.mouseY = clientY - rect.top + scrollY;
    };
    
    const handleGlobalUp = () => {
        dragRef.current.isDragging = false;
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchmove', handleGlobalMove);
        window.removeEventListener('touchend', handleGlobalUp);
    };

    const deleteComponent = (id: string) => {
        setComponents(prev => prev.filter(c => c.id !== id));
        setSelectedId(null);
    };

    const updateRotation = (id: string, val: number) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, rotation: val } : c));
    };

    const filteredTools = TOOLS.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a] relative" onClick={() => { setSelectedId(null); setSidebarOpen(false); }}>
            
            {/* Floating Menu Toggle */}
            <button 
                onClick={(e) => { e.stopPropagation(); setSidebarOpen(!isSidebarOpen); }} 
                className="absolute top-4 left-4 z-50 p-3 bg-slate-800 rounded-full text-white shadow-lg border border-slate-600 hover:bg-slate-700 transition-colors"
                title="Toggle Optics Kit"
            >
                {isSidebarOpen ? '✖️' : '🔍'}
            </button>

             {/* Sidebar - Hidden by Default */}
             <div 
                 className={`absolute top-0 left-0 h-full w-64 bg-[#0B0F19] border-r border-slate-800 z-40 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                 onClick={(e) => e.stopPropagation()}
             >
                 <div className="p-4 pt-16 flex flex-col h-full">
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search optics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 bg-slate-800 rounded-lg text-xs text-white border border-slate-700 focus:border-purple-500 outline-none placeholder-slate-500"
                        />
                    </div>

                    <h4 className="text-xs font-bold text-purple-400 uppercase mb-4">Optics Kit</h4>
                    <div className="grid grid-cols-2 gap-2 flex-grow content-start overflow-y-auto custom-scrollbar">
                        {filteredTools.map(tool => (
                            <button key={tool.id} onClick={() => addComponent(tool)} className="flex flex-col items-center p-2 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-purple-500 hover:bg-slate-700 transition-all active:scale-95">
                                <span className="text-2xl mb-1">{tool.icon}</span>
                                <span className="text-[9px] text-slate-300 font-bold text-center">{tool.name}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setComponents([])} className="mt-auto w-full py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors mt-6">Clear Bench</button>
                </div>
            </div>

            {/* Optical Bench */}
            <div ref={benchRef} className="flex-grow relative bg-[#020617] overflow-auto custom-scrollbar shadow-inner cursor-crosshair touch-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(2,6,23,0.9)_100%)] pointer-events-none" style={{ width: '2000px', height: '1000px' }}></div>
                
                {/* Optical Rail */}
                <div className="absolute top-1/2 left-0 right-0 h-12 bg-gradient-to-b from-slate-800 to-slate-900 border-y border-slate-700 transform translate-y-20" style={{ width: '2000px', top: '500px' }}>
                     <div className="absolute top-0 left-0 w-full h-full flex justify-between px-4 items-start pt-1 opacity-50">
                         {Array.from({length: 41}).map((_,i) => (
                             <div key={i} className="flex flex-col items-center">
                                 <div className="w-px h-3 bg-slate-400"></div>
                                 {i % 5 === 0 && <span className="text-[8px] text-slate-500 mt-0.5 font-mono">{i * 5}</span>}
                             </div>
                         ))}
                     </div>
                </div>
                
                {/* Principal Axis */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500/30 border-t border-dashed border-blue-400/50 pointer-events-none" style={{ width: '2000px', top: '500px' }}></div>

                {components.map(comp => {
                    const isSelected = selectedId === comp.id;

                    return (
                        <div
                            key={comp.id}
                            className={`absolute cursor-grab active:cursor-grabbing ${isSelected ? 'z-30' : 'z-20'}`}
                            style={{ left: comp.x, top: comp.y }}
                            onMouseDown={(e) => handleMouseDown(e, comp.id)}
                            onTouchStart={(e) => handleMouseDown(e, comp.id)}
                        >
                             {isSelected && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 bg-slate-800 p-2 rounded-xl border border-slate-600 shadow-xl z-50 flex flex-col items-center gap-2 w-32 animate-fade-in-up" onMouseDown={e => e.stopPropagation()}>
                                     <div className="flex w-full justify-between items-center">
                                        <span className="text-[10px] font-bold text-white truncate">{comp.name}</span>
                                        <button onClick={() => deleteComponent(comp.id)} className="text-red-400 hover:text-red-300"><span className="text-xs">🗑️</span></button>
                                     </div>
                                     <div className="w-full">
                                         <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                            <span>Rotation</span>
                                            <span>{comp.rotation}°</span>
                                         </div>
                                         <input 
                                            type="range" min="-180" max="180" 
                                            value={comp.rotation} 
                                            onChange={(e) => updateRotation(comp.id, Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                         />
                                     </div>
                                </div>
                            )}

                            <div className={`${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}`}>
                                <ComponentVisual comp={comp} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Optics;
