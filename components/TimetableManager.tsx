import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, firebase } from '../services/firebase';
import { Timetable, TimetablePeriod, GES_STANDARD_CURRICULUM, GES_CLASSES, TimetableData, UserProfile } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { GoogleGenAI } from '@google/genai';
import NotebookTimetable from './common/NotebookTimetable';
import { useToast } from './common/Toast';

interface TimetableManagerProps {
    classId: string;
    readOnly?: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + mins);
    return date.toTimeString().slice(0, 5);
};

const isTimeBefore = (time1: string, time2: string): boolean => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return h1 < h2 || (h1 === h2 && m1 < m2);
};

interface TeacherSchedule {
    [teacherName: string]: {
        [day: string]: Array<{ start: string; end: string; classId: string }>;
    };
}

const TimetableManager: React.FC<TimetableManagerProps> = ({ classId, readOnly = false }) => {
    const { showToast } = useToast();
    const [timetable, setTimetable] = useState<Timetable | null>(null);
    const [allTeachers, setAllTeachers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Multi-class state
    const [previewData, setPreviewData] = useState<Record<string, TimetableData> | null>(null);
    const [previewClassId, setPreviewClassId] = useState<string>(classId);
    const [targetClasses, setTargetClasses] = useState<string[]>([classId]);

    // Params
    const [startTime, setStartTime] = useState("08:00");
    const [closingTime, setClosingTime] = useState("15:00");
    const [periodDuration, setPeriodDuration] = useState(45);
    const [breakTime, setBreakTime] = useState("10:15");
    const [breakDuration, setBreakDuration] = useState(30);
    const [lunchTime, setLunchTime] = useState("12:30");
    const [lunchDuration, setLunchDuration] = useState(45);
    const [showGenOptions, setShowGenOptions] = useState(false);

    useEffect(() => {
        const fetchEssentialData = async () => {
            setLoading(true);
            try {
                const doc = await db.collection('timetables').doc(classId).get();
                if (doc.exists) setTimetable({ id: doc.id, ...doc.data() } as Timetable);
                else setTimetable(null);

                const teachersSnap = await db.collection('users').where('role', '==', 'teacher').get();
                setAllTeachers(teachersSnap.docs.map(d => d.data() as UserProfile));
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchEssentialData();
    }, [classId]);

    const generateDaySkeleton = useCallback(() => {
        const slots: { startTime: string; endTime: string; type: 'Lesson' | 'Break'; fixedName?: string }[] = [];
        let current = startTime;
        let limit = 0;
        while (isTimeBefore(current, closingTime) && limit < 20) {
            limit++;
            if (current === breakTime) {
                const end = addMinutes(current, breakDuration);
                slots.push({ startTime: current, endTime: end, type: 'Break', fixedName: 'Snack Break' });
                current = end;
                continue;
            }
            if (current === lunchTime) {
                const end = addMinutes(current, lunchDuration);
                slots.push({ startTime: current, endTime: end, type: 'Break', fixedName: 'Lunch Break' });
                current = end;
                continue;
            }
            let potentialEnd = addMinutes(current, periodDuration);
            if (isTimeBefore(closingTime, potentialEnd)) potentialEnd = closingTime;
            if (isTimeBefore(current, breakTime) && isTimeBefore(breakTime, potentialEnd)) potentialEnd = breakTime;
            if (isTimeBefore(current, lunchTime) && isTimeBefore(lunchTime, potentialEnd)) potentialEnd = lunchTime;
            if (current !== potentialEnd) { slots.push({ startTime: current, endTime: potentialEnd, type: 'Lesson' }); current = potentialEnd; }
            else break;
        }
        return slots;
    }, [startTime, closingTime, periodDuration, breakTime, breakDuration, lunchTime, lunchDuration]);

    const handleGenerateAI = async () => {
        if (targetClasses.length === 0) return showToast("Target class registry unselected.", "error");
        setIsGenerating(true);
        setGenerationProgress(`Initializing Neural Synthesis Engine...`);
        setPreviewData(null);
        
        const globalTeacherSchedule: TeacherSchedule = {};
        const newPreviewData: Record<string, TimetableData> = {};

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const dayStructure = generateDaySkeleton();
            const structureDescription = JSON.stringify(dayStructure, null, 2);

            for (let i = 0; i < targetClasses.length; i++) {
                const tClassId = targetClasses[i];
                setGenerationProgress(`Synthesizing ${tClassId} matrix (${i + 1}/${targetClasses.length})...`);
                
                const subjects = GES_STANDARD_CURRICULUM[tClassId] || [];
                const classTeachers = allTeachers.filter(t => 
                    t.classTeacherOf === tClassId || 
                    (t.classesTaught && t.classesTaught.includes(tClassId))
                );

                const teacherContext = classTeachers.map(t => 
                    `${t.name} (Authorized: ${t.subjectsTaught?.join(', ') || 'Global'})`
                ).join('\n');

                let busyConstraints = "";
                for (const [teacher, schedule] of Object.entries(globalTeacherSchedule)) {
                    for (const [day, slots] of Object.entries(schedule)) {
                        busyConstraints += `- ${teacher}: Conflict at ${day} [${slots.map(s => `${s.start}-${s.end}`).join(', ')}]\n`;
                    }
                }

                const prompt = `You are the School Master Scheduler. Splicing high-density timetable for **${tClassId}**. 
                Infrastructure: ${structureDescription}. 
                Curriculum Payload: [${subjects.join(', ')}]. 
                Available Staff Identity Manifest: 
                ${teacherContext}
                
                STRICT COMPLIANCE DIRECTIVES:
                1. Only use real staff names from the manifest.
                2. Hard Conflict Check: DO NOT book staff during these windows:
                ${busyConstraints || "Grid clear."}
                3. Preserve "Break" and "Lunch" slot IDs as "subject": "Break" / "Lunch".
                4. Output structured JSON protocol. Map days to arrays of periods.
                Format: { "Monday": [{ "subject": "string", "startTime": "string", "endTime": "string", "teacher": "string" }], ... }`;

                const res = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });

                const generatedData = JSON.parse(res.text) as TimetableData;
                newPreviewData[tClassId] = generatedData;

                Object.entries(generatedData).forEach(([day, periods]) => {
                    (periods as TimetablePeriod[]).forEach(p => {
                        if (p.teacher && p.teacher !== 'N/A' && !p.subject.toLowerCase().includes('break')) {
                            if (!globalTeacherSchedule[p.teacher]) globalTeacherSchedule[p.teacher] = {};
                            if (!globalTeacherSchedule[p.teacher][day]) globalTeacherSchedule[p.teacher][day] = [];
                            globalTeacherSchedule[p.teacher][day].push({ start: p.startTime, end: p.endTime, classId: tClassId });
                        }
                    });
                });
            }

            setPreviewData(newPreviewData);
            setPreviewClassId(targetClasses[0]);
            setShowGenOptions(false);
            showToast("Matrix synthesized successfully.", "success");
        } catch (err: any) {
            showToast(`Synthesis Fault: ${err.message}`, "error");
        } finally { setIsGenerating(false); setGenerationProgress(""); }
    };

    const handleSaveAll = async () => {
        if (!previewData) return;
        setIsSaving(true);
        try {
            const batch = db.batch();
            Object.entries(previewData).forEach(([cId, tData]) => {
                batch.set(db.collection('timetables').doc(cId), { 
                    id: cId, 
                    classId: cId, 
                    timetableData: tData, 
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
            });
            await batch.commit();
            showToast("Registry synchronized globally.", "success");
            if (previewData[classId]) setTimetable({ id: classId, classId: classId, timetableData: previewData[classId], updatedAt: firebase.firestore.Timestamp.now() } as Timetable);
            setPreviewData(null);
        } catch (err) { 
            showToast("Synchronization interrupted.", "error"); 
        } finally { setIsSaving(false); }
    };

    const handleManualSave = async () => {
        if (!timetable) return;
        setIsSaving(true);
        try {
            await db.collection('timetables').doc(classId).set({
                ...timetable,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("Registry manual record updated.", "success");
            setEditMode(false);
        } catch (e) {
            showToast("Record commit failed.", "error");
        } finally { setIsSaving(false); }
    };

    const updatePeriod = (day: string, idx: number, field: keyof TimetablePeriod, value: string) => {
        if (!timetable) return;
        const newData = JSON.parse(JSON.stringify(timetable.timetableData));
        if (newData[day]) {
            (newData[day] as any)[idx][field] = value;
            setTimetable({ ...timetable, timetableData: newData });
        }
    };

    const toggleClassSelection = (c: string) => {
        setTargetClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    };

    if (loading) return <div className="flex justify-center p-32"><Spinner /></div>;

    if (previewData) {
        return (
            <div className="space-y-10 animate-fade-in pb-32">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 border-4 border-white/10">
                    <div>
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Draft Matrix Room</h3>
                        <p className="text-blue-100/60 text-xs font-bold uppercase tracking-[0.4em] mt-2">Audit phase: {Object.keys(previewData).length} Class Registries</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setPreviewData(null)} className="px-10 py-4 rounded-2xl bg-white/10 backdrop-blur-xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/20 border border-white/20 transition-all">Abort Protocol</button>
                        <Button onClick={handleSaveAll} disabled={isSaving} className="px-16 py-4 rounded-2xl bg-white text-blue-600 font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                            {isSaving ? <Spinner /> : '🚀 DEPLOY REGISTRY'}
                        </Button>
                    </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar px-2">
                    {Object.keys(previewData).sort((a,b) => GES_CLASSES.indexOf(a) - GES_CLASSES.indexOf(b)).map(cId => (
                        <button 
                            key={cId} 
                            onClick={() => setPreviewClassId(cId)} 
                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-2 ${previewClassId === cId ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-110 z-10' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'}`}
                        >
                            {cId}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-900/40 p-10 rounded-[4rem] border-2 border-white/5 shadow-inner">
                    <NotebookTimetable classId={previewClassId} timetableData={previewData[previewClassId]} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in-up pb-40 max-w-[1600px] mx-auto">
            {!readOnly && (
                <Card className="!bg-slate-900/60 backdrop-blur-3xl border-white/5 !p-10 sm:!p-16 rounded-[4rem] shadow-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-[15rem] font-black pointer-events-none select-none group-hover:scale-110 transition-transform">⚙️</div>
                    
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-16 relative z-10">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 w-full">
                            {[
                                { label: 'Daily Launch', val: startTime, set: setStartTime, type: 'time' },
                                { label: 'Period (m)', val: periodDuration, set: (v: any) => setPeriodDuration(Number(v)), type: 'number' },
                                { label: 'Interval One', val: breakTime, set: setBreakTime, type: 'time' },
                                { label: 'Main Lunch', val: lunchTime, set: setLunchTime, type: 'time' },
                                { label: 'Operational End', val: closingTime, set: setClosingTime, type: 'time' }
                            ].map((field, i) => (
                                <div key={i} className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{field.label}</label>
                                    <input 
                                        type={field.type} 
                                        value={field.val} 
                                        onChange={e => field.set(e.target.value)} 
                                        className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl p-5 text-sm font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
                                    />
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                            <button 
                                onClick={() => setShowGenOptions(!showGenOptions)} 
                                className={`px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${showGenOptions ? 'bg-slate-700 border-slate-500 text-white shadow-xl' : 'bg-slate-950 border-white/5 text-slate-500 hover:text-white'}`}
                            >
                                {showGenOptions ? 'Hide Registry' : 'Target Registry'}
                            </button>
                            <Button 
                                onClick={handleGenerateAI} 
                                disabled={isGenerating} 
                                className="flex-grow py-5 px-16 rounded-2xl shadow-[0_20px_50px_rgba(59,130,246,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-xs font-black uppercase tracking-[0.4em]"
                            >
                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-3"><Spinner /> Splicing...</div>
                                        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white animate-pulse" style={{width: '60%'}}></div></div>
                                    </div>
                                ) : `✨ Synthesize Matrix`}
                            </Button>
                        </div>
                    </div>

                    {showGenOptions && (
                        <div className="pt-16 mt-16 border-t border-white/5 animate-fade-in-up relative z-10">
                            <div className="flex justify-between items-center mb-8 px-2">
                                <label className="text-[12px] font-black text-blue-400 uppercase tracking-[0.4em]">Target Class Protocols ({targetClasses.length})</label>
                                <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
                                    <button onClick={() => setTargetClasses([...GES_CLASSES])} className="text-slate-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-blue-500">Select Universal</button>
                                    <button onClick={() => setTargetClasses([])} className="text-slate-600 hover:text-white transition-colors">Wipe Selection</button>
                                </div>
                            </div>
                            <div className="bg-slate-950/80 rounded-[3rem] p-8 sm:p-12 max-h-[500px] overflow-y-auto custom-scrollbar border border-white/5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 shadow-2xl">
                                {GES_CLASSES.map(c => (
                                    <label key={c} className={`group flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all border-2 ${targetClasses.includes(c) ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 shadow-xl' : 'bg-slate-900/50 border-transparent text-slate-700 hover:text-slate-500 hover:border-white/10'}`}>
                                        <input type="checkbox" checked={targetClasses.includes(c)} onChange={() => toggleClassSelection(c)} className="sr-only" />
                                        <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${targetClasses.includes(c) ? 'bg-blue-600 border-blue-400' : 'border-slate-800'}`}>
                                            {targetClasses.includes(c) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-tighter truncate">{c}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {timetable ? (
                <div className="space-y-10 animate-fade-in">
                    <div className="flex flex-col sm:row justify-between items-center bg-slate-900/60 backdrop-blur-3xl p-8 sm:p-12 rounded-[4rem] border border-white/5 shadow-2xl">
                        <div className="text-center sm:text-left space-y-2">
                            <h3 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">{classId} <span className="text-blue-500">Master Registry</span></h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Last synchronized: {timetable.updatedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        {!readOnly && (
                            <button 
                                onClick={() => setEditMode(!editMode)} 
                                className={`mt-8 sm:mt-0 px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] transition-all border-2 shadow-xl ${editMode ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-blue-600 border-blue-400 text-white hover:scale-105 active:scale-95'}`}
                            >
                                {editMode ? 'Close Terminal' : 'Modify Record'}
                            </button>
                        )}
                    </div>

                    {editMode ? (
                        <Card className="!p-10 sm:!p-16 bg-slate-950/80 border-white/5 rounded-[4rem] shadow-3xl">
                            <div className="overflow-x-auto pb-8 custom-scrollbar">
                                <div className="flex gap-10 min-w-max px-4">
                                    {DAYS.map(day => (
                                        <div key={day} className="w-[400px] space-y-6">
                                            <div className="bg-blue-600/10 border-2 border-blue-500/20 py-5 rounded-[2rem] text-center shadow-xl">
                                                <h4 className="text-base font-black text-blue-400 uppercase tracking-[0.5em]">{day}</h4>
                                            </div>
                                            <div className="space-y-4">
                                                {timetable.timetableData[day]?.map((period, idx) => (
                                                    <div key={idx} className="bg-slate-900/80 p-6 rounded-[2.5rem] border-2 border-white/5 space-y-4 shadow-inner group/item hover:border-blue-500/20 transition-all">
                                                        <div className="flex gap-3 items-center text-[11px] font-black text-slate-600 bg-slate-950 p-3 rounded-xl">
                                                            <input type="time" value={period.startTime} onChange={e => updatePeriod(day, idx, 'startTime', e.target.value)} className="bg-transparent border-none outline-none text-white text-center w-full focus:text-blue-400 transition-colors" />
                                                            <span className="opacity-20">→</span>
                                                            <input type="time" value={period.endTime} onChange={e => updatePeriod(day, idx, 'endTime', e.target.value)} className="bg-transparent border-none outline-none text-white text-center w-full focus:text-blue-400 transition-colors" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <input 
                                                                type="text" 
                                                                value={period.subject} 
                                                                onChange={e => updatePeriod(day, idx, 'subject', e.target.value)} 
                                                                className="w-full bg-slate-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl p-4 text-sm font-black text-blue-400 text-center uppercase outline-none shadow-lg transition-all" 
                                                                placeholder="Subject"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={period.teacher || ''} 
                                                                onChange={e => updatePeriod(day, idx, 'teacher', e.target.value)} 
                                                                className="w-full bg-transparent border-none text-[10px] font-bold text-slate-500 text-center uppercase outline-none tracking-widest focus:text-white transition-colors" 
                                                                placeholder="Staff Identity" 
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-16 flex justify-center">
                                <Button onClick={handleManualSave} disabled={isSaving} className="w-full max-w-2xl py-8 rounded-[3rem] font-black uppercase text-sm tracking-[0.5em] shadow-[0_30px_70px_rgba(59,130,246,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600 border-none">
                                    {isSaving ? <Spinner /> : 'COMMIT CHANGES TO MASTER REGISTRY'}
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="bg-slate-900/40 p-10 sm:p-20 rounded-[5rem] border-2 border-white/5 shadow-[0_80px_150px_-30px_rgba(0,0,0,1)]">
                            <NotebookTimetable classId={classId} timetableData={timetable.timetableData} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-72 text-center opacity-[0.03] select-none pointer-events-none">
                     <span className="text-[20rem] block mb-10 leading-none">🗓️</span>
                     <p className="text-5xl font-black uppercase tracking-[2em] ml-[2em]">Vault Offline</p>
                </div>
            )}
        </div>
    );
};

export default TimetableManager;
