import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  technicalNote?: string;
  color: string;
}

const ALL_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: "Sovereignty Protocol",
    description: "Welcome to the Edutec Electoral Portal. A high-integrity, precision-engineered system designed to manage school leadership with absolute transparency.",
    icon: "📜",
    technicalNote: "Real-time state synchronization via Firestore Snaps.",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: 'hub',
    title: "Command Interface",
    description: "Monitor your nomination metrics and academic status. Only candidates exceeding 100% eligibility thresholds can initiate a leadership packet.",
    icon: "🛡️",
    technicalNote: "Thresholds validated at the database security kernel.",
    color: "from-indigo-600 to-purple-600"
  },
  {
    id: 'lifecycle',
    title: "Lifecycle Chronos",
    description: "The cycle follows a strict 9-phase sequence. Tracking transitions from Nominations to the Final Declaration of Polls in real-time.",
    icon: "⌛",
    technicalNote: "Managed by an autonomous cloud-time engine.",
    color: "from-purple-600 to-pink-600"
  },
  {
    id: 'campaign_wall',
    title: "Live Billboard",
    description: "Experience the vision of your peers. The billboard serves high-fidelity campaign manifestos directly to your terminal.",
    icon: "📽️",
    technicalNote: "Content delivery optimized via CDN-edged storage.",
    color: "from-pink-600 to-red-600"
  },
  {
    id: 'designer',
    title: "Neural Studio",
    description: "Synthesize world-class campaign visuals using our built-in AI Design Studio. Elevate your presence with professional-grade branding.",
    icon: "✨",
    technicalNote: "Powered by Gemini Vision Neural Engine.",
    color: "from-red-600 to-orange-600"
  },
  {
    id: 'voting',
    title: "The Secure Vault",
    description: "When polls open, your digital signature is locked into an encrypted vault. A one-way transaction protocol ensuring total ballot secrecy.",
    icon: "🔒",
    technicalNote: "Submissions utilize write-once-read-never security logic.",
    color: "from-orange-600 to-yellow-600"
  },
  {
    id: 'results',
    title: "The Declaration",
    description: "Witness the certified tabulation. Final results are broadcast with complete statistical breakdowns once the EC audit is finalized.",
    icon: "🏆",
    technicalNote: "Public declaration key enabled post-audit phase.",
    color: "from-emerald-600 to-blue-600"
  }
];

interface ElectoralGuideProps {
  onClose: () => void;
  context?: string;
  isTriggeredManually?: boolean;
}

const ElectoralGuide: React.FC<ElectoralGuideProps> = ({ onClose, context, isTriggeredManually = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const filteredSteps = useMemo(() => {
    if (!context || context === 'hub') return ALL_STEPS;
    const contextIndex = ALL_STEPS.findIndex(s => s.id === context);
    if (contextIndex === -1) return ALL_STEPS;
    const contextStep = ALL_STEPS[contextIndex];
    const welcomeStep = ALL_STEPS[0];
    const otherSteps = ALL_STEPS.filter((_, i) => i !== contextIndex && i !== 0);
    return context === 'welcome' ? ALL_STEPS : [contextStep, welcomeStep, ...otherSteps];
  }, [context]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleFinish(); };
    window.addEventListener('keydown', handleEsc);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleNext = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (!isTriggeredManually) {
        localStorage.setItem('edutec_election_guide_seen', 'true');
      }
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const step = filteredSteps[currentStep];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-10 bg-slate-950/95 backdrop-blur-3xl animate-fade-in">
      <Card className="w-full max-w-2xl !p-0 overflow-hidden bg-slate-900/40 border-2 border-white/10 shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] relative rounded-[3rem] sm:rounded-[5rem]">
        
        {/* Futuristic Global Progress Meter */}
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-950/50">
          <div 
            className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_30px_rgba(59,130,246,0.6)]`}
            style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
          />
        </div>

        <div className="p-12 sm:p-24 text-center flex flex-col items-center">
          
          {/* Immersive Icon Container */}
          <div className={`w-32 h-32 sm:w-44 sm:h-44 rounded-[2.5rem] sm:rounded-[4rem] bg-gradient-to-br ${step.color} flex items-center justify-center text-6xl sm:text-8xl mb-12 sm:mb-16 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.5)] border-4 border-white/20 group relative transition-transform duration-700 hover:rotate-6`}>
             <div className="absolute inset-0 bg-white/10 rounded-full animate-ping opacity-20"></div>
             <span className="relative z-10 drop-shadow-2xl">{step.icon}</span>
          </div>

          <div className="space-y-6 mb-16 sm:mb-20">
            <h3 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                {step.title}
            </h3>
            <p className="text-slate-400 text-sm sm:text-xl leading-relaxed font-medium max-w-lg mx-auto">
                {step.description}
            </p>
            {step.technicalNote && (
                <div className="pt-4">
                    <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.3em] bg-blue-500/10 px-6 py-2 rounded-full border border-blue-500/20 shadow-xl">
                        Protocol: {step.technicalNote}
                    </span>
                </div>
            )}
          </div>

          {/* Action Dock */}
          <div className="w-full space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                {currentStep > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="w-full sm:w-auto px-12 py-5 rounded-full bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all border border-white/5 active:scale-95"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={handleNext} 
                    className={`flex-grow w-full py-6 sm:py-8 rounded-[2rem] sm:rounded-[3rem] font-black uppercase text-xs sm:text-lg tracking-[0.3em] sm:tracking-[0.4em] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.5)] group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 text-white bg-gradient-to-r ${step.color}`}
                >
                    <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s]"></div>
                    <span className="relative z-10 flex items-center justify-center gap-4">
                        {currentStep === filteredSteps.length - 1 ? "Initialize Portal 🚀" : "Next Protocol →"}
                    </span>
                </button>
            </div>
            
            <button 
              onClick={handleFinish}
              className="text-[10px] sm:text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] hover:text-red-500 transition-colors py-4 px-10 group"
            >
              Terminate Introduction <span className="group-hover:translate-x-2 inline-block transition-transform">»</span>
            </button>
          </div>
        </div>

        {/* Phase Indicators */}
        <div className="p-8 bg-slate-950/80 border-t border-white/5 flex justify-center gap-3">
          {filteredSteps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-700 ${i === currentStep ? 'w-16 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'w-3 bg-slate-800'}`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ElectoralGuide;