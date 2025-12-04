
import React, { useState } from 'react';
import { LabLevel, UserProfile } from '../../types';
import Electricity from './Physics/Electricity';
import Mechanics from './Physics/Mechanics';
import Optics from './Physics/Optics';
import LabCharacter from './LabCharacter';

interface PhysicsLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

type PhysicsMode = 'Electricity' | 'Mechanics' | 'Optics';

const PhysicsLab: React.FC<PhysicsLabProps> = ({ level }) => {
    const [mode, setMode] = useState<PhysicsMode>('Mechanics');
    const [labState, setLabState] = useState({
        emotion: 'idle' as 'idle' | 'thinking' | 'success' | 'warning',
        message: "Welcome to the Physics Lab! I am Dr. Stone. Select an experiment to begin.",
        characterPos: null as {x: number, y: number} | null
    });

    // Callback for child components to update the character
    const updateCharacter = (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => {
        setLabState({ emotion, message, characterPos: pos || null });
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] relative overflow-hidden">
            {/* Physics Sub-Navigation */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl flex gap-1">
                {(['Electricity', 'Mechanics', 'Optics'] as PhysicsMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => { setMode(m); updateCharacter('idle', `Switching to ${m} bench.`); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            mode === m 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <div className="flex-grow relative">
                {mode === 'Electricity' && <Electricity onUpdateChar={updateCharacter} />}
                {mode === 'Mechanics' && <Mechanics onUpdateChar={updateCharacter} />}
                {mode === 'Optics' && <Optics onUpdateChar={updateCharacter} />}
            </div>
            
            {/* Dr. Stone Character Overlay */}
            <LabCharacter 
                emotion={labState.emotion}
                message={labState.message}
                position={labState.characterPos}
            />
        </div>
    );
};

export default PhysicsLab;
