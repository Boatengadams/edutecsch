
import React, { useState, useEffect, useRef } from 'react';
import { db, storage, functions, firebase } from '../services/firebase';
import { SchoolEvent, SchoolEventType, SchoolEventAudience, EVENT_TYPES, EVENT_AUDIENCE, PublishedFlyer, UserRole } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import { GoogleGenAI, Modality } from '@google/genai';
import FlyerCard from './common/FlyerCard';
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

// Robust dataURI to Blob converter
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
    
    // Professional Flyer State
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
            setUploadedImage(file);
            setUploadedImagePreview(URL.createObjectURL(file));
        }
    };

    // 1. Search & Ideate Prompts
    const handleGenerateOptions = async () => {
        if (!title) {
            showToast("Please enter an event title first.", "error");
            return;
        }
        setFlyerStep('searching');
        setGenerationProgress("AI Engine: Analyzing trends & branding...");
        setGeneratedOptions([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const schoolName = schoolSettings?.schoolName || "EduTec School";
            const motto = schoolSettings?.schoolMotto || "Excellence";
            
            // SYSTEM INSTRUCTION INJECTION
            const systemInstruction = `
                Build an advanced AI Flyer Generator Engine that produces studio-quality, professional, modern, and outstanding school flyers that eliminate the need for any traditional flyer designer.

                The system must automatically search across multiple platforms (Google Images, Pinterest, Instagram, Behance, Dribbble, Facebook) for top-tier flyer inspirations in education, branding, design, and event promotion.

                Use these references to understand:
                • modern layout structures
                • color harmony & visual balance
                • premium typography styles
                • contrast & composition rules
                • high-impact educational flyer trends
                • branding integration techniques

                Using this intelligence, generate three (3) unique world-class flyer PROMPTS (for an image generation model) each time.
            `;

            const userPrompt = `
                Generate 3 prompts for the event: "${title}".
                Type: ${type}.
                Details: ${description}.
                School Name: "${schoolName}".
                Motto: "${motto}".
                Target Audience: ${audience}.
                ${uploadedImage ? "NOTE: The user has uploaded a photo to be integrated. The prompt must explicitly instruct the image generator to seamlessly blend a user-provided photo into the layout." : ""}

                Required Styles:
                1. Modern Premium (sleek, minimal, luxury-class)
                2. Creative Vibrant (colorful, energetic, youth-focused)
                3. Professional Academic (formal, clean, institutional)

                Output a JSON object with a "prompts" array. Each item should have "style" (string) and "prompt" (string).
                The prompt string must be extremely detailed for an image generator (like Imagen 3), specifying lighting, resolution (4k), typography style, and composition.
            `;

            const textResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: { 
                    systemInstruction: systemInstruction,
                    tools: [{ googleSearch: {} }],
                    responseMimeType: 'application/json' 
                }
            });
            
            const result = JSON.parse(textResponse.text || '{}');
            const prompts: {style: string, prompt: string}[] = result.prompts || [];

            if (prompts.length === 0) throw new Error("Failed to generate design prompts.");

            // Step B: Generate Images in Parallel (Nano Banana)
            setFlyerStep('generating');
            setGenerationProgress("Studio Engine: Rendering 3 high-fidelity concepts...");
            
            // Prepare uploaded image if exists
            let imagePart: { inlineData: { mimeType: string, data: string } } | null = null;
            if (uploadedImage) {
                const base64 = await blobToBase64(uploadedImage);
                imagePart = { inlineData: { mimeType: uploadedImage.type, data: base64 } };
            }

            const imagePromises = prompts.map(async (item, index) => {
                try {
                    const promptText = `
                        ${item.prompt}. 
                        Ensure the text "${title}" and "${schoolName}" is legible and professional. 
                        High resolution, 8k, photorealistic, graphic design masterpiece.
                    `;

                    const contents: any[] = [{ text: promptText }];
                    if (imagePart) {
                        // If user uploaded an image, we provide it as context/input for the model to use
                        contents.push(imagePart);
                        // Enhance prompt to ensure it uses the image
                        contents[0].text += " Use the provided image as the central focal point, blended professionally with the background.";
                    }

                    const imageRes = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: contents,
                        // config: { responseModalities: [Modality.IMAGE] } 
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
                    console.error(`Failed to generate image ${index}`, e);
                }
                return null;
            });

            const images = (await Promise.all(imagePromises)).filter(Boolean) as GeneratedOption[];
            
            if (images.length === 0) throw new Error("Image generation failed.");
            
            setGeneratedOptions(images);
            setFlyerStep('selecting');

        } catch (err: any) {
            console.error(err);
            showToast(`Design failed: ${err.message}`, 'error');
            setFlyerStep('idle');
        }
    };

    // 2. Edit Selected Image
    const handleEditImage = async () => {
        if (!selectedOption || !editPrompt.trim()) return;
        
        setIsEditingImage(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = selectedOption.imageUrl.split(',')[1];
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', 
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `Refine this flyer design. Instruction: ${editPrompt}. Maintain high resolution and text legibility. Keep the school branding.` },
                            { inlineData: { mimeType: 'image/png', data: base64Data } }
                        ]
                    }
                ]
            });

            const part = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part && part.inlineData) {
                const newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
                
                // Update selected option with new version
                setSelectedOption({
                    ...selectedOption,
                    imageUrl: newImageUrl
                });
                setEditPrompt(''); // Clear prompt
                showToast("Design refined successfully!", "success");
            } else {
                throw new Error("No image returned from edit.");
            }
        } catch (err: any) {
            console.error(err);
            showToast("Edit failed. Try a different prompt.", "error");
        } finally {
            setIsEditingImage(false);
        }
    };

    // 3. Save Event & Publish Flyer
    const handleSaveAll = async () => {
        if (!title || !date) {
            showToast("Please complete event details.", "error");
            return;
        }
        
        setIsSaving(true);
        try {
            // A. Save Calendar Event
            const newEvent: Omit<SchoolEvent, 'id'> = {
                title,
                description,
                date,
                type,
                audience,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                createdBy: 'admin',
                createdByName: 'Administrator'
            };
            
            // Start Event Save
            const eventPromise = db.collection('calendarEvents').add(newEvent);

            // B. Upload & Save Flyer (if selected)
            let flyerPromise = Promise.resolve(null as any);
            
            if (selectedOption) {
                // Optimized: Convert Data URL to Blob directly without fetch (prevents hanging)
                const blob = dataURItoBlob(selectedOption.imageUrl);
                
                if (!blob) throw new Error("Failed to process image data.");
                
                // Upload logic
                const fileName = `flyers/${Date.now()}_${title.replace(/\s+/g, '_')}.png`;
                const storageRef = storage.ref(fileName);
                
                // Upload with retry logic handled implicitly by Firebase SDK, but we wrap in a promise chain for UI feedback
                flyerPromise = storageRef.put(blob)
                    .then(async (snapshot) => {
                         const downloadURL = await snapshot.ref.getDownloadURL();
                         
                         // Determine target roles
                         let targetRoles: UserRole[] = [];
                         if (audience === 'Students') targetRoles = ['student'];
                         else if (audience === 'Parents') targetRoles = ['parent'];
                         else if (audience === 'Teachers') targetRoles = ['teacher'];

                         const flyerData: Omit<PublishedFlyer, 'id'> = {
                             title: `📢 ${title}`,
                             content: description || `Upcoming ${type}: ${title}`,
                             imageUrl: downloadURL,
                             targetAudience: audience === 'All' ? 'all' : 'role',
                             publisherId: 'admin-auto',
                             publisherName: 'School Admin',
                             createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                             ...(targetRoles.length > 0 ? { targetRoles } : {})
                         };

                         await db.collection('publishedFlyers').add(flyerData);
                         
                         // C. Dispatch Notifications via Cloud Function (Fire-and-forget / Non-blocking)
                         const broadcastFn = functions.httpsCallable('sendBroadcastNotification');
                         
                         // We do NOT await this, so the UI unlocks immediately.
                         broadcastFn({
                             title: `New Flyer: ${title}`,
                             message: description || "Check the notice board for details.",
                             targetAudience: audience === 'All' ? 'all' : 'role',
                             targetRoles: targetRoles
                         }).catch(err => console.error("Notification broadcast failed:", err));

                         return true;
                    })
                    .catch((error) => {
                         console.error("Storage upload failed:", error);
                         throw new Error("Failed to upload flyer image. Please try again.");
                    });
            }

            // Wait for critical data writes (Event + Flyer Doc)
            await Promise.all([eventPromise, flyerPromise]);

            showToast('Event and Flyer published successfully!', 'success');
            resetForm();

        } catch (err: any) {
            console.error(err);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDate('');
        setShowFlyerDesigner(false);
        setFlyerStep('idle');
        setGeneratedOptions([]);
        setSelectedOption(null);
        setUploadedImage(null);
        setUploadedImagePreview(null);
    };

    const handleDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await db.collection('calendarEvents').doc(eventToDelete).delete();
            showToast('Event deleted successfully', 'success');
        } catch (err: any) {
            showToast(`Error deleting event: ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setEventToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* UI Content same as before, no changes needed to JSX structure */}
            <h2 className="text-3xl font-bold">School Calendar & Events</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <h3 className="text-lg font-bold mb-4">Add New Event</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700" placeholder="e.g. Science Fair 2025" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Date</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select value={type} onChange={e => setType(e.target.value as SchoolEventType)} className="w-full p-2 bg-slate-800 rounded border border-slate-700">
                                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Audience</label>
                                    <select value={audience} onChange={e => setAudience(e.target.value as SchoolEventAudience)} className="w-full p-2 bg-slate-800 rounded border border-slate-700">
                                        {EVENT_AUDIENCE.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Details (Optional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 bg-slate-800 rounded border border-slate-700" placeholder="Additional info..." />
                            </div>
                            
                            {/* Flyer Designer Toggle */}
                            {!showFlyerDesigner && (
                                <Button variant="secondary" onClick={() => setShowFlyerDesigner(true)} className="w-full bg-gradient-to-r from-purple-900/40 to-blue-900/40 text-white hover:from-purple-900/60 hover:to-blue-900/60 border border-purple-500/30">
                                    ✨ Open Flyer Studio
                                </Button>
                            )}

                            {/* Embedded Flyer Designer */}
                            {showFlyerDesigner && (
                                <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/50 animate-fade-in-down shadow-2xl">
                                    <div className="flex justify-between items-center mb-3 border-b border-purple-500/20 pb-2">
                                        <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
                                            <span className="text-lg">🎨</span> AI Flyer Engine
                                        </h4>
                                        <button onClick={() => setShowFlyerDesigner(false)} className="text-slate-500 hover:text-white">&times;</button>
                                    </div>
                                    
                                    {/* STEP 1: Initial State */}
                                    {flyerStep === 'idle' && (
                                        <div className="space-y-4">
                                            <div className="bg-slate-800/50 p-3 rounded-lg border border-dashed border-slate-600">
                                                <p className="text-xs text-slate-400 mb-2 font-bold uppercase">Optional: Add Photo</p>
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => fileInputRef.current?.click()} 
                                                        className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600 hover:bg-slate-700 transition-colors"
                                                    >
                                                        {uploadedImagePreview ? (
                                                            <img src={uploadedImagePreview} className="w-full h-full object-cover rounded-lg" alt="Preview" />
                                                        ) : (
                                                            <span className="text-2xl">📷</span>
                                                        )}
                                                    </button>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-slate-500">
                                                            Upload a picture to integrate into the design (e.g. school building, logo, or students).
                                                        </p>
                                                        <input 
                                                            type="file" 
                                                            ref={fileInputRef} 
                                                            className="hidden" 
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                        />
                                                    </div>
                                                    {uploadedImage && (
                                                        <button onClick={() => { setUploadedImage(null); setUploadedImagePreview(null); }} className="text-red-400 hover:text-red-300">
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <Button onClick={handleGenerateOptions} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-3 font-bold shadow-lg shadow-purple-900/30">
                                                🚀 Generate Professional Concepts
                                            </Button>
                                            <p className="text-[10px] text-center text-slate-500">
                                                Powered by Google Search & Imagen 3
                                            </p>
                                        </div>
                                    )}

                                    {/* STEP 2 & 3: Loading */}
                                    {(flyerStep === 'searching' || flyerStep === 'generating') && (
                                        <div className="text-center py-8">
                                            <Spinner />
                                            <p className="text-xs text-purple-300 mt-4 animate-pulse font-mono">{generationProgress}</p>
                                        </div>
                                    )}

                                    {/* STEP 4: Selection */}
                                    {flyerStep === 'selecting' && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400 font-bold uppercase">Select a Design:</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {generatedOptions.map(opt => (
                                                    <div 
                                                        key={opt.id} 
                                                        onClick={() => { setSelectedOption(opt); setFlyerStep('editing'); }}
                                                        className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 cursor-pointer relative group transition-all hover:scale-105 shadow-md"
                                                    >
                                                        <img src={opt.imageUrl} alt="Option" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                                            <span className="text-white font-bold text-xs">{opt.style}</span>
                                                            <span className="text-[10px] text-purple-300 mt-1">Click to Select</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button size="sm" variant="secondary" onClick={handleGenerateOptions} className="w-full text-xs">
                                                ↻ Regenerate All
                                            </Button>
                                        </div>
                                    )}

                                    {/* STEP 5: Editing */}
                                    {flyerStep === 'editing' && selectedOption && (
                                        <div className="space-y-3">
                                            <div className="relative rounded-lg overflow-hidden border border-purple-500/50 shadow-lg group">
                                                <img src={selectedOption.imageUrl} alt="Selected" className="w-full h-auto" />
                                                <button 
                                                    onClick={() => setFlyerStep('selecting')} 
                                                    className="absolute top-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-xs hover:bg-black backdrop-blur-md transition-opacity opacity-0 group-hover:opacity-100"
                                                >
                                                    ← Change Design
                                                </button>
                                                <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-[10px] backdrop-blur-md font-mono">
                                                    {selectedOption.style}
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-800 p-2 rounded-lg">
                                                <p className="text-[10px] text-slate-400 mb-1 uppercase font-bold">AI Editor</p>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={editPrompt} 
                                                        onChange={e => setEditPrompt(e.target.value)} 
                                                        placeholder="E.g. Make the title text larger..." 
                                                        className="flex-grow p-2 bg-slate-900 rounded border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
                                                    />
                                                    <button 
                                                        onClick={handleEditImage} 
                                                        disabled={isEditingImage || !editPrompt}
                                                        className="bg-purple-600 text-white px-3 rounded hover:bg-purple-500 disabled:opacity-50 transition-colors"
                                                    >
                                                        {isEditingImage ? <Spinner /> : '✨'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button onClick={handleSaveAll} disabled={isSaving || (showFlyerDesigner && flyerStep !== 'editing' && flyerStep !== 'selecting' && flyerStep !== 'idle' && !selectedOption)} className="w-full mt-4 shadow-lg shadow-green-900/20 bg-green-600 hover:bg-green-500">
                                {isSaving ? 'Publishing...' : (selectedOption ? 'Publish Event & Flyer' : 'Publish Event Only')}
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
                        {loading ? <Spinner /> : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {events.length === 0 ? <p className="text-gray-500">No events scheduled.</p> : 
                                events.map(event => (
                                    <div key={event.id} className="flex justify-between items-center p-4 bg-slate-800 rounded-lg border-l-4 border-blue-500 hover:bg-slate-700 transition-colors group">
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{event.title}</h4>
                                            <div className="flex gap-3 text-sm text-gray-400 mt-1">
                                                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                                <span>🏷️ {event.type}</span>
                                                <span>👥 {event.audience}</span>
                                            </div>
                                            {event.description && <p className="text-sm text-slate-500 mt-2">{event.description}</p>}
                                        </div>
                                        <button onClick={() => setEventToDelete(event.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-900/50 rounded-lg opacity-0 group-hover:opacity-100" title="Delete Event">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                confirmButtonText="Yes, Delete"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AdminCalendar;
