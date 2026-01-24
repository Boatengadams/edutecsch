import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

interface Liquid {
    ph: number;
    volume: number;
    temp: number;
    name: string;
}

const ChemistryLab: React.FC = () => {
    const [beaker, setBeaker] = useState<Liquid>({ ph: 7, volume: 100, temp: 25, name: 'Water' });
    const [burnerOn, setBurnerOn] = useState(false);
    const [isDripping, setIsDripping] = useState(false);

    // Thermal Engine
    useEffect(() => {
        let interval: any;
        if (burnerOn) {
            interval = setInterval(() => {
                setBeaker(prev => ({ ...prev, temp: Math.min(100, prev.temp + 0.5) }));
            }, 100);
        } else {
            interval = setInterval(() => {
                setBeaker(prev => ({ ...prev, temp: Math.max(25, prev.temp - 0.1) }));
            }, 100);
        }
        return () => clearInterval(interval);
    }, [burnerOn]);

    const dripAcid = () => {
        setIsDripping(true);
        setTimeout(() => {
            setBeaker(prev => ({
                ...prev,
                ph: Math.max(0, prev.ph - 0.2),
                volume: prev.volume + 1
            }));
            setIsDripping(false);
        }, 500);
    };

    const getLiquidColor = (ph: number) => {
        if (ph < 4) return 'rgba(239, 68, 68, 0.6)'; // Acidic - Red
        if (ph > 10) return 'rgba(59, 130, 246, 0.6)'; // Basic - Blue
        return 'rgba(186, 230, 253, 0.3)'; // Neutral
    };

    return (
        <div className="h-full flex bg-[#020617] overflow-hidden">
            <div className="flex-grow flex items-center justify-center p-20 relative">
                {/* Bunsen Burner */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    {burnerOn && (
                        <div className="mb-[-10px] w-8 h-20 bg-blue-500/40 rounded-full blur-xl animate-pulse"></div>
                    )}
                    <div className="w-10 h-32 bg-slate-700 rounded-t-lg border-x border-slate-500"></div>
                    <button 
                        onClick={() => setBurnerOn(!burnerOn)}
                        className={`mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${burnerOn ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}
                    >
                        Burner: {burnerOn ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Beaker & Stand */}
                <div className="relative mb-40">
                     {/* Burette Drip */}
                    {isDripping && (
                        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-1 h-40 bg-blue-300/40 animate-pulse"></div>
                    )}
                    
                    <svg width="200" height="200" viewBox="0 0 100 100" className="drop-shadow-2xl">
                        <path d="M 20 10 L 20 90 Q 20 95 25 95 L 75 95 Q 80 95 80 90 L 80 10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <rect x="20" y={90 - beaker.volume/2} width="60" height={beaker.volume/2} fill={getLiquidColor(beaker.ph)} className="transition-all duration-500" />
                        <text x="50" y="115" textAnchor="middle" fill="#475569" fontSize="6" fontWeight="bold">PYREX 250ML</text>
                    </svg>
                </div>
            </div>

            <aside className="w-96 border-l border-white/5 p-10 space-y-8 bg-slate-900/50 backdrop-blur-3xl">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Chemistry Workbench</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Titration Control Unit</p>
                </div>

                <Card className="space-y-6 !bg-slate-950/50">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">pH Level</p>
                            <p className="text-4xl font-mono font-bold text-white">{beaker.ph.toFixed(1)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Temperature</p>
                            <p className="text-4xl font-mono font-bold text-white">{beaker.temp.toFixed(1)}°C</p>
                        </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500" style={{ width: `${(beaker.ph / 14) * 100}%` }}></div>
                    </div>
                </Card>

                <div className="space-y-4">
                    <Button onClick={dripAcid} className="w-full !py-4 font-black uppercase tracking-widest">💧 Add 1ml 0.1M HCl</Button>
                    <Button onClick={() => setBeaker({ ph: 7, volume: 100, temp: 25, name: 'Water' })} variant="secondary" className="w-full">Reset Apparatus</Button>
                </div>

                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Safety Note</p>
                    <p className="text-xs text-blue-200/60 leading-relaxed italic">"Always add acid to water, never water to acid. Monitor temperature during exothermic reactions."</p>
                </div>
            </aside>
        </div>
    );
};

export default ChemistryLab;