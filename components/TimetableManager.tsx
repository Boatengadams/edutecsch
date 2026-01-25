
import React, { useState, useEffect, useCallback } from 'react';
import { db, firebase } from '../services/firebase';
import { Timetable, TimetablePeriod, GES_STANDARD_CURRICULUM, GES_CLASSES, TimetableData } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { GoogleGenAI, Type } from '@google/genai';
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
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [previewData, setPreviewData] = useState<Record<string, TimetableData> | null>(null);
    const [previewClassId, setPreviewClassId] = useState<string>(classId);

    const [startTime, setStartTime] = useState("08:00");
    const [closingTime, setClosingTime] = useState("15:00");
    const [periodDuration, setPeriodDuration] = useState(45);
    const [breakTime, setBreakTime] = useState("10:15");
    const [breakDuration, setBreakDuration] = useState(30);
    const [lunchTime, setLunchTime] = useState("12:30");
    const [lunchDuration, setLunchDuration] = useState(45);
    
    const [showGenOptions, setShowGenOptions] = useState(false);
    const [customInstructions, setCustomInstructions] = useState(
        "Staff Assignments:\n- MR. ADAMS: Science, Computing\n- MRS. BEATRICE: Mathematics, RME\n- MISS FAITH: English, Ghanaian Language\n- MR. KOFI: Social Studies, PE"
    );
    const [targetClasses, setTargetClasses] = useState<string[]>([classId]);

    // FIX: Define handleSelectAllClasses
    const handleSelectAllClasses = () => setTargetClasses([...GES_CLASSES]);
    
    // FIX: Define handleClearClasses
    const handleClearClasses = () => setTargetClasses([]);
    
    // FIX: Define toggleClassSelection
    const toggleClassSelection = (c: string) => {
        setTargetClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    };

    // FIX: Define updatePeriod
    const updatePeriod = (day: string, idx: number, field: keyof TimetablePeriod, value: string) => {
        if (!timetable) return;
        const newData = { ...timetable.timetableData };
        if (newData[day]) {
            (newData[day] as any)[idx][field] = value;
            setTimetable({ ...timetable, timetableData: newData });
        }
    };

    // FIX: Define handleManualSave
    const handleManualSave = async () => {
        if (!timetable) return;
        setIsSaving(true);
        try {
            await db.collection('timetables').doc(classId).set({
                ...timetable,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("Record updated successfully.", "success");
            setEditMode(false);
        } catch (e) {
            showToast("Sync failed.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!showGenOptions && !previewData) {
            setTargetClasses([classId]);
            setPreviewClassId(classId);
        }
    }, [classId, showGenOptions, previewData]);

    useEffect(() => {
        const fetchTimetable = async () => {
            setLoading(true);
            try {
                const doc = await db.collection('timetables').doc(classId).get();
                if (doc.exists) setTimetable({ id: doc.id, ...doc.data() } as Timetable);
                else setTimetable(null);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchTimetable();
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
        if (targetClasses.length === 0) return showToast("Select at least one class.", "error");
        setIsGenerating(true);
        setGenerationProgress(`Initializing Synthesis...`);
        setPreviewData(null);
        const globalTeacherSchedule: TeacherSchedule = {};
        const newPreviewData: Record<string, TimetableData> = {};

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const dayStructure = generateDaySkeleton();
            const structureDescription = JSON.stringify(dayStructure, null, 2);

            for (let i = 0; i < targetClasses.length; i++) {
                const tClassId = targetClasses[i];
                setGenerationProgress(`Rendering ${tClassId} (${i + 1}/${targetClasses.length})...`);
                const subjects = GES_STANDARD_CURRICULUM[tClassId] || GES_STANDARD_CURRICULUM['Basic 1'];
                let busyConstraints = "";
                for (const [teacher, schedule] of Object.entries(globalTeacherSchedule)) {
                    for (const [day, slots] of Object.entries(schedule)) {
                        busyConstraints += `- ${teacher}: ${day} [${slots.map(s => `${s.start}-${s.end}`).join(', ')}]\n`;
                    }
                }

                const prompt = `Create a professional timetable for **${tClassId}**. 
                Time grid: ${structureDescription}. 
                Subjects: [${subjects.join(', ')}]. 
                Instructions: ${customInstructions}. 
                STRICT RULE: Avoid these conflicts: ${busyConstraints || "None"}. 
                Return JSON only. Format: { "Monday": [{ "subject": "string", "startTime": "string", "endTime": "string", "teacher": "string" }] }`;

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
            showToast("Matrix generated successfully.", "success");
        } catch (err: any) {
            showToast(`Neural Link Fault: ${err.message}`, "error");
        } finally { setIsGenerating(false); setGenerationProgress(""); }
    };

    const handleSaveAll = async () => {
        if (!previewData) return;
        setIsSaving(true);
        try {
            const batch = db.batch();
            Object.entries(previewData).forEach(([cId, tData]) => {
                batch.set(db.collection('timetables').doc(cId), { id: cId, classId: cId, timetableData: tData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
            showToast("Vault updated successfully!", "success");
            if (previewData[classId]) setTimetable({ id: classId, classId: classId, timetableData: previewData[classId], updatedAt: firebase.firestore.Timestamp.now() } as Timetable);
            setPreviewData(null);
        } catch (err) { showToast("Save protocol failed.", "error"); } finally { setIsSaving(false); }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    if (previewData) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <Card className="!bg-blue-600/10 border-blue-500/30 !p-8 rounded-[2.5rem] shadow-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Matrix Preview</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Audit the generated schedule before deployment.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setPreviewData(null)} className="rounded-xl font-black px-8">Discard</Button>
                            <Button onClick={handleSaveAll} disabled={isSaving} className="rounded-xl font-black px-12 shadow-xl shadow-blue-900/40">
                                {isSaving ? <Spinner /> : '🚀 Deploy All'}
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                    {Object.keys(previewData).sort().map(cId => (
                        <button key={cId} onClick={() => setPreviewClassId(cId)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${previewClassId === cId ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-900 text-slate-500 hover:text-white'}`}>{cId}</button>
                    ))}
                </div>

                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[3rem] shadow-3xl">
                    <div className="mb-8 flex justify-between items-center border-b border-white/5 pb-6">
                         <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{previewClassId} Schedule</h2>
                    </div>
                    {previewData[previewClassId] && <NotebookTimetable classId={previewClassId} timetableData={previewData[previewClassId]} />}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {!readOnly && (
                <Card className="!bg-slate-900/80 border-white/10 !p-8 sm:!p-10 rounded-[2.5rem] shadow-3xl">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 w-full xl:w-auto">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily Launch</label>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Period (m)</label>
                                <input type="number" value={periodDuration} onChange={e => setPeriodDuration(Number(e.target.value))} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Snack</label>
                                <input type="time" value={breakTime} onChange={e => setBreakTime(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lunch</label>
                                <input type="time" value={lunchTime} onChange={e => setLunchTime(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Closing</label>
                                <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-blue-500" />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 w-full xl:w-auto">
                            <button onClick={() => setShowGenOptions(!showGenOptions)} className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showGenOptions ? 'bg-slate-700 text-white shadow-xl' : 'bg-slate-900 text-slate-500 hover:text-white border border-white/5'}`}>{showGenOptions ? 'Hide Protocol' : 'Options'}</button>
                            <Button onClick={handleGenerateAI} disabled={isGenerating} className="flex-1 sm:flex-none px-12 py-4 rounded-2xl shadow-2xl shadow-blue-900/30">
                                {isGenerating ? <div className="flex items-center gap-2"><Spinner /> Splicing...</div> : `✨ Synthesize`}
                            </Button>
                        </div>
                    </div>

                    {showGenOptions && (
                        <div className="pt-10 mt-10 border-t border-white/5 grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fade-in-up">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scope Target ({targetClasses.length})</label>
                                    <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                                        <button onClick={handleSelectAllClasses} className="text-blue-500 hover:text-white transition-colors">All</button>
                                        <button onClick={handleClearClasses} className="text-slate-600 hover:text-white transition-colors">None</button>
                                    </div>
                                </div>
                                <div className="bg-slate-950 rounded-3xl p-6 max-h-72 overflow-y-auto custom-scrollbar border border-white/5 grid grid-cols-2 gap-2 shadow-inner">
                                    {GES_CLASSES.map(c => (
                                        <label key={c} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${targetClasses.includes(c) ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-700 hover:text-slate-500'}`}>
                                            <input type="checkbox" checked={targetClasses.includes(c)} onChange={() => toggleClassSelection(c)} className="sr-only" />
                                            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center ${targetClasses.includes(c) ? 'bg-blue-600 border-blue-500' : 'border-slate-800'}`}>{targetClasses.includes(c) && <div className="w-1 h-1 bg-white rounded-full"></div>}</div>
                                            <span className="text-[10px] font-black uppercase truncate">{c}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Neural Constraints & Staff Assignments</label>
                                <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} rows={6} className="w-full p-6 bg-slate-950 border border-white/10 rounded-[2rem] text-sm text-slate-300 outline-none focus:ring-4 ring-blue-500/10 resize-none shadow-inner custom-scrollbar" placeholder="Staff assignment mappings..." />
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {timetable ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{classId} Schedule</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Registry Last Modified: {timetable.updatedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        {!readOnly && <Button variant="secondary" onClick={() => setEditMode(!editMode)} className="px-10 rounded-xl font-black uppercase text-[10px]">{editMode ? 'Cancel Edit' : 'Modify Record'}</Button>}
                    </div>
                    {editMode ? (
                        <Card className="!p-8 bg-slate-950 border-white/5">
                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                <div className="flex gap-6 min-w-max">
                                    {DAYS.map(day => (
                                        <div key={day} className="w-80 space-y-4 bg-slate-900 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                                            <h4 className="text-sm font-black text-center bg-blue-600/10 border border-blue-500/20 py-3 rounded-xl text-blue-400 uppercase tracking-[0.2em]">{day}</h4>
                                            <div className="space-y-3">
                                                {timetable.timetableData[day]?.map((period, idx) => (
                                                    <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                                                        <div className="flex gap-2 items-center text-[10px] font-black text-slate-600">
                                                            <input type="time" value={period.startTime} onChange={e => updatePeriod(day, idx, 'startTime', e.target.value)} className="bg-transparent border-none outline-none text-white text-center w-full" />
                                                            <span>TO</span>
                                                            <input type="time" value={period.endTime} onChange={e => updatePeriod(day, idx, 'endTime', e.target.value)} className="bg-transparent border-none outline-none text-white text-center w-full" />
                                                        </div>
                                                        <input type="text" value={period.subject} onChange={e => updatePeriod(day, idx, 'subject', e.target.value)} className="w-full bg-slate-800 border-none rounded-xl p-2 text-xs font-black text-blue-400 text-center uppercase" />
                                                        <input type="text" value={period.teacher || ''} onChange={e => updatePeriod(day, idx, 'teacher', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-slate-500 text-center uppercase" placeholder="Staff Name" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={handleManualSave} disabled={isSaving} className="w-full mt-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/40">
                                {isSaving ? <Spinner /> : 'Commit Changes to Registry'}
                            </Button>
                        </Card>
                    ) : (
                        <div className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 shadow-3xl">
                            <NotebookTimetable classId={classId} timetableData={timetable.timetableData} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-48 text-center opacity-10 italic select-none">
                     <span className="text-9xl sm:text-[15rem] block mb-10">🗓️</span>
                     <p className="text-xl sm:text-2xl font-black uppercase tracking-[2em]">Schedule Empty</p>
                </div>
            )}
        </div>
    );
};

export default TimetableManager;
