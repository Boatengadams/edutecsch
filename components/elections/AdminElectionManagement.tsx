import React, { useState, useEffect, useMemo } from 'react';
import { db, firebase } from '../../services/firebase';
import { ElectionConfig, ElectionPosition, ElectionStatus, CriteriaLevel, GES_CLASSES, ElectionApplication, UserProfile, UserRole } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { useToast } from '../common/Toast';
import ElectionResults from './ElectionResults';
import ElectoralGuide from './ElectoralGuide';

const ELECTION_PHASES: { status: ElectionStatus; label: string; icon: string; description: string }[] = [
    { status: 'setup', label: 'Setup', icon: '⚙️', description: 'Configure roles and thresholds' },
    { status: 'applications', label: 'Nominations', icon: '📝', description: 'Student application window' },
    { status: 'vetting', label: 'Vetting', icon: '⚖️', description: 'EC judicial audit of candidates' },
    { status: 'campaigning', label: 'Campaigning', icon: '📣', description: 'Poster design & manifestos live' },
    { status: 'cooling', label: 'Cooling', icon: '🧊', description: 'Materials locked, silence period' },
    { status: 'voting', label: 'Voting', icon: '🗳️', description: 'Ballot vault active' },
    { status: 'audit', label: 'Audit', icon: '🔍', description: 'Verification of packet integrity' },
    { status: 'results', label: 'Declaration', icon: '📢', description: 'Results broadcast to school' },
    { status: 'concluded', label: 'Archive', icon: '📁', description: 'Election cycle terminated' },
];

const AVAILABLE_ROLES: UserRole[] = ['student', 'teacher', 'parent', 'admin'];

const INITIAL_SCHEDULE: Record<ElectionStatus, any> = {
    setup: null,
    applications: null,
    vetting: null,
    campaigning: null,
    cooling: null,
    voting: null,
    audit: null,
    results: null,
    concluded: null
};

