import React, { useState, useEffect, useRef } from 'react';
import Card from '../../common/Card';
import Button from '../../common/Button';

const Mechanics: React.FC = () => {
    const [mode, setMode] = useState<'pendulum' | 'ramp'>('pendulum');
    const [length, setLength] = useState(150); // px
    const [mass, setMass] = useState(50); // g
    const [angle, setAngle] = useState(30); // deg
    const [timer, setTimer] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    const animate = (time: number) => {
        if (!startTimeRef.current) startTimeRef.current = time;
        const elapsed = (time - startTimeRef.current) / 1000;
        setTimer(elapsed);
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (isRunning) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            startTimeRef.current = 0;
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isRunning]);

    const pendulumAngle = isRunning ? angle * Math.cos(Math.sqrt(9.8 / (length/100)) * timer) : angle;

    return (
        <div className="h-full flex flex-col bg-slate-950 p-10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setMode('pendulum')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'pendulum' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Pendulum</button>
                    <button onClick={() => setMode('ramp')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'ramp' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Ramp</button>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chronometer</p>
                        <p className="text-2xl font-mono font-black text-blue-400">{timer.toFixed(2)}s</p>
                    </div>
                    <Button onClick={() => setIsRunning(!isRunning)} variant={isRunning ? 'danger' : 'primary'}>{isRunning ? 'Stop' : 'Start Experiment'}</Button>
                </div>
            </div>

            <div className="flex-grow flex gap-10">
                <div className="flex-grow bg-slate-900/50 rounded-[3rem] border border-white/5 flex items-center justify-center relative overflow-hidden">
                    {mode === 'pendulum' ? (
                        <div className="relative flex flex-col items-center">
                            <div className="w-40 h-2 bg-slate-700 rounded-full mb-[-4px] relative z-20 shadow-xl"></div>
                            <div 
                                className="origin-top transition-transform duration-75"
                                style={{ height: `${length}px`, transform: `rotate(${pendulumAngle}deg)` }}
                            >
                                <div className="w-1 h-full bg-slate-400 mx-auto"></div>
                                <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full shadow-2xl border-2 border-slate-500 flex items-center justify-center text-[10px] font-black text-slate-800">
                                    {mass}g
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg width="600" height="400" viewBox="0 0 600 400" className="overflow-visible">
                                <path d="M 50 350 L 550 350 L 550 150 Z" fill="rgba(59, 130, 246, 0.1)" stroke="white" strokeWidth="2" />
                                <rect x="100" y="280" width="60" height="30" fill="#ef4444" transform="rotate(-21, 100, 280)" />
                            </svg>
                        </div>
                    )}
                </div>

                <aside className="w-80 space-y-6">
                    <Card className="space-y-6">
                        <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Experimental Parameters</h4>
                        <div>
                            <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-500 uppercase">String Length</label><span className="text-white font-mono">{length}cm</span></div>
                            <input type="range" min="50" max="300" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Bob Mass</label><span className="text-white font-mono">{mass}g</span></div>
                            <input type="range" min="10" max="500" step="10" value={mass} onChange={e => setMass(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Initial Angle</label><span className="text-white font-mono">{angle}°</span></div>
                            <input type="range" min="5" max="60" value={angle} onChange={e => setAngle(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500" />
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
};

export default Mechanics;