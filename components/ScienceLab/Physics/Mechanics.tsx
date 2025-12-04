
import React, { useState, useRef, useEffect } from 'react';

interface MechanicsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface MechanicsComponent {
    id: string;
    type: string;
    x: number;
    y: number;
    state: any;
}

const TOOLS = [
    { id: 'retort_stand', name: 'Retort Stand', icon: '🏗️' },
    { id: 'metre_rule', name: 'Metre Rule', icon: '📏' },
    { id: 'knife_edge', name: 'Knife Edge', icon: '🔺' },
    { id: 'spring', name: 'Spiral Spring', icon: '➰' },
    { id: 'mass_hanger', name: 'Mass Hanger', icon: '⚖️' },
    { id: 'slotted_mass', name: 'Slotted Mass (20g)', icon: '🧱' },
    { id: 'stopwatch', name: 'Stopwatch', icon: '⏱️' },
    { id: 'g_clamp', name: 'G-Clamp', icon: '🗜️' },
    { id: 'pendulum', name: 'Pendulum Bob', icon: '🧶' },
    { id: 'optical_pin', name: 'Optical Pin', icon: '📍' },
];

const ComponentVisual = ({ comp }: { comp: MechanicsComponent }) => {
    switch(comp.type) {
        case 'retort_stand':
            return (
                <div className="w-24 h-64 flex flex-col items-center pointer-events-none transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-2 h-60 bg-slate-400 rounded-t"></div>
                    <div className="w-24 h-4 bg-slate-600 rounded"></div>
                    {/* Clamp Arm */}
                    <div className="absolute top-10 left-1/2 w-16 h-2 bg-slate-500 origin-left"></div>
                </div>
            );
        case 'metre_rule':
             return (
                 <div className="w-[400px] h-8 bg-[#fefce8] border border-slate-400 flex items-center justify-between px-2 rounded-sm shadow-md transform -translate-x-1/2 -translate-y-1/2 relative">
                     {Array.from({length: 11}).map((_,i) => (
                         <div key={i} className="h-full w-px bg-slate-800 relative">
                             <span className="absolute bottom-full text-[8px] font-bold -translate-x-1/2">{i*10}</span>
                         </div>
                     ))}
                 </div>
             );
        case 'knife_edge':
            return (
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[30px] border-b-slate-800 drop-shadow-lg transform -translate-x-1/2 -translate-y-1/2"></div>
            );
        case 'spring':
             return (
                 <div className="w-8 h-32 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                     <div className="w-1 h-4 bg-slate-400"></div>
                     <svg width="20" height="100" className="overflow-visible">
                         <path d="M10 0 Q 0 5, 10 10 Q 20 15, 10 20 Q 0 25, 10 30 Q 20 35, 10 40 Q 0 45, 10 50" fill="none" stroke="#64748b" strokeWidth="2" />
                     </svg>
                     <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                 </div>
             );
        case 'mass_hanger':
            return (
                <div className="w-6 h-16 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-1 h-12 bg-slate-500"></div>
                    <div className="w-6 h-2 bg-amber-600 rounded"></div>
                </div>
            );
        case 'slotted_mass':
             return (
                 <div className="w-8 h-4 bg-amber-500 border border-amber-700 rounded-sm shadow-sm transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                     <span className="text-[8px] text-amber-900 font-bold">20g</span>
                 </div>
             );
        case 'stopwatch':
             return (
                 <div className="w-12 h-14 bg-slate-800 rounded-full border-2 border-slate-600 flex flex-col items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2">
                     <span className="text-[10px] font-mono text-green-400">00:00</span>
                     <div className="absolute -top-2 w-2 h-2 bg-red-500 rounded-full"></div>
                 </div>
             );
         case 'g_clamp':
             return (
                 <div className="w-10 h-16 border-4 border-slate-700 rounded-r-lg border-l-0 relative transform -translate-x-1/2 -translate-y-1/2">
                     <div className="absolute top-2 -left-4 w-8 h-2 bg-slate-500"></div>
                 </div>
             );
        default: 
            return <div className="w-8 h-8 bg-gray-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>;
    }
}

const Mechanics: React.FC<MechanicsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<MechanicsComponent[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const workbenchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onUpdateChar('idle', "Mechanics Laboratory ready. I see you have listed many apparatus from the exam papers. Use the sidebar to place Retort Stands, Springs, or Knife Edges.");
    }, []);

    const addComponent = (type: string) => {
        setComponents([...components, {
            id: Math.random().toString(36),
            type,
            x: 400,
            y: 300,
            state: {}
        }]);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setComponents(prev => prev.map(c => c.id === draggingId ? { ...c, x, y } : c));
        }
    };

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)}>
             {/* Sidebar */}
             <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-bold text-amber-400 uppercase mb-4 flex items-center gap-2">
                    <span>🏗️</span> Mechanics Tools
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {TOOLS.map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => addComponent(tool.id)}
                            className="flex flex-col items-center p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-amber-500 hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                        >
                            <div className="text-2xl mb-2">{tool.icon}</div>
                            <span className="text-[10px] text-slate-300 text-center font-medium">{tool.name}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 border-t border-slate-800 pt-4">
                    <button 
                        onClick={() => { setComponents([]); onUpdateChar('warning', "Workbench cleared."); }}
                        className="w-full py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                    >
                        Clear Workbench
                    </button>
                </div>
            </div>

            {/* Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#1e293b] overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-5 pointer-events-none"></div>
                <div className="absolute bottom-0 w-full h-16 bg-[#334155] border-t-4 border-[#475569]"></div> {/* Floor/Bench Surface */}

                {components.map(comp => (
                    <div
                        key={comp.id}
                        className="absolute cursor-grab active:cursor-grabbing"
                        style={{ left: comp.x, top: comp.y }}
                        onMouseDown={() => setDraggingId(comp.id)}
                    >
                        <ComponentVisual comp={comp} />
                    </div>
                ))}

                {components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="text-center">
                            <span className="text-6xl">🏗️</span>
                            <p className="mt-4 text-xl font-bold text-slate-400">Mechanics Bench Empty</p>
                            <p className="text-sm">Set up your retort stands, springs, and beams here.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Mechanics;
