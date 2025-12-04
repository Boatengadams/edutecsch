
import React, { useState } from 'react';
import { UserProfile, LabType } from '../../types';
import PhysicsLab from './PhysicsLab';
import ChemistryLab from './ChemistryLab';
import BiologyLab from './BiologyLab';
import LabAssistant from './LabAssistant';

interface ScienceLabProps {
    userProfile: UserProfile;
}

const ScienceLab: React.FC<ScienceLabProps> = ({ userProfile }) => {
    const [activeLab, setActiveLab] = useState<LabType>('Physics');
    const [showAssistant, setShowAssistant] = useState(false);

    const renderLab = () => {
        switch (activeLab) {
            case 'Physics': return <PhysicsLab level="University" userProfile={userProfile} />;
            case 'Chemistry': return <ChemistryLab level="University" userProfile={userProfile} />;
            case 'Biology': return <BiologyLab level="University" userProfile={userProfile} />;
            default: return <div>Select a Lab</div>;
        }
    };

    return (
        <div className="h-full flex flex-col bg-black text-slate-200 overflow-hidden font-sans absolute inset-0 z-50">
            {/* Professional Lab Header */}
            <div className="flex-shrink-0 px-4 py-2 bg-[#0f172a] border-b border-slate-800 flex justify-between items-center z-30 shadow-md h-14 md:h-16 relative">
                {/* Glass effect background for header */}
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-0"></div>
                
                <div className="flex items-center gap-3 overflow-hidden relative z-10">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shadow-lg transition-colors duration-500 ${
                        activeLab === 'Physics' ? 'bg-amber-500 shadow-amber-500/20' : 
                        activeLab === 'Chemistry' ? 'bg-purple-600 shadow-purple-600/20' : 
                        'bg-emerald-600 shadow-emerald-600/20'
                    }`}>
                        <span className="text-lg md:text-xl text-white">
                            {activeLab === 'Physics' ? '⚡' : activeLab === 'Chemistry' ? '⚗️' : '🧬'}
                        </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-sm md:text-lg font-black text-white tracking-tight uppercase leading-none truncate">
                            EduTec Lab <span className="text-blue-400 text-[9px] align-top border border-blue-500/30 px-1 rounded ml-1">PRO</span>
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-[9px] text-slate-400 font-mono tracking-wider truncate">SIMULATION ACTIVE</p>
                        </div>
                    </div>
                </div>

                {/* Lab Switcher */}
                <div className="flex items-center gap-2 relative z-10">
                    <div className="hidden md:flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                        {(['Physics', 'Chemistry', 'Biology'] as LabType[]).map(lab => (
                            <button
                                key={lab}
                                onClick={() => setActiveLab(lab)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                    activeLab === lab 
                                    ? 'bg-slate-700 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                {lab}
                            </button>
                        ))}
                    </div>
                    
                    {/* Mobile Dropdown */}
                    <select 
                        value={activeLab}
                        onChange={(e) => setActiveLab(e.target.value as LabType)}
                        className="md:hidden bg-slate-800 text-xs text-white font-bold uppercase p-2 rounded border border-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                    </select>

                    <button 
                        onClick={() => setShowAssistant(!showAssistant)}
                        className={`p-2 rounded-lg transition-all border ${showAssistant ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                        <span className="text-lg">🤖</span>
                    </button>
                </div>
            </div>

            {/* Main Lab Workspace */}
            <div className="flex-grow flex overflow-hidden relative bg-[#0b0f19]">
                <div className="flex-grow relative z-10 flex flex-col w-full h-full">
                    {renderLab()}
                </div>

                {/* AI Assistant Overlay */}
                {showAssistant && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end md:static md:bg-transparent md:w-auto pointer-events-auto">
                         <div className="w-full h-full md:w-80 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-fade-in-right">
                            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Lab Assistant</h3>
                                <button onClick={() => setShowAssistant(false)} className="p-1 text-slate-400 hover:text-white">&times;</button>
                            </div>
                            <div className="flex-grow overflow-hidden">
                                <LabAssistant activeLab={activeLab} level="University" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScienceLab;
