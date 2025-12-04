
import React, { useState, useRef, useEffect } from 'react';
import { LabLevel, UserProfile, LabEquipment } from '../../types';
import { useToast } from '../common/Toast';

interface ChemistryLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

type ContainerType = 'test_tube' | 'beaker' | 'conical_flask' | 'measuring_cylinder' | 'burette';

interface Chemical {
    id: string;
    name: string;
    concentration: number; // Molarity
    volume: number; // mL
    color: string;
    type: 'acid' | 'base' | 'salt' | 'indicator' | 'oxidizer' | 'reducer' | 'solvent';
    formula?: string;
}

interface LabContainer {
    id: string;
    type: ContainerType;
    name: string;
    capacity: number;
    currentVolume: number;
    contents: Chemical[]; // Array of chemicals inside
    temperature: number;
    precipitate?: { color: string; name: string; amount: number }; // Solid ppt
    x: number;
    y: number;
}

const STOCK_CHEMICALS: LabEquipment[] = [
    // Titration Reagents (From Exam Q1, Q3, Q4)
    { id: 'na2s2o3', name: 'Sodium Thiosulfate', type: 'chemical', icon: '⚪', description: '0.1M Standard Sol.', properties: { color: '#ffffff05', volume: 0.1 } }, // Clear
    { id: 'i2', name: 'Iodine Solution', type: 'chemical', icon: '🟤', description: '0.05M Oxidizer', properties: { color: '#92400e', volume: 0.05 } }, // Brown
    { id: 'hcl', name: 'Dilute HCl', type: 'chemical', icon: '🧪', description: '1.0M Acid', properties: { color: '#ffffff05', volume: 1.0 } },
    { id: 'naoh', name: 'Sodium Hydroxide', type: 'chemical', icon: '🧴', description: '1.0M Base', properties: { color: '#ffffff05', volume: 1.0 } },
    { id: 'kmno4', name: 'Potassium Manganate(VII)', type: 'chemical', icon: '🟣', description: '0.05M Oxidizer', properties: { color: '#7e22ce', volume: 0.05 } }, // Purple
    { id: 'feso4', name: 'Iron(II) Sulfate', type: 'chemical', icon: '🟢', description: '0.1M Sample F', properties: { color: '#dcfce7', volume: 0.1 } }, // Pale Green

    // Qualitative Analysis Reagents (From Exam Q2, Q3)
    { id: 'bacl2', name: 'Barium Chloride', type: 'chemical', icon: '⚪', description: 'Test for Sulfate', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'agno3', name: 'Silver Nitrate', type: 'chemical', icon: '⚪', description: 'Test for Halides', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'nh3', name: 'Ammonia (aq)', type: 'chemical', icon: '💨', description: 'Weak Base', properties: { color: '#ffffff05', volume: 1.0 } },
    { id: 'cuso4', name: 'Copper Sulfate', type: 'chemical', icon: '🔷', description: '0.5M Solution', properties: { color: '#3b82f6', volume: 0.5 } },
    { id: 'fecl3', name: 'Iron(III) Chloride', type: 'chemical', icon: '🟠', description: 'Yellow/Brown Sol.', properties: { color: '#f59e0b', volume: 0.1 } },
    
    // Indicators
    { id: 'starch', name: 'Starch Indicator', type: 'chemical', icon: '🥔', description: 'Test for Iodine', properties: { color: '#ffffffaa', volume: 0 } }, // Cloudy white
    { id: 'methyl_orange', name: 'Methyl Orange', type: 'chemical', icon: '🟠', description: 'Acid-Base Ind.', properties: { color: '#fb923c', volume: 0 } },
    { id: 'phenolphthalein', name: 'Phenolphthalein', type: 'chemical', icon: '⚪', description: 'Acid-Base Ind.', properties: { color: '#ffffff00', volume: 0 } },
    
    // Solvents
    { id: 'h2o', name: 'Distilled Water', type: 'chemical', icon: '💧', description: 'Pure Solvent', properties: { color: '#f0f9ff', volume: 0 } },
];

