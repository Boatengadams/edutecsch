
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LabLevel, UserProfile, LabEquipment } from '../../types';
import { useToast } from '../common/Toast';
import Button from '../common/Button';

interface ChemistryLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

type ContainerType = 'test_tube' | 'beaker' | 'conical_flask' | 'measuring_cylinder' | 'burette' | 'reagent_bottle' | 'pipette' | 'retort_stand';

interface Chemical {
    id: string;
    name: string;
    concentration: number; // Molarity
    volume: number; // mL
    color: string; // Hex
    type: 'acid' | 'base' | 'salt' | 'indicator' | 'oxidizer' | 'reducer' | 'solvent';
    formula?: string;
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
    x: number;
    y: number;
    // State for specific tools
    buretteOpen?: boolean;
    pipetteState?: 'empty' | 'full'; 
    isHeld?: boolean;
    zIndex?: number;
    // For mounted items
    mountedOn?: string; // ID of the stand
}

// State for the pouring modal
interface PourModalState {
    isOpen: boolean;
    sourceId: string;
    targetId: string;
    maxVolume: number;
}

// State for the active pouring animation
interface ActivePourState {
    isActive: boolean;
    sourceId: string;
    targetId: string;
    totalAmountToPour: number;
    pouredSoFar: number;
}

// --- CONFIGURATION ---

const STOCK_CHEMICALS: LabEquipment[] = [
    { id: 'hcl', name: 'Hydrochloric Acid', type: 'chemical', icon: '🧪', description: '0.1M HCl (Standard)', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'naoh', name: 'Sodium Hydroxide', type: 'chemical', icon: '🧴', description: '0.1M NaOH (Standard)', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'phenolphthalein', name: 'Phenolphthalein', type: 'chemical', icon: '⚪', description: 'Indicator (pH 8.2-10)', properties: { color: '#ffffff00', volume: 0 } },
    { id: 'methyl_orange', name: 'Methyl Orange', type: 'chemical', icon: '🟠', description: 'Indicator (pH 3.1-4.4)', properties: { color: '#fb923c', volume: 0 } },
    { id: 'cuso4', name: 'Copper(II) Sulfate', type: 'chemical', icon: '🔷', description: '0.5M CuSO4', properties: { color: '#0ea5e9', volume: 0.5 } },
    { id: 'nh3', name: 'Ammonia', type: 'chemical', icon: '💨', description: '2.0M NH3', properties: { color: '#ffffff05', volume: 2.0 } },
    { id: 'agno3', name: 'Silver Nitrate', type: 'chemical', icon: '⚪', description: '0.1M AgNO3', properties: { color: '#ffffff05', volume: 0.1 } },
    { id: 'ki', name: 'Potassium Iodide', type: 'chemical', icon: '🧂', description: '0.5M KI', properties: { color: '#ffffff05', volume: 0.5 } },
    { id: 'pbno3', name: 'Lead(II) Nitrate', type: 'chemical', icon: '⚪', description: '0.5M Pb(NO3)2', properties: { color: '#ffffff05', volume: 0.5 } },
    { id: 'kmno4', name: 'Potassium Permanganate', type: 'chemical', icon: '🟣', description: '0.02M KMnO4', properties: { color: '#7e22ce', volume: 0.02 } },
];

const GLASSWARE: { type: ContainerType; name: string; capacity: number; icon: string }[] = [
    { type: 'retort_stand', name: 'Retort Stand', capacity: 0, icon: '🏗️' },
    { type: 'burette', name: 'Burette (50ml)', capacity: 50, icon: '📏' },
    { type: 'conical_flask', name: 'Conical Flask', capacity: 250, icon: '🏺' },
    { type: 'beaker', name: 'Beaker (250ml)', capacity: 250, icon: '🥃' },
    { type: 'pipette', name: 'Pipette (25ml)', capacity: 25, icon: '💉' },
    { type: 'test_tube', name: 'Test Tube', capacity: 20, icon: '🧪' },
    { type: 'measuring_cylinder', name: 'Cylinder', capacity: 100, icon: '📐' },
];

// --- HELPER FUNCTIONS ---

