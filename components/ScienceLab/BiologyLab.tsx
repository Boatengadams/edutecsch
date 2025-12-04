
import React, { useState, useRef } from 'react';
import { LabLevel, UserProfile, LabEquipment } from '../../types';

interface BiologyLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

const SLIDES: LabEquipment[] = [
    { id: 'onion', name: 'Onion Epidermis', type: 'specimen', icon: '🧅', description: 'Plant cells structure' },
    { id: 'blood', name: 'Human Blood Smear', type: 'specimen', icon: '🩸', description: 'RBCs, WBCs, Platelets' },
    { id: 'amoeba', name: 'Amoeba Proteus', type: 'specimen', icon: '🦠', description: 'Unicellular organism' },
    { id: 'cheek', name: 'Cheek Squamous', type: 'specimen', icon: '🧬', description: 'Animal epithelial cells' },
    { id: 'hydra', name: 'Hydra Budding', type: 'specimen', icon: '🌿', description: 'Reproduction study' },
];

const IMAGES: Record<string, string> = {
    'onion': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Onion_cells_2.jpg/1024px-Onion_cells_2.jpg',
    'blood': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Erythrocyte_deoxy.jpg/1024px-Erythrocyte_deoxy.jpg',
    'amoeba': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Amoeba_proteus.jpg/1024px-Amoeba_proteus.jpg',
    'cheek': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Cheek_cells_stained.jpg/1024px-Cheek_cells_stained.jpg',
    'hydra': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Hydra_oligactis.jpg'
};

const BiologyLab: React.FC<BiologyLabProps> = ({ level }) => {
    const [currentSlide, setCurrentSlide] = useState<LabEquipment | null>(null);
    const [magnification, setMagnification] = useState<40 | 100 | 400 | 1000>(40);
    const [focus, setFocus] = useState(50); // 0-100, 50 is perfect
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    
    // Viewport State
    const [position, setPosition] = useState({ x: 50, y: 50 }); // Percentage center
    const [isDragging, setIsDragging] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);

    const handleSlideSelect = (slide: LabEquipment) => {
        setCurrentSlide(slide);
        setFocus(30); // Start slightly out of focus for realism
        setMagnification(40); // Reset mag
        setPosition({ x: 50, y: 50 }); // Center
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && viewportRef.current) {
            const rect = viewportRef.current.getBoundingClientRect();
            // Inverted control for "moving the slide" feeling
            const deltaX = (e.movementX / rect.width) * 100; 
            const deltaY = (e.movementY / rect.height) * 100;
            
            setPosition(prev => ({
                x: Math.max(0, Math.min(100, prev.x - deltaX)),
                y: Math.max(0, Math.min(100, prev.y - deltaY))
            }));
        }
    };

    const blurAmount = Math.abs(50 - focus) / 5; // CSS pixel blur
    const zoomScale = magnification / 40; // Normalize scale for CSS

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-950">
            
            {/* Main Viewport (Microscope View) */}
            <div className="flex-grow relative bg-black flex flex-col items-center justify-center overflow-hidden">
                {currentSlide ? (
                    <div 
                        ref={viewportRef}
                        className="relative w-full h-full flex items-center justify-center cursor-move"
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={() => setIsDragging(false)}
                        onMouseLeave={() => setIsDragging(false)}
                        onMouseMove={handleMouseMove}
                    >
                        {/* Circular Mask Container */}
                        <div className="w-[80vmin] h-[80vmin] rounded-full overflow-hidden border-[20px] border-slate-900 shadow-2xl relative bg-white z-10 ring-1 ring-white/10">
                            {/* The Image Layer */}
                            <div 
                                className="absolute w-[200%] h-[200%] bg-cover transition-all duration-300 ease-out"
                                style={{
                                    backgroundImage: `url(${IMAGES[currentSlide.id]})`,
                                    left: `${-position.x}%`,
                                    top: `${-position.y}%`,
                                    transform: `scale(${1 + zoomScale * 0.5})`, // Subtle zoom effect based on mag
                                    filter: `blur(${blurAmount}px) brightness(${brightness}%) contrast(${contrast}%) grayscale(${magnification === 1000 ? 1 : 0})` // High mag often Electron in games (grayscale) or just blurrier
                                }}
                            ></div>
                            
                            {/* Reticle / Scale Overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-30">
                                <div className="absolute top-1/2 left-0 w-full h-px bg-black"></div>
                                <div className="absolute left-1/2 top-0 h-full w-px bg-black"></div>
                                {/* Scale markings */}
                                <div className="absolute bottom-10 right-10 border-b-2 border-black w-24 text-right text-[10px] font-bold text-black pr-1">
                                    {magnification === 40 ? '500µm' : magnification === 100 ? '200µm' : magnification === 400 ? '50µm' : '20µm'}
                                </div>
                            </div>
                        </div>

                        {/* Hint */}
                        <div className="absolute bottom-8 text-slate-500 text-xs bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                            Click & Drag to move slide stage
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-600 animate-pulse">
                        <div className="text-8xl mb-4 opacity-20">🔬</div>
                        <p className="text-xl font-light">Place a slide on the stage to begin</p>
                    </div>
                )}
            </div>

            {/* Controls Dashboard */}
            <div className="w-full md:w-80 bg-[#0f172a] border-l border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-20 overflow-y-auto">
                
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">BioScope Pro</h2>
                    <p className="text-xs text-slate-400 font-mono">MODEL X-2025 // OPTICAL SYSTEM</p>
                </div>

                {/* Slide Tray */}
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Slide Box</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {SLIDES.map(slide => (
                            <button
                                key={slide.id}
                                onClick={() => handleSlideSelect(slide)}
                                className={`p-2 rounded-lg text-left transition-all border flex items-center gap-3 ${currentSlide?.id === slide.id ? 'bg-green-600/20 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                <span className="text-xl">{slide.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{slide.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Optics Controls */}
                <div className="space-y-6">
                    {/* Objectives */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Objective Lenses</label>
                        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                            {[40, 100, 400, 1000].map((mag) => (
                                <button
                                    key={mag}
                                    onClick={() => setMagnification(mag as any)}
                                    disabled={!currentSlide}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${magnification === mag ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {mag}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Knobs */}
                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-slate-400">Coarse / Fine Focus</label>
                                <span className={`text-xs font-mono ${Math.abs(50 - focus) < 5 ? 'text-green-400' : 'text-slate-600'}`}>
                                    {Math.abs(50 - focus) < 2 ? 'LOCKED' : 'ADJUST'}
                                </span>
                            </div>
                            <input 
                                type="range" min="0" max="100" value={focus} 
                                onChange={(e) => setFocus(Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                                disabled={!currentSlide}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Illumination (Iris)</label>
                            <input 
                                type="range" min="50" max="150" value={brightness} 
                                onChange={(e) => setBrightness(Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                disabled={!currentSlide}
                            />
                        </div>
                    </div>
                </div>

                {/* Analysis Data */}
                {currentSlide && Math.abs(50 - focus) < 10 && (
                    <div className="mt-auto bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl animate-fade-in-up">
                        <h4 className="text-blue-400 text-sm font-bold mb-1 flex items-center gap-2">
                            <span>🧠</span> AI Analysis
                        </h4>
                        <p className="text-xs text-blue-200 leading-relaxed">
                            Specimen detected: <strong>{currentSlide.name}</strong>.<br/>
                            {currentSlide.description}. Structure visible clearly at {magnification}x magnification.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BiologyLab;
