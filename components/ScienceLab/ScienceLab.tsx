import React, { useState } from 'react';
import { UserProfile, LabType } from '../../types';
import PhysicsLab from './PhysicsLab';
import ChemistryLab from './ChemistryLab';
import BiologyLab from './BiologyLab';
import LabAssistant from './LabAssistant';
import { useAuthentication } from '../../hooks/useAuth';

interface ScienceLabProps {
    userProfile: UserProfile;
}

const ScienceLab: React.FC<ScienceLabProps> = ({ userProfile }) => {
    const { schoolSettings } = useAuthentication();
    const [activeLab, setActiveLab] = useState<LabType>('Physics');
    const [showAssistant, setShowAssistant] = useState(true);

    const renderLab = () => {
        switch (activeLab) {
            case 'Physics': return <PhysicsLab level="SHS" userProfile={userProfile} />;
            case 'Chemistry': return <ChemistryLab />;
            case 'Biology': return <BiologyLab />;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden font-sans absolute inset-0 z-[60] pt-safe pb-safe px-safe">
            {/* Pro-Lab Header */}
            <header className="flex-shrink-0 px-6 sm:px-10 py-4 sm:py-5 bg-slate-950 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center z-[70] shadow-2xl gap-4">
                <div className="flex items-center gap-4 sm:gap-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.2)] border border-white/10 overflow-hidden p-2">
                        {schoolSettings?.schoolLogoUrl ? (
                            <img src={schoolSettings.schoolLogoUrl} alt="School Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-blue-600 text-2xl sm:text-3xl font-black">{(schoolSettings?.schoolName || 'E').charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h2 className="font-black text-white tracking-tighter uppercase text-xl sm:text-2xl leading-none">EduTec <span className="text-blue-500">Pro-Lab</span></h2>
                        <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">{schoolSettings?.schoolName || 'Active Sim v5.2'}</p>
                        </div>
                    </div>
                </div>
                 
                 <div className="flex bg-slate-900/80 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] p-1 border border-white/5 w-full sm:w-auto">
                    {(['Physics', 'Chemistry', 'Biology'] as LabType[]).map(type => (
                        <button 
                            key={type} 
                            onClick={() => setActiveLab(type)} 
                            className={`flex-1 sm:flex-none px-4 sm:px-10 py-2 sm:py-3 rounded-[1rem] sm:rounded-[1.5rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-500 ${activeLab === type ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 scale-105' : 'text-slate-500 hover:text-white'}`}
                        >
                            {type}
                        </button>
                    ))}
                 </div>

                 <button 
                    onClick={() => setShowAssistant(!showAssistant)} 
                    className={`hidden sm:flex px-6 py-3 rounded-2xl border transition-all font-black uppercase tracking-widest text-[10px] items-center gap-3 ${showAssistant ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-500 border-white/5'}`}
                 >
                    <span>👨‍🔬</span> Lab Intel
                 </button>
            </header>

            <div className="flex-grow flex overflow-hidden relative">
                {/* Simulation Stage */}
                <main className="flex-grow relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/60 pointer-events-none"></div>
                    {renderLab()}
                </main>

                {/* Gemini Assistant Panel */}
                {showAssistant && (
                    <aside className="fixed sm:static bottom-0 inset-x-0 sm:inset-auto h-[40vh] sm:h-full sm:w-[400px] border-t sm:border-t-0 sm:border-l border-white/5 flex flex-col animate-fade-in-right z-[80] shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
                        <LabAssistant activeLab={activeLab} level="University" />
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ScienceLab;