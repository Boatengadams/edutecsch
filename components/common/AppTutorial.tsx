import React, { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import Button from './Button';

interface TutorialStep {
    id: string;
    title: string;
    description: string;
    icon: string;
    protocol?: string;
    color: string;
}

const ROLE_TUTORIALS: Record<string, TutorialStep[]> = {
    admin: [
        { id: 'admin_1', title: 'Command Center', description: 'Your strategic overview. Monitor school-wide KPIs, student enrollment, and system health at a glance.', icon: '🚀', protocol: 'Real-time Analytics Feed', color: 'from-indigo-600 via-blue-600 to-cyan-500' },
        { id: 'admin_2', title: 'Activity Monitor', description: 'Track live presence and system interactions across all user tiers. Ensure platform security and engagement.', icon: '📡', protocol: 'Presence Sync Kernel', color: 'from-blue-600 via-purple-600 to-pink-500' },
        { id: 'admin_3', title: 'Approvals & Users', description: 'Manage the user lifecycle. Review pending applications and precisely configure roles and class access.', icon: '👥', protocol: 'RBAC Enforcement', color: 'from-purple-600 via-pink-600 to-rose-500' },
        { id: 'admin_4', title: 'Elections & Governance', description: 'Deploy autonomous election cycles. Define roles, judicial vetting, and oversee the digital ballot vault.', icon: '🗳️', protocol: 'Democracy Protocol', color: 'from-pink-600 via-rose-600 to-orange-500' },
        { id: 'admin_5', title: 'Academics & Reports', description: 'Configure class timetables and oversee the terminal report generation process for all departments.', icon: '📊', protocol: 'Academic Ledger', color: 'from-orange-600 via-amber-600 to-yellow-500' },
        { id: 'admin_6', title: 'Communication Hub', description: 'Broadcast global flyers and notices to the entire school or targeted user groups via push alerts.', icon: '📣', protocol: 'Broadcast Matrix', color: 'from-emerald-600 via-teal-600 to-cyan-500' }
    ],
    teacher: [
        { id: 'teacher_1', title: 'Executive Dashboard', description: 'Monitor your assigned students and receive instant alerts for pending submissions or classroom activity.', icon: '🚀', protocol: 'Teacher Intelligence Hub', color: 'from-emerald-600 via-blue-600 to-indigo-600' },
        { id: 'teacher_2', title: 'AI Copilot Suite', description: 'Access lesson planners, quiz generators, and automated report card remark assistants powered by Gemini.', icon: '🤖', protocol: 'Neural Content Engine', color: 'from-blue-600 via-indigo-600 to-purple-600' },
        { id: 'teacher_3', title: 'Live Classroom', description: 'Launch immersive, real-time synchronized lessons with interactive whiteboards and AI voice synthesis.', icon: '📡', protocol: 'Live Transmission Link', color: 'from-indigo-600 via-purple-600 to-pink-500' },
        { id: 'teacher_4', title: 'Resource Library', description: 'Manage your generated presentations and video content. A central vault for your teaching assets.', icon: '📚', protocol: 'Asset Management', color: 'from-purple-600 via-pink-600 to-rose-500' },
        { id: 'teacher_5', title: 'Academic Management', description: 'Track daily attendance and grade assignments with precision. Use auto-fill to sync scores with terminal reports.', icon: '📝', protocol: 'Grading Protocol', color: 'from-pink-600 via-rose-600 to-orange-500' },
        { id: 'teacher_6', title: 'Group Work', description: 'Form dynamic student groups and assign collaborative tasks. Monitor group progress in real-time.', icon: '👥', protocol: 'Collaboration Engine', color: 'from-orange-600 via-amber-600 to-yellow-500' }
    ],
    student: [
        { id: 'student_1', title: 'Learner Dashboard', description: 'Track your academic growth, earn XP, and level up. Monitor pending tasks and join live classes.', icon: '🚀', protocol: 'Growth Tracking', color: 'from-blue-600 via-cyan-600 to-teal-500' },
        { id: 'student_2', title: 'Live Classroom', description: 'Engage in synchronized lessons. Raise your hand, react in real-time, and view the interactive whiteboard.', icon: '📡', protocol: 'Real-time Engagement', color: 'from-cyan-600 via-emerald-600 to-green-500' },
        { id: 'student_3', title: 'Study Mode', description: 'Launch focus sessions with a dedicated timer and AI-generated modules tailored to your timetable.', icon: '🧠', protocol: 'Deep Work Session', color: 'from-emerald-600 via-green-600 to-lime-500' },
        { id: 'student_4', title: 'Virtual Labs', description: 'Perform experiments in high-fidelity 3D Physics, Chemistry, and Biology laboratories.', icon: '🧪', protocol: 'Simulation Engine', color: 'from-green-600 via-lime-600 to-yellow-500' },
        { id: 'student_5', title: 'Election Portal', description: 'Participate in school governance. Run for positions, design posters, and vote in the secure vault.', icon: '🗳️', protocol: 'Civic Duty Protocol', color: 'from-lime-600 via-yellow-600 to-orange-500' },
        { id: 'student_6', title: 'Payments & Reports', description: 'Access your official report cards and manage school fee payments through the secure gateway.', icon: '💳', protocol: 'Financial Gateway', color: 'from-yellow-600 via-orange-600 to-red-500' }
    ],
    parent: [
        { id: 'parent_1', title: 'Parent Command', description: 'Toggle between your children to view specific academic snapshots, attendance rates, and averages.', icon: '🏠', protocol: 'Family Insight Hub', color: 'from-blue-600 via-purple-600 to-indigo-500' },
        { id: 'parent_2', title: 'Academic Progress', description: 'View detailed performance charts, grade histories, and portfolio items for your children.', icon: '📈', protocol: 'Transparency Matrix', color: 'from-purple-600 via-pink-600 to-rose-500' },
        { id: 'parent_3', title: 'Report Cards', description: 'Download and print official terminal report cards once they are certified and published by the school.', icon: '📊', protocol: 'Official Certification', color: 'from-pink-600 via-rose-600 to-orange-500' },
        { id: 'parent_4', title: 'Attendance Map', description: 'Monitor child presence via the Heatmap. Identify trends and ensure consistent school participation.', icon: '📅', protocol: 'Intensity Analysis', color: 'from-orange-600 via-amber-600 to-yellow-500' },
        { id: 'parent_5', title: 'Financial Portal', description: 'Securely pay school fees and PTA levies through the integrated Paystack gateway.', icon: '💳', protocol: 'Secure Transaction', color: 'from-amber-600 via-orange-600 to-red-500' },
        { id: 'parent_6', title: 'Communications', description: 'Receive official school broadcasts and message teachers directly regarding your child\'s growth.', icon: '💬', protocol: 'Bridge Protocol', color: 'from-yellow-600 via-emerald-600 to-teal-500' }
    ]
};

interface AppTutorialProps {
    role: string;
    onClose: () => void;
    isTriggeredManually?: boolean;
}

const AppTutorial: React.FC<AppTutorialProps> = ({ role, onClose, isTriggeredManually = false }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    
    const steps = useMemo(() => ROLE_TUTORIALS[role] || ROLE_TUTORIALS.student, [role]);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
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
                localStorage.setItem(`edutec_onboarding_${role}`, 'true');
            }
            onClose();
        }, 300);
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-slate-950/95 backdrop-blur-3xl animate-fade-in">
            {/* Background Decorative Element */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br ${step.color} rounded-full blur-[160px] opacity-10 pointer-events-none transition-all duration-1000`}></div>

            <Card className="w-full max-w-3xl !p-0 overflow-hidden bg-slate-900/40 border-2 border-white/10 shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] relative rounded-[4rem]">
                
                {/* Global Progress Track */}
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-950/50">
                    <div 
                        className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_30px_rgba(59,130,246,0.8)]`}
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-10 md:p-24 text-center flex flex-col items-center relative overflow-hidden">
                    {/* Background Text Label */}
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-[15rem] font-black pointer-events-none select-none uppercase tracking-tighter transform translate-x-20 -translate-y-20">
                        {step.icon}
                    </div>

                    {/* Immersive Animated Icon */}
                    <div className={`w-32 h-32 md:w-44 md:h-44 rounded-[3.5rem] bg-gradient-to-br ${step.color} flex items-center justify-center text-6xl md:text-8xl mb-12 md:mb-16 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-white/20 group relative transition-transform duration-700 hover:rotate-6 active:scale-95`}>
                         <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-30 pointer-events-none"></div>
                         <span className="relative z-10 drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]">{step.icon}</span>
                    </div>

                    <div className="space-y-6 mb-16 md:mb-20 relative z-10">
                        <h3 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none text-shadow-xl">
                            {step.title}
                        </h3>
                        <p className="text-slate-400 text-base md:text-2xl leading-relaxed font-medium max-w-xl mx-auto opacity-90">
                            {step.description}
                        </p>
                        {step.protocol && (
                            <div className="pt-6">
                                <span className="text-[10px] md:text-[12px] font-black text-blue-400 uppercase tracking-[0.4em] bg-blue-500/10 px-6 py-2.5 rounded-full border-2 border-blue-500/20 shadow-2xl backdrop-blur-md">
                                    Protocol: {step.protocol}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Navigation Control */}
                    <div className="w-full space-y-8 relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-5 w-full">
                            {currentStep > 0 && (
                                <button 
                                    onClick={handlePrev}
                                    className="w-full md:w-auto px-12 py-5 rounded-[2rem] bg-slate-800/80 backdrop-blur-md text-slate-300 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-700 hover:text-white transition-all border border-white/10 active:scale-95 shadow-xl"
                                >
                                    Previous
                                </button>
                            )}
                            <button 
                                onClick={handleNext} 
                                className={`flex-grow w-full py-6 md:py-8 rounded-[2.5rem] font-black uppercase text-xs md:text-xl tracking-[0.4em] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.6)] group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 text-white bg-gradient-to-r ${step.color}`}
                            >
                                <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s]"></div>
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    {currentStep === steps.length - 1 ? "Initialize Portal 🚀" : "Next Protocol →"}
                                </span>
                            </button>
                        </div>
                        
                        <button 
                            onClick={handleFinish}
                            className="text-[10px] md:text-[12px] font-black text-slate-600 uppercase tracking-[0.6em] hover:text-red-500 transition-all py-4 px-10 group"
                        >
                            Terminate Introduction <span className="group-hover:translate-x-2 inline-block transition-transform">»</span>
                        </button>
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="p-8 bg-slate-950/80 border-t border-white/5 flex justify-center gap-3">
                    {steps.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-2 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${i === currentStep ? 'w-20 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : 'w-4 bg-slate-800'}`}
                        />
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default AppTutorial;