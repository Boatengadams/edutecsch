
import React, { useState, useEffect, useCallback } from 'react';
import { db, firebase } from '../services/firebase';
import { Timetable, TimetablePeriod, GES_STANDARD_CURRICULUM, GES_CLASSES } from '../types';
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

const TimetableManager: React.FC<TimetableManagerProps> = ({ classId, readOnly = false }) => {
    const { showToast } = useToast();
    const [timetable, setTimetable] = useState<Timetable | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
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
    const [customInstructions, setCustomInstructions] = useState("");
    const [targetClasses, setTargetClasses] = useState<string[]>([classId]);

    useEffect(() => {
        // Reset target class when prop changes, unless menu is open
        if (!showGenOptions) {
            setTargetClasses([classId]);
        }
    }, [classId, showGenOptions]);

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
        const slots: { startTime: string; endTime: string; type: 'Lesson' | 'Break' | 'Worship'; fixedName?: string }[] = [];
        let current = startTime;

        // 1. Morning Worship/Assembly (Fixed 15 mins start)
        const worshipEnd = addMinutes(current, 15);
        slots.push({ startTime: current, endTime: worshipEnd, type: 'Worship', fixedName: 'Worship / Assembly' });
        current = worshipEnd;

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
                // If we are stuck (e.g., current == breakTime but didn't match 'if' above due to string mismatch?), force advance to next break end?
                // This shouldn't happen with sanitized inputs, but let's be safe.
                // If current matches a break start but wasn't caught (e.g. 10:15 vs 10:15), it should be caught.
                // If current is < breakTime but clamped to breakTime, next iter current == breakTime.
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
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Generate the mathematically correct time grid first
            const dayStructure = generateDaySkeleton();
            const structureDescription = JSON.stringify(dayStructure, null, 2);

            // Execute generations in parallel for speed
            const generatePromises = targetClasses.map(async (targetClassId) => {
                const subjects = GES_STANDARD_CURRICULUM[targetClassId] || GES_STANDARD_CURRICULUM['Basic 1']; // Fallback
                
                const prompt = `
                    You are a professional school timetable scheduler. Your goal is to create a balanced, pedagogically sound weekly timetable for a class in Ghana (Level: ${targetClassId}).

                    **Constraints:**
                    1. **Time Grid:** Use the EXACT time slots provided below. Do not alter start/end times or insert new slots.
                    2. **Subjects:** Distribute subjects from this list: [${subjects.join(', ')}].
                    3. **Pedagogy:**
                       - **Core Subjects** (Math, English, Science) must be in the morning (before first break) or immediately after.
                       - **Activity Subjects** (Creative Arts, PE, Career Tech) are best in the afternoon.
                       - **Balance:** Avoid scheduling the same subject back-to-back unless it's a practical session.
                       - **Variety:** Ensure subjects are spread across the week.
                       - **Mandatory:** "Religious & Moral Education" and "Our World Our People" must appear at least once.
                       - **Friday:** Often used for Worship/Assembly or sports in afternoon.

                    **Pre-calculated Daily Grid (Apply to Mon-Fri):**
                    ${structureDescription}

                    **Specific User Instructions:**
                    ${customInstructions}

                    **Output:**
                    Return ONLY a valid JSON object.
                    Keys: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday".
                    Value: Array of objects with "subject", "startTime", "endTime", "teacher" (leave teacher as empty string).
                    
                    Ensure the "type": "Break" or "Worship" slots from the grid are preserved exactly with their names.
                `;

                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash', // Using faster model
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

                    const generatedData = JSON.parse(response.text);
                    
                    const newTimetable = {
                        id: targetClassId,
                        classId: targetClassId,
                        timetableData: generatedData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Save immediately to DB
                    await db.collection('timetables').doc(targetClassId).set(newTimetable);
                    return { success: true, classId: targetClassId, data: newTimetable };

                } catch (error) {
                    console.error(`Generation failed for ${targetClassId}`, error);
                    return { success: false, classId: targetClassId };
                }
            });

            const results = await Promise.all(generatePromises);
            const successful = results.filter(r => r.success);

            // Update local state if current class was generated
            const currentClassResult = successful.find(r => r.classId === classId);
            if (currentClassResult && currentClassResult.data) {
                setTimetable({
                    ...currentClassResult.data,
                    updatedAt: firebase.firestore.Timestamp.now()
                } as Timetable);
                setEditMode(true);
            }

            if (successful.length === targetClasses.length) {
                showToast(`Generated timetables for ${successful.length} classes successfully!`, "success");
            } else if (successful.length > 0) {
                showToast(`Generated ${successful.length}/${targetClasses.length} timetables. Some failed.`, "error");
            } else {
                showToast("Failed to generate timetables. Please try again.", "error");
            }
            
            setShowGenOptions(false);

        } catch (err: any) {
            console.error("AI Generation critical error:", err);
            showToast("Failed to generate timetable. Please try again.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
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

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

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
                                <Button onClick={handleGenerateAI} disabled={isGenerating} className="shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600">
                                    {isGenerating ? <span className="flex items-center gap-2"><Spinner /> Generating...</span> : '✨ Generate with AI'}
                                </Button>
                                {timetable && !editMode && !showGenOptions && (
                                    <Button variant="secondary" onClick={() => setEditMode(true)}>Edit Manually</Button>
                                )}
                                {editMode && (
                                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {showGenOptions && (
                            <div className="pt-4 border-t border-slate-700 animate-fade-in-down grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Apply to Classes ({targetClasses.length})</label>
                                    <div className="bg-slate-800 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar border border-slate-600">
                                        {GES_CLASSES.map(c => (
                                            <label key={c} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer text-sm">
                                                <input 
                                                    type="checkbox" 
                                                    checked={targetClasses.includes(c)} 
                                                    onChange={() => toggleClassSelection(c)}
                                                    className="rounded bg-slate-900 border-slate-500 text-blue-500 focus:ring-blue-500"
                                                />
                                                <span className={targetClasses.includes(c) ? 'text-white' : 'text-gray-400'}>{c}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs">
                                        <button onClick={() => setTargetClasses(GES_CLASSES)} className="text-blue-400 hover:text-blue-300">Select All</button>
                                        <button onClick={() => setTargetClasses([classId])} className="text-slate-500 hover:text-slate-300">Reset</button>
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Custom Instructions / Prompt</label>
                                    <textarea 
                                        value={customInstructions} 
                                        onChange={e => setCustomInstructions(e.target.value)}
                                        placeholder="E.g., 'Ensure Physical Education is on Friday morning' or 'Make Maths immediately after breaks'. 'Worship' and 'Breaks' are added automatically based on the times above."
                                        className="w-full h-40 p-3 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-500 text-slate-200"
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
                    <NotebookTimetable classId={classId} timetableData={timetable.timetableData} />
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
