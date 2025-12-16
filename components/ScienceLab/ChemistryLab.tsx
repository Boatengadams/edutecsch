
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LabLevel, UserProfile, LabEquipment } from '../../types';
import { useToast } from '../common/Toast';

interface ChemistryLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

type ContainerType = 'test_tube' | 'beaker' | 'conical_flask' | 'measuring_cylinder' | 'burette' | 'reagent_bottle' | 'pipette' | 'retort_stand' | 'white_tile';

interface Chemical {
    id: string;
    name: string;
    concentration: number;
    volume: number;
    color: string;
    type: 'acid' | 'base' | 'salt' | 'indicator' | 'oxidizer' | 'reducer' | 'solvent';
}

interface LabContainer {
    id: string;
    type: ContainerType;
    name: string;
    capacity: number;
    currentVolume: number;
    contents: Chemical[]; 
    temperature: number;
    precipitate?: { color: string; name: string; amount: number }; 
    
    // Physics State
    x: number;
    y: number;
    rotation: number; // Current visual rotation
    targetRotation: number; // Where it wants to rotate to
    
    // Interaction State
    isHeld?: boolean;
    isSnapping?: boolean; // Is it magnetically snapped to another container?
    snapTargetId?: string | null; // ID of the parent (e.g., Stand for Burette, Tile for Flask)
    zIndex?: number;
    
    // Tool Specific
    buretteOpen?: boolean;
}

const STOCK_CHEMICALS: LabEquipment[] = [
    { id: 'hcl', name: 'Hydrochloric Acid', type: 'chemical', icon: '🧪', description: '0.1M HCl', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'naoh', name: 'Sodium Hydroxide', type: 'chemical', icon: '🧴', description: '0.1M NaOH', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'phenolphthalein', name: 'Phenolphthalein', type: 'chemical', icon: '⚪', description: 'Indicator', properties: { color: '#ffffff00', volume: 0 } },
    { id: 'methyl_orange', name: 'Methyl Orange', type: 'chemical', icon: '🟠', description: 'Indicator', properties: { color: '#fb923c', volume: 0 } },
    { id: 'cuso4', name: 'Copper(II) Sulfate', type: 'chemical', icon: '🔷', description: '0.5M CuSO4', properties: { color: '#0ea5e9', volume: 0.5 } },
    { id: 'nh3', name: 'Ammonia', type: 'chemical', icon: '💨', description: '2.0M NH3', properties: { color: '#ffffff05', volume: 2.0 } },
    { id: 'ki', name: 'Potassium Iodide', type: 'chemical', icon: '🧂', description: '0.5M KI', properties: { color: '#ffffff05', volume: 0.5 } },
    { id: 'pbno3', name: 'Lead(II) Nitrate', type: 'chemical', icon: '⚪', description: '0.5M Pb(NO3)2', properties: { color: '#ffffff05', volume: 0.5 } },
];

const GLASSWARE: { type: ContainerType; name: string; capacity: number; icon: string }[] = [
    { type: 'retort_stand', name: 'Retort Stand', capacity: 0, icon: '🏗️' },
    { type: 'burette', name: 'Burette (50ml)', capacity: 50, icon: '📏' },
    { type: 'white_tile', name: 'White Tile', capacity: 0, icon: '⬜' },
    { type: 'conical_flask', name: 'Conical Flask', capacity: 250, icon: '🏺' },
    { type: 'beaker', name: 'Beaker (250ml)', capacity: 250, icon: '🥃' },
    { type: 'test_tube', name: 'Test Tube', capacity: 20, icon: '🧪' },
    { type: 'measuring_cylinder', name: 'Cylinder', capacity: 100, icon: '📐' },
    { type: 'reagent_bottle', name: 'Reagent Bottle', capacity: 500, icon: '🍾' },
];

// --- PHYSICS HELPERS ---

const LERP_FACTOR = 0.15;
const FLOW_MULTIPLIER = 1.5; 
const BURETTE_FLOW_RATE = 0.5; // Slower, precise flow

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

