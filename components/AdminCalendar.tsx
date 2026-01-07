import React, { useState, useEffect, useRef } from 'react';
import { db, storage, functions, firebase } from '../services/firebase';
import { SchoolEvent, SchoolEventType, SchoolEventAudience, EVENT_TYPES, EVENT_AUDIENCE, PublishedFlyer, UserRole } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import { GoogleGenAI } from '@google/genai';
import { useAuthentication } from '../hooks/useAuth';
import ConfirmationModal from './common/ConfirmationModal';

interface GeneratedOption {
    id: number;
    imageUrl: string;
    prompt: string;
    style: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const dataURItoBlob = (dataURI: string) => {
    try {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    } catch (e) {
        console.error("Error converting data URI to blob:", e);
        return null;
    }
};

const AdminCalendar: React.FC = () => {
    const { showToast } = useToast();
    const { schoolSettings } = useAuthentication();
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<SchoolEventType>('Event');
    const [audience, setAudience] = useState<SchoolEventAudience>('All');
    
    // Designer State
    const [showFlyerDesigner, setShowFlyerDesigner] = useState(false);
    const [flyerStep, setFlyerStep] = useState<'idle' | 'searching' | 'generating' | 'selecting' | 'editing'>('idle');
    const [generatedOptions, setGeneratedOptions] = useState<GeneratedOption[]>([]);
    const [selectedOption, setSelectedOption] = useState<GeneratedOption | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [generationProgress, setGenerationProgress] = useState('');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = db.collection('calendarEvents')
            .orderBy('date', 'asc')
            .onSnapshot(snapshot => {
                const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent));
                setEvents(fetchedEvents);
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                showToast("File size too large. Please upload an image under 5MB.", "error");
                return;
            }
            if (!file.type.startsWith('image/')) {
                showToast("Invalid file type. Please upload a valid image (JPG, PNG).", "error");
                return;
            }
            setUploadedImage(file);
            setUploadedImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleGenerateOptions = async () => {
        if (!title) {
            showToast("Please enter an event title first.", "error");
            return;
        }
        setFlyerStep('searching');
        setGenerationProgress("Synthesizing Design Intelligence...");
        setGeneratedOptions([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const schoolName = schoolSettings?.schoolName || "EduTec School";
            const motto = schoolSettings?.schoolMotto || "Excellence";
            
            const systemInstruction = `
                You are a senior world-class graphic designer specializing in high-end academic and luxury branding. 
                Generate three unique, distinct, and professional flyer concepts.
                Styles to produce: 
                1. Neo-Brutalist (Bold yellow/black, thick borders)
                2. Glassmorphism (Frosty indigo/white, elegant)
                3. Modern Premium (Sleek dark theme, high saturation accents)
                Return a JSON object with a "prompts" array.
            `;

            const userPrompt = `
                Create 3 prompts for the event: "${title}".
                Details: ${description}.
                School: "${schoolName}". Motto: "${motto}".
                Target: ${audience}.
                Output format: { "prompts": [ { "style": "string", "prompt": "very detailed image prompt here" } ] }
            `;

            const textResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: { 
                    systemInstruction: systemInstruction,
                    responseMimeType: 'application/json' 
                }
            });
            
            const result = JSON.parse(textResponse.text || '{}');
            const prompts: {style: string, prompt: string}[] = result.prompts || [];

            setFlyerStep('generating');
            setGenerationProgress("Neural Rendering 4K Concepts...");
            
            let imagePart: { inlineData: { mimeType: string, data: string } } | null = null;
            if (uploadedImage) {
                const base64 = await blobToBase64(uploadedImage);
                imagePart = { inlineData: { mimeType: uploadedImage.type, data: base64 } };
            }

            const imagePromises = prompts.map(async (item, index) => {
                try {
                    const promptText = `${item.prompt}. Ensure the text "${title}" and "${schoolName}" is extremely crisp, legible, and part of the professional design.`;
                    const contents: any[] = [{ text: promptText }];
                    if (imagePart) contents.push(imagePart);

                    const imageRes = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: contents
                    });
                    
                    const part = imageRes?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part && part.inlineData) {
                        return {
                            id: index,
                            imageUrl: `data:image/png;base64,${part.inlineData.data}`,
                            prompt: item.prompt,
                            style: item.style
                        };
                    }
                } catch (e) {
                    console.error(`Render failed ${index}`, e);
                }
                return null;
            });

            const images = (await Promise.all(imagePromises)).filter(Boolean) as GeneratedOption[];
            if (images.length === 0) throw new Error("Neural engine rejected the prompt.");
            
            setGeneratedOptions(images);
            setFlyerStep('selecting');

        } catch (err: any) {
            showToast(`Engine Fault: ${err.message}`, 'error');
            setFlyerStep('idle');
        }
    };

    const handleBroadcast = async () => {
        if (!title || !date) {
            showToast("Required: Title and Date.", "error");
            return;
        }
        
        setIsSaving(true);
        try {
            // 1. Create the Calendar Record
            const eventRef = db.collection('calendarEvents').doc();
            await eventRef.set({
                title,
                description,
                date,
                type,
                audience,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: 'admin'
            });

            // 2. Process and Broadcast Flyer
            if (selectedOption) {
                const blob = dataURItoBlob(selectedOption.imageUrl);
                if (!blob) throw new Error("Image buffer corrupted.");
                
                const fileName = `flyers/${eventRef.id}.png`;
                const storageRef = storage.ref(fileName);
                await storageRef.put(blob);
                const downloadURL = await storageRef.getDownloadURL();

                const flyerData: Omit<PublishedFlyer, 'id'> = {
                    title: `Broadcast: ${title}`,
                    content: description || title,
                    imageUrl: downloadURL,
                    targetAudience: audience === 'All' ? 'all' : 'role',
                    publisherId: 'admin',
                    publisherName: 'School Executive Command',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() as any,
                    targetRoles: audience === 'All' ? ['student', 'teacher', 'parent'] : 
                                 audience === 'Students' ? ['student'] : 
                                 audience === 'Teachers' ? ['teacher'] : ['parent']
                };

                await db.collection('publishedFlyers').add(flyerData);
                
                // 3. Trigger Global Alerts via Cloud Function
                const broadcastFn = functions.httpsCallable('sendBroadcastNotification');
                broadcastFn({
                    title: `📢 New School Broadcast`,
                    message: title,
                    targetAudience: flyerData.targetAudience,
                    targetRoles: flyerData.targetRoles
                }).catch(err => console.warn("Broadcast alert failed:", err));
            }

            showToast('Global Broadcast Successfully Deployed 🚀', 'success');
            resetForm();

        } catch (err: any) {
            showToast(`Broadcast Interrupted: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setTitle(''); setDescription(''); setDate('');
        setShowFlyerDesigner(false); setFlyerStep('idle');
        setGeneratedOptions([]); setSelectedOption(null);
        setUploadedImage(null); setUploadedImagePreview(null);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase">School <span className="text-blue-500">Notice Board</span></h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mt-2">Executive Broadcast Terminal</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="!bg-slate-900/60 border-white/5">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Dispatch Details</h3>
                        <div className="space-y-4">
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-500" placeholder="Headline" />
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm text-white" />
                            <div className="grid grid-cols-2 gap-4">
                                <select value={type} onChange={e => setType(e.target.value as any)} className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-bold uppercase">
                                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={audience} onChange={e => setAudience(e.target.value as any)} className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-bold uppercase">
                                    {EVENT_AUDIENCE.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm outline-none resize-none" placeholder="Announcement details..." />
                            
                            {!showFlyerDesigner ? (
                                <button onClick={() => setShowFlyerDesigner(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-blue-500/30 text-blue-400 font-black uppercase text-[10px] tracking-widest hover:bg-blue-500/5 transition-all">
                                    ✨ Start Flyer Designer
                                </button>
                            ) : (
                                <div className="bg-slate-950 p-6 rounded-3xl border border-blue-500/50 space-y-6">
                                    {flyerStep === 'idle' && (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-slate-900 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                                                    {uploadedImagePreview ? <img src={uploadedImagePreview} className="w-full h-full object-cover" /> : <span className="text-2xl">📸</span>}
                                                </button>
                                                <div className="flex-1"><p className="text-[10px] text-slate-500 font-bold uppercase leading-tight">Add Visual Asset (Optional)</p></div>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </div>
                                            <Button onClick={handleGenerateOptions} className="w-full py-4 text-[10px] font-black tracking-widest uppercase">Generate Design Concepts</Button>
                                        </>
                                    )}

                                    {(flyerStep === 'searching' || flyerStep === 'generating') && (
                                        <div className="text-center py-10 space-y-4">
                                            <Spinner />
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">{generationProgress}</p>
                                        </div>
                                    )}

                                    {flyerStep === 'selecting' && (
                                        <div className="grid grid-cols-3 gap-3">
                                            {generatedOptions.map(opt => (
                                                <button key={opt.id} onClick={() => { setSelectedOption(opt); setFlyerStep('editing'); }} className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all hover:scale-105 shadow-2xl">
                                                    <img src={opt.imageUrl} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {flyerStep === 'editing' && selectedOption && (
                                        <div className="space-y-4">
                                            <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                                                <img src={selectedOption.imageUrl} className="w-full h-auto" />
                                                <button onClick={() => setFlyerStep('selecting')} className="absolute top-4 left-4 bg-black/60 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">Change Design</button>
                                            </div>
                                            <Button onClick={() => setFlyerStep('idle')} variant="secondary" className="w-full py-2 !text-[9px] uppercase">Discard Visuals</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button onClick={handleBroadcast} disabled={isSaving} className="w-full py-5 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/50 rounded-[2rem]">
                                {isSaving ? 'Broadcasting...' : '🚀 DEPLOY GLOBAL BROADCAST'}
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-8">
                    <Card className="h-full !p-8">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8">Active Dispatches</h3>
                        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar">
                            {events.length === 0 ? (
                                <div className="text-center py-40 opacity-20"><span className="text-8xl">📡</span><p className="mt-4 font-black uppercase tracking-[0.5em]">No transmissions</p></div>
                            ) : events.map(event => (
                                <div key={event.id} className="flex justify-between items-center p-6 bg-slate-950 border border-white/5 rounded-[2rem] hover:bg-slate-900 transition-all group">
                                    <div className="flex gap-6 items-center">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl border border-blue-500/20">{event.type === 'Holiday' ? '🌴' : '📅'}</div>
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{event.title}</h4>
                                            <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase mt-2">
                                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {event.date}</span>
                                                <span className="opacity-40">|</span>
                                                <span>Target: {event.audience}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setEventToDelete(event.id)} className="p-3 text-slate-700 hover:text-red-500 bg-white/5 rounded-xl transition-colors opacity-0 group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)}
                onConfirm={async () => {
                    setIsDeleting(true);
                    await db.collection('calendarEvents').doc(eventToDelete!).delete();
                    setIsDeleting(false); setEventToDelete(null);
                    showToast('Transmission Revoked', 'success');
                }}
                title="Revoke Transmission"
                message="Are you sure? This will remove the event from all student and staff calendars."
                confirmButtonText="Yes, Revoke" isLoading={isDeleting}
            />
        </div>
    );
};

export default AdminCalendar;