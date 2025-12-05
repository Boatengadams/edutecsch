
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface MechanicsProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

interface MechanicsComponent {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    rotation: number;
    attachedTo?: string | null;
    
    // Custom visual state (e.g. stand height)
    customState?: {
        bossHeadHeight?: number; // px from bottom
    };

    // Physics State
    physics: {
        mass: number;          // grams
        totalLoad?: number;    // grams (attached masses)
        length: number;        // cm (string length or spring L0)
        currentLength?: number;// cm (for spring animation)
        extension: number;     // cm (displacement from equilibrium)
        velocity: number;      // cm/s or rad/s
        angle: number;         // radians (pendulum)
        springConstant: number;// N/m (stiffness)
        damping: number;       // air resistance
        oscillationCount: number; 
        isHeld?: boolean;      // User is holding the bob/mass
        isArmed?: boolean;     // Held in position, waiting for stopwatch trigger
    };

    stopwatchState?: {
        isRunning: boolean;
        elapsedTime: number;
        lastTick: number;
        targetOscillations: number;
    };
}

const TOOLS = [
    { id: 'retort_stand', name: 'Retort Stand', icon: '🏗️' },
    { id: 'metre_rule', name: 'Metre Rule', icon: '📏' },
    { id: 'spring', name: 'Spiral Spring', icon: '➰' },
    { id: 'pendulum', name: 'Pendulum', icon: '🧶' },
    { id: 'stopwatch', name: 'Stopwatch', icon: '⏱️' },
];

const MASSES = [
    { id: 'mass_10g', name: '10g Mass', weight: 10, icon: '⚪' },
    { id: 'mass_20g', name: '20g Mass', weight: 20, icon: '🔵' },
    { id: 'mass_50g', name: '50g Mass', weight: 50, icon: '🟤' },
    { id: 'mass_100g', name: '100g Mass', weight: 100, icon: '⚫' },
];

// Physics Constants
const PIXELS_PER_CM = 5; 
const DT = 0.016; // 60 FPS

// Offsets & Dimensions for Zero-Gap Anchoring
const ARM_LENGTH_PX = 86; // Distance from rod center to hook center
const HOOK_Y_OFFSET = 6; // Vertical distance from arm center to hook contact point
const MASS_HEIGHT_PX = 45; // Height of mass body for chaining

// Tuning factors for realism perception
const VISUAL_GRAVITY_MULTIPLIER_PENDULUM = 25; 
const VISUAL_GRAVITY_MULTIPLIER_SPRING = 120;

// Generate dynamic spring path
const generateSpringPath = (width: number, lengthPx: number, coils: number) => {
    if (lengthPx < 20) lengthPx = 20;
    const startY = 0;
    const endY = lengthPx;
    const coilHeight = endY / coils;
    
    let d = `M ${width/2} ${startY} `;
    for (let i = 0; i < coils; i++) {
        const cy = startY + (i * coilHeight);
        d += `L ${width} ${cy + coilHeight * 0.25} L 0 ${cy + coilHeight * 0.75} L ${width/2} ${cy + coilHeight} `;
    }
    return d;
};

