
import React, { useState, useRef, useEffect } from 'react';

interface OpticsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface OpticsComponent {
    id: string;
    type: string;
    x: number;
    y: number; // Y is usually fixed on axis, but draggable for now
}

const TOOLS = [
    { id: 'ray_box', name: 'Ray Box', icon: '🔦' },
    { id: 'converging_lens', name: 'Converging Lens', icon: '🔍' },
    { id: 'diverging_lens', name: 'Diverging Lens', icon: '👓' },
    { id: 'concave_mirror', name: 'Concave Mirror', icon: '🥣' },
    { id: 'convex_mirror', name: 'Convex Mirror', icon: '🥄' },
    { id: 'screen', name: 'Screen', icon: '⬜' },
    { id: 'metre_rule', name: 'Metre Rule', icon: '📏' },
    { id: 'lens_holder', name: 'Lens Holder', icon: '🧬' },
    { id: 'candle', name: 'Candle', icon: '🕯️' },
];

const ComponentVisual = ({ comp }: { comp: OpticsComponent }) => {
    switch(comp.type) {
        case 'ray_box':
            return (
                <div className="w-16 h-10 bg-black border-2 border-yellow-600 rounded-sm flex items-center justify-end relative transform -translate-x-1/2 -translate-y-1/2">
                    <div className="absolute -right-4 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[20px] border-l-yellow-500/50 opacity-50"></div>
                    <span className="text-[8px] text-white pr-1">Ray Box</span>
                </div>
            );
        case 'converging_lens':
            return (
                <div className="w-2 h-20 bg-blue-400/30 border border-blue-300 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                     <div className="w-4 h-1 bg-slate-500 absolute -bottom-2 rounded"></div>
                </div>
            );
         case 'concave_mirror':
             return (
                 <div className="w-4 h-20 border-r-4 border-slate-300 rounded-r-[100%] bg-slate-800 transform -translate-x-1/2 -translate-y-1/2"></div>
             );
        case 'screen':
            return (
                <div className="w-2 h-24 bg-white border border-slate-300 shadow-lg transform -translate-x-1/2 -translate-y-1/2"></div>
            );
        case 'candle':
            return (
                <div className="flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-2 h-4 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,0,0.8)]"></div>
                    <div className="w-4 h-12 bg-white border border-slate-200"></div>
                </div>
            );
        default:
            return <div className="w-6 h-6 bg-gray-500 rounded transform -translate-x-1/2 -translate-y-1/2"></div>;
    }
}

const Optics: React.FC<OpticsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<OpticsComponent[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const benchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onUpdateChar('idle', "Optics Lab. Remember, real images are formed on a screen, virtual images are seen in the lens/mirror. Drag apparatus to the Optical Bench.");
    }, []);

    const addComponent = (type: string) => {
        setComponents([...components, {
            id: Math.random().toString(36),
            type,
            x: 100 + (components.length * 50),
            y: 150 // Center on bench
        }]);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && benchRef.current) {
            const rect = benchRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            // Constrain Y to bench line for optical components roughly
            const y = e.clientY - rect.top; 
            setComponents(prev => prev.map(c => c.id === draggingId ? { ...c, x, y } : c));
        }
    };

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)}>
             {/* Sidebar */}
             <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-bold text-purple-400 uppercase mb-4 flex items-center gap-2">
                    <span>🔦</span> Optics Tools
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {TOOLS.map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => addComponent(tool.id)}
                            className="flex flex-col items-center p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-purple-500 hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                        >
                            <div className="text-2xl mb-2">{tool.icon}</div>
                            <span className="text-[10px] text-slate-300 text-center font-medium">{tool.name}</span>
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
            <div ref={benchRef} className="flex-grow relative bg-[#020617] overflow-hidden shadow-inner flex items-center justify-center">
                {/* Grid/Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
                
                {/* Principal Axis */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-500/30 border-t border-dashed border-blue-400/50 pointer-events-none"></div>

                {/* Bench Rail Visual */}
                <div className="absolute top-1/2 left-10 right-10 h-4 bg-slate-800 border border-slate-700 rounded transform translate-y-16 opacity-50"></div>

                {components.map(comp => (
                    <div
                        key={comp.id}
                        className="absolute cursor-ew-resize active:cursor-grabbing z-20"
                        style={{ left: comp.x, top: comp.y }}
                        onMouseDown={() => setDraggingId(comp.id)}
                    >
                        <ComponentVisual comp={comp} />
                        {/* Position Label */}
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500 bg-black/50 px-1 rounded">
                            {Math.round(comp.x / 5)}cm
                        </div>
                    </div>
                ))}

                {components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="text-center">
                            <span className="text-6xl">🔦</span>
                            <p className="mt-4 text-xl font-bold text-slate-400">Optical Bench Empty</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Optics;