const AdminElectionManagement: React.FC<{ allUsers: UserProfile[] }> = ({ allUsers }) => {
    const { showToast } = useToast();
    const [config, setConfig] = useState<ElectionConfig | null>(null);
    const [positions, setPositions] = useState<ElectionPosition[]>([]);
    const [applications, setApplications] = useState<ElectionApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'management' | 'results' | 'vetting' | 'timeline'>('management');
    const [showGuide, setShowGuide] = useState(false);
    
    // Form State
    const [editingPosId, setEditingPosId] = useState<string | null>(null);
    const [posTitle, setPosTitle] = useState('');
    const [posResponsibilities, setPosResponsibilities] = useState('');
    const [posSlots, setPosSlots] = useState(1);
    const [posCriteria, setPosCriteria] = useState<CriteriaLevel>('moderate');
    const [posEligibleClasses, setPosEligibleClasses] = useState<string[]>([]);
    const [posEligibleRoles, setPosEligibleRoles] = useState<UserRole[]>(['student']);
    
    // --- AUTONOMOUS PROGRESSION ENGINE ---
    useEffect(() => {
        if (!config || !config.schedule) return;

        const checkTimeline = () => {
            const now = Date.now();
            const phaseOrder = ELECTION_PHASES.map(p => p.status);
            const currentIdx = phaseOrder.indexOf(config.status);

            let latestScheduledIdx = currentIdx;
            for (let i = currentIdx + 1; i < phaseOrder.length; i++) {
                const phaseStatus = phaseOrder[i];
                const startTime = config.schedule[phaseStatus]?.toMillis();
                if (startTime && now >= startTime) {
                    latestScheduledIdx = i;
                } else if (startTime && now < startTime) {
                    break;
                }
            }

            if (latestScheduledIdx > currentIdx) {
                const nextStatus = phaseOrder[latestScheduledIdx];
                updateElectionStatus(nextStatus, true);
            }
        };

        const timer = setInterval(checkTimeline, 10000); 
        return () => clearInterval(timer);
    }, [config?.status, config?.schedule]);

    useEffect(() => {
        const handleErr = (name: string) => (err: any) => {
            if (err.code === 'permission-denied') {
                console.warn(`Electoral ${name} access restricted.`);
            } else {
                console.error(`Electoral ${name} fault:`, err.message);
            }
        };

        const unsubConfig = db.collection('electionConfig').doc('active').onSnapshot(doc => {
            if (doc.exists) setConfig({ id: doc.id, ...doc.data() } as ElectionConfig);
            else {
                db.collection('electionConfig').doc('active').set({
                    status: 'setup',
                    academicYear: '2025/2026',
                    term: 1,
                    publishedResults: false,
                    eligibleClasses: [],
                    schedule: INITIAL_SCHEDULE,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }, handleErr("Config"));

        const unsubPos = db.collection('electionPositions').onSnapshot(snap => {
            setPositions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ElectionPosition)));
        }, handleErr("Positions"));

        const unsubApps = db.collection('electionApplications').onSnapshot(snap => {
            setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as ElectionApplication)));
            setLoading(false);
        }, handleErr("Applications"));

        return () => { unsubConfig(); unsubPos(); unsubApps(); };
    }, []);

    const updateElectionStatus = async (newStatus: ElectionStatus, isAuto = false) => {
        if (!config) return;
        setIsSaving(true);
        try {
            const update: any = { status: newStatus };
            if (newStatus === 'results') update.publishedResults = true;
            await db.collection('electionConfig').doc('active').update(update);
            showToast(isAuto ? `Auto: ${newStatus.toUpperCase()}` : `EC: ${newStatus.toUpperCase()}`, "success");
        } catch (e) {
            showToast("Phase transition failed.", "error");
        } finally { setIsSaving(false); }
    };

    const handleTogglePosClass = (cId: string) => {
        setPosEligibleClasses(prev => 
            prev.includes(cId) ? prev.filter(c => c !== cId) : [...prev, cId]
        );
    };

    const handleTogglePosRole = (role: UserRole) => {
        setPosEligibleRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleSelectAllRoles = () => setPosEligibleRoles([...AVAILABLE_ROLES]);
    const handleClearRoles = () => setPosEligibleRoles([]);
    
    const handleSelectAllClasses = () => setPosEligibleClasses([...GES_CLASSES]);
    const handleClearClasses = () => setPosEligibleClasses([]);

    const handleUpdateSchedule = async (phase: ElectionStatus, dateStr: string) => {
        if (!config) return;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) throw new Error("Invalid date");
            await db.collection('electionConfig').doc('active').update({
                [`schedule.${phase}`]: firebase.firestore.Timestamp.fromDate(date)
            });
        } catch (e) {
            showToast("Invalid format.", "error");
        }
    };

    const handleUpsertPosition = async () => {
        if (!posTitle.trim()) {
            showToast("Please enter a position title.", "error");
            return;
        }
        if (posEligibleRoles.length === 0) {
            showToast("Select at least one eligible role.", "error");
            return;
        }
        if (posEligibleClasses.length === 0) {
            showToast("Select at least one assigned class.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const positionData = {
                title: posTitle, 
                slots: posSlots, 
                criteriaLevel: posCriteria,
                minAttendance: 85, 
                minCompletion: 80, 
                minXp: 500,
                eligibleRoles: posEligibleRoles,
                eligibleClasses: posEligibleClasses, 
                category: 'General' as const, 
                responsibilities: posResponsibilities,
                isOpen: config?.status === 'applications'
            };

            const docRef = editingPosId ? db.collection('electionPositions').doc(editingPosId) : db.collection('electionPositions').doc();
            await docRef.set(positionData, { merge: true });
            showToast(editingPosId ? "Role Registry Updated" : "New Role Protocol Deployed", "success");
            resetForm();
        } finally { setIsSaving(false); }
    };

    const resetForm = () => { 
        setPosTitle(''); 
        setPosResponsibilities(''); 
        setPosSlots(1); 
        setEditingPosId(null); 
        setPosEligibleClasses([]);
        setPosEligibleRoles(['student']);
    };

    const handleAction = async (appId: string, status: 'approved' | 'rejected' | 'pending') => {
        try {
            await db.collection('electionApplications').doc(appId).update({ status });
            showToast(`Packet: ${status}`, "success");
        } catch (err: any) { showToast("Sync error.", "error"); }
    };

    if (loading) return <div className="p-10 flex justify-center h-full items-center"><Spinner /></div>;

    const currentPhaseIdx = ELECTION_PHASES.findIndex(p => p.status === config?.status);

    const formatTimestampForInput = (ts?: firebase.firestore.Timestamp | null) => {
        if (!ts) return "";
        const date = ts.toDate();
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Phase Stepper - Mobile Scrollable */}
            <Card className="!bg-slate-900 border-white/5 !p-4 sm:!p-8">
                <div className="flex justify-between items-start overflow-x-auto custom-scrollbar gap-4 sm:gap-8 pb-4">
                    {ELECTION_PHASES.map((phase, idx) => {
                        return (
                            <div key={phase.status} className="flex flex-col items-center relative min-w-[70px] sm:flex-1">
                                {idx < ELECTION_PHASES.length - 1 && (
                                    <div className={`absolute top-5 left-1/2 w-full h-[2px] z-0 hidden sm:block ${idx < currentPhaseIdx ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                                )}
                                <button 
                                    onClick={() => updateElectionStatus(phase.status)}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-2 ${
                                        idx === currentPhaseIdx ? 'bg-blue-600 border-blue-400 scale-110 sm:scale-125 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 
                                        idx < currentPhaseIdx ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-slate-700'
                                    }`}
                                >
                                    <span className="text-sm sm:text-base">{phase.icon}</span>
                                </button>
                                <p className={`mt-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-center ${idx === currentPhaseIdx ? 'text-white' : 'text-slate-500'}`}>{phase.label}</p>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* View Mode Toggle */}
            <div className="bg-slate-900 border border-white/5 p-4 sm:p-8 rounded-[2rem] shadow-3xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl">🗳️</div>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase leading-none">Electoral <span className="text-blue-500">Board</span></h1>
                        <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 sm:mt-2">Status: {config?.status.toUpperCase()}</p>
                    </div>
                </div>

                <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto scrollbar-hide">
                    {['management', 'timeline', 'vetting', 'results'].map(mode => (
                        <button 
                            key={mode} 
                            onClick={() => setViewMode(mode as any)} 
                            className={`flex-1 md:flex-none whitespace-nowrap px-4 sm:px-6 py-2 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-600 hover:text-white'}`}
                        >
                            {mode.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === 'management' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    {/* LEFT PANEL: CONFIGURATION FORM */}
                    <div className="lg:col-span-5 order-2 lg:order-1">
                        <Card className={`!bg-slate-900/60 border-2 transition-all duration-500 !p-6 sm:!p-10 h-fit ${editingPosId ? 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.15)]' : 'border-white/5'}`}>
                            <div className="flex justify-between items-center mb-8 sm:mb-10">
                                <h3 className="text-[10px] sm:text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">
                                    {editingPosId ? 'Modify System Entry' : 'Deploy New Role'}
                                </h3>
                                {editingPosId && (
                                    <button onClick={resetForm} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                                )}
                            </div>

                            <div className="space-y-6 sm:space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 sm:mb-3 ml-1 text-left">Position Title</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Senior Prefect" 
                                            value={posTitle} 
                                            onChange={e => setPosTitle(e.target.value)} 
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-slate-700" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 sm:mb-3 ml-1 text-left">Slots</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={posSlots} 
                                                onChange={e => setPosSlots(Number(e.target.value))} 
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm text-white focus:border-blue-500 outline-none text-center font-bold" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 sm:mb-3 ml-1 text-left">Vetting</label>
                                            <select 
                                                value={posCriteria} 
                                                onChange={e => setPosCriteria(e.target.value as any)} 
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[9px] sm:text-[11px] uppercase font-black text-blue-400 cursor-pointer focus:border-blue-500 outline-none"
                                            >
                                                <option value="high">High</option>
                                                <option value="moderate">Moderate</option>
                                                <option value="low">Standard</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 sm:mb-3 ml-1 text-left">Official Responsibilities</label>
                                    <textarea 
                                        placeholder="Describe constitutional duties..." 
                                        value={posResponsibilities} 
                                        onChange={e => setPosResponsibilities(e.target.value)} 
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-sm text-white h-24 sm:h-28 focus:border-blue-500 outline-none resize-none transition-all placeholder-slate-700" 
                                    />
                                </div>

                                {/* VOTER ROLES SELECTION */}
                                <div>
                                    <div className="flex justify-between items-end mb-3 sm:mb-4 ml-1">
                                        <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Voter Roles</label>
                                        <div className="flex gap-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                                            <button type="button" onClick={handleSelectAllRoles} className="text-blue-500 hover:text-white transition-colors">All</button>
                                            <span className="text-slate-800">/</span>
                                            <button type="button" onClick={handleClearRoles} className="text-slate-600 hover:text-white transition-colors">Clear</button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                                        {AVAILABLE_ROLES.map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => handleTogglePosRole(role)}
                                                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest border-2 transition-all shadow-lg ${
                                                    posEligibleRoles.includes(role)
                                                    ? 'bg-purple-600 border-purple-400 text-white shadow-purple-900/20'
                                                    : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ASSIGNED CLASSES SELECTION */}
                                <div>
                                    <div className="flex justify-between items-end mb-3 sm:mb-4 ml-1">
                                        <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Voter Classes</label>
                                        <div className="flex gap-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                                            <button type="button" onClick={handleSelectAllClasses} className="text-blue-500 hover:text-white transition-colors">All</button>
                                            <span className="text-slate-800">/</span>
                                            <button type="button" onClick={handleClearClasses} className="text-slate-600 hover:text-white transition-colors">Clear</button>
                                        </div>
                                    </div>
                                    <div className="p-3 sm:p-6 bg-slate-950 rounded-2xl sm:rounded-[2rem] border border-white/5 overflow-hidden shadow-inner">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 max-h-48 sm:max-h-56 overflow-y-auto custom-scrollbar pr-1 sm:pr-3">
                                            {GES_CLASSES.map(cls => (
                                                <button
                                                    key={cls}
                                                    type="button"
                                                    onClick={() => handleTogglePosClass(cls)}
                                                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-tight border-2 transition-all ${
                                                        posEligibleClasses.includes(cls)
                                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-blue-500/10'
                                                        : 'bg-slate-900/50 border-white/5 text-slate-600 hover:text-slate-400'
                                                    }`}
                                                >
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleUpsertPosition} 
                                    disabled={isSaving || !posTitle.trim()} 
                                    className="w-full py-4 sm:py-6 text-[10px] sm:text-[12px] uppercase font-black rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-900/30 tracking-[0.2em]"
                                >
                                    {isSaving ? <Spinner /> : (editingPosId ? 'Update Registry' : 'Deploy Protocol')}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT PANEL: REGISTRY CARDS */}
                    <div className="lg:col-span-7 order-1 lg:order-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                            {positions.length === 0 ? (
                                <div className="col-span-full py-20 sm:py-48 text-center opacity-10 italic">
                                     <span className="text-6xl sm:text-[10rem] block mb-6 sm:mb-10">🗳️</span>
                                     <p className="text-sm sm:text-lg font-black uppercase tracking-[1.5em]">Empty Registry</p>
                                </div>
                            ) : positions.map(pos => (
                                <Card key={pos.id} className="relative flex flex-col justify-between border-white/5 bg-slate-900/40 overflow-hidden group hover:border-blue-500/30 transition-all p-6 sm:p-8">
                                    <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 text-6xl sm:text-[8rem] transition-transform group-hover:scale-125 pointer-events-none">🏷️</div>
                                    
                                    <div className="mb-6 sm:mb-10 relative z-10">
                                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter leading-none mb-3 sm:mb-4 group-hover:text-blue-400 transition-colors">{pos.title}</h3>
                                        
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-4 sm:mt-6">
                                            {pos.eligibleRoles?.map(r => (
                                                <span key={r} className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-purple-500/20">{r}</span>
                                            ))}
                                            {pos.eligibleClasses?.map(c => (
                                                <span key={c} className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-blue-500/20">{c}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 sm:gap-3 relative z-10">
                                        <button 
                                            onClick={() => { 
                                                setEditingPosId(pos.id); 
                                                setPosTitle(pos.title); 
                                                setPosResponsibilities(pos.responsibilities); 
                                                setPosSlots(pos.slots); 
                                                setPosCriteria(pos.criteriaLevel); 
                                                setPosEligibleClasses(pos.eligibleClasses || []); 
                                                setPosEligibleRoles(pos.eligibleRoles || ['student']); 
                                            }} 
                                            className="flex-grow py-3 sm:py-4 bg-slate-800 hover:bg-blue-600 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <span className="text-base sm:text-lg">✏️</span> Edit
                                        </button>
                                        <button 
                                            onClick={() => { if(window.confirm(`Permanently terminate role [${pos.title}] and purge all related ballots?`)) db.collection('electionPositions').doc(pos.id).delete(); }} 
                                            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white transition-all border border-red-500/20 shadow-lg"
                                        >
                                            <span className="text-lg sm:text-xl">🗑️</span>
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'timeline' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 animate-fade-in-up">
                    <Card className="!bg-slate-900/60 !p-6 sm:!p-12 border-white/5">
                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-8 sm:mb-10">Lifecycle Chronos</h3>
                        <div className="space-y-4 sm:space-y-6">
                            {ELECTION_PHASES.filter(p => p.status !== 'setup').map(phase => (
                                <div key={phase.status} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-slate-950 rounded-2xl sm:rounded-3xl border border-white/5 group hover:border-blue-500/30 transition-all shadow-inner gap-4">
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-110 transition-transform shadow-xl border border-white/5">{phase.icon}</div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">{phase.label}</p>
                                            <p className="text-[8px] sm:text-[10px] text-slate-600 font-bold uppercase mt-0.5">{phase.status}</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="datetime-local" 
                                        defaultValue={formatTimestampForInput(config?.schedule?.[phase.status])}
                                        onChange={(e) => handleUpdateSchedule(phase.status, e.target.value)}
                                        className="w-full sm:w-auto bg-slate-900 border border-white/10 rounded-xl px-3 py-2 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-mono text-blue-400 outline-none focus:border-blue-500 transition-all shadow-lg"
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div className="space-y-6 lg:space-y-10">
                         <div className="p-6 sm:p-12 bg-blue-600/5 border border-blue-500/20 rounded-2xl sm:rounded-[3rem] shadow-2xl">
                            <h4 className="text-blue-400 font-black uppercase text-[10px] sm:text-[11px] tracking-[0.4em] mb-6 sm:mb-10 flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                Operational Override
                            </h4>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {ELECTION_PHASES.map(p => (
                                    <button 
                                        key={p.status} 
                                        onClick={() => updateElectionStatus(p.status)}
                                        className="px-3 py-2 sm:px-5 sm:py-3 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all border border-white/5 shadow-lg active:scale-95"
                                    >
                                        Force {p.label}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {viewMode === 'vetting' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                    {applications.filter(a => a.status === 'pending').map(app => (
                        <Card key={app.id} className="border-white/5 bg-slate-900/40 p-6 sm:p-10 flex flex-col gap-4 sm:gap-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-5 text-7xl sm:text-9xl pointer-events-none group-hover:scale-110 transition-transform">⚖️</div>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-800 border-2 sm:border-4 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
                                        {app.studentPhoto ? <img src={app.studentPhoto} className="w-full h-full object-cover" /> : <span className="text-3xl sm:text-4xl">👤</span>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-1 sm:mb-2 truncate">{app.studentName}</p>
                                        <div className="flex items-center">
                                            <span className="text-[8px] sm:text-[11px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-blue-500/20 truncate">Target: {app.positionTitle}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="h-px bg-white/5 w-full"></div>
                            
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl sm:rounded-2xl border border-white/5 text-center">
                                    <p className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Attendance</p>
                                    <p className="text-sm sm:text-lg font-black text-white">{app.metrics?.attendance}%</p>
                                </div>
                                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl sm:rounded-2xl border border-white/5 text-center">
                                    <p className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Completion</p>
                                    <p className="text-sm sm:text-lg font-black text-white">{app.metrics?.completion}%</p>
                                </div>
                                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl sm:rounded-2xl border border-white/5 text-center">
                                    <p className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">XP Points</p>
                                    <p className="text-sm sm:text-lg font-black text-emerald-400">{app.metrics?.xp}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4 mt-auto">
                                <button onClick={() => handleAction(app.id, 'rejected')} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-rose-500/10 text-rose-500 font-black uppercase text-[9px] sm:text-[11px] tracking-widest border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95">Deny</button>
                                <button onClick={() => handleAction(app.id, 'approved')} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-400 font-black uppercase text-[9px] sm:text-[11px] tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95">Approve</button>
                            </div>
                        </Card>
                    ))}
                    {applications.filter(a => a.status === 'pending').length === 0 && (
                        <div className="col-span-full py-20 sm:py-64 text-center opacity-10 italic">
                             <span className="text-7xl sm:text-[12rem] block mb-6 sm:mb-10">⚖️</span>
                             <p className="text-lg sm:text-xl font-black uppercase tracking-[2em]">Vault Secure</p>
                             <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.5em] mt-4">No pending nominations</p>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'results' && config && (
                <ElectionResults config={config} positions={positions} isAdmin={true} />
            )}
            
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
                   System Intel
                </div>
            </button>

            {showGuide && (
                <ElectoralGuide 
                    onClose={() => setShowGuide(false)} 
                    context={viewMode === 'management' ? 'management' : viewMode}
                    isTriggeredManually={true} 
                />
            )}
        </div>
    );
};

export default AdminElectionManagement;