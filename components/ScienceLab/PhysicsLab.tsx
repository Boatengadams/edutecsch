import React, { useState } from 'react';
import { LabLevel, UserProfile } from '../../types';
import Electricity from './Physics/Electricity';
import Mechanics from './Physics/Mechanics';
import Optics from './Physics/Optics';

interface PhysicsLabProps {
    level: LabLevel;
    userProfile: UserProfile;
}

type PhysicsMode = 'Electricity' | 'Mechanics' | 'Optics';

const PhysicsLab: React.FC<PhysicsLabProps> = ({ level }) => {
    const [mode, setMode] = useState<PhysicsMode>('Mechanics');
    
    // We keep the callback structure to avoid breaking child components, 
    // even though we aren't displaying the character anymore.
    const updateCharacter = (emotion: 'idle' | 'thinking' | 'success' | 'warning', message: string, pos?: {x: number, y: number}) => {
        // Intentionally empty - Dr. Adams is now part of the Lab Assistant panel or hidden.
        console.log(`Dr. Adams (${emotion}): ${message}`);
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] relative overflow-hidden">
            {/* Physics Sub-Navigation */}
            <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-40 w-full md:w-auto px-4 md:px-0 flex justify-center pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-2xl flex gap-1 pointer-events-auto">
                    {(['Electricity', 'Mechanics', 'Optics'] as PhysicsMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); }}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${
                                mode === m 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow relative h-full">
                {/* FIX: Removed onUpdateChar prop from Electricity as it is not defined in its props. */}
                {mode === 'Electricity' && <Electricity />}
                {/* FIX: Removed onUpdateChar prop from Mechanics as it is not defined in its props. */}
                {mode === 'Mechanics' && <Mechanics />}
                {mode === 'Optics' && <Optics onUpdateChar={updateCharacter} />}
            </div>
        </div>
    );
};

export default PhysicsLab;