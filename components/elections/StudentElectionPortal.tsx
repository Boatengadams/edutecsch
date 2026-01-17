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
            <div className="inline-flex items-center gap-3 sm:gap-4 bg-slate-900/50 backdrop-blur-xl border border-white/5 px-6 sm:px-10 py-2.5 sm:py-3.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-10 sm:mb-16 animate-fade-in-down border-b-2 border-b-blue-500/30">
                <span className="text-xl sm:text-2xl animate-pulse">{current.icon}</span>
                <span className="text-[10px] sm:text-[12px] font-black text-white uppercase tracking-[0.4em] sm:tracking-[0.6em]">Phase: {current.label}</span>
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-${current.color}-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse`}></div>
            </div>
        );
    };

    const renderContent = () => {
        if (config.status === 'voting' && !hasVoted) {
            if (!isEligibleVoter || positions.length === 0) {
                return (
                    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[3rem] sm:rounded-[4rem] flex items-center justify-center text-5xl sm:text-7xl shadow-2xl border border-white/10 mb-10 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                            <span className="relative z-10 filter grayscale contrast-125">🚫</span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-6">Access <span className="text-red-500">Restricted</span></h2>
                        <p className="text-slate-500 text-sm sm:text-base font-bold uppercase tracking-[0.3em] max-w-md mx-auto leading-relaxed">
                            {role.toUpperCase()} Profile is not registered in the active voter roll for this protocol.
                        </p>
                        <Button onClick={() => setViewMode('hub')} variant="secondary" className="mt-12 px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10">System Reboot</Button>
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
            <div className="space-y-12 sm:space-y-20 pb-40 animate-fade-in-up">
                <div className="text-center px-4">
                    {renderPhaseBanner()}
                    <h1 className="text-5xl sm:text-8xl md:text-9xl font-black text-white uppercase tracking-tighter leading-[0.85] sm:leading-[0.75] mb-6 sm:mb-10 text-shadow-xl">Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600">Sovereignty</span></h1>
                    <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto italic font-medium opacity-80 leading-relaxed">
                        Precision-engineered electoral infrastructure. Ensuring every voice is heard with cryptographic integrity.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12 px-2 sm:px-0">
                    <Card onClick={() => setViewMode('hub')} className={`group cursor-pointer border-blue-500/10 transition-all duration-500 !p-10 sm:!p-16 text-center rounded-[3rem] relative overflow-hidden ${viewMode === 'hub' ? 'bg-blue-600/10 border-blue-500/40 ring-4 ring-blue-500/5 shadow-[0_30px_60px_-10px_rgba(59,130,246,0.3)]' : 'bg-slate-900/40 hover:bg-blue-600/5 hover:border-blue-500/30'}`}>
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] text-[12rem] font-black select-none pointer-events-none transform translate-x-12 -translate-y-12 transition-opacity">🏠</div>
                        <span className="text-5xl sm:text-7xl block mb-8 sm:mb-10 filter group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">🏠</span>
                        <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-[0.2em]">Operational Hub</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-4 font-black uppercase tracking-[0.3em] group-hover:text-blue-400 transition-colors">Nomination Registry</p>
                    </Card>
                    
                    <Card onClick={() => setViewMode('campaign_wall')} className={`group cursor-pointer border-purple-500/10 transition-all duration-500 !p-10 sm:!p-16 text-center rounded-[3rem] relative overflow-hidden ${viewMode === 'campaign_wall' ? 'bg-purple-600/10 border-purple-500/40 ring-4 ring-purple-500/5 shadow-[0_30px_60px_-10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/40 hover:bg-purple-600/5 hover:border-purple-500/30'}`}>
                         <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] text-[12rem] font-black select-none pointer-events-none transform translate-x-12 -translate-y-12 transition-opacity">🖼️</div>
                        <span className="text-5xl sm:text-7xl block mb-8 sm:mb-10 filter group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all">🖼️</span>
                        <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-[0.2em]">Live Billboard</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-4 font-black uppercase tracking-[0.3em] group-hover:text-purple-400 transition-colors">Candidate Visions</p>
                    </Card>

                    {(config.status === 'results' || config.publishedResults) && (
                        <Card onClick={() => setViewMode('results')} className={`group cursor-pointer border-emerald-500/10 transition-all duration-500 !p-10 sm:!p-16 text-center rounded-[3rem] relative overflow-hidden ${viewMode === 'results' ? 'bg-emerald-600/10 border-emerald-500/40 ring-4 ring-emerald-500/5 shadow-[0_30px_60px_-10px_rgba(16,185,129,0.3)]' : 'bg-slate-900/40 hover:bg-emerald-600/5 hover:border-emerald-500/30'}`}>
                             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] text-[12rem] font-black select-none pointer-events-none transform translate-x-12 -translate-y-12 transition-opacity">📈</div>
                            <span className="text-5xl sm:text-7xl block mb-8 sm:mb-10 filter group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all">📈</span>
                            <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-[0.2em]">The Declaration</h4>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-4 font-black uppercase tracking-[0.3em] group-hover:text-emerald-400 transition-colors">Certified Statistics</p>
                        </Card>
                    )}
                </div>
                
                {isStudent && myApp && (
                    <div className="px-2 sm:px-0">
                         <Card className={`relative overflow-hidden border-2 rounded-[3rem] sm:rounded-[4rem] !p-10 sm:!p-16 animate-fade-in shadow-3xl ${myApp.status === 'approved' ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900/50' : myApp.status === 'rejected' ? 'border-rose-500/30 bg-gradient-to-br from-rose-950/20 to-slate-900/50' : 'border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-slate-900/50'}`}>
                            <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl group-hover:scale-110 transition-transform">
                                {myApp.status === 'approved' ? '🏆' : myApp.status === 'rejected' ? '🚫' : '🛡️'}
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                                <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 text-center sm:text-left">
                                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center text-4xl sm:text-6xl shadow-2xl border-4 ${myApp.status === 'approved' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-slate-800'}`}>
                                        {myApp.status === 'approved' ? '🎖️' : myApp.status === 'rejected' ? '🚫' : '⏳'}
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none">Protocol: <span className={myApp.status === 'approved' ? 'text-emerald-400' : 'text-blue-400'}>{myApp.status.toUpperCase()}</span></h4>
                                        <div className="flex items-center justify-center sm:justify-start gap-4">
                                            <p className="text-slate-400 text-[10px] sm:text-sm font-black uppercase tracking-[0.2em]">Target Authority:</p>
                                            <span className="px-4 py-1.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-widest border border-blue-500/30">{myApp.positionTitle}</span>
                                        </div>
                                    </div>
                                </div>
                                {myApp.status === 'approved' && config.status === 'campaigning' && (
                                    <Button onClick={() => setViewMode('designer')} className="w-full sm:w-auto !py-5 px-12 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_40px_rgba(59,130,246,0.3)] hover:scale-105 transition-all">Designer Studio 🎨</Button>
                                )}
                                {myApp.status === 'approved' && config.status === 'cooling' && (
                                    <div className="flex flex-col items-center sm:items-end gap-2">
                                        <div className="px-8 py-3 bg-cyan-400/10 text-cyan-400 font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-full border-2 border-cyan-400/30 shadow-xl animate-pulse">Vault Locked for Cooling</div>
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Protocol strictly enforced.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {role !== 'student' && (
                    <div className="px-2 sm:px-0">
                        <Card className="border-white/5 bg-slate-900/40 !p-10 sm:!p-20 rounded-[3rem] sm:rounded-[5rem] shadow-3xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 pointer-events-none"></div>
                            <div className="flex flex-col sm:flex-row items-start gap-10 sm:gap-16 relative z-10">
                                <div className="w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] sm:rounded-[3.5rem] flex items-center justify-center text-4xl sm:text-7xl flex-shrink-0 shadow-2xl border-4 border-white/10 group-hover:rotate-6 transition-transform">📜</div>
                                <div className="space-y-6 sm:space-y-8 w-full">
                                    <h3 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none">{role === 'teacher' ? 'Staff Authority Oversight' : 'Global Observer Panel'}</h3>
                                    <p className="text-slate-400 text-sm sm:text-xl leading-relaxed max-w-3xl font-medium">
                                        Active session monitoring engaged for authorized <strong>{role.toUpperCase()}</strong>. Access candidate roadmaps via the <strong>Live Billboard</strong> and audit tabulation in the <strong>Declaration Room</strong>.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-6 sm:pt-10">
                                        <div className="px-8 py-4 bg-slate-950 rounded-2xl border border-white/5 flex flex-col shadow-inner">
                                            <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Positions</p>
                                            <p className="text-2xl sm:text-3xl font-black text-white">{positions.length}</p>
                                        </div>
                                        <div className="px-8 py-4 bg-slate-950 rounded-2xl border border-white/5 flex flex-col shadow-inner">
                                            <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Board Protocol</p>
                                            <p className="text-2xl sm:text-3xl font-black text-blue-500 uppercase tracking-tighter">{config.status}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-0 h-full overflow-y-auto w-full font-sans relative custom-scrollbar bg-slate-950">
            {/* Immersive Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-[30%] left-[20%] w-[1px] h-[40%] bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
                <div className="absolute top-[40%] right-[15%] w-[1px] h-[30%] bg-gradient-to-b from-transparent via-purple-500/20 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
                {renderContent()}
            </div>
            
            {/* FLOATING PROTOCOL INTEL TRIGGER */}
            <button 
                onClick={() => setShowGuide(true)}
                className="fixed bottom-10 right-10 z-[100] w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white shadow-[0_20px_50px_rgba(59,130,246,0.6)] hover:scale-110 hover:shadow-blue-500/50 transition-all active:scale-95 border-4 border-white/20 group"
                title="Portal Intelligence & Help"
            >
                <span className="text-3xl font-bold group-hover:rotate-12 transition-transform drop-shadow-lg">💡</span>
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30 pointer-events-none scale-150"></div>
                <div className="absolute -top-14 right-0 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-3xl pointer-events-none translate-y-2 group-hover:translate-y-0">
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