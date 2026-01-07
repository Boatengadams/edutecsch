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

// Helper to add minutes to time string "HH:MM"
const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + mins);
    return date.toTimeString().slice(0, 5);
};

// Helper to compare times "HH:MM"
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
    
    // Preview State
    const [previewData, setPreviewData] = useState<Record<string, TimetableData> | null>(null);
    const [previewClassId, setPreviewClassId] = useState<string>(classId);

    // Generator Settings
    const [startTime, setStartTime] = useState("08:00");
    const [closingTime, setClosingTime] = useState("15:00");
    const [periodDuration, setPeriodDuration] = useState(45); // minutes
    const [breakTime, setBreakTime] = useState("10:15");
    const [breakDuration, setBreakDuration] = useState(30);
    const [lunchTime, setLunchTime] = useState("12:30");
    const [lunchDuration, setLunchDuration] = useState(45);
    
    // Advanced Generator Settings
    const [showGenOptions, setShowGenOptions] = useState(false);
    const [customInstructions, setCustomInstructions] = useState(
        "SIR ADAMS (Science, History, Creative Arts)\nMADAM Beatrice (Maths, Computing, RME)\nMADAM U (English, Twi)\nFrench: Mon 10:30-11:30 (Class 4), 11:30-12:30 (Class 5), 13:00-14:00 (Class 6); Fri 8-9 (Class 5&6), 9-10 (Class 4)"
    );
    const [targetClasses, setTargetClasses] = useState<string[]>([classId]);

    useEffect(() => {
        // Reset target class when prop changes, unless menu is open to prevent accidental loss of selection
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
                if (doc.exists) {
                    setTimetable({ id: doc.id, ...doc.data() } as Timetable);
                } else {
                    setTimetable(null);
                }
            } catch (err) {
                console.error("Error fetching timetable:", err);
                showToast("Failed to load timetable.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchTimetable();
    }, [classId]);

    const generateDaySkeleton = useCallback(() => {
        const slots: { startTime: string; endTime: string; type: 'Lesson' | 'Break'; fixedName?: string }[] = [];
        let current = startTime;

        // Loop until closing
        let limit = 0;
        while (isTimeBefore(current, closingTime) && limit < 20) {
            limit++;
            
            // Explicit Break Insertion if current time matches scheduled break start
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

            // Determine slot end
            let potentialEnd = addMinutes(current, periodDuration);
            
            // Adjust for Closing Time
            if (isTimeBefore(closingTime, potentialEnd)) {
                potentialEnd = closingTime;
            }

            // Adjust for Break Time (Snack)
            // If the period spans across the break start time, clamp it to the break start
            if (isTimeBefore(current, breakTime) && isTimeBefore(breakTime, potentialEnd)) {
                potentialEnd = breakTime;
            }
            
            // Adjust for Lunch Time
            if (isTimeBefore(current, lunchTime) && isTimeBefore(lunchTime, potentialEnd)) {
                potentialEnd = lunchTime;
            }

            // Add Lesson Slot
            if (current !== potentialEnd) {
                 slots.push({ startTime: current, endTime: potentialEnd, type: 'Lesson' });
                 current = potentialEnd;
            } else {
                break; // Break loop if no progress to prevent infinite loop
            }
        }
        return slots;
    }, [startTime, closingTime, periodDuration, breakTime, breakDuration, lunchTime, lunchDuration]);

    const handleGenerateAI = async () => {
        if (targetClasses.length === 0) {
            showToast("Please select at least one class.", "error");
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(`Initializing...`);
        setPreviewData(null);
        
        // Track teacher busy slots globally across this generation batch
        const globalTeacherSchedule: TeacherSchedule = {};
        const newPreviewData: Record<string, TimetableData> = {};

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Generate the mathematically correct time grid first
            const dayStructure = generateDaySkeleton();
            const structureDescription = JSON.stringify(dayStructure, null, 2);

            // Process classes sequentially to build up the teacher schedule context
            for (let i = 0; i < targetClasses.length; i++) {
                const targetClassId = targetClasses[i];
                setGenerationProgress(`Generating ${targetClassId} (${i + 1}/${targetClasses.length})...`);
                
                const subjects = GES_STANDARD_CURRICULUM[targetClassId] || GES_STANDARD_CURRICULUM['Basic 1'];
                
                // Construct a context string of busy teachers
                let busyConstraints = "";
                if (Object.keys(globalTeacherSchedule).length > 0) {
                    busyConstraints = "CRITICAL - The following teachers are ALREADY BOOKED at these times. DO NOT schedule them for a new class during these slots:\n";
                    for (const [teacher, schedule] of Object.entries(globalTeacherSchedule)) {
                        for (const [day, slots] of Object.entries(schedule)) {
                            const times = slots.map(s => `${s.start}-${s.end}`).join(', ');
                            busyConstraints += `- ${teacher}: ${day} [${times}]\n`;
                        }
                    }
                }

                const prompt = `
                    You are a professional school timetable scheduler. Create a weekly timetable for **${targetClassId}**.

                    **Global Rules:**
                    1. **Time Grid:** Use the EXACT time slots provided below. Do not create custom times.
                    2. **Subjects:** Use: [${subjects.join(', ')}].
                    3. **Teacher Continuity:** If a teacher teaches multiple subjects or periods, try to schedule them consecutively (back-to-back) in the same class to save time, rather than splitting them up.
                    4. **Core Subjects:** Maths, Science, English should appear at least 4 times a week, preferably in morning slots.
                    5. **Conflict Avoidance:** STRICTLY respect the 'Already Booked' list below. A teacher cannot be in two classes at once.

                    **Pre-calculated Daily Grid:**
                    ${structureDescription}

                    **Already Booked Teachers (Conflicts to Avoid):**
                    ${busyConstraints || "No conflicts yet."}

                    **Specific User Instructions:**
                    ${customInstructions}

                    **Output:**
                    Return ONLY a valid JSON object.
                    Keys: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday".
                    Value: Array of objects with "subject", "startTime", "endTime", "teacher".
                    
                    IMPORTANT:
                    - Populate the "teacher" field based on the instructions (e.g., "Sir Adams" for Science).
                    - Ensure "Break" slots are preserved exactly as "Snack Break" or "Lunch Break".
                `;

                try {
                    // FIX: Updated model name to 'gemini-3-pro-preview' for complex timetable generation tasks as per guidelines.
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-pro-preview',
                        contents: prompt,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    Monday: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, startTime: { type: Type.STRING }, endTime: { type: Type.STRING }, teacher: { type: Type.STRING } } } },
                                    Tuesday: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, startTime: { type: Type.STRING }, endTime: { type: Type.STRING }, teacher: { type: Type.STRING } } } },
                                    Wednesday: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, startTime: { type: Type.STRING }, endTime: { type: Type.STRING }, teacher: { type: Type.STRING } } } },
                                    Thursday: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, startTime: { type: Type.STRING }, endTime: { type: Type.STRING }, teacher: { type: Type.STRING } } } },
                                    Friday: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, startTime: { type: Type.STRING }, endTime: { type: Type.STRING }, teacher: { type: Type.STRING } } } },
                                }
                            }
                        }
                    });

                    const generatedData = JSON.parse(response.text) as TimetableData;
                    newPreviewData[targetClassId] = generatedData;

                    // Update Global Teacher Schedule for the next iteration
                    Object.entries(generatedData).forEach(([day, periods]) => {
                        // FIX: Added explicit type cast to resolve 'Property forEach does not exist on type unknown' error.
                        (periods as TimetablePeriod[]).forEach(p => {
                            if (p.teacher && p.teacher !== 'N/A' && p.subject !== 'Break') {
                                if (!globalTeacherSchedule[p.teacher]) {
                                    globalTeacherSchedule[p.teacher] = {};
                                }
                                if (!globalTeacherSchedule[p.teacher][day]) {
                                    globalTeacherSchedule[p.teacher][day] = [];
                                }
                                globalTeacherSchedule[p.teacher][day].push({
                                    start: p.startTime,
                                    end: p.endTime,
                                    classId: targetClassId
                                });
                            }
                        });
                    });

                } catch (error) {
                    console.error(`Generation failed for ${targetClassId}`, error);
                    showToast(`Failed to generate for ${targetClassId}`, "error");
                }
            }

            setPreviewData(newPreviewData);
            setPreviewClassId(targetClasses[0]); // Default view to first class
            setShowGenOptions(false); // Close config
            
        } catch (err: any) {
            console.error("AI Generation critical error:", err);
            showToast("Failed to generate timetables. Please try again.", "error");
        } finally {
            setIsGenerating(false);
            setGenerationProgress("");
        }
    };

    const handleSaveAll = async () => {
        if (!previewData) return;
        setIsSaving(true);
        try {
            const batch = db.batch();
            Object.entries(previewData).forEach(([cId, tData]) => {
                const docRef = db.collection('timetables').doc(cId);
                batch.set(docRef, {
                    id: cId,
                    classId: cId,
                    timetableData: tData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            
            showToast("All timetables saved successfully!", "success");
            
            // If current view class was updated, refresh it
            if (previewData[classId]) {
                setTimetable({
                    id: classId,
                    classId: classId,
                    timetableData: previewData[classId],
                    updatedAt: firebase.firestore.Timestamp.now()
                } as Timetable);
            }
            
            setPreviewData(null); // Exit preview mode
            
        } catch (err) {
            console.error("Save failed:", err);
            showToast("Failed to save timetables.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualSave = async () => {
        if (!timetable) return;
        setIsSaving(true);
        try {
            await db.collection('timetables').doc(classId).set({
                ...timetable,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("Timetable saved successfully.", "success");
            setEditMode(false);
        } catch (err) {
            console.error("Save failed:", err);
            showToast("Failed to save timetable.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const updatePeriod = (day: string, index: number, field: keyof TimetablePeriod, value: string) => {
        if (!timetable) return;
        const newData = { ...timetable.timetableData };
        newData[day][index] = { ...newData[day][index], [field]: value };
        setTimetable({ ...timetable, timetableData: newData });
    };

    const toggleClassSelection = (cId: string) => {
        setTargetClasses(prev => 
            prev.includes(cId) ? prev.filter(c => c !== cId) : [...prev, cId]
        );
    };
    
    const handleSelectAllClasses = () => setTargetClasses(GES_CLASSES);
    const handleDeselectAllClasses = () => setTargetClasses([]);

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    // PREVIEW MODE UI
    if (previewData) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <Card className="border-green-500/30 bg-green-900/10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-white">Review Generated Timetables</h3>
                            <p className="text-sm text-gray-300">Generated {Object.keys(previewData).length} timetables. Please review before saving.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setPreviewData(null)}>Discard All</Button>
                            <Button onClick={handleSaveAll} disabled={isSaving} className="bg-green-600 hover:bg-green-500">
                                {isSaving ? <Spinner /> : 'Save All to Database'}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Tabs for preview classes */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {Object.keys(previewData).sort().map(cId => (
                        <button
                            key={cId}
                            onClick={() => setPreviewClassId(cId)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${previewClassId === cId ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                        >
                            {cId}
                        </button>
                    ))}
                </div>

                <div className="border-t-4 border-blue-500 rounded-t-lg">
                    <div className="bg-slate-800 p-3 text-center rounded-t-lg mb-2">
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">{previewClassId} TIMETABLE</h2>
                    </div>
                    {previewData[previewClassId] ? (
                        <NotebookTimetable classId={previewClassId} timetableData={previewData[previewClassId]} />
                    ) : <p className="text-center p-10">No data.</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!readOnly && (
                <Card className="border-blue-500/30 bg-blue-900/10">
                    <div className="space-y-4">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 items-end w-full xl:w-auto">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Start Time</label>
                                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Period (min)</label>
                                    <input type="number" value={periodDuration} onChange={e => setPeriodDuration(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Snack Break</label>
                                    <input type="time" value={breakTime} onChange={e => setBreakTime(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Lunch Break</label>
                                    <input type="time" value={lunchTime} onChange={e => setLunchTime(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Close Time</label>
                                    <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
                                <button 
                                    onClick={() => setShowGenOptions(!showGenOptions)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showGenOptions ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
                                >
                                    {showGenOptions ? 'Hide Options' : 'Options'}
                                </button>
                                <Button onClick={handleGenerateAI} disabled={isGenerating} className="shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 w-full sm:w-auto">
                                    {isGenerating ? <span className="flex items-center gap-2"><Spinner /> {generationProgress || 'Generating...'}</span> : `✨ Generate (${targetClasses.length} Classes)`}
                                </Button>
                                {timetable && !editMode && !showGenOptions && (
                                    <Button variant="secondary" onClick={() => setEditMode(true)}>Edit Manually</Button>
                                )}
                                {editMode && (
                                    <Button variant="primary" onClick={handleManualSave} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {showGenOptions && (
                            <div className="pt-4 border-t border-slate-700 animate-fade-in-down grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-gray-300">Apply to Classes ({targetClasses.length})</label>
                                        <div className="flex gap-2 text-xs">
                                            <button onClick={handleSelectAllClasses} className="text-blue-400 hover:text-blue-300">Select All</button>
                                            <button onClick={handleDeselectAllClasses} className="text-slate-500 hover:text-slate-300">None</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar border border-slate-600 grid grid-cols-2 gap-1">
                                        {GES_CLASSES.map(c => (
                                            <label key={c} className={`flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer text-xs ${targetClasses.includes(c) ? 'bg-blue-900/20' : ''}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={targetClasses.includes(c)} 
                                                    onChange={() => toggleClassSelection(c)}
                                                    className="rounded bg-slate-900 border-slate-500 text-blue-500 focus:ring-blue-500 h-3 w-3"
                                                />
                                                <span className={targetClasses.includes(c) ? 'text-white font-medium' : 'text-gray-400'}>{c}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Instructions & Teacher Constraints</label>
                                    <p className="text-xs text-slate-400 mb-2">Define teacher subjects and specific time slots here. The AI will try to avoid clashing teachers across the selected classes.</p>
                                    <textarea 
                                        value={customInstructions} 
                                        onChange={e => setCustomInstructions(e.target.value)}
                                        placeholder="E.g., 'Mr. Osei teaches Math in Basic 1 & 2'. 'French is on Mondays 10am for Class 4'."
                                        className="w-full h-48 p-3 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-500 text-slate-200 font-mono leading-relaxed"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {timetable ? (
                editMode ? (
                    <Card className="overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-yellow-400">Editing Mode</h3>
                            <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} className="text-slate-400">Cancel</Button>
                        </div>
                        <div className="overflow-x-auto pb-4 custom-scrollbar">
                            <div className="flex gap-4 min-w-max">
                                {DAYS.map(day => (
                                    <div key={day} className="w-72 space-y-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                                        <h4 className="font-bold text-center bg-slate-700 py-2 rounded-lg text-blue-300 uppercase tracking-wider text-sm">{day}</h4>
                                        <div className="space-y-2">
                                            {timetable.timetableData[day]?.map((period, idx) => (
                                                <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-600/50 text-sm space-y-2 shadow-sm focus-within:ring-2 ring-blue-500/50 transition-all">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="relative flex-grow">
                                                            <input 
                                                                type="time" 
                                                                value={period.startTime} 
                                                                onChange={e => updatePeriod(day, idx, 'startTime', e.target.value)}
                                                                className="bg-slate-900 w-full rounded px-2 py-1 text-xs text-gray-300 border border-slate-700 focus:border-blue-500 outline-none text-center"
                                                            />
                                                        </div>
                                                        <span className="text-gray-500 text-xs font-bold">to</span>
                                                        <div className="relative flex-grow">
                                                            <input 
                                                                type="time" 
                                                                value={period.endTime} 
                                                                onChange={e => updatePeriod(day, idx, 'endTime', e.target.value)}
                                                                className="bg-slate-900 w-full rounded px-2 py-1 text-xs text-gray-300 border border-slate-700 focus:border-blue-500 outline-none text-center"
                                                            />
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={period.subject} 
                                                        onChange={e => updatePeriod(day, idx, 'subject', e.target.value)}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 font-semibold text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                                                        placeholder="Subject"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Teacher (Optional)"
                                                        value={period.teacher || ''} 
                                                        onChange={e => updatePeriod(day, idx, 'teacher', e.target.value)}
                                                        className="w-full bg-transparent border-b border-slate-700 rounded-none px-1 py-1 text-xs text-gray-400 focus:border-blue-500 outline-none focus:text-white"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div>
                        <div className="bg-slate-800 p-3 text-center rounded-t-lg mb-2 border-b-4 border-blue-500">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest">{classId} TIMETABLE</h2>
                        </div>
                        <NotebookTimetable classId={classId} timetableData={timetable.timetableData} />
                    </div>
                )
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl opacity-50">🗓️</span>
                    </div>
                    <p className="text-gray-400 text-lg">No timetable found for <strong className="text-white">{classId}</strong>.</p>
                    {!readOnly && <p className="text-sm text-gray-500 mt-2">Use the controls above to generate one instantly with AI.</p>}
                </div>
            )}
        </div>
    );
};

export default TimetableManager;