const GLASSWARE: { type: ContainerType; name: string; capacity: number; icon: string }[] = [
    { type: 'burette', name: 'Burette (50ml)', capacity: 50, icon: '📏' },
    { type: 'conical_flask', name: 'Conical Flask', capacity: 250, icon: '🏺' },
    { type: 'beaker', name: 'Beaker (250ml)', capacity: 250, icon: '🥃' },
    { type: 'test_tube', name: 'Test Tube', capacity: 20, icon: '🧪' },
    { type: 'measuring_cylinder', name: 'Measuring Cyl.', capacity: 100, icon: '📐' },
];

const ChemistryLab: React.FC<ChemistryLabProps> = () => {
    const { showToast } = useToast();
    const [containers, setContainers] = useState<LabContainer[]>([]);
    const [heldContainer, setHeldContainer] = useState<LabContainer | null>(null);
    
    // Interaction State
    const [burnerState, setBurnerState] = useState<'off' | 'yellow' | 'blue'>('off');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    // Pouring State
    const [isPouringModalOpen, setIsPouringModalOpen] = useState(false);
    const [pourAmount, setPourAmount] = useState(10); // mL
    const [pourTarget, setPourTarget] = useState<LabContainer | string>(''); 
    const [animationState, setAnimationState] = useState<'idle' | 'pouring'>('idle');
    const [pourSourcePos, setPourSourcePos] = useState({ x: 0, y: 0 });
    
    // Burette specific state
    const [activeBuretteId, setActiveBuretteId] = useState<string | null>(null);
    const [buretteFlowRate, setBuretteFlowRate] = useState(0); // 0 = closed, 1 = slow, 5 = fast

    const workbenchRef = useRef<HTMLDivElement>(null);

    // --- REACTION ENGINE ---
    const processReaction = (container: LabContainer): LabContainer => {
        const newContainer = { ...container };
        const chems = newContainer.contents;
        
        const getChem = (id: string) => chems.find(c => c.id === id);
        const removeChem = (id: string, vol: number) => {
            const c = chems.find(chem => chem.id === id);
            if (c) {
                c.volume -= vol;
                if (c.volume <= 0.01) newContainer.contents = newContainer.contents.filter(x => x.id !== id);
            }
        };
        const addChem = (templateId: string, vol: number) => {
            const template = STOCK_CHEMICALS.find(s => s.id === templateId);
            if (!template) return;
            const existing = chems.find(c => c.id === templateId);
            if (existing) existing.volume += vol;
            else newContainer.contents.push({
                id: template.id,
                name: template.name,
                concentration: template.properties?.volume || 0,
                volume: vol,
                color: template.properties?.color || '#fff',
                type: 'salt' // Simplification
            });
        };

        // 1. IODOMETRIC TITRATION (I2 + Thiosulfate)
        const iodine = getChem('i2');
        const thiosulfate = getChem('na2s2o3');
        const starch = getChem('starch');

        if (iodine && thiosulfate) {
            // Reaction: 2S2O3(2-) + I2 -> S4O6(2-) + 2I-
            // Moles
            const molI2 = iodine.concentration * (iodine.volume / 1000);
            const molThio = thiosulfate.concentration * (thiosulfate.volume / 1000);
            
            // Stoichiometry 1:2 (I2 : Thio)
            // Determine limiting reagent logic for simulation step (instant reaction for simplicity)
            // If we have enough Thio to neutralize I2:
            if (molThio >= molI2 * 2) {
                removeChem('i2', iodine.volume);
                // Add Iodide (colorless) - effectively removing I2 color
                showToast("Solution turned colorless (Endpoint reached)", "success");
            } else {
                // Partial reaction
                removeChem('na2s2o3', thiosulfate.volume);
                // Reduce I2 proportionally
                const reactedI2Moles = molThio / 2;
                const reactedI2Vol = (reactedI2Moles / iodine.concentration) * 1000;
                removeChem('i2', reactedI2Vol);
            }
        }
        
        // Starch Logic
        if (starch && getChem('i2')) {
             // Starch + I2 = Blue-Black Complex
             // We simulate this by overriding the container color later
        }

        // 2. PRECIPITATION REACTIONS (Qualitative Analysis)
        // Fe2+ + OH- -> Fe(OH)2 (Green ppt)
        const fe2 = getChem('feso4');
        const base = getChem('naoh') || getChem('nh3');
        
        if (fe2 && base && !newContainer.precipitate) {
             newContainer.precipitate = { name: 'Iron(II) Hydroxide', color: '#15803d', amount: 1 }; // Green
             showToast("Green precipitate formed (Fe²⁺ confirmed)", "success");
        }

        // Fe3+ + OH- -> Fe(OH)3 (Red-Brown ppt)
        const fe3 = getChem('fecl3');
        if (fe3 && base && !newContainer.precipitate) {
            newContainer.precipitate = { name: 'Iron(III) Hydroxide', color: '#9a3412', amount: 1 }; // Rust
            showToast("Red-brown precipitate formed (Fe³⁺ confirmed)", "success");
        }

        // Cu2+ + OH- -> Cu(OH)2 (Blue ppt)
        const cu2 = getChem('cuso4');
        if (cu2 && base && !newContainer.precipitate) {
            newContainer.precipitate = { name: 'Copper(II) Hydroxide', color: '#60a5fa', amount: 1 }; // Light Blue
            showToast("Blue precipitate formed (Cu²⁺ confirmed)", "success");
        }
        
        // Cu(OH)2 + Excess NH3 -> Deep Blue Solution
        if (newContainer.precipitate?.name === 'Copper(II) Hydroxide' && getChem('nh3') && (getChem('nh3')?.volume || 0) > 10) {
            newContainer.precipitate = undefined; // Dissolves
            // Add deep blue complex visual logic handled in renderer
            showToast("Precipitate dissolved in excess NH₃ (Deep Blue Solution)", "success");
        }

        // Sulfate Test: SO4 + BaCl2 -> BaSO4 (White ppt)
        const sulfate = getChem('feso4') || getChem('cuso4') || getChem('na2s2o3'); // Sources of sulfur/sulfate (simplified)
        const barium = getChem('bacl2');
        // Ensure acid is present for valid sulfate test if needed, but simplified here:
        if ((getChem('feso4') || getChem('cuso4')) && barium && !newContainer.precipitate) {
             newContainer.precipitate = { name: 'Barium Sulfate', color: '#ffffff', amount: 1 }; // White
             showToast("White precipitate formed (Sulfate confirmed)", "success");
        }

        return newContainer;
    };

    const spawnGlassware = (type: ContainerType) => {
        const template = GLASSWARE.find(g => g.type === type);
        if (!template) return;
        // Center spawn or grid spawn
        const x = 300 + (containers.length * 50) % 400;
        const y = type === 'burette' ? 150 : 350; // Burettes spawn higher

        const newContainer: LabContainer = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            name: `${template.name} ${containers.length + 1}`,
            capacity: template.capacity,
            currentVolume: 0,
            contents: [],
            temperature: 25,
            x, y
        };
        setContainers([...containers, newContainer]);
    };

    const spawnChemical = (chem: LabEquipment) => {
        const tempContainer: LabContainer = {
            id: 'stock_' + Math.random().toString(36).substr(2, 5),
            type: 'beaker',
            name: chem.name,
            capacity: 1000,
            currentVolume: 500,
            contents: [{ 
                id: chem.id, 
                name: chem.name, 
                concentration: chem.properties?.volume || 1, 
                volume: 500,
                color: chem.properties?.color || '#fff',
                type: 'salt'
            }],
            temperature: 25,
            x: 0, y: 0
        };
        setHeldContainer(tempContainer);
    };

    const handleBenchClick = (e: React.MouseEvent) => {
        if (heldContainer && animationState === 'idle') {
            const rect = workbenchRef.current?.getBoundingClientRect();
            if (rect) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (heldContainer.id.startsWith('stock_')) {
                    setHeldContainer(null); // Put back stock
                } else {
                    // Place container
                    setContainers([...containers, { ...heldContainer, x, y }]);
                    setHeldContainer(null);
                }
            }
        }
    };

    const handleContainerClick = (e: React.MouseEvent, container: LabContainer) => {
        e.stopPropagation();
        if (animationState === 'pouring') return; 
        
        // Burette Control override
        if (container.type === 'burette' && !heldContainer) {
            setActiveBuretteId(container.id === activeBuretteId ? null : container.id);
            return;
        }

        if (heldContainer) {
            if (heldContainer.id === container.id) return;
            // Pouring Logic
            setPourTarget(container);
            setIsPouringModalOpen(true);
        } else {
            // Pick up
            setHeldContainer(container);
            setContainers(containers.filter(c => c.id !== container.id));
            setActiveBuretteId(null);
        }
    };

    // Burette Dripping Logic
    useEffect(() => {
        if (!activeBuretteId || buretteFlowRate === 0) return;

        const interval = setInterval(() => {
            setContainers(prev => {
                const buretteIndex = prev.findIndex(c => c.id === activeBuretteId);
                if (buretteIndex === -1) return prev;
                
                const burette = prev[buretteIndex];
                if (burette.currentVolume <= 0) {
                    setBuretteFlowRate(0); // Empty
                    return prev;
                }

                const dropVolume = buretteFlowRate * 0.1; // 0.1ml to 0.5ml per tick
                
                // Find flask below burette
                const targetIndex = prev.findIndex(c => 
                    c.id !== burette.id && 
                    Math.abs(c.x - burette.x) < 40 && // Aligned X
                    c.y > burette.y && c.y < burette.y + 300 // Below
                );

                if (targetIndex !== -1) {
                    const target = prev[targetIndex];
                    
                    // Transfer liquid
                    const newBuretteVol = Math.max(0, burette.currentVolume - dropVolume);
                    const ratio = dropVolume / burette.currentVolume;
                    const transferredContents = burette.contents.map(c => ({ ...c, volume: c.volume * ratio }));

                    // Update Target
                    let newTarget = {
                        ...target,
                        currentVolume: target.currentVolume + dropVolume,
                        contents: [...target.contents]
                    };
                    
                    // Mix logic simplified
                    transferredContents.forEach(tc => {
                        const ex = newTarget.contents.find(c => c.id === tc.id);
                        if(ex) ex.volume += tc.volume;
                        else newTarget.contents.push(tc);
                    });
                    
                    // Run Reaction
                    newTarget = processReaction(newTarget);

                    const newContainers = [...prev];
                    newContainers[buretteIndex] = { ...burette, currentVolume: newBuretteVol };
                    newContainers[targetIndex] = newTarget;
                    return newContainers;
                } else {
                    // Drip on floor (waste)
                    const newContainers = [...prev];
                    newContainers[buretteIndex] = { ...burette, currentVolume: Math.max(0, burette.currentVolume - dropVolume) };
                    return newContainers;
                }
            });
        }, 200);

        return () => clearInterval(interval);
    }, [activeBuretteId, buretteFlowRate]);


    const triggerPourAnimation = () => {
        if (!heldContainer) return;
        
        let targetX = 0, targetY = 0;
        if (typeof pourTarget === 'string' && pourTarget === 'drain') {
             const bench = workbenchRef.current?.getBoundingClientRect();
             if(bench) { targetX = bench.width - 60; targetY = bench.height - 60; }
        } else {
             const target = pourTarget as LabContainer;
             targetX = target.x;
             targetY = target.y;
        }

        // Position source for pouring
        // If target is burette, pour from top. Else standard pour.
        const isBuretteTarget = typeof pourTarget !== 'string' && pourTarget.type === 'burette';
        const yOffset = isBuretteTarget ? -200 : -100;

        setPourSourcePos({ x: targetX - 40, y: targetY + yOffset });
        setAnimationState('pouring');
        setIsPouringModalOpen(false);
        
        setTimeout(() => { completePourLogic(); }, 2000);
    };

    const completePourLogic = () => {
        if (!heldContainer) return;

        if (typeof pourTarget === 'string' && pourTarget === 'drain') {
            setHeldContainer({ ...heldContainer, currentVolume: 0, contents: [], temperature: 25, precipitate: undefined });
            showToast("Container emptied.", "success");
        } else {
            const target = pourTarget as LabContainer;
            const amount = Math.min(pourAmount, heldContainer.currentVolume);
            const actualPour = Math.min(amount, target.capacity - target.currentVolume);

            if (actualPour > 0) {
                const ratio = actualPour / heldContainer.currentVolume;
                const transferredContents = heldContainer.contents.map(c => ({...c, volume: c.volume * ratio}));

                setContainers(prev => prev.map(c => {
                    if (c.id === target.id) {
                        let newC = { ...c, currentVolume: c.currentVolume + actualPour };
                        // Mix
                        transferredContents.forEach(tc => {
                            const ex = newC.contents.find(x => x.id === tc.id);
                            if(ex) ex.volume += tc.volume;
                            else newC.contents.push(tc);
                        });
                        // React
                        return processReaction(newC);
                    }
                    return c;
                }));

                // Reduce source
                const remainingContents = heldContainer.contents.map(c => ({...c, volume: c.volume * (1 - ratio)})).filter(c => c.volume > 0.01);
                setHeldContainer({ ...heldContainer, currentVolume: heldContainer.currentVolume - actualPour, contents: remainingContents });
            }
        }
        setAnimationState('idle');
        setPourTarget('');
    };

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a] overflow-hidden select-none" onMouseMove={(e) => { if(animationState === 'idle') setMousePos({ x: e.clientX, y: e.clientY }); }}>
            {/* LEFT SIDEBAR - STOCK */}
            <div className="w-full md:w-64 bg-[#0B0F19] border-r border-slate-800 flex flex-col z-20 shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Apparatus</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {GLASSWARE.map(glass => (
                            <button key={glass.type} onClick={() => spawnGlassware(glass.type)} className="flex flex-col items-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95">
                                <span className="text-2xl mb-1">{glass.icon}</span>
                                <span className="text-[10px] font-bold text-slate-300">{glass.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
                    <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">Reagents</h4>
                    <div className="space-y-2">
                        {STOCK_CHEMICALS.map(chem => (
                            <button key={chem.id} onClick={() => spawnChemical(chem)} className="w-full flex items-center gap-3 p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all text-left group">
                                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-lg" style={{color: chem.properties?.color !== '#ffffff05' ? chem.properties?.color : 'white'}}>{chem.icon}</div>
                                <div>
                                    <div className="text-xs font-bold text-slate-200">{chem.name}</div>
                                    <div className="text-[10px] text-slate-500">{chem.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* MAIN WORKBENCH */}
            <div className="flex-grow relative bg-[#1e293b] overflow-hidden cursor-default" onClick={handleBenchClick} ref={workbenchRef}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
                
                {/* Sink */}
                <div className="absolute bottom-10 right-10 w-24 h-24 bg-slate-800 rounded-full border-4 border-slate-600 flex items-center justify-center shadow-inner cursor-pointer hover:border-slate-400 transition-colors z-10 group" onClick={(e) => { e.stopPropagation(); if(heldContainer) { setPourTarget('drain'); setIsPouringModalOpen(true); } }}>
                    <div className="text-4xl opacity-50 group-hover:opacity-100 transition-opacity">🚰</div>
                    <span className="absolute bottom-full mb-2 whitespace-nowrap text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">Pour to Empty</span>
                </div>

                {/* Containers */}
                {containers.map(container => (
                    <div key={container.id} style={{ left: container.x, top: container.y }} className={`absolute transform -translate-x-1/2 ${container.type === 'burette' ? '-translate-y-0' : '-translate-y-1/2'} transition-all duration-200 z-20 hover:scale-105 cursor-grab active:cursor-grabbing`} onClick={(e) => handleContainerClick(e, container)}>
                         <GlasswareVisual container={container} />
                         
                         {/* Burette Controls */}
                         {container.type === 'burette' && activeBuretteId === container.id && (
                             <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 p-2 rounded-lg border border-slate-600 shadow-xl z-50 flex flex-col items-center w-32">
                                 <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">Flow Control</span>
                                 <input 
                                     type="range" min="0" max="5" step="1" 
                                     value={activeBuretteId === container.id ? buretteFlowRate : 0}
                                     onChange={(e) => setBuretteFlowRate(Number(e.target.value))}
                                     className="w-full accent-blue-500"
                                 />
                                 <div className="flex justify-between w-full text-[9px] text-slate-500 mt-1">
                                     <span>Stop</span>
                                     <span>Fast</span>
                                 </div>
                             </div>
                         )}
                    </div>
                ))}

                {/* Held Container */}
                {heldContainer && (
                    <div className="fixed pointer-events-none z-50 filter drop-shadow-2xl transition-all duration-700 ease-in-out" style={{ left: animationState === 'pouring' ? workbenchRef.current!.getBoundingClientRect().left + pourSourcePos.x : mousePos.x + 20, top: animationState === 'pouring' ? workbenchRef.current!.getBoundingClientRect().top + pourSourcePos.y : mousePos.y + 20 }}>
                        <div className={`transform transition-transform duration-500 ${animationState === 'pouring' ? 'rotate-[-45deg]' : 'rotate-0'}`}>
                            {heldContainer.type === 'test_tube' && <div className="absolute -left-6 top-1/2 w-12 h-2 bg-amber-700 rounded origin-right"></div>}
                            <GlasswareVisual container={heldContainer} isHeld />
                            {animationState === 'pouring' && <div className="absolute top-0 right-0 w-1.5 bg-blue-400/60 rounded-full origin-top transform translate-y-2 translate-x-2 animate-stream-flow"></div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Pouring Modal */}
            {isPouringModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl w-80 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-white mb-4 text-center">{typeof pourTarget === 'string' ? 'Pour into Sink?' : `Pour into ${pourTarget.name}`}</h3>
                        {typeof pourTarget !== 'string' && (
                            <div className="mb-6">
                                <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Amount</span><span>{pourAmount} mL</span></div>
                                <input type="range" min="1" max={heldContainer?.currentVolume || 100} value={pourAmount} onChange={(e) => setPourAmount(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setIsPouringModalOpen(false)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={triggerPourAnimation} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">{typeof pourTarget === 'string' ? 'Empty' : 'Pour'}</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes stream-flow { 0% { height: 0; opacity: 0; } 20% { height: 120px; opacity: 0.8; } 80% { height: 120px; opacity: 0.8; } 100% { height: 0; opacity: 0; } }
                .animate-stream-flow { animation: stream-flow 1.8s ease-in-out forwards; pointer-events: none; }
            `}</style>
        </div>
    );
};

const GlasswareVisual: React.FC<{ container: LabContainer; isHeld?: boolean }> = ({ container, isHeld }) => {
    const liquidHeight = (container.currentVolume / container.capacity) * 100;
    
    // Color Logic: Mix colors, handle precipitates, handle indicators
    let displayColor = 'transparent';
    if (container.contents.length > 0) {
        // Check for Iodine-Starch Complex
        if (container.contents.some(c => c.id === 'i2') && container.contents.some(c => c.id === 'starch')) {
            displayColor = '#1e1b4b'; // Deep Blue-Black
        } 
        // Check for Complex Ion (Deep Blue Copper Ammonia)
        else if (container.contents.some(c => c.id === 'cuso4') && container.contents.some(c => c.id === 'nh3') && !container.precipitate) {
            displayColor = '#1d4ed8'; // Deep Blue
        }
        else {
            // Simple dominant color mix
            const dominant = container.contents.reduce((prev, current) => (prev.volume > current.volume) ? prev : current);
            displayColor = dominant.color;
        }
    }

    const isPrecipitate = !!container.precipitate;

    return (
        <div className="relative flex flex-col items-center group">
            {container.type === 'burette' && (
                <div className="absolute -top-8 w-1 h-8 bg-gray-500"></div> // Clamp visual
            )}
            
            <div className={`
                relative overflow-hidden backdrop-blur-sm border border-white/30 shadow-inner transition-all bg-gradient-to-br from-white/10 to-transparent
                ${container.type === 'test_tube' ? 'w-6 h-24 rounded-b-full border-t-2 border-t-white/40' : ''}
                ${container.type === 'beaker' ? 'w-20 h-24 rounded-b-xl border-t-0 border-x-2 border-b-4' : ''}
                ${container.type === 'conical_flask' ? 'w-24 h-32 rounded-b-3xl border-t-0 clip-path-flask' : ''}
                ${container.type === 'measuring_cylinder' ? 'w-8 h-32 rounded-b-lg border-x-2 border-b-2' : ''}
                ${container.type === 'burette' ? 'w-4 h-80 rounded-b-sm border-x-2 border-b-2 border-slate-400' : ''}
            `}>
                {/* Graduations */}
                {(container.type === 'measuring_cylinder' || container.type === 'burette') && (
                    <div className="absolute right-0 top-0 bottom-0 w-full flex flex-col justify-between py-2 pr-1 pointer-events-none opacity-50">
                        {[...Array(10)].map((_,i) => <div key={i} className="w-2 h-px bg-white self-end"></div>)}
                    </div>
                )}

                {/* Liquid Layer */}
                <div 
                    className={`absolute bottom-0 w-full transition-all duration-500 ease-in-out ${isPrecipitate ? 'backdrop-blur-md opacity-90' : 'opacity-80'}`}
                    style={{ 
                        height: `${liquidHeight}%`,
                        backgroundColor: isPrecipitate ? container.precipitate?.color : displayColor,
                        boxShadow: `inset 0 -5px 10px rgba(0,0,0,0.2)`
                    }}
                >
                    {/* Precipitate Particles Effect */}
                    {isPrecipitate && (
                         <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse"></div>
                    )}
                    {/* Meniscus */}
                    {!isPrecipitate && <div className="w-full h-1 bg-white/30 absolute top-0 rounded-[100%]"></div>}
                </div>
                
                {/* Reflections */}
                <div className="absolute inset-0 pointer-events-none opacity-30 flex flex-col justify-evenly p-1">
                     <div className="w-1 h-full bg-white/20 absolute right-1 rounded-full"></div>
                </div>
            </div>

            {/* Labels */}
            {!isHeld && (
                <div className="mt-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[9px] font-mono text-slate-300 border border-slate-700 flex flex-col items-center min-w-[60px] shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-bold text-white">{container.contents.length > 0 ? (container.precipitate ? container.precipitate.name : container.contents[0].name.split(' ')[0]) : 'Empty'}</span>
                    <span>{Math.round(container.currentVolume)}ml</span>
                    {container.precipitate && <span className="text-yellow-400 font-bold">PPT</span>}
                </div>
            )}
            
            <style>{`
                .clip-path-flask { clip-path: polygon(30% 0, 70% 0, 100% 100%, 0% 100%); }
            `}</style>
        </div>
    );
};

export default ChemistryLab;