const blendColors = (contents: Chemical[]): string => {
    if (contents.length === 0) return 'rgba(255,255,255,0.05)'; // Almost clear glass
    
    const isMostlyClear = contents.every(c => c.color.endsWith('05') || c.color.endsWith('00'));
    if (isMostlyClear && contents.length > 0) return 'rgba(200, 230, 255, 0.2)'; 

    let r = 0, g = 0, b = 0, totalVol = 0;
    let alpha = 0;

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

    r = Math.round(r / totalVol);
    g = Math.round(g / totalVol);
    b = Math.round(b / totalVol);
    alpha = alpha / totalVol;

    if (alpha < 0.2 && !isMostlyClear) alpha = 0.4;
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ChemistryLab: React.FC<ChemistryLabProps> = () => {
    const { showToast } = useToast();
    const [containers, setContainers] = useState<LabContainer[]>([]);
    const [heldContainer, setHeldContainer] = useState<LabContainer | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    const [snapTarget, setSnapTarget] = useState<LabContainer | 'drain' | null>(null);
    const [isSnappingToStand, setIsSnappingToStand] = useState(false); // New state for magnetic snap

    const [isPouring, setIsPouring] = useState(false);
    const [buretteFlow, setBuretteFlow] = useState<number>(0); 

    const [pourModal, setPourModal] = useState<PourModalState | null>(null);
    const [pourAmountInput, setPourAmountInput] = useState<number>(0);
    const [activePour, setActivePour] = useState<ActivePourState | null>(null);

    const workbenchRef = useRef<HTMLDivElement>(null);
    const pourIntervalRef = useRef<number | null>(null);
    const lastMousePos = useRef<{x: number, y: number} | null>(null);

    // --- REACTION ENGINE ---
    const processReaction = (container: LabContainer): LabContainer => {
        const newContainer = { ...container };
        const chems = newContainer.contents;
        const totalVol = newContainer.currentVolume;
        if (totalVol <= 0) return newContainer;

        const getChem = (idParts: string) => chems.find(c => c.id.includes(idParts));
        
        // TITRATION LOGIC
        const acid = chems.find(c => c.type === 'acid');
        const base = chems.find(c => c.type === 'base');
        const indicator = chems.find(c => c.type === 'indicator');

        if (acid && base) {
            const acidMoles = acid.concentration * (acid.volume / 1000);
            const baseMoles = base.concentration * (base.volume / 1000);
            const netMoles = baseMoles - acidMoles; 

            if (indicator) {
                if (indicator.id === 'phenolphthalein') {
                    if (netMoles > 0) { // Basic
                        const excessConc = netMoles / (totalVol / 1000);
                        const intensity = Math.min(1, excessConc * 3000); 
                        indicator.color = `rgba(236, 72, 153, ${intensity})`; // Pink gradient
                    } else { // Acidic or Neutral
                        indicator.color = '#ffffff00'; 
                    }
                } else if (indicator.id === 'methyl_orange') {
                     if (netMoles > 0) indicator.color = '#eab308'; // Yellow (Base)
                     else indicator.color = '#ef4444'; // Red (Acid)
                }
            }
        } else if (base && indicator?.id === 'phenolphthalein') {
             indicator.color = '#ec4899'; // Deep pink for base only
        }

        // PRECIPITATION LOGIC
        const pb = getChem('pbno3');
        const ki = getChem('ki');
        if (pb && ki && !newContainer.precipitate) {
            newContainer.precipitate = { name: 'Lead(II) Iodide', color: '#facc15', amount: 1 };
        }
        
        const cu = getChem('cuso4');
        const nh3 = getChem('nh3');
        if (cu && nh3) {
             if (nh3.volume > cu.volume * 2) {
                newContainer.precipitate = undefined;
                cu.color = '#1e3a8a'; 
            } else {
                newContainer.precipitate = { name: 'Copper(II) Hydroxide', color: '#93c5fd', amount: 1 };
            }
        }

        return newContainer;
    };

    // --- INTERACTION HANDLERS ---

    const spawnGlassware = (type: ContainerType) => {
        const template = GLASSWARE.find(g => g.type === type);
        if (!template) return;
        
        const scrollX = workbenchRef.current?.scrollLeft || 0;
        const scrollY = workbenchRef.current?.scrollTop || 0;
        
        // Custom spawn Y for stand
        const y = (type === 'retort_stand' ? 450 : type === 'burette' ? 200 : 350) + scrollY; 
        const x = 300 + scrollX + (containers.length * 40) % 300;

        const newContainer: LabContainer = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            name: template.name,
            capacity: template.capacity,
            currentVolume: 0,
            contents: [],
            temperature: 25,
            x, y,
            zIndex: type === 'retort_stand' ? 5 : 10,
            pipetteState: type === 'pipette' ? 'empty' : undefined
        };
        setContainers(prev => [...prev, newContainer]);
    };

    const spawnReagent = (chem: LabEquipment) => {
        const scrollX = workbenchRef.current?.scrollLeft || 0;
        const scrollY = workbenchRef.current?.scrollTop || 0;

        const newContainer: LabContainer = {
            id: 'stock_' + Math.random().toString(36).substr(2, 5),
            type: 'reagent_bottle',
            name: chem.name,
            capacity: 500,
            currentVolume: 500,
            contents: [{ 
                id: chem.id, 
                name: chem.name, 
                concentration: chem.properties?.volume || 1, 
                volume: 500,
                color: chem.properties?.color || '#fff',
                type: (chem.id === 'hcl' ? 'acid' : chem.id === 'naoh' || chem.id === 'nh3' ? 'base' : chem.id.includes('ph') || chem.id.includes('methyl') ? 'indicator' : 'salt')
            }],
            temperature: 25,
            x: 200 + scrollX, y: 350 + scrollY,
            zIndex: 10
        };
        setContainers(prev => [...prev, newContainer]);
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (activePour?.isActive) return;

            const rect = workbenchRef.current?.getBoundingClientRect();
            if (!rect) return;
            
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            
            // Calculate delta
            const dx = lastMousePos.current ? x - lastMousePos.current.x : 0;
            const dy = lastMousePos.current ? y - lastMousePos.current.y : 0;
            lastMousePos.current = { x, y };

            // MAGNETIC SNAP LOGIC
            let snapped = false;
            let snapStand: LabContainer | null = null;
            
            if (heldContainer && heldContainer.type === 'burette') {
                const stand = containers.find(c => c.type === 'retort_stand');
                if (stand) {
                    const clampX = stand.x + 60;
                    const clampY = stand.y - 180;
                    const dist = Math.hypot(x - clampX, y - clampY);
                    
                    if (dist < 60) { // 60px magnetic radius
                        x = clampX;
                        y = clampY;
                        snapped = true;
                        snapStand = stand;
                    }
                }
            }
            
            setMousePos({ x, y });
            setIsSnappingToStand(snapped);

            if (heldContainer) {
                // MOVE ATTACHED OBJECTS (Logic for Retort Stand carrying Burette)
                if (heldContainer.type === 'retort_stand' && (dx !== 0 || dy !== 0)) {
                    setContainers(prev => prev.map(c => {
                        if (c.mountedOn === heldContainer.id) {
                            return { ...c, x: c.x + dx, y: c.y + dy };
                        }
                        return c;
                    }));
                }

                // Pouring/Snap targets
                // If we are magnetically snapped, we don't look for other targets
                if (snapped) {
                    setSnapTarget(snapStand); // Use stand as target for visual feedback
                    return;
                }

                let closest: LabContainer | 'drain' | null = null;
                let minDist = 120; 

                const drainX = rect.width - 60;
                const drainY = rect.height - 60;
                const distToDrain = Math.hypot(x - drainX, y - drainY);
                if (distToDrain < 80) {
                    closest = 'drain';
                    minDist = distToDrain;
                }

                containers.forEach(c => {
                    if (c.id === heldContainer.id) return;
                    if (heldContainer.type === 'retort_stand') return; // Cannot pour a stand
                    if (heldContainer.type === 'reagent_bottle' && c.type === 'reagent_bottle') return;
                    
                    // Standard Pouring Snap
                    const targetX = c.x;
                    const targetY = c.y - (c.type === 'burette' ? 200 : 120); 
                    const dist = Math.hypot(x - targetX, y - targetY);
                    
                    if (dist < minDist) {
                        minDist = dist;
                        closest = c;
                    }
                });

                setSnapTarget(closest);
            }
        };

        const handleGlobalMouseUp = () => {
            if (isPouring) stopPouring();
            // Dont clear lastMousePos here to ensure smooth subsequent drags, 
            // but effectively the drag ends in handleWorkbenchClick
        };
        
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [heldContainer, containers, isPouring, activePour]);

    const handleContainerClick = (e: React.MouseEvent, container: LabContainer) => {
        e.stopPropagation();
        if (activePour?.isActive) return;
        
        // Reset last mouse pos to prevent jumps
        const rect = workbenchRef.current?.getBoundingClientRect();
        if(rect) {
            lastMousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        // Pipette interaction
        if (heldContainer && heldContainer.type === 'pipette') {
             if (container.id !== heldContainer.id) {
                 if (heldContainer.pipetteState === 'empty' && container.currentVolume > 0) {
                     transferLiquid(container, heldContainer, 25);
                     setHeldContainer({...heldContainer, pipetteState: 'full', currentVolume: 25, contents: [...container.contents]});
                     showToast("Pipette filled (25ml)", "success");
                 } else if (heldContainer.pipetteState === 'full') {
                     transferLiquid(heldContainer, container, 25);
                     setHeldContainer({...heldContainer, pipetteState: 'empty', currentVolume: 0, contents: []});
                     showToast("Pipette dispensed", "success");
                 }
                 return;
             }
        }
        
        if (container.type === 'burette') return; // Handled by Double Click for consistency
        if (container.type === 'retort_stand') {
             setHeldContainer({...container, isHeld: true});
             setContainers(prev => prev.filter(c => c.id !== container.id));
             return;
        }

        if (heldContainer) return;

        setHeldContainer({...container, isHeld: true, zIndex: 100});
        setContainers(prev => prev.filter(c => c.id !== container.id));
        setSnapTarget(null);
    };

    const handleContainerDoubleClick = (e: React.MouseEvent, targetContainer: LabContainer) => {
        e.stopPropagation();
        
        if (targetContainer.type === 'burette') {
             if (targetContainer.mountedOn) {
                 // Double click to DETACH
                 const newContainerState = { 
                     ...targetContainer, 
                     isHeld: true, 
                     mountedOn: undefined,
                     zIndex: 100 
                 };
                 setHeldContainer(newContainerState);
                 setContainers(prev => prev.filter(c => c.id !== targetContainer.id));
                 showToast("Burette detached", "info");
                 return;
             } else {
                 // Double click to PICK UP if not mounted
                 setHeldContainer({...targetContainer, isHeld: true, zIndex: 100});
                 setContainers(prev => prev.filter(c => c.id !== targetContainer.id));
             }
             return;
        }

        if (heldContainer && heldContainer.id !== targetContainer.id) {
            // Normal Pouring Logic
            if (heldContainer.currentVolume <= 0) {
                showToast("Your container is empty!", "error");
                return;
            }
            if (targetContainer.currentVolume >= targetContainer.capacity) {
                showToast("Target container is full!", "error");
                return;
            }

            const maxTransfer = Math.min(heldContainer.currentVolume, targetContainer.capacity - targetContainer.currentVolume);
            setPourAmountInput(Math.min(50, maxTransfer)); 
            setPourModal({
                isOpen: true,
                sourceId: heldContainer.id,
                targetId: targetContainer.id,
                maxVolume: maxTransfer
            });
        }
    };

    const handleConfirmPour = () => {
        if (!pourModal || !heldContainer) return;
        setPourModal(null);
        setActivePour({
            isActive: true,
            sourceId: pourModal.sourceId,
            targetId: pourModal.targetId,
            totalAmountToPour: pourAmountInput,
            pouredSoFar: 0
        });
    };

    // --- ANIMATED POURING ENGINE ---
    useEffect(() => {
        if (activePour && activePour.isActive) {
            const targetContainer = containers.find(c => c.id === activePour.targetId);
            if (!heldContainer || !targetContainer) {
                setActivePour(null);
                return;
            }

            let animationId: number;
            const flowRate = 2; 

            const animate = () => {
                setActivePour(current => {
                    if (!current) return null;
                    if (current.pouredSoFar >= current.totalAmountToPour || !heldContainer || heldContainer.currentVolume <= 0) {
                        return null; 
                    }

                    const remaining = current.totalAmountToPour - current.pouredSoFar;
                    const delta = Math.min(flowRate, remaining, heldContainer.currentVolume);
                    
                    if (delta <= 0) return null;

                    setContainers(prevConts => {
                        const tIdx = prevConts.findIndex(c => c.id === current.targetId);
                        if (tIdx === -1) return prevConts;
                        const t = prevConts[tIdx];

                        const ratio = delta / heldContainer.currentVolume;
                        const tContents = [...t.contents];
                        const transferChems = heldContainer.contents.map(c => ({...c, volume: c.volume * ratio}));
                        
                        transferChems.forEach(tc => {
                            const ex = tContents.find(x => x.id === tc.id);
                            if(ex) ex.volume += tc.volume; else tContents.push(tc);
                        });

                        let newT = { ...t, currentVolume: t.currentVolume + delta, contents: tContents };
                        newT = processReaction(newT);

                        const newConts = [...prevConts];
                        newConts[tIdx] = newT;
                        return newConts;
                    });

                    setHeldContainer(currHeld => {
                        if (!currHeld) return null;
                        const newHeldContents = currHeld.contents.map(c => ({
                            ...c, 
                            volume: Math.max(0, c.volume - (c.volume * (delta/currHeld.currentVolume)))
                        })).filter(c => c.volume > 0.001);
                        
                        return { 
                            ...currHeld, 
                            currentVolume: currHeld.currentVolume - delta, 
                            contents: newHeldContents 
                        };
                    });

                    return {
                        ...current,
                        pouredSoFar: current.pouredSoFar + delta
                    };
                });

                animationId = requestAnimationFrame(animate);
            };
            
            animationId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationId);
        }
    }, [activePour?.isActive]);


    const handleWorkbenchClick = (e: React.MouseEvent) => {
        if (heldContainer && !activePour?.isActive) {
            
            // MAGNETIC MOUNT ON DROP
            if (isSnappingToStand && heldContainer.type === 'burette') {
                 const stand = containers.find(c => c.type === 'retort_stand');
                 if (stand) {
                     const mountedBurette = {
                         ...heldContainer,
                         isHeld: false,
                         x: stand.x + 60, 
                         y: stand.y - 180, 
                         zIndex: 20,
                         mountedOn: stand.id
                     };
                     setContainers(prev => [...prev, mountedBurette]);
                     setHeldContainer(null);
                     setIsSnappingToStand(false);
                     showToast("Burette clamped securely", "success");
                     return;
                 }
            }

            // Normal Drop
            const rect = workbenchRef.current?.getBoundingClientRect();
            if (rect) {
                const scrollX = workbenchRef.current?.scrollLeft || 0;
                const scrollY = workbenchRef.current?.scrollTop || 0;
                const x = e.clientX - rect.left + scrollX;
                const y = e.clientY - rect.top + scrollY;
                
                setContainers(prev => [...prev, { ...heldContainer, x, y, isHeld: false, zIndex: heldContainer.type === 'retort_stand' ? 5 : 10 }]);
                setHeldContainer(null);
            }
        }
    };

    const transferLiquid = (source: LabContainer, target: LabContainer, amount: number) => {
        const actualPour = Math.min(amount, source.currentVolume, target.capacity - target.currentVolume);
        if (actualPour <= 0) return { newSource: source, newTarget: target };

        const ratio = actualPour / source.currentVolume;
        const transferredContents = source.contents.map(c => ({...c, volume: c.volume * ratio}));

        const newTargetContents = [...target.contents];
        transferredContents.forEach(tc => {
            const existing = newTargetContents.find(x => x.id === tc.id);
            if (existing) existing.volume += tc.volume;
            else newTargetContents.push(tc);
        });

        const newSourceContents = source.contents.map(c => ({...c, volume: c.volume * (1 - ratio)})).filter(c => c.volume > 0.001);

        let updatedTarget = { ...target, currentVolume: target.currentVolume + actualPour, contents: newTargetContents };
        updatedTarget = processReaction(updatedTarget);

        const updatedSource = { ...source, currentVolume: source.currentVolume - actualPour, contents: newSourceContents };

        if (source.id === heldContainer?.id) setHeldContainer(updatedSource);
        else updateContainerState(updatedSource);

        if (target.id === heldContainer?.id) setHeldContainer(updatedTarget);
        else updateContainerState(updatedTarget);

        return { newSource: updatedSource, newTarget: updatedTarget };
    };

    const updateContainerState = (updated: LabContainer) => {
        setContainers(prev => prev.map(c => c.id === updated.id ? updated : c));
    };

    // Continuous Pouring (Manual Drag)
    const startPouring = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!heldContainer || !snapTarget || activePour?.isActive) return;
        setIsPouring(true);
        
        const flowRate = heldContainer.type === 'beaker' ? 5 : 2; 

        pourIntervalRef.current = window.setInterval(() => {
            if (snapTarget === 'drain') {
                setHeldContainer(curr => {
                    if(!curr || curr.currentVolume <= 0) { stopPouring(); return curr; }
                    return {...curr, currentVolume: Math.max(0, curr.currentVolume - flowRate)};
                });
            } else {
                setHeldContainer(currHeld => {
                    if (!currHeld || currHeld.currentVolume <= 0) { stopPouring(); return currHeld; }
                    
                    setContainers(prevConts => {
                        const tIdx = prevConts.findIndex(c => c.id === (snapTarget as LabContainer).id);
                        if (tIdx === -1) return prevConts;
                        const t = prevConts[tIdx];
                        
                        const actualPour = Math.min(flowRate, currHeld.currentVolume, t.capacity - t.currentVolume);
                        if(actualPour <= 0) return prevConts;

                        const ratio = actualPour / currHeld.currentVolume;
                        const tContents = [...t.contents];
                        const transferChems = currHeld.contents.map(c => ({...c, volume: c.volume * ratio}));
                        
                        transferChems.forEach(tc => {
                            const ex = tContents.find(x => x.id === tc.id);
                            if(ex) ex.volume += tc.volume; else tContents.push(tc);
                        });

                        let newT = { ...t, currentVolume: t.currentVolume + actualPour, contents: tContents };
                        newT = processReaction(newT);

                        const newConts = [...prevConts];
                        newConts[tIdx] = newT;
                        return newConts;
                    });

                    const newHeldContents = currHeld.contents.map(c => ({...c, volume: Math.max(0, c.volume - (c.volume * (flowRate/currHeld.currentVolume)))})).filter(c=>c.volume>0.001);
                    return { ...currHeld, currentVolume: currHeld.currentVolume - flowRate, contents: newHeldContents };
                });
            }
        }, 50);
    };

    const stopPouring = () => {
        setIsPouring(false);
        if (pourIntervalRef.current) {
            clearInterval(pourIntervalRef.current);
            pourIntervalRef.current = null;
        }
    };

    // Burette Drip Logic
    useEffect(() => {
        if (buretteFlow === 0) return;
        
        const interval = setInterval(() => {
            setContainers(prev => {
                const newContainers = [...prev];
                let changed = false;

                newContainers.forEach((c, idx) => {
                    if (c.type === 'burette' && c.currentVolume > 0 && c.buretteOpen) {
                         // Find target EXACTLY under the burette tip
                         // The burette tip is at x (center), and y + ~height/2.
                         // Flask mouth needs to be roughly there.
                         
                         const targetIdx = newContainers.findIndex(t => 
                             t.id !== c.id && 
                             t.type !== 'retort_stand' &&
                             t.type !== 'burette' &&
                             // X Alignment: Close to burette X
                             Math.abs(t.x - c.x) < 25 && 
                             // Y Alignment: Below the burette but not too far
                             t.y > c.y + 150 && t.y < c.y + 250
                         );
                         
                         if (targetIdx !== -1) {
                             const target = newContainers[targetIdx];
                             const dropVol = buretteFlow === 1 ? 0.1 : 1.0;
                             
                             const actualTransfer = Math.min(dropVol, c.currentVolume, target.capacity - target.currentVolume);
                             
                             if (actualTransfer > 0) {
                                 const ratio = actualTransfer / c.currentVolume;
                                 const transferChems = c.contents.map(x => ({...x, volume: x.volume * ratio}));
                                 transferChems.forEach(tc => {
                                     const ex = target.contents.find(x => x.id === tc.id);
                                     if(ex) ex.volume += tc.volume; else target.contents.push(tc);
                                 });
                                 target.currentVolume += actualTransfer;
                                 newContainers[targetIdx] = processReaction(target);

                                 c.contents.forEach(x => x.volume -= x.volume * ratio);
                                 c.currentVolume -= actualTransfer;
                                 changed = true;
                             }
                         }
                    }
                });
                return changed ? newContainers : prev;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [buretteFlow]);

    const toggleBurette = (id: string) => {
        setContainers(prev => prev.map(c => {
            if (c.id === id) {
                const isOpen = !c.buretteOpen;
                setBuretteFlow(isOpen ? 1 : 0);
                return { ...c, buretteOpen: isOpen };
            }
            return c;
        }));
    };

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#111827] overflow-hidden select-none relative">
            
            {/* Sidebar */}
            <div className={`absolute top-0 left-0 h-full w-72 bg-[#1e293b] border-r border-slate-700 z-40 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 pt-16 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
                    <div>
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Glassware & Equipment</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {GLASSWARE.map(glass => (
                                <button key={glass.type} onClick={() => spawnGlassware(glass.type)} className="flex flex-col items-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all">
                                    <span className="text-2xl mb-1">{glass.icon}</span>
                                    <span className="text-[10px] font-bold text-slate-300">{glass.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Reagents</h4>
                        <div className="space-y-1">
                            {STOCK_CHEMICALS.map(chem => (
                                <button key={chem.id} onClick={() => spawnReagent(chem)} className="w-full flex items-center gap-3 p-2 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all text-left">
                                    <div className="w-8 h-8 bg-amber-900/50 rounded flex items-center justify-center text-xs border border-amber-700">Rx</div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-200">{chem.name}</div>
                                        <div className="text-[9px] text-slate-500">{chem.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-50 p-3 bg-slate-800 rounded-full text-white shadow-lg border border-slate-600 hover:bg-slate-700">
                {isSidebarOpen ? '✖️' : '🧪'}
            </button>

            <div className="flex-grow relative bg-[#0f172a] overflow-hidden cursor-default" onClick={handleWorkbenchClick} ref={workbenchRef}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(15,23,42,1)_100%)]"></div>
                
                <div className="absolute bottom-4 right-4 w-24 h-24 bg-slate-800/50 rounded-2xl border-4 border-slate-700 flex items-center justify-center shadow-inner z-0">
                    <div className="text-4xl opacity-30">🚰</div>
                </div>

                {containers.map(container => (
                    <div 
                        key={container.id} 
                        style={{ left: container.x, top: container.y, zIndex: container.zIndex || 10 }} 
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 cursor-grab hover:scale-[1.02] group`} 
                        onMouseDown={(e) => handleContainerClick(e, container)}
                        onDoubleClick={(e) => handleContainerDoubleClick(e, container)}
                    >
                         <GlasswareVisual container={container} />
                         
                         {/* Pour Hint / Snap Hint */}
                         {heldContainer && heldContainer.id !== container.id && (
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                 {heldContainer.type === 'burette' && container.type === 'retort_stand' ? 'Release to Mount' : 'Double-click to pour here'}
                             </div>
                         )}
                         
                         {/* Mounted State Detach Hint */}
                         {container.mountedOn && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                Double-click to Detach
                            </div>
                         )}

                         {container.type === 'burette' && (
                             <div className="absolute top-[280px] -right-12 bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-600 flex flex-col gap-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto" onClick={e=>e.stopPropagation()}>
                                 <button onClick={() => {toggleBurette(container.id); setBuretteFlow(1)}} className={`px-2 py-1 text-[10px] rounded ${container.buretteOpen && buretteFlow===1 ? 'bg-green-600' : 'bg-slate-700'}`}>💧 Drop</button>
                                 <button onClick={() => {toggleBurette(container.id); setBuretteFlow(5)}} className={`px-2 py-1 text-[10px] rounded ${container.buretteOpen && buretteFlow===5 ? 'bg-green-600' : 'bg-slate-700'}`}>🌊 Stream</button>
                                 <button onClick={() => {toggleBurette(container.id); setBuretteFlow(0)}} className={`px-2 py-1 text-[10px] rounded ${!container.buretteOpen ? 'bg-red-600' : 'bg-slate-700'}`}>🛑 Stop</button>
                             </div>
                         )}
                    </div>
                ))}

                {heldContainer && (
                    <div 
                        className="fixed z-[200] pointer-events-none"
                        style={{ 
                            left: activePour?.isActive 
                                ? (containers.find(c => c.id === activePour.targetId)?.x || 0) + (workbenchRef.current?.getBoundingClientRect().left || 0) - (workbenchRef.current?.scrollLeft||0) - 50
                                : isSnappingToStand && heldContainer.type === 'burette' && snapTarget
                                    ? (snapTarget as LabContainer).x + 60 + (workbenchRef.current?.getBoundingClientRect().left || 0) - (workbenchRef.current?.scrollLeft||0)
                                    : snapTarget && snapTarget !== 'drain' && (snapTarget as LabContainer).type !== 'retort_stand'
                                        ? (snapTarget as LabContainer).x + (workbenchRef.current?.getBoundingClientRect().left || 0) - (workbenchRef.current?.scrollLeft||0) - 50
                                        : mousePos.x, 
                            top: activePour?.isActive
                                ? (containers.find(c => c.id === activePour.targetId)?.y || 0) + (workbenchRef.current?.getBoundingClientRect().top || 0) - (workbenchRef.current?.scrollTop||0) - 140
                                : isSnappingToStand && heldContainer.type === 'burette' && snapTarget
                                     ? (snapTarget as LabContainer).y - 180 + (workbenchRef.current?.getBoundingClientRect().top || 0) - (workbenchRef.current?.scrollTop||0)
                                     : snapTarget && snapTarget !== 'drain' && (snapTarget as LabContainer).type !== 'retort_stand'
                                        ? (snapTarget as LabContainer).y + (workbenchRef.current?.getBoundingClientRect().top || 0) - (workbenchRef.current?.scrollTop||0) - 120
                                        : mousePos.y,
                            transition: activePour?.isActive || isSnappingToStand ? 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
                        }}
                    >
                        {/* Magnetic Snap Ghost Effect */}
                        {isSnappingToStand && heldContainer.type === 'burette' && (
                             <div className="absolute inset-0 z-[-1] animate-ping opacity-30">
                                 <GlasswareVisual container={heldContainer} />
                             </div>
                        )}

                        <div className={`transform transition-all duration-300 ${isPouring || activePour?.isActive ? 'rotate-[-45deg] translate-y-4' : 'rotate-0'}`}>
                             <div 
                                className="pointer-events-auto cursor-grabbing relative"
                                onMouseDown={startPouring}
                                onMouseUp={stopPouring}
                             >
                                <GlasswareVisual container={heldContainer} isHeld isPouring={isPouring || activePour?.isActive} />
                             </div>
                        </div>

                        {snapTarget && !isPouring && !activePour?.isActive && heldContainer.type !== 'pipette' && (
                            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap animate-bounce ${isSnappingToStand ? 'bg-green-600' : 'bg-black/80'}`}>
                                {isSnappingToStand ? 'Release to Mount' : snapTarget !== 'drain' ? 'Double-click to Pour' : 'Release to Drain'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Pour Volume Dialog */}
            {pourModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex justify-center items-center p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-600 shadow-2xl w-full max-w-sm animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">Measure & Pour</h3>
                        <p className="text-sm text-slate-400 mb-6">How much liquid would you like to transfer?</p>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                                <span>0 mL</span>
                                <span className="text-blue-400 font-bold text-lg">{pourAmountInput} mL</span>
                                <span>{Math.floor(pourModal.maxVolume)} mL</span>
                            </div>
                            
                            <input 
                                type="range" 
                                min="1" 
                                max={pourModal.maxVolume} 
                                value={pourAmountInput} 
                                onChange={(e) => setPourAmountInput(Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => setPourAmountInput(Math.max(1, pourAmountInput - 10))} className="px-3 py-1 bg-slate-700 rounded text-xs">-10</button>
                                <button onClick={() => setPourAmountInput(Math.min(pourModal.maxVolume, pourAmountInput + 10))} className="px-3 py-1 bg-slate-700 rounded text-xs">+10</button>
                                <button onClick={() => setPourAmountInput(pourModal.maxVolume)} className="px-3 py-1 bg-slate-700 rounded text-xs">Max</button>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <Button variant="secondary" onClick={() => setPourModal(null)} className="flex-1">Cancel</Button>
                            <Button onClick={handleConfirmPour} className="flex-1 bg-blue-600 hover:bg-blue-500">Pour Liquid</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- REALISTIC GLASSWARE RENDERING ---

const GlasswareVisual: React.FC<{ container: LabContainer; isHeld?: boolean; isPouring?: boolean }> = ({ container, isHeld, isPouring }) => {
    const fillHeight = (container.currentVolume / (container.capacity || 1)) * 100;
    const liquidColor = blendColors(container.contents);
    const isPrecipitate = !!container.precipitate;
    const pptColor = container.precipitate?.color;

    // Helper to calculate stream position based on container type
    const getSpoutOffset = (type: ContainerType) => {
        // Adjust these to align with the transformed lip position when rotated -45deg
        switch(type) {
            case 'beaker': return { x: -35, y: -20 };
            case 'conical_flask': return { x: -35, y: -45 };
            case 'reagent_bottle': return { x: -35, y: -45 };
            case 'test_tube': return { x: -15, y: -30 };
            case 'measuring_cylinder': return { x: -15, y: -30 };
            default: return { x: -30, y: -30 };
        }
    };

    const spout = getSpoutOffset(container.type);

    // --- REALISTIC STREAM VISUAL ---
    const Stream = () => (
        <svg className="absolute top-0 left-0 overflow-visible z-0 pointer-events-none" style={{ transform: `translate(${spout.x}px, ${spout.y}px) rotate(45deg)` }}>
            <defs>
                <linearGradient id="streamGrad" x1="0" x2="0" y1="0" y2="1">
                     <stop offset="0%" stopColor={liquidColor} stopOpacity="0.8" />
                     <stop offset="80%" stopColor={liquidColor} stopOpacity="0.6" />
                     <stop offset="100%" stopColor={liquidColor} stopOpacity="0.1" />
                </linearGradient>
            </defs>
            {/* Tapered curve simulating fluid dynamics */}
            <path d={`M 0 0 C 0 20, -5 100, -2 250`} stroke="url(#streamGrad)" strokeWidth="6" strokeLinecap="round" fill="none" className="animate-flow" />
            <path d={`M 0 0 C 0 20, -5 100, -2 250`} stroke="white" strokeWidth="2" strokeOpacity="0.3" fill="none" className="blur-[1px]" />
            
            {/* Splash Effect at bottom */}
            <circle cx="-2" cy="250" r="10" fill={liquidColor} opacity="0.6" className="animate-splash" />
            <circle cx="-2" cy="250" r="6" fill="white" opacity="0.4" className="animate-splash delay-75" />
        </svg>
    );

    // --- LIQUID COMPONENT (Reusable) ---
    const Liquid = ({ height, color }: { height: number, color: string }) => (
        <div 
            className={`absolute bottom-0 w-full transition-all duration-300 ease-linear overflow-hidden`}
            style={{ 
                height: `${Math.max(height, 0)}%`,
                background: `linear-gradient(to right, 
                    ${color}, 
                    rgba(255,255,255,0.1) 40%, 
                    ${color} 60%, 
                    rgba(0,0,0,0.2) 100%)`
            }}
        >
            {/* Meniscus / Surface */}
            <div className="absolute top-0 left-0 w-full h-[6px] bg-white/30 rounded-[100%] scale-x-110 transform -translate-y-1/2 blur-[1px]"></div>
            
            {/* Bubbles / Texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            
            {isPrecipitate && (
                 <div className="absolute inset-0 w-full h-full opacity-80 animate-pulse bg-repeat" 
                      style={{ 
                          backgroundImage: `radial-gradient(${pptColor} 30%, transparent 30%)`,
                          backgroundSize: '6px 6px',
                          backgroundPosition: '0 0'
                      }}>
                 </div>
            )}
        </div>
    );

    // --- RETORT STAND ---
    if (container.type === 'retort_stand') {
        return (
            <div className="relative flex flex-col items-center select-none pointer-events-none group z-[5]">
                {/* Rod */}
                <div className="w-3 h-96 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-500 rounded-t-sm shadow-md border-x border-gray-500 z-10 relative"></div>
                
                {/* Bosshead (Connector) */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-600 rounded shadow-md z-20 flex items-center justify-center border border-gray-500">
                    <div className="w-2 h-2 bg-black/50 rounded-full"></div>
                </div>

                {/* Clamp Arm */}
                <div className="absolute top-[88px] left-1/2 w-[60px] h-3 bg-gray-500 z-10 shadow-sm border-y border-gray-600"></div>
                
                {/* Clamp Jaws - The Grip */}
                <div className="absolute top-[80px] left-[calc(50%+56px)] w-8 h-8 z-30 flex flex-col justify-between py-1">
                    {/* Back Grip */}
                    <div className="w-full h-1.5 bg-amber-900/80 rounded-full"></div>
                    {/* Front Grip (Cork lined) */}
                    <div className="w-full h-1.5 bg-amber-800 rounded-full shadow-sm"></div>
                </div>
                {/* Vertical screw for clamp */}
                <div className="absolute top-[82px] left-[calc(50%+50px)] w-1 h-8 bg-gray-400 z-20"></div>

                {/* Base */}
                <div className="w-48 h-6 bg-gray-700 rounded-md shadow-2xl relative border-t border-gray-600 z-10 mt-[-2px] flex items-center justify-center overflow-hidden">
                    {/* White Tile - Positioned under the clamp area on the right */}
                    <div className="absolute right-4 top-1 w-20 h-16 bg-white shadow-inner rounded-sm opacity-95 transform perspective-[600px] rotateX(60deg)"></div>
                </div>

                {!isHeld && (
                     <div className="absolute -bottom-8 bg-black/80 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">Retort Stand & White Tile</div>
                )}
            </div>
        );
    }

    // --- REAGENT BOTTLE ---
    if (container.type === 'reagent_bottle') {
        return (
            <div className="relative group w-20 h-32 flex flex-col items-center">
                {isPouring && <Stream />}
                {!isHeld && <div className="w-8 h-6 bg-amber-900 rounded-t-md mb-[-2px] z-20 shadow-md border border-amber-950 flex items-center justify-center"><div className="w-full h-1 bg-white/20"></div></div>}
                <div className="w-8 h-6 bg-amber-800/80 border-x-2 border-amber-900/50 backdrop-blur-sm z-10"></div>
                <div className="w-20 h-24 bg-amber-800/90 rounded-xl border-2 border-amber-900/50 backdrop-blur-md shadow-lg relative overflow-hidden">
                    {/* Label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-14 bg-white rounded shadow-sm flex items-center justify-center text-center p-1 z-20 border border-gray-300">
                        <div>
                            <div className="text-[10px] font-bold text-black leading-tight font-serif">{container.contents[0]?.name}</div>
                            <div className="text-[8px] text-gray-600 mt-1">{container.contents[0]?.concentration}M</div>
                            {container.contents[0]?.type === 'acid' && <div className="text-[7px] font-bold text-white bg-red-600 px-1 mt-1 rounded inline-block">DANGER</div>}
                        </div>
                    </div>
                    <Liquid height={fillHeight} color="rgba(60, 30, 10, 0.8)" />
                </div>
            </div>
        );
    }

    // --- BURETTE ---
    if (container.type === 'burette') {
        return (
            <div className="relative flex flex-col items-center group">
                {/* Main Tube */}
                <div className="w-4 h-96 bg-blue-50/10 border-x border-white/50 backdrop-blur-sm relative overflow-hidden rounded-sm shadow-[inset_2px_0_5px_rgba(255,255,255,0.2)]">
                    {/* Graduations */}
                    <div className="absolute right-0 top-0 bottom-0 w-full flex flex-col justify-between py-2 pr-0.5 opacity-80 pointer-events-none z-20">
                         {[...Array(26)].map((_,i) => (
                             <div key={i} className="flex justify-end items-center gap-1">
                                {i % 5 === 0 && <span className="text-[7px] font-mono text-black">{i * 2}</span>}
                                <div className={`h-px bg-black ${i % 5 === 0 ? 'w-2.5' : 'w-1.5'}`}></div>
                             </div>
                         ))}
                    </div>
                    
                    {/* Liquid */}
                    <Liquid height={fillHeight} color={liquidColor} />
                </div>

                {/* Stopcock Area */}
                <div className="relative z-20 flex flex-col items-center -mt-1">
                    <div className="w-4 h-6 bg-blue-50/20 border-x border-white/50 backdrop-blur-sm">
                        <Liquid height={container.currentVolume > 0 ? 100 : 0} color={liquidColor} />
                    </div>
                    {/* Tap Body */}
                    <div className="w-8 h-4 bg-white border border-gray-300 rounded shadow-sm flex items-center justify-center relative cursor-pointer" title="Toggle Tap">
                         {/* Rotatable Key */}
                        <div className={`w-10 h-2 bg-blue-600 rounded-full transition-transform duration-300 shadow-sm ${container.buretteOpen ? 'rotate-90' : 'rotate-0'}`}>
                            <div className="w-1 h-1 bg-white rounded-full absolute left-1 top-0.5"></div>
                        </div>
                    </div>
                    {/* Tip */}
                    <div className="w-1.5 h-6 bg-blue-50/30 border-x border-white/40 mb-1 relative overflow-hidden">
                        <Liquid height={container.currentVolume > 0 ? 100 : 0} color={liquidColor} />
                    </div>
                    
                    {/* Drop Animation */}
                    {container.buretteOpen && container.currentVolume > 0 && (
                        <div className="absolute -bottom-4 w-2 h-2 rounded-full animate-drip" style={{backgroundColor: liquidColor}}></div>
                    )}
                </div>
            </div>
        );
    }

    // --- PIPETTE ---
    if (container.type === 'pipette') {
        const hasLiquid = container.pipetteState === 'full';
        return (
            <div className={`relative flex flex-col items-center transition-transform ${isHeld ? 'rotate-[-45deg] origin-bottom' : ''}`}>
                 <div className="w-2 h-24 bg-white/20 border border-white/40 rounded-full relative overflow-hidden backdrop-blur-sm shadow-md">
                     {hasLiquid && <div className="absolute bottom-0 w-full h-full bg-blue-500/30 transition-all"></div>}
                 </div>
                 <div className="w-0.5 h-8 bg-white/30 border-x border-white/40"></div>
            </div>
        );
    }

    // --- STANDARD GLASSWARE (Beaker, Flask) ---
    return (
        <div className="relative flex flex-col items-center group">
            {isPouring && <Stream />}
            <div className={`
                relative overflow-hidden backdrop-blur-sm border border-white/40 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] transition-all bg-gradient-to-br from-white/10 to-white/5
                ${container.type === 'test_tube' ? 'w-6 h-28 rounded-b-full border-t-2 border-t-white/50' : ''}
                ${container.type === 'beaker' ? 'w-24 h-28 rounded-b-xl border-t-0 border-x-2 border-b-4' : ''}
                ${container.type === 'conical_flask' ? 'w-28 h-36 rounded-b-3xl border-t-0 clip-path-flask' : ''}
                ${container.type === 'measuring_cylinder' ? 'w-8 h-40 rounded-b-lg border-x-2 border-b-2' : ''}
            `}>
                {/* Rim Highlight */}
                {container.type === 'beaker' && <div className="absolute top-0 left-0 w-full h-1.5 bg-white/40 rounded-full shadow-sm"></div>}
                {container.type === 'conical_flask' && <div className="absolute top-0 left-[35%] w-[30%] h-1 bg-white/40 rounded-full"></div>}
                
                {/* Markings */}
                {(container.type === 'measuring_cylinder' || container.type === 'beaker' || container.type === 'conical_flask') && (
                    <div className="absolute right-0 top-10 bottom-4 w-full flex flex-col justify-end py-2 pr-2 pointer-events-none opacity-60 z-20">
                        {[...Array(6)].map((_,i) => (
                            <div key={i} className="flex justify-end items-center gap-1 mb-3">
                                <span className="text-[9px] font-bold text-white/70 drop-shadow-md">{(i+1)*50}</span>
                                <div className="w-2 h-0.5 bg-white/70 shadow-sm"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* The Liquid */}
                <Liquid height={fillHeight} color={liquidColor} />

                {/* Glass Highlights */}
                <div className="absolute top-0 left-2 w-2 h-full bg-gradient-to-r from-white/20 to-transparent blur-[2px] pointer-events-none"></div>
                <div className="absolute top-0 right-4 w-1 h-full bg-gradient-to-l from-white/10 to-transparent blur-[1px] pointer-events-none"></div>
            </div>

            {!isHeld && (
                <div className="mt-2 bg-black/80 backdrop-blur px-3 py-1.5 rounded-md text-[10px] font-mono text-slate-200 border border-slate-600 flex flex-col items-center min-w-[80px] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 absolute bottom-full mb-2">
                    <span className="font-bold text-white uppercase tracking-wider mb-1">{container.name}</span>
                    <div className="w-full h-px bg-slate-600 mb-1"></div>
                    <span>{Math.round(container.currentVolume)} / {container.capacity} ml</span>
                    {container.contents.length > 0 && <span className="text-blue-300 truncate max-w-[100px]">{container.contents[0].name}</span>}
                    {container.precipitate && <span className="text-yellow-400 font-bold animate-pulse">PPT: {container.precipitate.name}</span>}
                </div>
            )}
            
            <style>{`
                .clip-path-flask { clip-path: polygon(30% 0, 70% 0, 100% 100%, 0% 100%); }
                @keyframes splash {
                    0% { transform: scale(0); opacity: 0.8; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .animate-splash { animation: splash 0.6s infinite ease-out; }
                @keyframes drip {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    80% { transform: translateY(20px) scale(0.5); opacity: 1; }
                    100% { transform: translateY(30px) scale(0); opacity: 0; }
                }
                .animate-drip { animation: drip 0.5s infinite linear; }
            `}</style>
        </div>
    );
};

export default ChemistryLab;
