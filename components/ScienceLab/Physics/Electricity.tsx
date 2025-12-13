
import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- TYPES ---

interface ElectricityProps {
    onUpdateChar: (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => void;
}

type ComponentType = 'cell' | 'cell_holder' | 'bulb' | 'switch' | 'resistor' | 'rheostat' | 'voltmeter' | 'ammeter';

interface Terminal {
    id: string;
    x: number;
    y: number;
    polarity?: 'positive' | 'negative' | 'neutral';
    color?: string;
}

interface EComponent {
    id: string;
    type: ComponentType;
    name: string;
    x: number;
    y: number;
    rotation: number;
    properties: {
        voltage?: number;       // Volts (Source)
        resistance?: number;    // Ohms (Load)
        isOpen?: boolean;       // Switch state
        maxResistance?: number; // Rheostat
        currentValue?: number;  // Live Simulation Value (Amps/Volts)
        isGlowing?: boolean;    // Visual State
        brightness?: number;    // 0-1 Visual intensity
        power?: number;         // Watts
        cellCount?: number;     // For holders
    };
}

interface Wire {
    id: string;
    from: { compId: string, terminalId: string };
    to: { compId: string, terminalId: string };
    color: string;
    current?: number; // For animation speed
}

// --- ASSETS & CONFIG ---

const COMPONENT_DEFS: Record<ComponentType, { width: number, height: number, terminals: Terminal[], label: string, icon: string, defaultR?: number }> = {
    'cell': {
        width: 100, height: 180, // Vertical dimensions
        terminals: [{ id: 'pos', x: 0, y: -80, polarity: 'positive', color: '#ef4444' }, { id: 'neg', x: 0, y: 80, polarity: 'negative', color: '#000000' }],
        label: 'Cells (Series)', icon: '🔋', defaultR: 0.5
    },
    'cell_holder': {
        width: 160, height: 100, // Horizontal dimensions
        terminals: [{ id: 'pos', x: -70, y: 0, polarity: 'positive', color: '#ef4444' }, { id: 'neg', x: 70, y: 0, polarity: 'negative', color: '#000000' }],
        label: 'Cells (Parallel)', icon: '⚡🔋', defaultR: 0.5
    },
    'bulb': {
        width: 80, height: 80,
        terminals: [{ id: 't1', x: -30, y: 30, color: '#000000' }, { id: 't2', x: 30, y: 30, color: '#000000' }],
        label: '6V Lamp', icon: '💡', defaultR: 10
    },
    'switch': {
        width: 100, height: 60,
        terminals: [{ id: 'in', x: -40, y: 0, color: '#d4af37' }, { id: 'out', x: 40, y: 0, color: '#d4af37' }],
        label: 'Tap Key', icon: '🔌', defaultR: 0
    },
    'resistor': {
        width: 100, height: 40,
        terminals: [{ id: 't1', x: -50, y: 0, color: '#9ca3af' }, { id: 't2', x: 50, y: 0, color: '#9ca3af' }],
        label: 'Resistor', icon: '〰️', defaultR: 10
    },
    'rheostat': {
        width: 140, height: 70,
        terminals: [{ id: 't1', x: -60, y: 25, color: '#000000' }, { id: 't2', x: 60, y: 25, color: '#000000' }, { id: 'wipe', x: 0, y: -30, color: '#ef4444' }],
        label: 'Rheostat', icon: '🎚️', defaultR: 5
    },
    'voltmeter': {
        width: 110, height: 110,
        terminals: [{ id: 'pos', x: -35, y: 45, polarity: 'positive', color: '#ef4444' }, { id: 'neg', x: 35, y: 45, polarity: 'negative', color: '#000000' }],
        label: 'Voltmeter', icon: '⚡', defaultR: 1000000 // High R
    },
    'ammeter': {
        width: 110, height: 110,
        terminals: [{ id: 'pos', x: -35, y: 45, polarity: 'positive', color: '#ef4444' }, { id: 'neg', x: 35, y: 45, polarity: 'negative', color: '#000000' }],
        label: 'Ammeter', icon: '⏱️', defaultR: 0.001 // Low R
    }
};

// --- PHYSICS ENGINE HELPERS ---

const getId = (compId: string, termId: string) => `${compId}:${termId}`;

// Union-Find for node detection
class UnionFind {
    parent: Record<string, string> = {};
    constructor(elements: string[]) {
        elements.forEach(e => this.parent[e] = e);
    }
    find(i: string): string {
        if (this.parent[i] === i) return i;
        return this.parent[i] = this.find(this.parent[i]);
    }
    union(i: string, j: string) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) this.parent[rootI] = rootJ;
    }
}

// Simple Gaussian Elimination Solver
function solveLinearSystem(A: number[][], b: number[]) {
    const n = A.length;
    // Pivot and Forward Elimination
    for (let i = 0; i < n; i++) {
        let maxEl = Math.abs(A[i][i]);
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > maxEl) {
                maxEl = Math.abs(A[k][i]);
                maxRow = k;
            }
        }
        
        // Swap
        for (let k = i; k < n; k++) {
            const tmp = A[maxRow][k];
            A[maxRow][k] = A[i][k];
            A[i][k] = tmp;
        }
        const tmp = b[maxRow];
        b[maxRow] = b[i];
        b[i] = tmp;

        // Make upper triangular
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[i][i]) < 1e-9) continue; // Singularity check
            const c = -A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                if (i === j) A[k][j] = 0;
                else A[k][j] += c * A[i][j];
            }
            b[k] += c * b[i];
        }
    }

    // Back Substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i > -1; i--) {
        if (Math.abs(A[i][i]) < 1e-9) continue;
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (b[i] - sum) / A[i][i];
    }
    return x;
}


