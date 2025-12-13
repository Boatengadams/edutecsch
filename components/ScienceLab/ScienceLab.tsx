
import React, { useState } from 'react';
import { UserProfile, LabType } from '../../types';
import PhysicsLab from './PhysicsLab';
import ChemistryLab from './ChemistryLab';
import BiologyLab from './BiologyLab';
import LabAssistant from './LabAssistant';
import WeatherWidget from '../common/WeatherWidget';

interface ScienceLabProps {
    userProfile: UserProfile;
}

const ScienceLab: React.FC<ScienceLabProps> = ({ userProfile }) => {
    // State for dual slots
    const [slots, setSlots] = useState<[LabType, LabType]>(['Physics', 'Chemistry']);
    const [layout, setLayout] = useState<'split' | 'single_left' | 'single_right'>('split');
    const [showAssistant, setShowAssistant] = useState(false);

    // Helper to switch lab type in a specific slot
    const updateSlot = (index: 0 | 1, newType: LabType) => {
        const newSlots = [...slots] as [LabType, LabType];
        newSlots[index] = newType;
        setSlots(newSlots);
    };

    const renderLabInstance = (type: LabType) => {
        switch (type) {
            case 'Physics': return <PhysicsLab level="University" userProfile={userProfile} />;
            case 'Chemistry': return <ChemistryLab level="University" userProfile={userProfile} />;
            case 'Biology': return <BiologyLab level="University" userProfile={userProfile} />;
            default: return <div className="flex items-center justify-center h-full text-slate-500">Select a Lab</div>;
        }
    };

    return (
        <div className="h-full flex flex-col bg-black text-slate-200 overflow-hidden font-sans absolute inset-0 z-50">
            {/* Global Professional Header */}
            <div className="flex-shrink-0 px-4 py-2 bg-[#0f172a] border-b border-slate-800 flex justify-between items-center z-50 shadow-md h-12 relative">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white text-lg">⚗️</span>
                    </div>
                    <div>
                        <h2 className="font-black text-white tracking-wide uppercase text-xs sm:text-sm">EduTec <span className="text-blue-400">Dual-Bench</span></h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[9px] text-slate-400 font-mono tracking-wider">ACTIVE SESSION</span>
                        </div>
                    </div>
                </div>
                 
                 {/* Layout Controls */}
                 <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button 
                        onClick={() => setLayout('single_left')} 
                        className={`p-1.5 rounded transition-all ${layout === 'single_left' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                        title="Maximize Bench A"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4z" /></svg>
                    </button>
                    <button 
                        onClick={() => setLayout('split')} 
                        className={`p-1.5 rounded transition-all ${layout === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                        title="Split View"
                    >
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h9v16H2V4zm11 0h9v16h-9V4z" /></svg>
                    </button>
                    <button 
                        onClick={() => setLayout('single_right')} 
                        className={`p-1.5 rounded transition-all ${layout === 'single_right' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                        title="Maximize Bench B"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4z" /></svg>
                    </button>
                 </div>

                 <button 
                    onClick={() => setShowAssistant(!showAssistant)} 
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${showAssistant ? 'bg-blue-900/30 text-blue-400 border-blue-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                >
                    <span>🤖</span> 
                    <span className="hidden sm:inline">Assistant</span>
                 </button>
            </div>

            {/* Workspace Area */}
            <div className="flex-grow flex overflow-hidden relative bg-[#0b0f19]">
                
                {/* Bench A (Left) */}
                <div className={`flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out ${
                    layout === 'split' ? 'w-1/2' : layout === 'single_left' ? 'w-full' : 'w-0 overflow-hidden border-none'
                }`}>
                    {/* Slot A Header */}
                    <div className="h-10 bg-[#1e293b] border-b border-slate-700 flex justify-between items-center px-4 shadow-sm z-10 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Bench A</span>
                        </div>
                        <select 
                            value={slots[0]} 
                            onChange={(e) => updateSlot(0, e.target.value as LabType)}
                            className="bg-slate-800 text-xs font-medium text-white border border-slate-600 rounded px-2 py-1 outline-none hover:border-slate-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>
                    <div className="flex-grow relative overflow-y-auto custom-scrollbar">
                        {renderLabInstance(slots[0])}
                    </div>
                </div>

                {/* Bench B (Right) */}
                <div className={`flex flex-col transition-all duration-300 ease-in-out ${
                    layout === 'split' ? 'w-1/2' : layout === 'single_right' ? 'w-full' : 'w-0 overflow-hidden'
                }`}>
                     {/* Slot B Header */}
                    <div className="h-10 bg-[#1e293b] border-b border-slate-700 flex justify-between items-center px-4 shadow-sm z-10 border-l border-slate-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Bench B</span>
                        </div>
                        <select 
                            value={slots[1]} 
                            onChange={(e) => updateSlot(1, e.target.value as LabType)}
                            className="bg-slate-800 text-xs font-medium text-white border border-slate-600 rounded px-2 py-1 outline-none hover:border-slate-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                        </select>
                    </div>
                    <div className="flex-grow relative overflow-y-auto custom-scrollbar">
                        {renderLabInstance(slots[1])}
                    </div>
                </div>

                {/* AI Assistant Overlay */}
                {showAssistant && (
                    <div className="absolute top-4 right-4 bottom-4 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl z-50 flex flex-col animate-fade-in-left overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                <span className="text-lg">🤖</span> Lab Assistant
                            </h3>
                            <button onClick={() => setShowAssistant(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-full p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Weather Widget */}
                        <div className="px-4 pt-4">
                            <WeatherWidget />
                        </div>

                        <div className="flex-grow overflow-hidden flex flex-col">
                             {/* Context-aware assistant based on which bench is focused or default to Bench A */}
                             <LabAssistant 
                                activeLab={layout === 'single_right' ? slots[1] : slots[0]} 
                                level="University" 
                             />
                             <div className="p-2 text-[10px] text-center text-slate-500 bg-slate-950/30 border-t border-slate-800">
                                 Context: {layout === 'single_right' ? 'Bench B' : 'Bench A'}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScienceLab;