const blendColors = (contents: Chemical[]): string => {
    if (contents.length === 0) return 'rgba(255,255,255,0.05)';
    
    let r = 0, g = 0, b = 0, totalVol = 0, alpha = 0;

    contents.forEach(c => {
        let hex = c.color;
        let a = 1;
        
        if (hex.startsWith('rgba')) {
             const parts = hex.match(/[\d.]+/g);
             if(parts) {
                 r += parseFloat(parts[0]) * c.volume;
                 g += parseFloat(parts[1]) * c.volume;
                 b += parseFloat(parts[2]) * c.volume;
                 a = parseFloat(parts[3]);
             }
        } else {
             if (hex.length > 7) { 
                 a = parseInt(hex.substring(7, 9), 16) / 255;
                 hex = hex.substring(0, 7);
             }
             const cr = parseInt(hex.substring(1, 3), 16);
             const cg = parseInt(hex.substring(3, 5), 16);
             const cb = parseInt(hex.substring(5, 7), 16);
             r += cr * c.volume;
             g += cg * c.volume;
             b += cb * c.volume;
        }

        alpha += a * c.volume;
        totalVol += c.volume;
    });

    if (totalVol === 0) return contents[0].color;
    return `rgba(${Math.round(r / totalVol)}, ${Math.round(g / totalVol)}, ${Math.round(b / totalVol)}, ${Math.min(0.9, Math.max(0.1, alpha / totalVol))})`;
};

