import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../common/Card';

type CompType = 'cell' | 'bulb' | 'resistor' | 'ammeter' | 'voltmeter' | 'switch';

interface EComp {
    id: string;
    type: CompType;
    x: number;
    y: number;
    value: number; // Voltage for cell, Resistance for bulb/resistor
    state?: boolean; // For switch
}

const Electricity: React.FC = () => {
    const [components, setComponents] = useState<EComp[]>([]);
    const [isLive, setIsLive] = useState(false);

    const circuitStatus = useMemo(() => {
        const hasCell = components.some(c => c.type === 'cell');
        const isClosed = components.every(c => c.type !== 'switch' || c.state === true);
        const totalVoltage = components.filter(c => c.type === 'cell').reduce((acc, c) => acc + c.value, 0);
        const totalResistance = components.filter(c => c.type === 'bulb' || c.type === 'resistor').reduce((acc, c) => acc + c.value, 0) || 1;
        
        const current = isClosed && hasCell ? totalVoltage / totalResistance : 0;
        return { active: isClosed && hasCell, current, totalVoltage };
    }, [components]);

    const spawn = (type: CompType) => {
        const defaults: Record<CompType, number> = { cell: 1.5, bulb: 10, resistor: 10, ammeter: 0, voltmeter: 0, switch: 0 };
        setComponents([...components, {
            id: Math.random().toString(36).substr(2, 9),
            type, x: 200, y: 200, value: defaults[type], state: type === 'switch' ? false : undefined
        }]);
    };

    return (
        <div className="h-full relative bg-slate-900/50 overflow-hidden">
            {/* HUD */}
            <div className="absolute top-6 left-6 z-50 flex gap-4">
                <Card className="!bg-slate-950/80 !p-3 flex items-center gap-6 border-blue-500/20">
                    <div className="text-center">
                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Main Current</p>
                        <p className="text-xl font-mono font-bold text-white">{circuitStatus.current.toFixed(2)}A</p>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Potential Diff.</p>
                        <p className="text-xl font-mono font-bold text-white">{circuitStatus.totalVoltage.toFixed(1)}V</p>
                    </div>
                </Card>
            </div>

            {/* Toolbox */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 bg-slate-950/90 p-3 rounded-3xl border border-white/10">
                {(['cell', 'bulb', 'resistor', 'switch', 'ammeter'] as CompType[]).map(t => (
                    <button key={t} onClick={() => spawn(t)} className="w-14 h-14 bg-slate-800 hover:bg-blue-600 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-xl">
                        {t === 'cell' ? '🔋' : t === 'bulb' ? '💡' : t === 'resistor' ? '〰️' : t === 'switch' ? '🔌' : '⏱️'}
                    </button>
                ))}
            </div>

            <div className="w-full h-full p-20 grid grid-cols-4 gap-10">
                {components.map(c => (
                    <Card key={c.id} className={`relative flex flex-col items-center justify-center transition-all ${circuitStatus.active && c.type === 'bulb' ? 'ring-4 ring-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.4)]' : ''}`}>
                        <div className="text-4xl mb-2">
                            {c.type === 'cell' ? '🔋' : c.type === 'bulb' ? (circuitStatus.active ? '🌟' : '💡') : c.type === 'resistor' ? '〰️' : c.type === 'switch' ? (c.state ? '⏺️' : '⏹️') : '⏱️'}
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-500">{c.type}</p>
                        {c.type === 'switch' && (
                            <button 
                                onClick={() => setComponents(components.map(x => x.id === c.id ? {...x, state: !x.state} : x))}
                                className={`mt-3 px-4 py-1 rounded-full text-[8px] font-black uppercase ${c.state ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                            >
                                {c.state ? 'Closed' : 'Open'}
                            </button>
                        )}
                        {(c.type === 'bulb' || c.type === 'resistor') && (
                            <input 
                                type="range" min="1" max="100" value={c.value} 
                                onChange={e => setComponents(components.map(x => x.id === c.id ? {...x, value: Number(e.target.value)} : x))}
                                className="w-full mt-4 h-1 bg-slate-700 appearance-none cursor-pointer accent-blue-500"
                            />
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Electricity;