import React, { useState, useEffect, useMemo } from 'react';
import { db, firebase } from '../../services/firebase';
import { ElectionConfig, ElectionPosition, ElectionApplication, UserProfile, ElectionStatus } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { useToast } from '../common/Toast';
import VotingFlow from './VotingFlow';
import CampaignDesigner from './CampaignDesigner';
import CampaignWall from './CampaignWall';
import ElectionResults from './ElectionResults';
import ElectoralGuide from './ElectoralGuide';

const StudentElectionPortal: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const { showToast } = useToast();
    const [config, setConfig] = useState<ElectionConfig | null>(null);
    const [positions, setPositions] = useState<ElectionPosition[]>([]);
    const [myApp, setMyApp] = useState<ElectionApplication | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'hub' | 'campaign_wall' | 'results' | 'designer'>('hub');
    const [showGuide, setShowGuide] = useState(false);

    const role = userProfile.role;
    const isStudent = role === 'student';
    const isTeacher = role === 'teacher';
    
    const isEligibleVoter = useMemo(() => {
        if (!config) return false;
        if (isStudent && userProfile.class) {
            return config.eligibleClasses?.includes(userProfile.class);
        }
        if (isTeacher) {
            const teacherClasses = [
                ...(userProfile.classesTaught || []),
                ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : [])
            ];
            return teacherClasses.some(c => config.eligibleClasses?.includes(c));
        }
        if (role === 'admin') return true;
        return false;
    }, [config, userProfile, isStudent, isTeacher, role]);

    useEffect(() => {
        const handleErr = (name: string) => (err: any) => {
            if (err.code === 'permission-denied') {
                console.warn(`Election ${name} access pending...`);
            } else {
                console.error(`Election ${name} error:`, err.message);
            }
        };

        const unsubConfig = db.collection('electionConfig').doc('active').onSnapshot(doc => {
            if (doc.exists) setConfig({ id: doc.id, ...doc.data() } as ElectionConfig);
        }, handleErr("Config"));

        const unsubPos = db.collection('electionPositions').onSnapshot(snap => {
            const allPos = snap.docs.map(d => ({ id: d.id, ...d.data() } as ElectionPosition));
            const eligible = allPos.filter(p => {
                if (!p.eligibleRoles?.includes(role)) return false;
                if (isStudent) return p.eligibleClasses?.includes(userProfile.class || '');
                if (isTeacher) {
                    const teacherClasses = [
                        ...(userProfile.classesTaught || []),
                        ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : [])
                    ];
                    return teacherClasses.some(c => p.eligibleClasses?.includes(c));
                }
                return true; 
            });
            setPositions(eligible);
        }, handleErr("Positions"));

        let unsubMyApp = () => {};
        let unsubVote = () => {};

        if (isStudent) {
            unsubMyApp = db.collection('electionApplications')
                .where('studentId', '==', userProfile.uid)
                .onSnapshot(snap => {
                    setMyApp(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as ElectionApplication);
                }, handleErr("MyApplication"));
        }

        unsubVote = db.collection('electionVotes')
            .where('voterId', '==', userProfile.uid)
            .onSnapshot(snap => {
                setHasVoted(!snap.empty);
            }, handleErr("Votes"));

        setLoading(false);

        // First-time UX: Trigger guide automatically
        const guideSeen = localStorage.getItem('edutec_election_guide_seen');
        if (!guideSeen) {
            const timer = setTimeout(() => setShowGuide(true), 1500);
            return () => clearTimeout(timer);
        }

        return () => { 
            unsubConfig(); 
            unsubPos(); 
            unsubMyApp();
            unsubVote();
        };
    }, [userProfile.uid, userProfile.class, userProfile.role, isStudent, isTeacher, role]);

    if (loading) return <div className="h-full flex items-center justify-center bg-slate-950 p-20"><Spinner /></div>;
    if (!config) return <div className="p-20 text-center opacity-30 font-mono text-white uppercase tracking-[0.5em]">Election Registry Offline</div>;

    const renderPhaseBanner = () => {
        const phases: Record<ElectionStatus, { label: string, color: string, icon: string }> = {
            setup: { label: 'Internal Setup', color: 'slate', icon: '⚙️' },
            applications: { label: 'Nominations Open', color: 'blue', icon: '📝' },
            vetting: { label: 'Judicial Vetting', color: 'amber', icon: '⚖️' },
            campaigning: { label: 'Campaigning Live', color: 'purple', icon: '📣' },
            cooling: { label: 'Cooling Period', color: 'cyan', icon: '🧊' },
            voting: { label: 'Polls Active', color: 'red', icon: '🗳️' },
            audit: { label: 'Verification', color: 'indigo', icon: '🔍' },
            results: { label: 'Polls Declared', color: 'emerald', icon: '📢' },
            concluded: { label: 'Election Terminated', color: 'slate', icon: '📁' },
        };
        const current = phases[config.status];
        return (
            <div className="inline-flex items-center gap-3 sm:gap-4 bg-slate-900 border border-white/5 px-4 sm:px-8 py-2 sm:py-3 rounded-full shadow-2xl mb-8 sm:mb-12">
                <span className="text-lg sm:text-xl animate-pulse">{current.icon}</span>
                <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-[0.3em] sm:tracking-[0.4em]">Phase: {current.label}</span>
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-${current.color}-500 shadow-[0_0_10px_rgba(var(--tw-color-${current.color}-500))]`}></div>
            </div>
        );
    };

    const renderContent = () => {
        if (config.status === 'voting' && !hasVoted) {
            if (!isEligibleVoter || positions.length === 0) {
                return (
                    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-6xl shadow-2xl border border-white/5 mb-8">🚫</div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">Ineligible Roll</h2>
                        <p className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-widest mt-4 max-w-sm mx-auto leading-relaxed">
                            {role.toUpperCase()} profile is not authorized to vote for any available positions in this cycle.
                        </p>
                        <Button onClick={() => setViewMode('hub')} variant="secondary" className="mt-8">Return to Hub</Button>
                    </div>
                );
            }
            return <VotingFlow userProfile={userProfile} positions={positions} onComplete={() => setHasVoted(true)} />;
        }
        if (viewMode === 'results' && (config.status === 'results' || config.publishedResults)) {
            return <ElectionResults config={config} positions={positions} isAdmin={userProfile.role === 'admin'} />;
        }
        if (viewMode === 'campaign_wall' && (['campaigning', 'cooling', 'voting', 'results', 'audit'].includes(config.status))) {
            return <CampaignWall userProfile={userProfile} positions={positions} />;
        }
        if (viewMode === 'designer' && isStudent && myApp?.status === 'approved' && config.status === 'campaigning') {
            return <CampaignDesigner userProfile={userProfile} application={myApp} />;
        }

        return (
            <div className="space-y-8 sm:space-y-12 pb-32 animate-fade-in-up">
                <div className="text-center px-4">
                    {renderPhaseBanner()}
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] sm:leading-[0.8] mb-4 sm:mb-6">Prefectural <span className="text-blue-500">Board</span></h1>
                    <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto italic">High-integrity digital election protocols for Edutec Schools.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-2 sm:px-0">
                    <Card onClick={() => setViewMode('hub')} className={`cursor-pointer border-blue-500/20 transition-all !p-6 sm:!p-10 text-center ${viewMode === 'hub' ? 'bg-blue-600/20 ring-2 ring-blue-500' : 'bg-blue-600/5 hover:bg-blue-600/10'}`}>
                        <span className="text-3xl sm:text-4xl block mb-4 sm:mb-6">🏠</span>
                        <h4 className="text-lg sm:text-xl font-black text-white uppercase tracking-widest">Portal Hub</h4>
                        <p className="text-[8px] sm:text-[10px] text-slate-500 mt-2 font-bold uppercase">Main control & nomination</p>
                    </Card>
                    <Card onClick={() => setViewMode('campaign_wall')} className={`cursor-pointer border-purple-500/20 transition-all !p-6 sm:!p-10 text-center ${viewMode === 'campaign_wall' ? 'bg-purple-600/20 ring-2 ring-purple-500' : 'bg-purple-600/5 hover:bg-purple-600/10'}`}>
                        <span className="text-3xl sm:text-4xl block mb-4 sm:mb-6">🖼️</span>
                        <h4 className="text-lg sm:text-xl font-black text-white uppercase tracking-widest">Digital Billboard</h4>
                        <p className="text-[8px] sm:text-[10px] text-slate-500 mt-2 font-bold uppercase">Live candidate manifestos</p>
                    </Card>
                    {(config.status === 'results' || config.publishedResults) && (
                        <Card onClick={() => setViewMode('results')} className={`cursor-pointer border-emerald-500/20 transition-all !p-6 sm:!p-10 text-center ${viewMode === 'results' ? 'bg-emerald-600/20 ring-2 ring-emerald-500' : 'bg-emerald-600/5 hover:bg-emerald-600/10'}`}>
                            <span className="text-3xl sm:text-4xl block mb-4 sm:mb-6">📈</span>
                            <h4 className="text-lg sm:text-xl font-black text-white uppercase tracking-widest">Declaration Room</h4>
                            <p className="text-[8px] sm:text-[10px] text-slate-500 mt-2 font-bold uppercase">Final certified results</p>
                        </Card>
                    )}
                </div>
                
                {isStudent && myApp && (
                    <Card className={`mx-2 sm:mx-0 border-2 rounded-[2rem] sm:rounded-[2.5rem] !p-6 sm:!p-8 animate-fade-in ${myApp.status === 'approved' ? 'border-emerald-500/50 bg-emerald-950/20' : myApp.status === 'rejected' ? 'border-rose-500/50 bg-rose-950/20' : 'border-blue-500/50 bg-blue-950/20'}`}>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl shadow-xl">
                                    {myApp.status === 'approved' ? '🎖️' : myApp.status === 'rejected' ? '🚫' : '⏳'}
                                </div>
                                <div>
                                    <h4 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Packet Status: {myApp.status.toUpperCase()}</h4>
                                    <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Role: <span className="text-blue-400">{myApp.positionTitle}</span></p>
                                </div>
                            </div>
                            {myApp.status === 'approved' && config.status === 'campaigning' && (
                                <Button onClick={() => setViewMode('designer')} className="w-full sm:w-auto !py-3 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">Designer Studio 🎨</Button>
                            )}
                            {myApp.status === 'approved' && config.status === 'cooling' && (
                                <p className="text-[8px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-4 py-2 rounded-xl border border-cyan-400/20">Registry Locked for Cooling</p>
                            )}
                        </div>
                    </Card>
                )}

                {role !== 'student' && (
                    <Card className="mx-2 sm:mx-0 border-white/5 bg-slate-900/50 !p-6 sm:!p-10 rounded-[2rem] sm:rounded-[3rem]">
                        <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
                             <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0">ℹ️</div>
                             <div className="space-y-4 w-full">
                                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">{role === 'teacher' ? 'Staff Oversight Panel' : 'Observer Panel'}</h3>
                                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
                                    You are viewing the election cycle as an authorized <strong>{role}</strong>. Monitor candidate manifestos on the <strong>Billboard</strong> and view tabulation in the <strong>Declaration Room</strong>.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                    <div className="px-4 py-2 bg-slate-800 rounded-xl border border-white/5 flex flex-col">
                                        <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Scope Positions</p>
                                        <p className="text-lg font-black text-white">{positions.length}</p>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-800 rounded-xl border border-white/5 flex flex-col">
                                        <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Cycle Status</p>
                                        <p className="text-lg font-black text-blue-400 uppercase">{config.status}</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <div className="p-2 sm:p-4 md:p-10 h-full overflow-y-auto max-w-7xl mx-auto font-sans relative custom-scrollbar">
            {renderContent()}
            
            {/* FLOATING PROTOCOL INTEL TRIGGER */}
            <button 
                onClick={() => setShowGuide(true)}
                className="fixed bottom-8 right-8 z-[100] w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white shadow-[0_15px_35px_rgba(59,130,246,0.6)] hover:scale-110 hover:shadow-blue-500/50 transition-all active:scale-95 border-2 border-white/20 group"
                title="Portal Intelligence & Help"
            >
                <span className="text-2xl font-bold group-hover:rotate-12 transition-transform">💡</span>
                {/* Sonar Pulse Effect */}
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30 pointer-events-none scale-150"></div>
                <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-2xl pointer-events-none">
                   Protocol Intel
                </div>
            </button>

            {showGuide && (
                <ElectoralGuide 
                    onClose={() => setShowGuide(false)} 
                    context={config.status === 'voting' && !hasVoted ? 'voting' : viewMode}
                    isTriggeredManually={true} 
                />
            )}
        </div>
    );
};

export default StudentElectionPortal;