const Mechanics: React.FC<MechanicsProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<MechanicsComponent[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [snapGhost, setSnapGhost] = useState<{x: number, y: number, type: 'stand' | 'spring' | 'ruler' | 'mass' | 'mass_merge'} | null>(null);
    
    // Environment Variables
    const [gravity, setGravity] = useState(9.81);
    const gravityRef = useRef(9.81);

    useEffect(() => {
        gravityRef.current = gravity;
    }, [gravity]);
    
    const componentsRef = useRef<MechanicsComponent[]>([]);
    const requestRef = useRef<number>();
    const workbenchRef = useRef<HTMLDivElement>(null);

    const dragRef = useRef<{
        active: boolean;
        id: string | null;
        type: 'move' | 'interact'; 
        mouseX: number; 
        mouseY: number; 
        offsetX: number;
        offsetY: number;
    }>({ 
        active: false, id: null, type: 'move', 
        mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 
    });

    useEffect(() => { componentsRef.current = components; }, [components]);

    // Helper to calculate total weight hanging on a component (recursive)
    const calculateChainWeight = useCallback((parentId: string, allComponents: MechanicsComponent[]): number => {
        let total = 0;
        const children = allComponents.filter(c => c.attachedTo === parentId);
        
        children.forEach(child => {
            if (child.type.startsWith('mass')) {
                total += child.physics.mass;
                // Add weight of anything attached to this mass (chaining)
                total += calculateChainWeight(child.id, allComponents);
            }
        });
        return total;
    }, []);

    // --- PHYSICS & ANIMATION LOOP ---
    const updatePhysics = useCallback(() => {
        let updated = [...componentsRef.current];
        const now = Date.now();
        const benchRect = workbenchRef.current?.getBoundingClientRect();

        // 1. Handle Mouse Interaction
        if (dragRef.current.active && dragRef.current.id) {
            const { id, type, mouseX, mouseY, offsetX, offsetY } = dragRef.current;
            
            updated = updated.map(comp => {
                if (comp.id === id) {
                    // Case A: Moving the object around (Drag & Drop)
                    if (type === 'move') {
                        let newX = mouseX - offsetX;
                        let newY = mouseY - offsetY;

                        if (benchRect) {
                            newX = Math.max(0, Math.min(benchRect.width, newX));
                            newY = Math.max(0, Math.min(benchRect.height, newY));
                        }
                        return { ...comp, x: newX, y: newY };
                    } 
                    // Case B: Interacting with attached physics object (Displace)
                    else if (type === 'interact') {
                        const phys = { ...comp.physics, isHeld: true, isArmed: false };
                        
                        if (comp.type === 'pendulum') {
                            // Calculate angle based on mouse relative to pivot
                            const pivotX = comp.x; 
                            const pivotY = comp.y;
                            const dx = mouseX - pivotX;
                            const dy = mouseY - pivotY;
                            phys.angle = Math.atan2(dx, dy); // 0 is straight down
                            phys.velocity = 0;
                            phys.oscillationCount = 0;
                        }
                        
                        if (comp.type === 'spring') {
                            // Calculate extension based on mouse Y
                            const anchorY = comp.y;
                            const dy = mouseY - anchorY; 
                            const newTotalLen = dy / PIXELS_PER_CM;
                            // Don't let it compress inverted
                            const safeLen = Math.max(phys.length * 0.5, newTotalLen);
                            phys.extension = safeLen - phys.length;
                            phys.velocity = 0;
                            phys.oscillationCount = 0;
                            phys.currentLength = safeLen;
                        }
                        return { ...comp, physics: phys };
                    }
                }
                return comp;
            });
        }

        // 2. Parent-Child Kinematics (Lock attached items to parents - Zero Gap Enforcement)
        updated = updated.map(comp => {
            if (comp.attachedTo) {
                const parent = updated.find(p => p.id === comp.attachedTo);
                if (parent) {
                    // ATTACHED TO RETORT STAND (The Zero-Gap Rule)
                    if (parent.type === 'retort_stand') {
                        const height = parent.customState?.bossHeadHeight ?? 350;
                        // We calculate the exact coordinate of the hook's lowest point
                        // The parent Y is the bottom of the rod. 
                        // The hook is at (parent.y - height + HOOK_Y_OFFSET)
                        return { ...comp, x: parent.x + ARM_LENGTH_PX, y: parent.y - height + HOOK_Y_OFFSET }; 
                    }
                    // ATTACHED TO SPRING
                    if (parent.type === 'spring') {
                        // Hangs from bottom of spring
                        const springLenPx = (parent.physics.currentLength || parent.physics.length) * PIXELS_PER_CM;
                        return { ...comp, x: parent.x, y: parent.y + springLenPx }; 
                    }
                    // ATTACHED TO MASS (CHAINING)
                    if (parent.type.startsWith('mass')) {
                        // Hangs from bottom of previous mass
                        return { ...comp, x: parent.x, y: parent.y + MASS_HEIGHT_PX }; 
                    }
                } else {
                    // Parent deleted? Detach
                    return { ...comp, attachedTo: null };
                }
            }
            return comp;
        });

        // 3. Calculate Total Loads on Springs (Recursive)
        const currentSnapshot = [...updated];
        updated = updated.map(comp => {
            if (comp.type === 'spring') {
                const totalChainMass = calculateChainWeight(comp.id, currentSnapshot);
                return { ...comp, physics: { ...comp.physics, totalLoad: totalChainMass }};
            }
            return comp;
        });

        // 4. Physics Integration (Faster Realism)
        updated = updated.map(comp => {
            // Stopwatch Logic
            if (comp.type === 'stopwatch' && comp.stopwatchState?.isRunning) {
                const sw = comp.stopwatchState;
                // Find the active experiment to check oscillation count
                const activeExp = updated.find(c => 
                    (c.type === 'pendulum' || c.type === 'spring') && c.attachedTo
                );
                
                let newState = { ...sw, elapsedTime: sw.elapsedTime + (now - sw.lastTick)/1000, lastTick: now };
                
                // Auto Stop Logic
                if (sw.targetOscillations > 0 && activeExp && activeExp.physics.oscillationCount >= sw.targetOscillations) {
                    newState.isRunning = false; 
                }
                return { ...comp, stopwatchState: newState };
            }

            // Skip physics if held or armed
            if (comp.physics.isHeld || comp.physics.isArmed) return comp;
            
            // Only simulate if attached
            if (!comp.attachedTo && !comp.type.startsWith('mass')) return comp;

            const phys = { ...comp.physics };

            // --- PENDULUM (T = 2π√(L/g)) ---
            if (comp.type === 'pendulum') {
                const g_visual = gravityRef.current * PIXELS_PER_CM * VISUAL_GRAVITY_MULTIPLIER_PENDULUM; 
                const L_px = Math.max(10, phys.length * PIXELS_PER_CM);
                // F = -mg sin(theta), angular accel = -g/L sin(theta)
                const angularAccel = -(g_visual / L_px) * Math.sin(phys.angle);
                
                phys.velocity += angularAccel * DT;
                phys.velocity *= (1 - phys.damping); 
                const prevAngle = phys.angle;
                phys.angle += phys.velocity * DT;

                if (prevAngle > 0 && phys.angle <= 0) {
                    phys.oscillationCount++;
                }
            }

            // --- SPRING (T = 2π√(m/k)) ---
            if (comp.type === 'spring') {
                const totalMass = (phys.mass + (phys.totalLoad || 0)); 
                const g_visual = gravityRef.current * VISUAL_GRAVITY_MULTIPLIER_SPRING; 
                const k_visual = phys.springConstant * 50; 

                // Equilibrium Extension: mg = kx => x = mg/k
                const equilibriumExt = (totalMass * g_visual) / (k_visual * 10); 
                
                // Displacement from Equilibrium
                const displacement = phys.extension - equilibriumExt;
                const restoringForce = -k_visual * displacement;
                const dampingForce = -30 * phys.velocity; // Basic viscous damping

                // a = F/m
                const accel = (restoringForce + dampingForce) / Math.max(1, totalMass);

                phys.velocity += accel * DT;
                
                // Apply damping factor
                phys.velocity *= (1 - phys.damping);

                const prevExt = phys.extension;
                phys.extension += phys.velocity * DT;
                phys.currentLength = phys.length + phys.extension;

                if (prevExt < equilibriumExt && phys.extension >= equilibriumExt && Math.abs(phys.velocity) > 2) {
                    phys.oscillationCount++;
                }
            }

            return { ...comp, physics: phys };
        });

        setComponents(updated);
        requestRef.current = requestAnimationFrame(updatePhysics);
    }, [calculateChainWeight]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updatePhysics);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [updatePhysics]);


    // --- EVENT HANDLERS ---

    const addComponent = (toolId: string) => {
        const tool = TOOLS.find(t => t.id === toolId) || MASSES.find(m => m.id === toolId);
        if (!tool) return;

        // Initial Physics State - Defaulting to low damping for long oscillations (>15)
        let physics = { mass: 10, length: 20, extension: 0, velocity: 0, angle: 0, springConstant: 30, damping: 0.005, currentLength: 20, oscillationCount: 0, isHeld: false, isArmed: false };
        let stopwatchState = undefined;
        let customState = {};

        if (toolId === 'spring') { 
            physics.length = 20; 
            physics.currentLength = 20; 
            physics.mass = 5; 
            physics.springConstant = 40; 
            physics.damping = 0.002; // Lower damping for longer oscillation
        } 
        if (toolId === 'pendulum') { 
            physics.length = 50; 
            physics.mass = 50;
            physics.damping = 0.0005; // Very low damping for extended swings
        }
        if (toolId.startsWith('mass')) { physics.mass = (tool as any).weight; }
        if (toolId === 'stopwatch') { stopwatchState = { isRunning: false, elapsedTime: 0, lastTick: 0, targetOscillations: 20 }; }
        if (toolId === 'metre_rule') { physics.length = 100; }
        if (toolId === 'retort_stand') { customState = { bossHeadHeight: 350 }; }

        const newComp: MechanicsComponent = {
            id: Math.random().toString(36).substr(2, 9),
            type: toolId,
            name: tool.name,
            x: 300 + Math.random() * 50,
            y: 400 + Math.random() * 50,
            rotation: 0,
            physics,
            stopwatchState,
            customState
        };
        
        setComponents(prev => [...prev, newComp]);
        setSelectedId(newComp.id); 
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        
        const comp = components.find(c => c.id === id);
        if (!comp || !workbenchRef.current) return;

        setSelectedId(id);

        let mode: 'move' | 'interact' = 'move';
        
        // Interact if it's an active physics object attached to something
        if (comp.attachedTo && (comp.type === 'pendulum' || comp.type === 'spring')) {
            mode = 'interact';
            // Reset armed/held state
            setComponents(prev => prev.map(c => c.id === id ? { ...c, physics: { ...c.physics, isArmed: false, oscillationCount: 0 } } : c));
        } else {
            // Bring to front if moving
            setComponents(prev => [...prev.filter(c => c.id !== id), comp]);
            if(comp.attachedTo) {
                // Detach immediately if moving a component
                setComponents(prev => prev.map(c => c.id === id ? { ...c, attachedTo: null, rotation: 0 } : c));
            }
        }

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = workbenchRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        dragRef.current = {
            active: true,
            id,
            type: mode,
            mouseX,
            mouseY,
            offsetX: mouseX - comp.x,
            offsetY: mouseY - comp.y
        };
        
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
        window.addEventListener('touchmove', handleGlobalMove, { passive: false });
        window.addEventListener('touchend', handleGlobalUp);
    };

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!dragRef.current.active || !workbenchRef.current) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        const rect = workbenchRef.current.getBoundingClientRect();
        
        const mx = clientX - rect.left;
        const my = clientY - rect.top;

        dragRef.current.mouseX = mx;
        dragRef.current.mouseY = my;

        // --- SNAP GHOST PREVIEW ---
        if (dragRef.current.type === 'move') {
            const draggingComp = componentsRef.current.find(c => c.id === dragRef.current.id);
            if (draggingComp) {
                const stand = componentsRef.current.find(c => c.type === 'retort_stand');
                if (stand) {
                    const headHeight = stand.customState?.bossHeadHeight ?? 350;
                    const tipX = stand.x + ARM_LENGTH_PX;
                    const tipY = stand.y - headHeight + HOOK_Y_OFFSET;

                    // Snap Spring/Pendulum to Tip
                    if (['spring', 'pendulum'].includes(draggingComp.type)) {
                        if (Math.abs(mx - tipX) < 40 && Math.abs(my - tipY) < 40) {
                            setSnapGhost({ x: tipX, y: tipY, type: 'stand' });
                            return;
                        }
                    }
                }

                // Mass-to-Mass or Mass-to-Spring Snapping (Merging & Chaining)
                if (draggingComp.type.startsWith('mass')) {
                    const springs = componentsRef.current.filter(c => c.type === 'spring');
                    
                    // Check Spring
                    for(const spring of springs) {
                        const springBottomY = spring.y + (spring.physics.currentLength || 0) * PIXELS_PER_CM;
                        if(Math.abs(mx - spring.x) < 40 && Math.abs(my - springBottomY) < 60) {
                            setSnapGhost({ x: spring.x, y: springBottomY, type: 'spring' });
                            return;
                        }
                    }

                    // Check Hanging Masses for Merge/Chain
                    const hangingMasses = componentsRef.current.filter(c => c.type.startsWith('mass') && c.id !== draggingComp.id && c.attachedTo);
                    for(const mass of hangingMasses) {
                         // Check for Merge (Hitbox: Body of mass - increased tolerance)
                         if (Math.abs(mx - mass.x) < 50 && Math.abs(my - mass.y) < 50) {
                             setSnapGhost({ x: mass.x, y: mass.y, type: 'mass_merge' });
                             return;
                         }
                         // Check for Chain (Hitbox: Bottom of mass)
                         if (Math.abs(mx - mass.x) < 30 && Math.abs(my - (mass.y + MASS_HEIGHT_PX)) < 30) {
                            setSnapGhost({ x: mass.x, y: mass.y + MASS_HEIGHT_PX, type: 'mass' });
                            return;
                        }
                    }
                }
            }
        }
        setSnapGhost(null);
    };

    const handleGlobalUp = () => {
        const id = dragRef.current.id;
        
        // RELEASE LOGIC (Arming)
        if (dragRef.current.type === 'interact' && id) {
            setComponents(prev => prev.map(c => c.id === id ? { 
                ...c, 
                physics: { ...c.physics, isHeld: false, isArmed: true } 
            } : c));
            onUpdateChar('success', 'System Armed. Press Start on Stopwatch to release.');
        }

        // DROP LOGIC (Snap & Merge)
        if (dragRef.current.type === 'move' && id) {
            setComponents(prev => {
                const active = prev.find(c => c.id === id);
                if(!active) return prev;
                let updated = [...prev];
                const stand = prev.find(c => c.type === 'retort_stand');

                // Snap to Retort Stand Tip (Zero Gap)
                if (stand) {
                    const headHeight = stand.customState?.bossHeadHeight ?? 350;
                    const tipX = stand.x + ARM_LENGTH_PX;
                    const tipY = stand.y - headHeight + HOOK_Y_OFFSET;

                    if(['spring', 'pendulum'].includes(active.type)) {
                        if(Math.abs(active.x - tipX) < 40 && Math.abs(active.y - tipY) < 40) {
                            updated = updated.map(c => c.id === id ? { 
                                ...c, 
                                attachedTo: stand.id, 
                                x: tipX, 
                                y: tipY, 
                                physics: {...c.physics, velocity: 0, angle: 0} 
                            } : c);
                            onUpdateChar('success', `${active.name} attached to Clamp.`);
                        }
                    }
                }

                // Snap Mass Logic (Merging & Chaining)
                if(active.type.startsWith('mass')) {
                    const springs = prev.filter(c => c.type === 'spring');
                    // Find masses that are attached to something (so they are "hanging")
                    const hangingMasses = prev.filter(c => c.type.startsWith('mass') && c.id !== active.id && c.attachedTo);
                    
                    let handled = false;

                    // 1. MERGE LOGIC (Dropping onto another mass to sum them)
                    for(const targetMass of hangingMasses) {
                        if(Math.abs(active.x - targetMass.x) < 50 && Math.abs(active.y - targetMass.y) < 50) {
                            const newMass = targetMass.physics.mass + active.physics.mass;
                            updated = updated.map(c => c.id === targetMass.id ? { 
                                ...c, 
                                name: `${newMass}g Mass`,
                                type: `mass_${newMass}g`, // Just for icon handling logic compatibility
                                physics: { ...c.physics, mass: newMass } 
                            } : c);
                            // Delete the dragged mass
                            updated = updated.filter(c => c.id !== active.id);
                            onUpdateChar('success', `Mass merged: ${newMass}g`);
                            handled = true;
                            break;
                        }
                    }
                    
                    // 2. CHAINING LOGIC (Dropping below another mass)
                    if (!handled) {
                        for(const targetMass of hangingMasses) {
                             if(Math.abs(active.x - targetMass.x) < 30 && Math.abs(active.y - (targetMass.y + MASS_HEIGHT_PX)) < 30) {
                                updated = updated.map(c => c.id === id ? { ...c, attachedTo: targetMass.id } : c);
                                onUpdateChar('success', 'Mass chained.');
                                handled = true;
                                break;
                             }
                        }
                    }

                    // 3. SPRING ATTACHMENT
                    if (!handled) {
                        for(const spring of springs) {
                            const springBottomY = spring.y + (spring.physics.currentLength || 0) * PIXELS_PER_CM;
                            
                            // Hitbox: Bottom of spring
                            if(Math.abs(active.x - spring.x) < 40 && Math.abs(active.y - springBottomY) < 60) {
                                // Check if spring already has a mass attached
                                const existingMass = updated.find(c => c.attachedTo === spring.id && c.type.startsWith('mass'));
                                
                                if (existingMass) {
                                    // Merge with existing mass automatically if trying to attach to same spring
                                    const newMass = existingMass.physics.mass + active.physics.mass;
                                    updated = updated.map(c => c.id === existingMass.id ? { 
                                        ...c, 
                                        name: `${newMass}g Mass`,
                                        physics: { ...c.physics, mass: newMass } 
                                    } : c);
                                    updated = updated.filter(c => c.id !== active.id);
                                    onUpdateChar('success', `Mass combined on spring: ${newMass}g`);
                                } else {
                                    // Attach new mass
                                    updated = updated.map(c => c.id === id ? { ...c, attachedTo: spring.id } : c);
                                    onUpdateChar('success', 'Mass loaded onto spring.');
                                }
                                handled = true;
                                break;
                            }
                        }
                    }
                }
                return updated;
            });
        }

        setSnapGhost(null);
        dragRef.current.active = false;
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchmove', handleGlobalMove);
        window.removeEventListener('touchend', handleGlobalUp);
    };

    const handleStartStopwatch = (stopwatchId: string) => {
        setComponents(prev => {
            const swComp = prev.find(c => c.id === stopwatchId);
            if (!swComp || !swComp.stopwatchState) return prev;
            
            const isStarting = !swComp.stopwatchState.isRunning;

            let updated = prev.map(c => {
                if (c.id === stopwatchId && c.stopwatchState) {
                    return { ...c, stopwatchState: { ...c.stopwatchState, isRunning: isStarting, lastTick: Date.now() } };
                }
                if (isStarting && (c.type === 'pendulum' || c.type === 'spring') && c.physics.isArmed) {
                    return { ...c, physics: { ...c.physics, isArmed: false, oscillationCount: 0 } };
                }
                return c;
            });
            return updated;
        });
    };
    
    const deleteComponent = (id: string) => {
        setComponents(prev => prev.filter(c => c.id !== id && c.attachedTo !== id));
        setSelectedId(null);
    };

    const updateProperty = (id: string, key: string, value: number) => {
        setComponents(prev => prev.map(c => {
            if (c.id === id) {
                if (key === 'rotation') return { ...c, rotation: value };
                if (key === 'targetOscillations') return { ...c, stopwatchState: { ...c.stopwatchState!, targetOscillations: value } };
                if (key === 'bossHeadHeight' && c.type === 'retort_stand') return { ...c, customState: { ...c.customState, bossHeadHeight: value } };
                return { ...c, physics: { ...c.physics, [key]: value } };
            }
            return c;
        }));
    };
    
    const activeOscillationCount = components.find(c => (c.type === 'pendulum' || c.type === 'spring') && c.attachedTo)?.physics.oscillationCount || 0;

    // Smart Ruler Logic: Calculate markers for any ruler component
    const getRulerMarkers = (ruler: MechanicsComponent, allComponents: MechanicsComponent[]) => {
        const markers: { top: string, value: number, label: string, color: string, line?: boolean }[] = [];
        const rulerTop = ruler.y - 250; // 500px height centered (y is center)
        
        allComponents.forEach(c => {
            if (c.id === ruler.id) return;
            // Only track objects within a reasonable horizontal range
            if (Math.abs(c.x - ruler.x) > 200) return; 

            let points: {y: number, label: string, color: string}[] = [];

            if (c.type === 'spring') {
                 // Bottom of spring (Current Extension)
                 const springBottom = c.y + (c.physics.currentLength || c.physics.length) * PIXELS_PER_CM;
                 points.push({ y: springBottom, label: `Ext: ${(c.physics.currentLength || c.physics.length).toFixed(1)}cm`, color: 'text-blue-400' });
                 // Top of spring (Datum)
                 points.push({ y: c.y, label: 'Zero', color: 'text-slate-400' });
            } else if (c.type === 'pendulum') {
                 // Center of Bob
                 const bobY = c.y + (c.physics.length * PIXELS_PER_CM);
                 points.push({ y: bobY, label: `L: ${c.physics.length}cm`, color: 'text-red-400' });
                 // Pivot
                 points.push({ y: c.y, label: 'Pivot', color: 'text-slate-400' });
            } else if (c.type.startsWith('mass') && !c.attachedTo) {
                 // Only loose masses near ruler
                 points.push({ y: c.y, label: 'Center', color: 'text-yellow-400' });
            } else if (c.type === 'retort_stand') {
                 // Hook level
                 const height = c.customState?.bossHeadHeight ?? 350;
                 const hookY = c.y - height + HOOK_Y_OFFSET;
                 points.push({ y: hookY, label: 'Clamp', color: 'text-slate-500' });
            }

            points.forEach(p => {
                const relativeY = p.y - rulerTop;
                const percentage = (relativeY / 500) * 100; // 500px ruler height
                const cmValue = relativeY / PIXELS_PER_CM;

                if (percentage >= 0 && percentage <= 100) {
                    markers.push({ 
                        top: `${percentage}%`, 
                        value: cmValue,
                        label: p.label,
                        color: p.color,
                        line: true
                    });
                }
            });
        });
        return markers;
    };

    return (
        <div className="h-full flex flex-col-reverse md:flex-row bg-[#0f172a]">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-[#0B0F19] border-r border-slate-800 p-4 z-20 overflow-y-auto custom-scrollbar shadow-2xl flex flex-col">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 bg-slate-800 rounded-lg text-xs text-white border border-slate-700 focus:border-blue-500 outline-none placeholder-slate-500"
                    />
                </div>
                
                {/* Global Physics Settings */}
                <div className="mb-6 p-3 bg-slate-900/80 rounded-lg border border-slate-700">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-2">Physics Environment</h4>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>Gravity (g)</span>
                            <span>{gravity} m/s²</span>
                        </div>
                        <input 
                            type="range" min="1.6" max="20" step="0.1" 
                            value={gravity} 
                            onChange={(e) => setGravity(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-600">
                            <span>Moon</span>
                            <span>Earth</span>
                            <span>Jupiter</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 flex-grow">
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Apparatus</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {TOOLS.filter(t=>t.name.toLowerCase().includes(searchQuery)).map(tool => (
                                <button key={tool.id} onClick={() => addComponent(tool.id)} className="flex flex-col items-center p-2 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500 transition-all active:scale-95">
                                    <span className="text-2xl mb-1">{tool.icon}</span>
                                    <span className="text-[9px] text-slate-400 font-bold text-center">{tool.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Weights</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {MASSES.filter(m=>m.name.toLowerCase().includes(searchQuery)).map(mass => (
                                <button key={mass.id} onClick={() => addComponent(mass.id)} className="flex flex-col items-center p-2 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-yellow-500 transition-all active:scale-95">
                                    <span className="text-2xl mb-1">{mass.icon}</span>
                                    <span className="text-[9px] text-slate-400 font-bold text-center">{mass.weight}g</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={() => setComponents([])} className="mt-auto w-full py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">Clear Lab</button>
            </div>

            {/* Workbench */}
            <div ref={workbenchRef} className="flex-grow relative bg-[#1e293b] overflow-hidden cursor-default touch-none" onClick={() => setSelectedId(null)}>
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
                </div>

                {/* Delete Button for Selected Item */}
                {selectedId && (
                    <div className="absolute top-4 right-4 z-50 animate-fade-in-up">
                        <button 
                            onClick={() => deleteComponent(selectedId)}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
                        >
                            <span>🗑️</span> Delete Selected
                        </button>
                    </div>
                )}

                {/* Snap Ghost Indicator */}
                {snapGhost && (
                    <div className="absolute z-30 pointer-events-none flex flex-col items-center" style={{ left: snapGhost.x, top: snapGhost.y, transform: 'translate(-50%, -50%)' }}>
                        <div className="w-8 h-8 bg-green-500/50 rounded-full border-2 border-green-400 animate-ping"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full absolute top-3"></div>
                        <span className="text-[10px] text-green-400 font-bold mt-8 bg-black/70 px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            {snapGhost.type === 'ruler' ? 'Place Rule' : snapGhost.type === 'mass_merge' ? 'Merge Masses (Add)' : snapGhost.type === 'mass' ? 'Chain Mass' : 'Attach to Tip'}
                        </span>
                    </div>
                )}

                {components.map(comp => {
                    const isSelected = selectedId === comp.id;
                    
                    const renderControlPanel = () => {
                        if (!isSelected) return null;
                        return (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-800 p-3 rounded-xl border border-slate-600 shadow-xl z-50 w-48 animate-fade-in-up" onMouseDown={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-white truncate">{comp.name}</span>
                                    <button onClick={() => deleteComponent(comp.id)} className="text-red-400 hover:text-red-300">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                {/* Retort Stand Controls */}
                                {comp.type === 'retort_stand' && (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Bosshead Height</span></div>
                                        <input type="range" min="100" max="480" value={comp.customState?.bossHeadHeight || 350} onChange={(e) => updateProperty(comp.id, 'bossHeadHeight', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                    </div>
                                )}
                                {/* Length Controls */}
                                {['spring', 'pendulum'].includes(comp.type) && (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Length</span><span>{comp.physics.length}cm</span></div>
                                        <input type="range" min="10" max="100" value={comp.physics.length} onChange={(e) => updateProperty(comp.id, 'length', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                                    </div>
                                )}
                                {/* Spring Constant Control */}
                                {comp.type === 'spring' && (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Spring Constant (k)</span><span>{comp.physics.springConstant} N/m</span></div>
                                        <input type="range" min="10" max="100" step="5" value={comp.physics.springConstant} onChange={(e) => updateProperty(comp.id, 'springConstant', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                                    </div>
                                )}
                                {/* Pendulum Mass Control */}
                                {comp.type === 'pendulum' && (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Bob Mass</span><span>{comp.physics.mass}g</span></div>
                                        <input type="range" min="10" max="200" step="10" value={comp.physics.mass} onChange={(e) => updateProperty(comp.id, 'mass', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"/>
                                    </div>
                                )}
                                {comp.attachedTo && <div className="w-full text-center"><button onClick={() => setComponents(prev => prev.map(c => c.id === comp.id ? {...c, attachedTo: null} : c))} className="text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/40">Detach</button></div>}
                            </div>
                        );
                    };

                    let visual = null;

                    if (comp.type === 'retort_stand') {
                        const headHeight = comp.customState?.bossHeadHeight ?? 350;
                        visual = (
                            <div className="relative group">
                                {/* Base */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-gradient-to-r from-slate-600 to-slate-500 rounded shadow-2xl border-t border-slate-400"></div>
                                {/* Rod */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[4px] h-[500px] bg-gradient-to-r from-gray-300 to-gray-400 shadow-md"></div>
                                
                                {/* MOVABLE PART (Clamp + Arm) */}
                                <div style={{ position: 'absolute', bottom: headHeight, left: '50%' }}>
                                    {/* Boss Head (Clamp) */}
                                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-12 bg-slate-700 rounded border border-slate-600 flex items-center justify-center shadow-lg z-10">
                                        <div className="w-3 h-3 rounded-full bg-black/50"></div>
                                    </div>
                                    {/* Horizontal Arm */}
                                    <div className="absolute top-0 left-0 w-[90px] h-[6px] bg-gray-400 rounded-r-md shadow-sm border-b border-gray-500 -translate-y-1/2 origin-left z-0">
                                        {/* Hook Visual at Tip - Precise Alignment */}
                                        <div className="absolute right-1 bottom-[-6px] w-2 h-4 border-2 border-slate-600 rounded-b-full border-t-0"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    else if (comp.type === 'spring') {
                        const lenPx = (comp.physics.currentLength || 20) * PIXELS_PER_CM;
                        const coils = Math.max(5, Math.floor(lenPx / 15));
                        visual = (
                            <div className="flex flex-col items-center group cursor-grab active:cursor-grabbing" onDoubleClick={() => setSelectedId(comp.id)}>
                                {/* Top Loop/Hook - Tight fit to anchor */}
                                <div className="w-3 h-3 rounded-full border-2 border-slate-400 -mb-1"></div>
                                <svg width="60" height={lenPx} className="overflow-visible drop-shadow-lg">
                                    <path d={generateSpringPath(60, lenPx, coils)} fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                                    <path d={generateSpringPath(60, lenPx, coils)} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" style={{transform: 'translate(1px, -1px)'}} />
                                </svg>
                                {/* Bottom Hook for Weights */}
                                <div className="w-4 h-5 border-b-2 border-x-2 border-slate-400 rounded-b-full -mt-1 z-30"></div>
                                
                                {comp.physics.totalLoad !== undefined && comp.physics.totalLoad > 0 && (
                                     <div className="absolute top-full mt-2 text-[8px] text-slate-400 bg-black/50 px-1 rounded whitespace-nowrap">{Math.round(comp.physics.totalLoad)}g Load</div>
                                )}
                                {comp.physics.isArmed && <span className="text-[9px] text-black font-bold bg-yellow-400 px-2 py-0.5 rounded-full mt-1 absolute top-full animate-pulse whitespace-nowrap z-40">Release to Arm</span>}
                            </div>
                        );
                    }
                    else if (comp.type === 'pendulum') {
                        const threadLenPx = comp.physics.length * PIXELS_PER_CM;
                        visual = (
                            <div className="relative cursor-grab active:cursor-grabbing" onDoubleClick={() => setSelectedId(comp.id)} onClick={() => setSelectedId(comp.id)}>
                                {/* Attachment Knot - Tight fit */}
                                <div className="absolute -top-0 -left-1 w-2 h-2 bg-white rounded-full border border-slate-400 z-20"></div>
                                <div style={{ transform: `rotate(${comp.physics.angle}rad)`, transformOrigin: 'top center' }}>
                                    <div className="w-[2px] bg-white/80 shadow-sm mx-auto" style={{ height: threadLenPx }}></div>
                                    <div className={`w-12 h-12 -ml-6 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#f8fafc,_#475569,_#0f172a)] shadow-xl border border-slate-600 flex items-center justify-center ${comp.physics.isArmed ? 'ring-4 ring-yellow-500 ring-opacity-80' : ''}`}>
                                        <span className="text-[9px] text-slate-800 font-bold opacity-50">{comp.physics.mass}g</span>
                                        {(comp.physics.isHeld || comp.physics.isArmed) && (
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-[9px] px-1 rounded mt-1">
                                                {(comp.physics.angle * (180/Math.PI)).toFixed(1)}°
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    else if (comp.type.startsWith('mass')) {
                        const massValue = comp.physics.mass;
                        visual = (
                            <div className="flex flex-col items-center group cursor-grab active:cursor-grabbing" onDoubleClick={() => setSelectedId(comp.id)}>
                                {/* Top Loop for hanging */}
                                <div className="w-3 h-3 border-2 border-yellow-700 mx-auto rounded-full bg-transparent -mb-1"></div>
                                {/* Body */}
                                <div className="w-10 h-12 bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-800 rounded-sm shadow-lg flex items-center justify-center border-y-2 border-yellow-900 relative">
                                    <span className="text-[10px] font-bold text-yellow-950 drop-shadow-sm">{massValue}g</span>
                                </div>
                                {/* Bottom hook visual for chaining */}
                                <div className="w-2 h-3 border-2 border-yellow-700 border-t-0 rounded-b-full -mt-1"></div>
                            </div>
                        );
                    }
                    else if (comp.type === 'metre_rule') {
                        const markers = getRulerMarkers(comp, components);
                        visual = (
                             <div className="w-16 h-[500px] bg-[#e2e8f0] border border-slate-400 shadow-xl rounded-sm flex relative select-none cursor-grab active:cursor-grabbing group">
                                {/* Metallic/Wood Texture Overlay */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]"></div>
                                
                                {/* Scale */}
                                <div className="h-full w-full relative">
                                    <div className="absolute top-0 left-0 right-0 bg-black/10 h-full w-px ml-1"></div> {/* Edge highlight */}
                                    {Array.from({ length: 101 }).map((_, i) => {
                                        const isMajor = i % 10 === 0;
                                        const isMid = i % 5 === 0;
                                        return (
                                            <div 
                                                key={i} 
                                                className={`absolute right-0 border-t border-slate-800 ${isMajor ? 'w-8 border-slate-900 border-t-2' : isMid ? 'w-5 border-slate-600' : 'w-3 border-slate-400'}`} 
                                                style={{ top: `${i}%` }}
                                            >
                                                {isMajor && (
                                                    <span className="absolute right-9 -top-2.5 text-[10px] font-bold text-slate-800 font-mono transform -rotate-90 origin-right">
                                                        {i}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Smart Markers Layer */}
                                {markers.map((m, i) => (
                                    <div 
                                        key={i} 
                                        className="absolute w-full border-t border-dashed border-red-500/80 z-10 flex items-center justify-start animate-fade-in-short"
                                        style={{ top: m.top }}
                                    >
                                        <div className={`bg-slate-900 ${m.color} text-[9px] px-2 py-0.5 rounded shadow-sm transform -translate-x-4 -translate-y-1/2 whitespace-nowrap border border-slate-700 flex gap-1 items-center`}>
                                            <span className="font-mono font-bold">{m.value.toFixed(1)}cm</span>
                                            <span className="opacity-60 text-[8px] uppercase tracking-wider">{m.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    }
                    else if (comp.type === 'stopwatch') {
                         visual = (
                            <div className="w-32 h-40 bg-slate-800 rounded-xl border-4 border-slate-600 shadow-2xl flex flex-col items-center justify-center relative p-2 cursor-grab active:cursor-grabbing" onDoubleClick={() => setSelectedId(comp.id)}>
                                <div className="absolute -top-2 w-4 h-4 bg-slate-500 rounded-sm"></div>
                                <div className="font-mono text-3xl text-green-400 font-black bg-black px-2 rounded border border-slate-700 w-full text-center mb-2">
                                    {(comp.stopwatchState?.elapsedTime || 0).toFixed(2)}s
                                </div>
                                <div className="flex justify-between w-full px-1 mb-2 text-[10px] text-slate-400">
                                    <span>Count: <b className="text-white">{activeOscillationCount}</b></span>
                                    {comp.stopwatchState?.targetOscillations ? <span className="text-yellow-400">Auto: {comp.stopwatchState.targetOscillations}</span> : <span>Manual</span>}
                                </div>
                                <div className="flex gap-2 justify-center w-full">
                                    <button 
                                        className={`w-8 h-8 rounded-full ${comp.stopwatchState?.isRunning ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'} text-white flex items-center justify-center shadow transition-colors`}
                                        onMouseDown={(e) => { e.stopPropagation(); handleStartStopwatch(comp.id); }}
                                    >
                                        {comp.stopwatchState?.isRunning ? 'II' : '▶'}
                                    </button>
                                    <button 
                                        className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow transition-colors"
                                        onMouseDown={(e) => { 
                                            e.stopPropagation(); 
                                            setComponents(prev => prev.map(c => {
                                                if (c.id === comp.id && c.stopwatchState) return { ...c, stopwatchState: { ...c.stopwatchState, isRunning: false, elapsedTime: 0, lastTick: 0 } };
                                                if (c.type === 'pendulum' || c.type === 'spring') return { ...c, physics: { ...c.physics, oscillationCount: 0, isHeld: false, isArmed: false, velocity: 0, angle: 0, extension: 0 } };
                                                return c;
                                            })); 
                                        }}
                                    >
                                        ■
                                    </button>
                                </div>
                                <div className="flex gap-1 mt-2 w-full justify-center">
                                    {[10, 20, 50].map(t => (
                                        <button key={t} className={`text-[9px] px-1.5 py-0.5 rounded border ${comp.stopwatchState?.targetOscillations === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                                            onMouseDown={(e) => { e.stopPropagation(); updateProperty(comp.id, 'targetOscillations', t); }}>{t}</button>
                                    ))}
                                </div>
                            </div>
                         );
                    }

                    // Determine Anchoring Transform based on component type
                    // Retort Stand & Ruler: Anchored at bottom (translateY -100%) to sit on base line
                    // Spring, Pendulum, Masses: Anchored at top (translateY 0%) to hang from hook
                    // Stopwatch: Centered (translateY -50%)
                    let translateY = '-50%';
                    if (comp.type === 'retort_stand') {
                        translateY = '-100%';
                    } else if (comp.type === 'metre_rule') {
                        translateY = '-50%'; // Ruler centered
                    } else if (['spring', 'pendulum'].includes(comp.type) || comp.type.startsWith('mass')) {
                        translateY = '0%';
                    }

                    return (
                        <div 
                            key={comp.id} 
                            style={{ 
                                position: 'absolute', 
                                left: comp.x, 
                                top: comp.y, 
                                transform: `translate(-50%, ${translateY}) rotate(${comp.rotation}deg)`, 
                                zIndex: isSelected ? 100 : 20
                            }}
                            onMouseDown={(e) => handleMouseDown(e, comp.id)}
                            onTouchStart={(e) => handleMouseDown(e, comp.id)}
                            className={`${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}`}
                        >
                            {renderControlPanel()}
                            {visual}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Mechanics;
