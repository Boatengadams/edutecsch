import React, { useState } from 'react';
import Card from '../common/Card';

const SPECIMENS = [
    { id: 'cell', name: 'Plant Cell', img: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&w=800&q=80', description: 'Onion epidermis showing cell walls.' },
    { id: 'blood', name: 'Human Blood', img: 'https://images.unsplash.com/photo-1579152276503-68fe28dc47bf?auto=format&fit=crop&w=800&q=80', description: 'Erythrocytes and Leucocytes (400x).' },
    { id: 'tissue', name: 'Muscle Tissue', img: 'https://images.unsplash.com/photo-1583911800223-960965e6402f?auto=format&fit=crop&w=800&q=80', description: 'Striated skeletal muscle fibers.' }
];

const BiologyLab: React.FC = () => {
    const [selected, setSelected] = useState(SPECIMENS[0]);
    const [magnification, setMagnification] = useState(10);
    const [focus, setFocus] = useState(25); // 0 is perfect
    const [posX, setPosX] = useState(50);
    const [posY, setPosY] = useState(50);

    const blurAmount = Math.abs(focus) / 2;

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#050b1a] overflow-hidden">
            {/* Specimen Browser */}
            <aside className="w-full md:w-80 border-r border-white/5 bg-slate-900/50 p-6 flex flex-col gap-6 order-2 md:order-1">
                <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Specimen Library</h3>
                <div className="space-y-3">
                    {SPECIMENS.map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => setSelected(s)}
                            className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 ${selected.id === s.id ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-white/5 hover:bg-slate-700'}`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-black border border-white/10 overflow-hidden">
                                <img src={s.img} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-bold uppercase">{s.name}</span>
                        </button>
                    ))}
                </div>
                <Card className="mt-auto !bg-slate-950/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Microscope Log</p>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{selected.description}"</p>
                </Card>
            </aside>

            {/* Viewport */}
            <main className="flex-grow flex flex-col items-center justify-center p-6 sm:p-20 order-1 md:order-2 relative">
                <div className="relative w-full max-w-[600px] aspect-square rounded-full border-[15px] border-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden bg-black flex items-center justify-center">
                    {/* Reticle Layer */}
                    <div className="absolute inset-0 z-30 pointer-events-none opacity-20">
                        <div className="absolute top-1/2 w-full h-px bg-white"></div>
                        <div className="absolute left-1/2 h-full w-px bg-white"></div>
                        <div className="absolute inset-0 rounded-full border border-white/10"></div>
                    </div>

                    <div 
                        className="w-[200%] h-[200%] transition-all duration-300 ease-out"
                        style={{
                            backgroundImage: `url(${selected.img})`,
                            backgroundSize: 'cover',
                            backgroundPosition: `${posX}% ${posY}%`,
                            filter: `blur(${blurAmount}px) contrast(1.1) saturate(1.2)`,
                            transform: `scale(${magnification/5})`
                        }}
                    ></div>
                </div>

                <div className="mt-10 flex gap-4 bg-slate-900/80 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                    {[10, 40, 100].map(m => (
                        <button 
                            key={m} 
                            onClick={() => setMagnification(m)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${magnification === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            {m}x
                        </button>
                    ))}
                </div>
            </main>

            {/* Stage Controls */}
            <aside className="w-full md:w-80 border-l border-white/5 bg-slate-900/50 p-10 space-y-10 order-3">
                <div className="space-y-6">
                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Stage Alignment</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div />
                        <button onClick={() => setPosY(Math.max(0, posY - 5))} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">🔼</button>
                        <div />
                        <button onClick={() => setPosX(Math.max(0, posX - 5))} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">◀️</button>
                        <div className="flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">Stage</div>
                        <button onClick={() => setPosX(Math.min(100, posX + 5))} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">▶️</button>
                        <div />
                        <button onClick={() => setPosY(Math.min(100, posY + 5))} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">🔽</button>
                        <div />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Fine Focus Knob</h4>
                    <input 
                        type="range" min="-50" max="50" value={focus} 
                        onChange={e => setFocus(Number(e.target.value))} 
                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500" 
                    />
                    <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase">
                        <span>Coarse</span>
                        <span className={blurAmount < 1 ? 'text-emerald-400 animate-pulse' : ''}>{blurAmount < 1 ? 'OPTIMAL FOCUS' : 'Adjust'}</span>
                        <span>Near</span>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default BiologyLab;