const ChemistryLab: React.FC<ChemistryLabProps> = () => {
    const { showToast } = useToast();
    const [containers, setContainers] = useState<LabContainer[]>([]);
    const [heldId, setHeldId] = useState<string | null>(null);
    const [isPouring, setIsPouring] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    const mousePos = useRef({ x: 0, y: 0 });
    const requestRef = useRef<number | null>(null);
    const workbenchRef = useRef<HTMLDivElement>(null);

    // --- PHYSICS LOOP ---
    const updatePhysics = () => {
        setContainers(prevContainers => {
            const held = prevContainers.find(c => c.id === heldId);
            const targetMouseX = mousePos.current.x;
            const targetMouseY = mousePos.current.y;

            // 1. Calculate Movements and Snaps
            const movingContainers = prevContainers.map(container => {
                let newX = container.x;
                let newY = container.y;
                let newRotation = container.rotation;
                let newTargetRotation = 0;
                let snapTargetId = null;

                if (container.id === heldId) {
                    // --- SNAP LOGIC ---
                    let closestDist = 100;
                    let closestTarget: LabContainer | null = null;

                    prevContainers.forEach(other => {
                        if (other.id !== container.id) {
                            const dist = Math.hypot(other.x - container.x, other.y - container.y);
                            
                            // A. Burette snaps to Retort Stand
                            if (container.type === 'burette' && other.type === 'retort_stand') {
                                // Specific check for stand height/position
                                if (dist < 100 && container.y < other.y) {
                                     closestTarget = other;
                                }
                            }
                            // B. Flask/Beaker snaps to White Tile
                            else if ((container.type === 'conical_flask' || container.type === 'beaker') && other.type === 'white_tile') {
                                if (dist < 60) {
                                    closestTarget = other;
                                }
                            }
                            // C. Standard Pouring Snap (Flask to Beaker etc)
                            else if (container.type !== 'burette' && container.type !== 'retort_stand' && container.type !== 'white_tile' && 
                                     other.type !== 'burette' && other.type !== 'white_tile' && other.type !== 'retort_stand') {
                                if (dist < closestDist && container.y < other.y) {
                                    closestDist = dist;
                                    closestTarget = other;
                                }
                            }
                        }
                    });

                    if (closestTarget) {
                        snapTargetId = (closestTarget as LabContainer).id;
                        
                        if (container.type === 'burette' && closestTarget.type === 'retort_stand') {
                            // Snap Burette to Clamp Position
                            const snapX = closestTarget.x + 20; // Offset from rod
                            const snapY = closestTarget.y - 180; // High up
                            newX = lerp(container.x, snapX, 0.3);
                            newY = lerp(container.y, snapY, 0.3);
                            newTargetRotation = 0; // Lock vertical
                        } else if ((container.type === 'conical_flask' || container.type === 'beaker') && closestTarget.type === 'white_tile') {
                            // Snap Flask to Tile Center
                            const snapX = closestTarget.x;
                            const snapY = closestTarget.y - 10; // Sit on top
                            newX = lerp(container.x, snapX, 0.3);
                            newY = lerp(container.y, snapY, 0.3);
                            newTargetRotation = 0; // Upright
                        } else {
                            // Standard Pouring Snap
                            const snapX = (closestTarget as LabContainer).x - 60; 
                            const snapY = (closestTarget as LabContainer).y - 80;
                            newX = lerp(container.x, snapX, 0.2);
                            newY = lerp(container.y, snapY, 0.2);
                            
                            if (isPouring) newTargetRotation = -80;
                            else newTargetRotation = -45;
                        }

                    } else {
                        // Free Drag
                        newX = lerp(container.x, targetMouseX, LERP_FACTOR);
                        newY = lerp(container.y, targetMouseY, LERP_FACTOR);
                        
                        // Vertical dragging for burette/stand, slight tilt for others
                        if (container.type !== 'burette' && container.type !== 'retort_stand' && container.type !== 'white_tile') {
                            newTargetRotation = (newX - container.x) * 2; 
                        } else {
                            newTargetRotation = 0;
                        }
                    }
                } else {
                    // Not Held
                    // If snapped to a stand or tile, maintain position relative to parent?
                    // For this simple sim, we just stop moving.
                    newTargetRotation = 0;
                }

                newRotation = lerp(container.rotation, newTargetRotation, 0.1);

                return {
                    ...container,
                    x: newX,
                    y: newY,
                    rotation: newRotation,
                    isSnapping: !!snapTargetId,
                    snapTargetId
                };
            });

            // 2. Liquid Transfer Logic
            // Need to handle both Pouring (Rotation) and Burette Drip (Valve)
            
            // Map to allow updates
            const containerMap = new Map<string, LabContainer>();
            movingContainers.forEach(c => containerMap.set(c.id, c));

            movingContainers.forEach(source => {
                // A. Standard Pouring
                if (source.id === heldId && isPouring && source.snapTargetId && source.currentVolume > 0 && source.type !== 'burette') {
                    const target = containerMap.get(source.snapTargetId);
                    if (target && target.type !== 'retort_stand' && target.type !== 'white_tile') {
                        const flowRate = (Math.abs(source.rotation) - 40) * 0.1 * FLOW_MULTIPLIER;
                        if (flowRate > 0) {
                            transferLiquid(source, target, flowRate, containerMap);
                        }
                    }
                }

                // B. Burette Drip (Depends on Open State, not Tilt)
                if (source.type === 'burette' && source.buretteOpen && source.currentVolume > 0) {
                    // Find target below
                    const target = movingContainers.find(c => 
                        c.id !== source.id && 
                        c.type !== 'retort_stand' && 
                        c.type !== 'white_tile' &&
                        Math.abs(c.x - source.x) < 30 && // Horizontally aligned
                        c.y > source.y && // Below
                        c.y < source.y + 400 // Within reasonable distance
                    );
                    
                    if (target) {
                        const tContainer = containerMap.get(target.id);
                        if (tContainer) transferLiquid(source, tContainer, BURETTE_FLOW_RATE, containerMap);
                    }
                }
            });

            return Array.from(containerMap.values());
        });

        requestRef.current = requestAnimationFrame(updatePhysics);
    };
    
    const transferLiquid = (source: LabContainer, target: LabContainer, amount: number, map: Map<string, LabContainer>) => {
        const actualTransfer = Math.min(amount, source.currentVolume, target.capacity - target.currentVolume);
        if (actualTransfer <= 0) return;

        // Source Update
        const sRatio = actualTransfer / source.currentVolume;
        const s = map.get(source.id)!;
        s.currentVolume -= actualTransfer;
        s.contents = s.contents.map(c => ({...c, volume: c.volume * (1-sRatio)})).filter(c => c.volume > 0.001);
        
        // Target Update
        const t = map.get(target.id)!;
        const tRatio = actualTransfer / (s.currentVolume + actualTransfer); // Approx for mixing calculation
        
        source.contents.forEach(sc => {
            const transferVol = sc.volume * sRatio; // This isn't perfect math for concentration but visually works
            // Better: transferVol is proportional to total volume moved
            // Let's just create new chem object
            const movedChem = { ...sc, volume: (sc.volume / (source.currentVolume + actualTransfer)) * actualTransfer };
            
            const existing = t.contents.find(tc => tc.id === sc.id);
            if (existing) existing.volume += movedChem.volume;
            else t.contents.push(movedChem);
        });

        t.currentVolume += actualTransfer;
        
        // React immediately
        const reacted = processReaction(t);
        map.set(target.id, reacted);
        map.set(source.id, s);
    };

    // Reacting Logic
    const processReaction = (container: LabContainer): LabContainer => {
        const c = { ...container };
        const chems = c.contents;
        
        // Titration Logic: Acid + Base + Indicator
        const acid = chems.find(x => x.type === 'acid');
        const base = chems.find(x => x.type === 'base');
        const ind = chems.find(x => x.type === 'indicator');
        
        if (acid && base && ind) {
             const netMoles = (base.concentration * base.volume) - (acid.concentration * acid.volume);
             // Sensitivity threshold for endpoint
             if (Math.abs(netMoles) < 0.05) {
                 ind.color = '#ffc0cb'; // Faint pink (End point)
             } else if (ind.name === 'Phenolphthalein') {
                 ind.color = netMoles > 0 ? '#ec4899' : '#ffffff00'; // Pink if base excess
             } else if (ind.name === 'Methyl Orange') {
                 ind.color = netMoles > 0 ? '#eab308' : '#ef4444'; // Yellow base, Red acid
             }
        }
        
        // Precipitation
        const pb = chems.find(x => x.id === 'pbno3');
        const ki = chems.find(x => x.id === 'ki');
        if (pb && ki) {
            c.precipitate = { name: 'Lead(II) Iodide', color: '#facc15', amount: 1 };
        }

        return c;
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updatePhysics);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [heldId, isPouring]); 

    // --- EVENT HANDLERS ---

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = workbenchRef.current?.getBoundingClientRect();
        if (rect) {
            mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const container = containers.find(c => c.id === id);
        
        // Special Case: Clicking Burette Tap (don't drag)
        // We handle this inside the component usually, but here for global logic:
        // Actually passed via callback on Glassware component now.
        
        if (container && container.isSnapping && heldId === id && container.type !== 'burette') {
             setIsPouring(true);
        } else {
             setHeldId(id);
             setContainers(prev => prev.map(c => ({...c, zIndex: c.id === id ? 100 : 10})));
        }
    };

    const handleMouseUp = () => {
        setIsPouring(false);
        setHeldId(null);
    };
    
    const handleTapClick = (id: string) => {
        setContainers(prev => prev.map(c => 
            c.id === id ? { ...c, buretteOpen: !c.buretteOpen } : c
        ));
    };
    
    const spawnGlassware = (type: ContainerType) => {
        const template = GLASSWARE.find(g => g.type === type);
        if (!template) return;
        
        const rect = workbenchRef.current?.getBoundingClientRect();
        const centerX = rect ? rect.width / 2 : 300;
        const centerY = rect ? rect.height / 2 : 300;
        
        // Auto-fill burette for convenience
        let initialContents: Chemical[] = [];
        let initialVol = 0;
        if (type === 'burette') {
            initialContents = [{ ...STOCK_CHEMICALS[1].properties, id: 'naoh', name: 'Sodium Hydroxide', type: 'base', concentration: 0.1, volume: 50, color: '#ffffff05' } as Chemical];
            initialVol = 50;
        }

        const newC: LabContainer = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            name: template.name,
            capacity: template.capacity,
            currentVolume: initialVol,
            contents: initialContents,
            temperature: 25,
            x: centerX + (Math.random() * 100 - 50),
            y: centerY + (Math.random() * 100 - 50),
            rotation: 0,
            targetRotation: 0,
            zIndex: 20
        };
        setContainers(prev => [...prev, newC]);
    };

    const spawnReagent = (chem: LabEquipment) => {
        const rect = workbenchRef.current?.getBoundingClientRect();
        const newC: LabContainer = {
            id: 'stock_' + Math.random().toString(36).substr(2, 5),
            type: 'reagent_bottle',
            name: chem.name,
            capacity: 500,
            currentVolume: 500,
            contents: [{ ...chem.properties, id: chem.id, name: chem.name, concentration: chem.properties?.volume || 1, volume: 500, type: 'solvent' } as Chemical], 
            temperature: 25,
            x: 100, y: 300,
            rotation: 0,
            targetRotation: 0,
            zIndex: 20
        };
        setContainers(prev => [...prev, newC]);
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#111827] overflow-hidden select-none relative" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
            
            {/* Sidebar Toggle */}
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-50 p-3 bg-slate-800 rounded-full text-white shadow-lg border border-slate-600 hover:bg-slate-700 transition-all">
                {isSidebarOpen ? '✖️' : '🧪'}
            </button>

            {/* Tools Panel */}
            <div className={`absolute top-0 left-0 h-full w-72 bg-[#1e293b] border-r border-slate-700 z-40 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 pt-16 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
                    <div>
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Apparatus</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {GLASSWARE.map(glass => (
                                <button key={glass.type} onClick={() => spawnGlassware(glass.type)} className="flex flex-col items-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all active:scale-95">
                                    <span className="text-2xl mb-1">{glass.icon}</span>
                                    <span className="text-[10px] font-bold text-slate-300">{glass.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Chemicals</h4>
                        <div className="space-y-1">
                            {STOCK_CHEMICALS.map(chem => (
                                <button key={chem.id} onClick={() => spawnReagent(chem)} className="w-full flex items-center gap-3 p-2 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all text-left active:scale-95">
                                    <div className="w-8 h-8 bg-amber-900/50 rounded flex items-center justify-center text-xs border border-amber-700">Rx</div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-200">{chem.name}</div>
                                        <div className="text-[9px] text-slate-500">{chem.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                     <button onClick={() => setContainers([])} className="mt-auto w-full py-3 bg-red-900/50 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20">
                        Clear Bench
                    </button>
                </div>
            </div>

            {/* Workbench */}
            <div className="flex-grow relative bg-[#0f172a] overflow-hidden cursor-default" ref={workbenchRef}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(15,23,42,1)_100%)]"></div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-slate-500 text-xs font-mono pointer-events-none bg-black/20 px-2 py-1 rounded">
                    Drag items to move • Snap Flask to Tile • Snap Burette to Stand
                </div>

                {containers.map(container => (
                    <Glassware 
                        key={container.id} 
                        container={container} 
                        onMouseDown={(e) => handleMouseDown(e, container.id)}
                        onTapToggle={() => handleTapClick(container.id)}
                    />
                ))}
            </div>
        </div>
    );
};

// --- VISUAL COMPONENT ---

interface GlasswareProps { 
    container: LabContainer; 
    onMouseDown: (e: React.MouseEvent) => void;
    onTapToggle?: () => void;
}

const Glassware: React.FC<GlasswareProps> = ({ container, onMouseDown, onTapToggle }) => {
    const liquidColor = blendColors(container.contents);
    const fillPercent = container.capacity > 0 ? (container.currentVolume / container.capacity) * 100 : 0;
    
    // -- RENDERERS --
    
    if (container.type === 'retort_stand') {
        return (
            <div 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing select-none"
                style={{ left: container.x, top: container.y, zIndex: container.zIndex }}
                onMouseDown={onMouseDown}
            >
                {/* Base */}
                <div className="w-32 h-6 bg-slate-700 rounded border-t border-slate-500 shadow-xl relative top-[280px]"></div>
                {/* Rod */}
                <div className="w-2 h-[300px] bg-slate-400 mx-auto rounded-t relative -top-4 border-l border-white/20"></div>
                {/* Clamp */}
                <div className="absolute top-[80px] left-1/2 w-16 h-2 bg-slate-500 -translate-x-full rounded-l shadow-md"></div>
                <div className="absolute top-[75px] left-1/2 -translate-x-[60px] w-6 h-4 bg-slate-600 rounded border border-slate-400"></div>
            </div>
        );
    }
    
    if (container.type === 'white_tile') {
        return (
            <div 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing select-none"
                style={{ left: container.x, top: container.y, zIndex: 1 }} // Low Z to be under flasks
                onMouseDown={onMouseDown}
            >
                {/* 3D Perspective Tile */}
                <div className="w-24 h-16 bg-[#f8fafc] border border-slate-300 shadow-md transform skew-x-12 rounded-sm"></div>
            </div>
        );
    }

    if (container.type === 'burette') {
        return (
             <div 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing group select-none"
                style={{ left: container.x, top: container.y, zIndex: container.zIndex }}
                onMouseDown={onMouseDown}
            >
                {/* Drip Stream */}
                {container.buretteOpen && container.currentVolume > 0 && (
                    <div className="absolute top-[310px] left-1/2 -translate-x-1/2 w-0.5 h-48 bg-blue-400/50 animate-pulse pointer-events-none z-0"></div>
                )}
                
                {/* Tube */}
                <div className="w-4 h-[300px] bg-blue-100/10 border border-white/40 rounded-full relative overflow-hidden backdrop-blur-[1px]">
                     {/* Liquid */}
                     <div 
                        className="absolute bottom-0 w-full transition-all duration-300 ease-linear"
                        style={{ height: `${fillPercent}%`, backgroundColor: liquidColor }}
                     ></div>
                     {/* Graduations */}
                     <div className="absolute inset-0 flex flex-col justify-evenly opacity-50 pointer-events-none">
                         {[...Array(10)].map((_, i) => <div key={i} className="w-2 h-px bg-black/50 self-end mr-1"></div>)}
                     </div>
                </div>
                
                {/* Tip & Tap */}
                <div className="flex flex-col items-center relative -mt-1">
                    <div className="w-2 h-4 bg-blue-100/10 border-x border-white/40"></div>
                    {/* Tap Mechanism */}
                    <div 
                        className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors shadow-lg relative z-50"
                        onMouseDown={(e) => { e.stopPropagation(); onTapToggle && onTapToggle(); }}
                    >
                         <div className={`w-1 h-4 bg-slate-400 rounded transition-transform duration-300 ${container.buretteOpen ? 'rotate-0' : 'rotate-90'}`}></div>
                    </div>
                    <div className="w-1 h-6 bg-blue-100/10 border-x border-white/40 mb-1"></div>
                </div>

                {/* Hover Info */}
                <div className="opacity-0 group-hover:opacity-100 absolute left-full top-10 ml-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
                    Burette: {Math.round(container.currentVolume)}ml
                    <br/>
                    {container.buretteOpen ? "Tap Open" : "Tap Closed"}
                </div>
            </div>
        );
    }
    
    // STANDARD GLASSWARE (Beaker, Flask, etc)
    const spoutPos = { x: -35, y: -45 };

    return (
        <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing group select-none"
            style={{ 
                left: container.x, 
                top: container.y, 
                zIndex: container.zIndex,
                transform: `translate(-50%, -50%) rotate(${container.rotation}deg)`,
                transition: 'transform 0.1s linear' // Smooth visual rotation from physics engine
            }}
            onMouseDown={onMouseDown}
        >
            {/* POURING STREAM */}
            {container.rotation < -45 && container.currentVolume > 0 && (
                <div className="absolute pointer-events-none z-0" style={{ 
                    left: spoutPos.x, 
                    top: spoutPos.y,
                    // Counter-rotate the stream container so gravity acts downwards relative to screen
                    transform: `rotate(${-container.rotation}deg)` 
                }}>
                    <svg width="20" height="300" className="overflow-visible">
                        {/* Dynamic stream width based on tilt angle */}
                        <path 
                            d={`M 0 0 Q 0 50, ${Math.sin(Date.now()/100)*2} 300`} 
                            stroke={liquidColor} 
                            strokeWidth={Math.min(10, (Math.abs(container.rotation)-45)/4)} 
                            fill="none" 
                            strokeLinecap="round"
                            className="opacity-80"
                        />
                        {/* Splash at the bottom */}
                         <circle cx="0" cy="300" r={Math.min(8, (Math.abs(container.rotation)-45)/5)} fill={liquidColor} opacity="0.6" className="animate-ping" />
                    </svg>
                </div>
            )}

            {/* CONTAINER BODY */}
            <div className={`relative overflow-hidden backdrop-blur-sm border border-white/30 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] bg-gradient-to-br from-white/10 to-white/5
                ${container.type === 'beaker' ? 'w-24 h-28 rounded-b-xl border-t-0 border-x-2 border-b-4' : ''}
                ${container.type === 'conical_flask' ? 'w-28 h-36 rounded-b-3xl border-t-0 clip-path-flask' : ''}
                ${container.type === 'test_tube' ? 'w-6 h-28 rounded-b-full border-t-2 border-t-white/50' : ''}
                ${container.type === 'reagent_bottle' ? 'w-20 h-24 rounded-xl border-2 border-amber-900/50 bg-amber-900/80' : ''}
                ${container.type === 'measuring_cylinder' ? 'w-8 h-40 rounded-b-lg border-x-2 border-b-2' : ''}
            `}>
                
                {/* Reagent Label */}
                {container.type === 'reagent_bottle' && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded shadow-sm text-center">
                        <div className="text-[9px] font-bold font-serif text-black leading-tight">{container.name}</div>
                        {container.contents[0]?.type === 'acid' && <div className="text-[6px] bg-red-600 text-white px-1 rounded inline-block mt-0.5">DANGER</div>}
                    </div>
                )}
                
                {/* Measurement Lines */}
                {container.type !== 'reagent_bottle' && container.type !== 'test_tube' && (
                    <div className="absolute right-0 bottom-0 top-0 w-full flex flex-col justify-end py-2 pr-1 opacity-50 pointer-events-none">
                        {[...Array(5)].map((_, i) => (
                             <div key={i} className="flex justify-end mb-4 border-b border-white/40 w-1/4 self-end"></div>
                        ))}
                    </div>
                )}

                {/* LIQUID */}
                <div 
                    className="absolute -left-[50%] -right-[50%] -bottom-[50%] -top-[50%] pointer-events-none transition-colors duration-300"
                    style={{ 
                        transform: `rotate(${-container.rotation}deg)`, // Counter-rotate to keep level
                        transformOrigin: 'center center'
                    }}
                >
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-75 ease-linear"
                        style={{ 
                            height: `${fillPercent > 0 ? 50 + (fillPercent/2) : 0}%`, // Offset to center for rotation
                            background: `linear-gradient(to bottom, ${liquidColor}, rgba(0,0,0,0.3))`,
                            boxShadow: `0 -2px 5px ${liquidColor}`
                        }}
                    >
                        {/* Surface Bubbles */}
                        <div className="w-full h-2 bg-white/20 absolute top-0 skew-x-12 blur-[1px]"></div>
                        {/* Precipitate Particles */}
                        {container.precipitate && (
                             <div className="absolute bottom-0 w-full h-1/2 bg-repeat animate-pulse opacity-80"
                                  style={{ backgroundImage: `radial-gradient(${container.precipitate.color} 2px, transparent 2px)`, backgroundSize: '10px 10px' }}
                             ></div>
                        )}
                    </div>
                </div>

                {/* Glass Highlights (Overlay) */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none rounded-b-xl"></div>
                <div className="absolute top-0 right-2 w-1 h-full bg-white/20 blur-[1px]"></div>
            </div>
            
            {/* Hover Info */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-50">
                {container.name} ({Math.round(container.currentVolume)}ml)
                {container.isSnapping && <div className="text-yellow-300 font-bold">Hold Click to Pour</div>}
            </div>
            
            <style>{`
                .clip-path-flask { clip-path: polygon(25% 0, 75% 0, 100% 100%, 0% 100%); }
            `}</style>
        </div>
    );
};

export default ChemistryLab;
