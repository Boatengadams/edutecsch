import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  technicalNote?: string;
}

const ALL_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: "Digital Democracy Protocol",
    description: "Welcome to the Edutec Electoral Portal. This is a high-integrity, end-to-end system designed to manage school elections with 100% transparency and security.",
    icon: "🗳️",
    technicalNote: "System utilizes Firestore snapshots for real-time ballot tracking."
  },
  {
    id: 'hub',
    title: "Command Hub & Metrics",
    description: "This is your operational center. Check your 'Nomination Status' and monitor your academic KPIs. Only students meeting specific thresholds can apply.",
    icon: "🏠",
    technicalNote: "XP, Attendance, and Completion rates are strictly enforced via security rules."
  },
  {
    id: 'lifecycle',
    title: "Automated Lifecycle",
    description: "The election follows a 9-phase sequence. Monitor the 'Phase Bar' at the top to track transitions from Nominations to the Final Declaration.",
    icon: "⚙️",
    technicalNote: "Phase transitions are managed by an autonomous time-check engine."
  },
  {
    id: 'campaign_wall',
    title: "Digital Billboard",
    description: "Browse candidate profiles and manifestos. Every poster here is a live vision statement from your peers aiming to lead the student body.",
    icon: "🖼️",
    technicalNote: "Media assets are served via high-bandwidth Cloud Storage."
  },
  {
    id: 'designer',
    title: "AI Neural Design Studio",
    description: "Approved candidates can access our AI-powered studio to generate professional-grade campaign posters and slogans.",
    icon: "🎨",
    technicalNote: "Powered by Gemini-2.5-Flash-Image for high-fidelity rendering."
  },
  {
    id: 'voting',
    title: "Encrypted Voting Vault",
    description: "When polls open, your digital signature is committed to an encrypted vault. Each student has exactly one cryptographically unique vote.",
    icon: "🔒",
    technicalNote: "Submissions are write-once to ensure zero-tampering audit trails."
  },
  {
    id: 'results',
    title: "Declaration Room",
    description: "Witness the public broadcast of polls. Once the EC completes the audit, real-time results are certified and displayed here.",
    icon: "📢",
    technicalNote: "Results are only accessible after the 'results' status flag is enabled."
  },
  {
    id: 'management',
    title: "Executive Control",
    description: "As an Administrator, you can configure roles, adjust vetting criteria, and handle manual phase overrides during the election cycle.",
    icon: "🛠️",
    technicalNote: "Restricted to users with 'admin' or 'co-admin' RBAC privileges."
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

  // Filter and prioritize steps based on the user's current view
  const filteredSteps = useMemo(() => {
    if (!context || context === 'hub') return ALL_STEPS;
    
    const contextIndex = ALL_STEPS.findIndex(s => s.id === context);
    if (contextIndex === -1) return ALL_STEPS;

    // Move current context to first position, followed by welcome, then the rest
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <Card className="w-full max-w-xl !p-0 overflow-hidden bg-slate-900 border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative">
        {/* Animated Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(59,130,246,0.6)]"
            style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
          />
        </div>

        <div className="p-10 sm:p-14 text-center">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-600/10 rounded-[3rem] flex items-center justify-center text-5xl sm:text-7xl mx-auto mb-10 border border-blue-500/20 shadow-inner group relative">
             <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-ping"></div>
             <span className="group-hover:scale-110 transition-transform duration-500 relative z-10">{step.icon}</span>
          </div>

          <div className="space-y-4 mb-12">
            <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-tight">
                {step.title}
            </h3>
            <p className="text-slate-400 text-sm sm:text-lg leading-relaxed font-medium">
                {step.description}
            </p>
            {step.technicalNote && (
                <div className="pt-2">
                    <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.2em] bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10">
                        System Logic: {step.technicalNote}
                    </span>
                </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex gap-2 w-full sm:w-auto flex-grow">
              {currentStep > 0 && (
                <button 
                  onClick={handlePrev}
                  className="flex-1 px-8 py-4 rounded-2xl bg-slate-800 text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all border border-white/5"
                >
                  Back
                </button>
              )}
              <Button 
                onClick={handleNext} 
                className="flex-[2] py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-900/50 group"
              >
                {currentStep === filteredSteps.length - 1 ? "Initialize Portal 🚀" : (
                    <span className="flex items-center justify-center gap-2">
                        Next Protocol <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                )}
              </Button>
            </div>
            
            <button 
              onClick={handleFinish}
              className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-red-400 transition-colors py-2 px-6"
            >
              Skip Introduction
            </button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="p-5 bg-slate-950/50 border-t border-white/5 flex justify-center gap-2">
          {filteredSteps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-10 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 bg-slate-800'}`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ElectoralGuide;