// --- VISUAL COMPONENTS ---
const CellHolderSVG = ({ count, mode }: { count: number, mode: 'series' | 'parallel' }) => {
    if (mode === 'series') {
        const cellHeight = 32;
        const gap = 4;
        const totalStackHeight = (count * cellHeight) + ((count - 1) * gap);
        const startY = -totalStackHeight / 2 + cellHeight / 2;

        return (
            <g className="filter drop-shadow-xl">
                 <defs>
                    <linearGradient id="holderBodyV" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1f2937" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                     <linearGradient id="batteryGradientV" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1e40af" />
                    </linearGradient>
                </defs>
                <rect x="-35" y="-80" width="70" height="160" rx="8" fill="url(#holderBodyV)" stroke="#374151" strokeWidth="2" />
                <rect x="-10" y="-88" width="20" height="10" fill="#ef4444" />
                <circle cx="0" cy="-80" r="4" fill="#ef4444" stroke="#7f1d1d" />
                <text x="15" y="-75" fontSize="10" fill="white" fontWeight="bold">+</text>
                <rect x="-10" y="80" width="20" height="10" fill="#000000" />
                <circle cx="0" cy="80" r="4" fill="#000000" stroke="#333" />
                <text x="15" y="82" fontSize="10" fill="white" fontWeight="bold">-</text>
                <g transform="translate(0, 0)">
                    {Array.from({ length: Math.min(count, 4) }).map((_, i) => {
                        const y = startY + i * (cellHeight + gap);
                        return (
                            <g key={i} transform={`translate(0, ${y})`}>
                                <rect x="-25" y="-14" width="50" height="28" rx="2" fill="url(#batteryGradientV)" stroke="#172554" />
                                <rect x="-10" y="-17" width="20" height="3" fill="#9ca3af" />
                                {i > 0 && <path d={`M 0 -22 L 0 -${gap + 8}`} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 1" opacity="0.6" />}
                                <text x="0" y="4" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" opacity="0.8">1.5V</text>
                            </g>
                        );
                    })}
                </g>
                <text x="45" y="0" textAnchor="middle" transform="rotate(90, 45, 0)" fontSize="9" fill="#94a3b8" fontFamily="monospace">{(count * 1.5).toFixed(1)}V</text>
                 <path d="M -45 -10 V 10 M -45 0 H -55" stroke="#64748b" strokeWidth="2" />
            </g>
        );
    }
    const width = 25;
    const gap = 5;
    const totalWidth = (count * width) + ((count - 1) * gap);
    return (
        <g className="filter drop-shadow-xl">
             <defs>
                <linearGradient id="holderBodyH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f2937" />
                    <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                 <linearGradient id="batteryGradientH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
            </defs>
            <rect x="-70" y="-40" width="140" height="80" rx="8" fill="url(#holderBodyH)" stroke="#374151" strokeWidth="2" />
            <rect x="-78" y="-10" width="8" height="20" rx="2" fill="#ef4444" />
            <circle cx="-70" cy="0" r="4" fill="#ef4444" stroke="#7f1d1d" />
            <text x="-62" y="4" fontSize="10" fill="white" fontWeight="bold">+</text>
            <rect x="70" y="-10" width="8" height="20" rx="2" fill="#000000" />
            <circle cx="70" cy="0" r="4" fill="#000000" stroke="#333" />
            <text x="60" y="4" fontSize="10" fill="white" fontWeight="bold">-</text>
            <path d="M -60 -30 H 60" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <path d="M -60 30 H 60" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <g transform="translate(0, 0)">
                {Array.from({ length: Math.min(count, 4) }).map((_, i) => {
                    const startX = -totalWidth / 2 + width/2; 
                    const x = startX + i * (width + gap);
                    return (
                        <g key={i} transform={`translate(${x}, 0)`}>
                            <line x1="0" y1="-28" x2="0" y2="-30" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
                            <line x1="0" y1="28" x2="0" y2="30" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
                            <rect x="-10" y="-28" width="20" height="56" rx="2" fill="url(#batteryGradientH)" stroke="#172554" />
                            <rect x="-6" y="-32" width="12" height="4" fill="#9ca3af" />
                            <text x="0" y="0" textAnchor="middle" transform="rotate(-90)" fontSize="6" fill="white" fontWeight="bold" opacity="0.6">PARA</text>
                        </g>
                    );
                })}
            </g>
            <text x="0" y="32" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">1.5V ({count}x)</text>
             <path d="M -10 38 H 10 M -10 42 H 10" stroke="#64748b" strokeWidth="1.5" />
        </g>
    );
};

const BulbSVG = ({ isGlowing, brightness }: { isGlowing?: boolean, brightness?: number }) => {
    let glowColor = "#f59e0b"; // Default Orange-Yellow
    let coreColor = "#fbbf24";
    if (brightness) {
        if (brightness > 0.8) { glowColor = "#ffffff"; coreColor = "#fef3c7"; } 
        else if (brightness < 0.4) { glowColor = "#ef4444"; coreColor = "#7f1d1d"; }
    }
    const opacity = Math.min(1, Math.max(0.2, (brightness || 0)));
    return (
        <g className="filter drop-shadow-xl">
             <defs>
                <filter id="glowBlur">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                    <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <circle cx="0" cy="30" r="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="0" cy="30" r="20" fill="#1e293b" />
            <circle cx="0" cy="0" r="25" fill={isGlowing ? coreColor : "rgba(255,255,255,0.2)"} stroke="#94a3b8" strokeWidth="1" fillOpacity={isGlowing ? 0.3 + (opacity * 0.4) : 0.1} />
            {isGlowing && <circle cx="0" cy="0" r={25 + (brightness || 0)*5} fill={glowColor} fillOpacity={opacity * 0.6} filter="url(#glowBlur)" className="animate-pulse" style={{animationDuration: '0.2s'}} />}
            <path d="M -8 30 L -5 5 L 0 -5 L 5 5 L 8 30" stroke={isGlowing ? "#fff" : "#525252"} strokeWidth={isGlowing ? 2 : 1} fill="none" />
            <circle cx="-30" cy="30" r="6" fill="#000" stroke="#333" />
            <circle cx="30" cy="30" r="6" fill="#000" stroke="#333" />
        </g>
    );
};

const SwitchSVG = ({ isOpen }: { isOpen?: boolean }) => (
    <g className="filter drop-shadow-md">
        <rect x="-45" y="-15" width="90" height="30" rx="2" fill="#1c1917" stroke="#44403c" />
        <circle cx="-30" cy="0" r="6" fill="#d4af37" stroke="#b45309" />
        <circle cx="30" cy="0" r="6" fill="#d4af37" stroke="#b45309" />
        <g transform={isOpen ? "rotate(-35, -30, 0)" : "rotate(0, -30, 0)"} className="transition-transform duration-200 origin-left">
            <rect x="-30" y="-4" width="70" height="8" fill="#d1d5db" stroke="#6b7280" />
            <circle cx="40" cy="-8" r="8" fill="#111827" />
        </g>
        <rect x="-45" y="-5" width="10" height="10" fill="#d4af37" />
        <rect x="35" y="-5" width="10" height="10" fill="#d4af37" />
    </g>
);

const ResistorSVG = ({ value }: { value: number }) => (
    <g className="filter drop-shadow-md">
         <line x1="-50" y1="0" x2="50" y2="0" stroke="#cbd5e1" strokeWidth="4" />
         <rect x="-30" y="-10" width="60" height="20" rx="4" fill="#fcd34d" stroke="#b45309" />
         <rect x="-20" y="-10" width="5" height="20" fill="#ef4444" />
         <rect x="-5" y="-10" width="5" height="20" fill="#000" />
         <rect x="10" y="-10" width="5" height="20" fill="#a16207" />
         <text x="0" y="30" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" style={{textShadow: '0 1px 2px black'}}>{value}Ω</text>
    </g>
);

const RheostatSVG = ({ value, max }: { value: number, max: number }) => {
    const pos = (value / (max || 1)) * 80; 
    return (
        <g className="filter drop-shadow-md">
             <line x1="-60" y1="25" x2="60" y2="25" stroke="#cbd5e1" strokeWidth="3" />
             <rect x="-40" y="5" width="80" height="40" rx="2" fill="#334155" stroke="#1e293b" />
             {Array.from({length: 12}).map((_, i) => <path key={i} d={`M ${-35 + i*6} 5 V 45`} stroke="#64748b" strokeWidth="1" />)}
             <line x1="-40" y1="-30" x2="40" y2="-30" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
             <g transform={`translate(${pos - 40}, 0)`} className="transition-transform duration-75">
                 <path d="M 0 -30 L 0 15" stroke="#ef4444" strokeWidth="3" />
                 <circle cx="0" cy="-30" r="4" fill="#ef4444" />
                 <path d="M -4 15 L 4 15 L 0 25 Z" fill="#ef4444" />
             </g>
             <text x="0" y="60" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" style={{textShadow: '0 1px 2px black'}}>{value}Ω</text>
        </g>
    );
};

const MeterSVG = ({ type, value }: { type: 'voltmeter' | 'ammeter', value: number }) => {
    const isVolt = type === 'voltmeter';
    const maxVal = isVolt ? 10 : 3;
    const clampedVal = Math.min(Math.abs(value), maxVal);
    const angle = -45 + (clampedVal / maxVal) * 90;
    const isNegative = value < 0;

    return (
        <g className="filter drop-shadow-2xl">
            <rect x="-55" y="-30" width="110" height="80" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="4" />
            <path d="M -50 -20 A 80 80 0 0 1 50 -20 L 50 30 L -50 30 Z" fill="#f8fafc" />
            <path d="M -40 10 L -38 0" stroke="black" strokeWidth="1" />
            <path d="M 0 -10 L 0 -20" stroke="black" strokeWidth="2" />
            <path d="M 40 10 L 38 0" stroke="black" strokeWidth="1" />
            <text x="0" y="10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#333">{isVolt ? 'V' : 'A'}</text>
            <g transform={`translate(0, 35) rotate(${isNegative ? -angle : angle}) translate(0, -35)`} className="transition-transform duration-500 ease-out">
                <line x1="0" y1="35" x2="0" y2="-15" stroke="#ef4444" strokeWidth="2" />
            </g>
            <circle cx="0" cy="35" r="4" fill="#000" />
            <circle cx="-35" cy="45" r="8" fill="#ef4444" stroke="#7f1d1d" />
            <text x="-35" y="49" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">+</text>
            <circle cx="35" cy="45" r="8" fill="#000" stroke="#333" />
            <text x="35" y="49" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">-</text>
            <rect x="-20" y="-45" width="40" height="14" rx="2" fill="#000" stroke="#333" />
            <text x="0" y="-35" textAnchor="middle" fill="#22c55e" fontSize="10" fontFamily="monospace">
                {value.toFixed(2)}
            </text>
        </g>
    );
};


const Electricity: React.FC<ElectricityProps> = ({ onUpdateChar }) => {
    const [components, setComponents] = useState<EComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [drawingStart, setDrawingStart] = useState<{ compId: string, termId: string, x: number, y: number } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    const dragRef = useRef<{ id: string, startX: number, startY: number } | null>(null);
    const workbenchRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- MNA (MODIFIED NODAL ANALYSIS) SOLVER WITH MULTI-ISLAND SUPPORT ---
    useEffect(() => {
        // 1. Identify Nodes using Union-Find
        const allTerminals: string[] = [];
        components.forEach(c => {
            COMPONENT_DEFS[c.type].terminals.forEach(t => allTerminals.push(getId(c.id, t.id)));
        });

        const uf = new UnionFind(allTerminals);

        // Union terminals connected by wires
        wires.forEach(w => {
            uf.union(getId(w.from.compId, w.from.terminalId), getId(w.to.compId, w.to.terminalId));
        });

        // Collect unique nodes (roots)
        const uniqueNodes = new Set<string>();
        allTerminals.forEach(t => uniqueNodes.add(uf.find(t)));
        const nodesList = Array.from(uniqueNodes);
        const nodeMap = new Map<string, number>();
        nodesList.forEach((n, i) => nodeMap.set(n, i));

        const n = nodesList.length;
        if (n < 2) return; 

        // 2. Identify Disjoint Islands (Separate Circuits)
        // Group node indices that are connected by components
        const islandParent = new Array(n).fill(0).map((_, i) => i);
        const findIsland = (i: number): number => {
            if (islandParent[i] === i) return i;
            return islandParent[i] = findIsland(islandParent[i]);
        };
        const unionIsland = (i: number, j: number) => {
            const rootI = findIsland(i);
            const rootJ = findIsland(j);
            if (rootI !== rootJ) islandParent[rootI] = rootJ;
        };

        components.forEach(c => {
            // Treat high resistance meters as open for island connectivity to prevent them bridging separate circuits erroneously during setup
            // However, for voltage measurement they need to be part of the island. 
            // Better approach: include everything in connectivity check.
            
            if (c.type === 'switch' && c.properties.isOpen) return;

            const terms = COMPONENT_DEFS[c.type].terminals;
            if (terms.length < 2) return;

            const u = nodeMap.get(uf.find(getId(c.id, terms[0].id)));
            const v = nodeMap.get(uf.find(getId(c.id, terms[1].id)));

            if (u !== undefined && v !== undefined) {
                unionIsland(u, v);
            }
        });

        const islands = new Map<number, number[]>();
        for (let i = 0; i < n; i++) {
            const root = findIsland(i);
            if (!islands.has(root)) islands.set(root, []);
            islands.get(root)!.push(i);
        }

        // 3. Fix Grounds per Island
        const fixedPotentials = new Map<number, number>();

        islands.forEach((islandNodes) => {
            // Check for batteries in this island
            const islandBatteries = components.filter(c => {
                if (c.type !== 'cell' && c.type !== 'cell_holder') return false;
                const negId = uf.find(getId(c.id, 'neg'));
                const negIdx = nodeMap.get(negId);
                return islandNodes.includes(negIdx!);
            });

            if (islandBatteries.length > 0) {
                // Island has power. Pick one negative terminal as 0V reference.
                const refBat = islandBatteries[0];
                const negId = uf.find(getId(refBat.id, 'neg'));
                const negIdx = nodeMap.get(negId)!;
                fixedPotentials.set(negIdx, 0);
            } else {
                // Passive island (no batteries). Fix one arbitrary node to 0V to make matrix solvable.
                fixedPotentials.set(islandNodes[0], 0);
            }
        });
        
        // 4. Propagate Fixed Potentials (Voltage Sources)
        const batteries = components.filter(c => c.type === 'cell' || c.type === 'cell_holder');
        let changed = true;
        let iter = 0;
        while(changed && iter < 20) { // Limit iterations
            changed = false;
            iter++;
            batteries.forEach(bat => {
                const posNode = nodeMap.get(uf.find(getId(bat.id, 'pos')));
                const negNode = nodeMap.get(uf.find(getId(bat.id, 'neg')));
                
                if (posNode === undefined || negNode === undefined) return;

                const voltage = bat.type === 'cell' ? (bat.properties.cellCount || 2) * 1.5 : 1.5;

                if (fixedPotentials.has(negNode) && !fixedPotentials.has(posNode)) {
                    fixedPotentials.set(posNode, fixedPotentials.get(negNode)! + voltage);
                    changed = true;
                } else if (fixedPotentials.has(posNode) && !fixedPotentials.has(negNode)) {
                    fixedPotentials.set(negNode, fixedPotentials.get(posNode)! - voltage);
                    changed = true;
                }
            });
        }

        // 5. Build Linear Equations System (Conductance Matrix) for Unknown Nodes
        const unknownNodes = nodesList.map((_, i) => i).filter(i => !fixedPotentials.has(i));
        const uCount = unknownNodes.length;
        
        const uMap = new Map<number, number>();
        unknownNodes.forEach((realIdx, solverIdx) => uMap.set(realIdx, solverIdx));

        const G_matrix = Array.from({ length: uCount }, () => Array(uCount).fill(0));
        const I_vector = Array(uCount).fill(0);

        // Populate Matrix with Components
        components.forEach(c => {
            if (c.type === 'cell' || c.type === 'cell_holder') return; // Sources handled as constraints

            const terms = COMPONENT_DEFS[c.type].terminals;
            if (terms.length < 2) return;

            const n1 = nodeMap.get(uf.find(getId(c.id, terms[0].id)))!;
            const n2 = nodeMap.get(uf.find(getId(c.id, terms[1].id)))!;

            if (n1 === n2) return; // Shorted component

            // Determine Resistance
            let R = 1e9; // Default open
            if (c.type === 'switch') {
                R = c.properties.isOpen ? 1e9 : 0.001;
            } else if (c.type === 'voltmeter') {
                R = 1000000; // 1M Ohm
            } else if (c.type === 'ammeter') {
                R = 0.001; // 1 mOhm
            } else {
                R = c.properties.resistance || 10;
            }

            const g = 1 / R;

            // Apply stamps
            if (uMap.has(n1)) {
                const u1 = uMap.get(n1)!;
                G_matrix[u1][u1] += g;
                if (uMap.has(n2)) {
                    const u2 = uMap.get(n2)!;
                    G_matrix[u1][u2] -= g;
                } else if (fixedPotentials.has(n2)) {
                    I_vector[u1] += g * fixedPotentials.get(n2)!;
                }
            }

            if (uMap.has(n2)) {
                const u2 = uMap.get(n2)!;
                G_matrix[u2][u2] += g;
                if (uMap.has(n1)) {
                    const u1 = uMap.get(n1)!;
                    G_matrix[u2][u1] -= g;
                } else if (fixedPotentials.has(n1)) {
                    I_vector[u2] += g * fixedPotentials.get(n1)!;
                }
            }
        });

        // 6. Solve
        const solvedPotentials = solveLinearSystem(G_matrix, I_vector);
        
        // 7. Map back to all nodes
        const finalPotentials = new Map<number, number>();
        fixedPotentials.forEach((v, k) => finalPotentials.set(k, v));
        unknownNodes.forEach((realIdx, i) => finalPotentials.set(realIdx, solvedPotentials[i]));

        // 8. Update Components State
        setComponents(prev => prev.map(c => {
            const terms = COMPONENT_DEFS[c.type].terminals;
            if (terms.length < 2) return c;

            const n1 = nodeMap.get(uf.find(getId(c.id, terms[0].id)))!;
            const n2 = nodeMap.get(uf.find(getId(c.id, terms[1].id)))!;

            const v1 = finalPotentials.get(n1);
            const v2 = finalPotentials.get(n2);
            
            // Check if component is fully connected (both terminals mapped to a solved potential)
            if (v1 === undefined || v2 === undefined) {
                 return { ...c, properties: { ...c.properties, currentValue: 0, isGlowing: false } };
            }

            const voltageDrop = v1 - v2;
            
            let R = c.properties.resistance || 1;
            if (c.type === 'switch') R = c.properties.isOpen ? 1e9 : 0.001;
            if (c.type === 'voltmeter') R = 1e6;
            if (c.type === 'ammeter') R = 0.001;
            
            const current = voltageDrop / R;
            const absCurrent = Math.abs(current);

            const props = { ...c.properties };
            
            if (c.type === 'voltmeter') {
                props.currentValue = voltageDrop;
            } else if (c.type === 'ammeter') {
                props.currentValue = current; 
            } else if (c.type === 'bulb') {
                props.currentValue = absCurrent;
                props.isGlowing = absCurrent > 0.02; // Threshold
                props.brightness = Math.min(1.5, absCurrent / 0.3); // Rated 0.3A
            } else {
                props.currentValue = absCurrent;
            }

            return { ...c, properties: props };
        }));

        // Update Wires for Animation
        setWires(prev => prev.map(w => {
            const n1 = nodeMap.get(uf.find(getId(w.from.compId, w.from.terminalId)))!;
            const n2 = nodeMap.get(uf.find(getId(w.to.compId, w.to.terminalId)))!;
            
            const v1 = finalPotentials.get(n1);
            const v2 = finalPotentials.get(n2);

            // Animate wire if it's part of a live circuit (potential exists relative to ground)
            // Simplified check: is there potential at either end?
            // Better: Is there flow? Hard to know wire flow without mesh analysis, so we guess based on potential.
            return { ...w, current: (v1 !== undefined && v1 > 0) || (v2 !== undefined && v2 > 0) ? 0.1 : 0 }; 
        }));

    }, [components.map(c => `${c.x},${c.y},${c.properties.isOpen},${c.properties.resistance},${c.rotation}`).join('|'), wires.length]);


    // --- UI INTERACTIONS ---

    const spawnComponent = (type: ComponentType) => {
        const def = COMPONENT_DEFS[type];
        const container = scrollContainerRef.current;
        const cx = container ? (container.scrollLeft + container.clientWidth / 2) : 300;
        const cy = container ? (container.scrollTop + container.clientHeight / 2) : 300;

        const newComp: EComponent = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            name: def.label,
            x: cx + (Math.random() * 60 - 30),
            y: cy + (Math.random() * 60 - 30),
            rotation: 0,
            properties: {
                voltage: type === 'cell' ? 1.5 : 0,
                resistance: def.defaultR,
                maxResistance: type === 'rheostat' ? 20 : 0,
                isOpen: type === 'switch' ? true : undefined,
                cellCount: (type === 'cell_holder' || type === 'cell') ? 2 : undefined,
            }
        };
        setComponents([...components, newComp]);
        setSelectedId(newComp.id);
        // Automatically open sidebar on spawn if user wants, but request says hide by default
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dragRef.current = { id, startX: e.clientX, startY: e.clientY };
        setSelectedId(id);
        setSelectedWireId(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = workbenchRef.current?.getBoundingClientRect();
        if (rect) {
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }

        if (dragRef.current) {
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            
            setComponents(prev => prev.map(c => {
                if (c.id === dragRef.current?.id) {
                    return { ...c, x: c.x + dx, y: c.y + dy };
                }
                return c;
            }));
            
            dragRef.current = { id: dragRef.current.id, startX: e.clientX, startY: e.clientY };
        }
    };

    const handleMouseUp = () => {
        dragRef.current = null;
    };

    const handleTerminalClick = (e: React.MouseEvent, compId: string, terminalId: string) => {
        e.stopPropagation();
        
        // Remove existingWireIndex check to allow parallel connections (junctions)
        
        if (drawingStart) {
            if (drawingStart.compId !== compId || drawingStart.termId !== terminalId) {
                const comp = components.find(c => c.id === compId);
                const termDef = COMPONENT_DEFS[comp!.type].terminals.find(t => t.id === terminalId);
                
                let wireColor = '#1f2937'; 
                if (termDef?.polarity === 'positive' || drawingStart.termId === 'pos') wireColor = '#ef4444'; 
                if (termDef?.polarity === 'negative' || drawingStart.termId === 'neg') wireColor = '#000000'; 

                setWires([...wires, {
                    id: Math.random().toString(36),
                    from: { compId: drawingStart.compId, terminalId: drawingStart.termId },
                    to: { compId, terminalId },
                    color: wireColor,
                    current: 0
                }]);
            }
            setDrawingStart(null);
            return;
        }

        const comp = components.find(c => c.id === compId);
        if (!comp) return;
        const termDef = COMPONENT_DEFS[comp.type].terminals.find(t => t.id === terminalId);
        if (!termDef) return;

        const rad = comp.rotation * (Math.PI / 180);
        const tx = termDef.x * Math.cos(rad) - termDef.y * Math.sin(rad) + comp.x;
        const ty = termDef.x * Math.sin(rad) + termDef.y * Math.cos(rad) + comp.y;

        setDrawingStart({ compId, termId: terminalId, x: tx, y: ty });
    };

    const deleteWire = (id: string) => {
        setWires(prev => prev.filter(w => w.id !== id));
        setSelectedWireId(null);
    };

    const toggleSwitch = (id: string) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, properties: { ...c.properties, isOpen: !c.properties.isOpen } } : c));
    };

    const updateRheostat = (id: string, newVal: number) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, properties: { ...c.properties, resistance: newVal } } : c));
    };
    
    const updateCellCount = (id: string, increment: boolean) => {
        setComponents(prev => prev.map(c => {
            if (c.id === id) {
                const current = c.properties.cellCount || 2;
                const next = increment ? Math.min(6, current + 1) : Math.max(1, current - 1);
                return { ...c, properties: { ...c.properties, cellCount: next } };
            }
            return c;
        }));
    };
    
    const rotateComponent = (id: string) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, rotation: (c.rotation + 45) % 360 } : c));
    };

    const deleteSelected = () => {
        if (selectedId) {
            setComponents(prev => prev.filter(c => c.id !== selectedId));
            setWires(prev => prev.filter(w => w.from.compId !== selectedId && w.to.compId !== selectedId));
            setSelectedId(null);
        }
        if (selectedWireId) {
            deleteWire(selectedWireId);
        }
    };

    const getAbsTermPos = (compId: string, termId: string) => {
        const comp = components.find(c => c.id === compId);
        if (!comp) return { x: 0, y: 0 };
        const def = COMPONENT_DEFS[comp.type].terminals.find(t => t.id === termId);
        if (!def) return { x: 0, y: 0 };
        
        const rad = comp.rotation * (Math.PI / 180);
        return {
            x: def.x * Math.cos(rad) - def.y * Math.sin(rad) + comp.x,
            y: def.x * Math.sin(rad) + def.y * Math.cos(rad) + comp.y
        };
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#0f172a] select-none relative" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onClick={() => { setSelectedId(null); setSelectedWireId(null); setSidebarOpen(false); }}>
            
            {/* Floating Menu Toggle */}
            <button 
                onClick={(e) => { e.stopPropagation(); setSidebarOpen(!isSidebarOpen); }} 
                className="absolute top-4 left-4 z-50 p-3 bg-slate-800 rounded-full text-white shadow-lg border border-slate-600 hover:bg-slate-700 transition-colors"
                title="Toggle Components"
            >
                {isSidebarOpen ? '✖️' : '🛠️'}
            </button>

            {/* Sidebar Toolbox - Hidden by default */}
            <div 
                className={`absolute top-0 left-0 h-full w-64 bg-[#1e293b] border-r border-slate-700 z-40 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside sidebar
            >
                <div className="p-4 pt-16 flex flex-col gap-4 h-full overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Components</h3>
                    {(Object.keys(COMPONENT_DEFS) as ComponentType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => spawnComponent(type)}
                            className="w-full h-16 bg-slate-800 rounded-xl border border-slate-600 hover:border-blue-500 hover:bg-slate-700 flex items-center px-4 gap-4 transition-all shadow-md active:scale-95 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">{COMPONENT_DEFS[type].icon}</span>
                            <span className="text-xs text-slate-300 font-bold">{COMPONENT_DEFS[type].label}</span>
                        </button>
                    ))}
                    <div className="flex-grow"></div>
                    <button onClick={() => { setComponents([]); setWires([]); }} className="w-full py-3 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center gap-2 transition-colors border border-red-500/30">
                        <span>🗑️</span> Clear Workbench
                    </button>
                </div>
            </div>

            {/* Workbench Container (Scrollable) */}
            <div ref={scrollContainerRef} className="flex-grow bg-[#0f172a] overflow-auto relative cursor-crosshair">
                 <div ref={workbenchRef} className="relative w-[2500px] h-[1500px]">
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(30,41,59,0.4)_1px,transparent_1px)] bg-[size:20px_20px] opacity-50 pointer-events-none"></div>

                    {/* Simulation HUD */}
                    <div className="absolute top-4 left-20 z-30 pointer-events-none">
                        <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-2 px-4 rounded-xl shadow-2xl">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">Physics Engine Active</span>
                        </div>
                    </div>

                    {/* Wires Layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-auto z-10 overflow-visible">
                        <defs>
                            <filter id="glowWire">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        {wires.map(wire => {
                            const start = getAbsTermPos(wire.from.compId, wire.from.terminalId);
                            const end = getAbsTermPos(wire.to.compId, wire.to.terminalId);
                            const isSelected = selectedWireId === wire.id;
                            
                            const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                            const droop = Math.min(100, dist * 0.2); 
                            const midX = (start.x + end.x) / 2;
                            const midY = (start.y + end.y) / 2 + droop; 
                            
                            const isLive = (wire.current || 0) > 0.01;
                            
                            const pathD = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
                            
                            return (
                                <g key={wire.id} onClick={(e) => { e.stopPropagation(); setSelectedWireId(wire.id); setSelectedId(null); }} className="cursor-pointer group">
                                    <path 
                                        d={pathD}
                                        fill="none" 
                                        stroke="transparent" 
                                        strokeWidth="20" 
                                        strokeLinecap="round"
                                    />
                                    <path 
                                        d={pathD}
                                        fill="none" 
                                        stroke={wire.color} 
                                        strokeWidth="6" 
                                        strokeLinecap="round"
                                        className={`filter transition-all ${isSelected ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] stroke-white' : 'drop-shadow-md'}`}
                                    />
                                    <circle cx={start.x} cy={start.y} r="4" fill={wire.color} />
                                    <circle cx={end.x} cy={end.y} r="4" fill={wire.color} />
                                    {isLive && (
                                        <path 
                                            d={pathD}
                                            fill="none" 
                                            stroke="#fbbf24" // Electricity color
                                            strokeWidth="2" 
                                            strokeDasharray="4 12"
                                            strokeLinecap="round"
                                            className="animate-flow opacity-80"
                                            style={{ animationDuration: '0.5s' }}
                                            filter="url(#glowWire)"
                                        />
                                    )}
                                    {isSelected && (
                                        <foreignObject x={midX - 12} y={midY - 12} width="24" height="24" className="overflow-visible">
                                            <div 
                                                className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs shadow-lg cursor-pointer transform hover:scale-110 transition-transform"
                                                title="Cut Wire"
                                                onClick={(e) => { e.stopPropagation(); deleteWire(wire.id); }}
                                            >
                                                ✂️
                                            </div>
                                        </foreignObject>
                                    )}
                                </g>
                            );
                        })}
                        
                        {drawingStart && (
                            <path 
                                d={`M ${drawingStart.x} ${drawingStart.y} L ${mousePos.x} ${mousePos.y}`} 
                                fill="none" 
                                stroke="#ffffff" 
                                strokeWidth="3" 
                                strokeDasharray="5,5" 
                                opacity="0.8"
                                className="animate-pulse"
                            />
                        )}
                    </svg>

                    {/* Components Layer */}
                    {components.map(comp => (
                        <div
                            key={comp.id}
                            className={`absolute group cursor-grab active:cursor-grabbing transition-transform duration-75 ease-out
                            ${selectedId === comp.id 
                                ? 'z-50' 
                                : 'z-20'}`}
                            style={{ 
                                left: comp.x, top: comp.y, 
                                transform: `translate(-50%, -50%) rotate(${comp.rotation}deg)`,
                                width: COMPONENT_DEFS[comp.type].width,
                                height: COMPONENT_DEFS[comp.type].height
                            }}
                            onMouseDown={(e) => handleMouseDown(e, comp.id)}
                        >
                            {selectedId === comp.id && (
                                <div className="absolute inset-[-10px] border-2 border-cyan-400 rounded-lg opacity-60 pointer-events-none animate-pulse"></div>
                            )}

                            {selectedId === comp.id && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded-xl flex gap-2 shadow-2xl border border-slate-600 animate-fade-in-up z-[60]" onMouseDown={(e)=>e.stopPropagation()}>
                                    <button onClick={() => rotateComponent(comp.id)} className="p-2 hover:bg-slate-700 rounded text-slate-300" title="Rotate">↻</button>
                                    <button onClick={deleteSelected} className="p-2 hover:bg-red-900/50 text-red-400 rounded" title="Delete">🗑️</button>
                                    {(comp.type === 'cell_holder' || comp.type === 'cell') && (
                                        <div className="flex items-center gap-2 border-l border-slate-600 pl-2 ml-2">
                                            <button onClick={() => updateCellCount(comp.id, false)} className="p-2 hover:bg-slate-700 rounded text-white font-bold" title="Remove Cell">-</button>
                                            <span className="text-xs text-white font-mono">{comp.properties.cellCount || 2}</span>
                                            <button onClick={() => updateCellCount(comp.id, true)} className="p-2 hover:bg-slate-700 rounded text-white font-bold" title="Add Cell">+</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div onClick={(e) => {
                                if(comp.type === 'switch') {
                                    e.stopPropagation();
                                    toggleSwitch(comp.id);
                                }
                            }} className="w-full h-full relative">
                                <div className="w-full h-full flex items-center justify-center">
                                    <svg width="100%" height="100%" viewBox={`-${COMPONENT_DEFS[comp.type].width/2} -${COMPONENT_DEFS[comp.type].height/2} ${COMPONENT_DEFS[comp.type].width} ${COMPONENT_DEFS[comp.type].height}`} style={{overflow: 'visible'}}>
                                        {comp.type === 'cell' && <CellHolderSVG count={comp.properties.cellCount || 2} mode="series" />}
                                        {comp.type === 'cell_holder' && <CellHolderSVG count={comp.properties.cellCount || 2} mode="parallel" />}
                                        {comp.type === 'bulb' && <BulbSVG isGlowing={comp.properties.isGlowing} brightness={comp.properties.brightness} />}
                                        {comp.type === 'switch' && <SwitchSVG isOpen={comp.properties.isOpen} />}
                                        {comp.type === 'resistor' && <ResistorSVG value={comp.properties.resistance || 0} />}
                                        {comp.type === 'rheostat' && <RheostatSVG value={comp.properties.resistance || 0} max={comp.properties.maxResistance || 20} />}
                                        {(comp.type === 'voltmeter' || comp.type === 'ammeter') && <MeterSVG type={comp.type} value={comp.properties.currentValue || 0} />}
                                    </svg>
                                </div>
                            </div>

                            {comp.type === 'rheostat' && (
                                <input 
                                    type="range" 
                                    min="0" max={comp.properties.maxResistance} 
                                    value={comp.properties.resistance} 
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateRheostat(comp.id, Number(e.target.value))}
                                    onMouseDown={(e) => e.stopPropagation()} 
                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 z-50"
                                />
                            )}

                            {COMPONENT_DEFS[comp.type].terminals.map(term => (
                                <div
                                    key={term.id}
                                    className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full z-50 cursor-crosshair group/term"
                                    style={{ 
                                        left: '50%', top: '50%', 
                                        transform: `translate(${term.x}px, ${term.y}px)` 
                                    }}
                                    onClick={(e) => handleTerminalClick(e, comp.id, term.id)}
                                >
                                    <div className={`w-3 h-3 mx-auto my-auto mt-1.5 rounded-full border-2 border-white shadow-sm transition-transform group-hover/term:scale-150 ${term.color === '#ef4444' ? 'bg-red-500' : 'bg-black'}`}></div>
                                </div>
                            ))}
                        </div>
                    ))}
                 </div>
            </div>

            {/* CSS Animation for Flow */}
            <style>{`
                @keyframes flow {
                    from { stroke-dashoffset: 20; }
                    to { stroke-dashoffset: 0; }
                }
                .animate-flow {
                    animation: flow 0.5s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Electricity;
