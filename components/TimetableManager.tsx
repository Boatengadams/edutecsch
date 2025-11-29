
import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from '../services/firebase';
import { Timetable, TimetableData, TimetablePeriod, GES_STANDARD_CURRICULUM, GES_CLASSES } from '../types';
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

const TimetableManager: React.FC<TimetableManagerProps> = ({ classId, readOnly = false }) => {
    const { showToast } = useToast();
    const [timetable, setTimetable] = useState<Timetable | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Generator Settings
    const [startTime, setStartTime] = useState("08:00");
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

    const handleGenerateAI = async () => {
        if (targetClasses.length === 0) {
            showToast("Please select at least one class.", "error");
            return;
        }

        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let successCount = 0;

            // Iterate through selected classes
            for (const targetClassId of targetClasses) {
                const subjects = GES_STANDARD_CURRICULUM[targetClassId] || GES_STANDARD_CURRICULUM['Basic 1']; // Fallback
                
                const prompt = `
                    Generate a school timetable for a class in Ghana (Level: ${targetClassId}).
                    
                    **Constraints:**
                    - Days: Monday to Friday.
                    - Start Time: ${startTime}.
                    - Period Duration: ${periodDuration} minutes.
                    - First Break: At ${breakTime} for ${breakDuration} minutes. Label subject as "Snack Break".
                    - Second Break: At ${lunchTime} for ${lunchDuration} minutes. Label subject as "Lunch Break".
                    - Closing Time: Approximately 3:00 PM.
                    - Subjects to distribute: ${subjects.join(', ')}.
                    - Core subjects (Math, English, Science) should appear more frequently.
                    - Include a daily "Worship" or "Assembly" period at the very start.
                    
                    **Additional User Instructions:**
                    ${customInstructions}
                    
                    **Output Format:**
                    Return ONLY a valid JSON object matching this structure:
                    {
                        "Monday": [ { "subject": "Math", "startTime": "08:00", "endTime": "08:45" }, ... ],
                        "Tuesday": ...
                    }
                    
                    Ensure time slots are continuous.
                `;

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

                const generatedData = JSON.parse(response.text);
                
                const newTimetable = {
                    id: targetClassId,
                    classId: targetClassId,
                    timetableData: generatedData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Save immediately to DB
                await db.collection('timetables').doc(targetClassId).set(newTimetable);
                
                // If this is the currently viewed class, update local state
                if (targetClassId === classId) {
                    setTimetable({
                         ...newTimetable,
                         updatedAt: firebase.firestore.Timestamp.now()
                    });
                    setEditMode(true);
                }
                
                successCount++;
            }

            showToast(`Generated timetables for ${successCount} classes successfully!`, "success");
            setShowGenOptions(false);

        } catch (err: any) {
            console.error("AI Generation failed:", err);
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
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Period (mins)</label>
                                    <input type="number" value={periodDuration} onChange={e => setPeriodDuration(Number(e.target.value))} className="bg-slate-800 border border-slate-600 rounded p-1 text-sm w-16" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Snack Break</label>
                                    <input type="time" value={breakTime} onChange={e => setBreakTime(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1 text-sm" />
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowGenOptions(!showGenOptions)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showGenOptions ? 'bg-slate-700 text-white' : 'text-blue-400 hover:bg-slate-800'}`}
                                >
                                    {showGenOptions ? 'Hide Options' : 'Advanced Options'}
                                </button>
                                <Button onClick={handleGenerateAI} disabled={isGenerating} className="shadow-lg shadow-blue-500/20">
                                    {isGenerating ? <span className="flex items-center gap-2"><Spinner /> Generating ({targetClasses.length})...</span> : '✨ Generate with AI'}
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
                                        placeholder="E.g., 'Ensure Physical Education is on Friday morning' or 'Make Maths immediately after breaks'."
                                        className="w-full h-40 p-3 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {timetable ? (
                editMode ? (
                    <Card>
                        <h3 className="text-lg font-bold mb-4 text-yellow-400">Editing Mode</h3>
                        <div className="overflow-x-auto">
                            <div className="flex gap-4 min-w-max pb-4">
                                {DAYS.map(day => (
                                    <div key={day} className="w-64 space-y-2">
                                        <h4 className="font-bold text-center bg-slate-700 py-1 rounded">{day}</h4>
                                        {timetable.timetableData[day]?.map((period, idx) => (
                                            <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-600 text-sm space-y-1">
                                                <div className="flex gap-1">
                                                    <input 
                                                        type="time" 
                                                        value={period.startTime} 
                                                        onChange={e => updatePeriod(day, idx, 'startTime', e.target.value)}
                                                        className="bg-slate-900 w-full rounded px-1 text-xs text-gray-400"
                                                    />
                                                    <span className="text-gray-500">-</span>
                                                    <input 
                                                        type="time" 
                                                        value={period.endTime} 
                                                        onChange={e => updatePeriod(day, idx, 'endTime', e.target.value)}
                                                        className="bg-slate-900 w-full rounded px-1 text-xs text-gray-400"
                                                    />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={period.subject} 
                                                    onChange={e => updatePeriod(day, idx, 'subject', e.target.value)}
                                                    className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 font-semibold text-white"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Teacher (Optional)"
                                                    value={period.teacher || ''} 
                                                    onChange={e => updatePeriod(day, idx, 'teacher', e.target.value)}
                                                    className="w-full bg-slate-900 border-none rounded px-2 py-1 text-xs text-gray-300"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                ) : (
                    <NotebookTimetable classId={classId} timetableData={timetable.timetableData} />
                )
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
                    <p className="text-gray-500 text-lg">No timetable found for <strong>{classId}</strong>.</p>
                    {!readOnly && <p className="text-sm text-gray-600 mt-2">Use the controls above to generate one.</p>}
                </div>
            )}
        </div>
    );
};

export default TimetableManager;
