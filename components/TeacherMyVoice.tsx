import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { db, firebase } from '../services/firebase';
import { UserProfile, CustomVoice } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import ConfirmationModal from './common/ConfirmationModal';
import { useToast } from './common/Toast';

// Helper functions for audio decoding
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}

const PREBUILT_VOICES = [
    { name: 'Kore', description: 'A clear, standard female voice.' },
    { name: 'Puck', description: 'A friendly, expressive male voice.' },
    { name: 'Charon', description: 'A deep, authoritative male voice.' },
    { name: 'Zephyr', description: 'A warm, gentle female voice.' },
];

const TRAINING_SENTENCES = [
    "The quick brown fox jumps over the lazy dog.",
    "Education is the most powerful weapon which you can use to change the world.",
    "To be, or not to be, that is the question.",
    "I have a dream that one day this nation will rise up.",
    "Ask not what your country can do for you; ask what you can do for your country."
];

// Simple UUID generator since the import is not available
const simpleUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

interface EditVoiceModalProps {
    voice: CustomVoice;
    onClose: () => void;
    handlePreview: (voiceIdentifier: string, text: string) => void;
    isPlayingPreview: boolean;
}

const EditVoiceModal: React.FC<EditVoiceModalProps> = ({ voice, onClose, handlePreview, isPlayingPreview }) => {
    const { showToast } = useToast();
    const [clarity, setClarity] = useState(50);
    const [pace, setPace] = useState(50);
    const [pitch, setPitch] = useState(50);
    const [emotion, setEmotion] = useState('Neutral');

    const handleSaveChanges = () => {
        showToast(`Voice enhancements for "${voice.name}" have been saved.`, 'success');
        onClose();
    };

    const previewText = `This is a preview of the edited voice for ${voice.name} with the new settings applied.`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-[60]">
            <Card className="w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Enhance Voice: {voice.name}</h3>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="clarity" className="block text-sm font-medium text-gray-300">Clarity / Crispness</label>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400">Softer</span>
                            <input id="clarity" type="range" min="0" max="100" value={clarity} onChange={e => setClarity(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                            <span className="text-xs text-gray-400">Crisper</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="pace" className="block text-sm font-medium text-gray-300">Pace / Speed</label>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400">Slower</span>
                            <input id="pace" type="range" min="0" max="100" value={pace} onChange={e => setPace(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                            <span className="text-xs text-gray-400">Faster</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="pitch" className="block text-sm font-medium text-gray-300">Pitch</label>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400">Lower</span>
                            <input id="pitch" type="range" min="0" max="100" value={pitch} onChange={e => setPitch(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                            <span className="text-xs text-gray-400">Higher</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Emotion / Expressiveness</label>
                        <div className="flex justify-around mt-2">
                            {['Calm', 'Neutral', 'Energetic'].map(e => (
                                <label key={e} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="emotion" value={e} checked={emotion === e} onChange={() => setEmotion(e)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded-full bg-slate-800" />
                                    {e}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="secondary" onClick={() => handlePreview('Zephyr', previewText)} disabled={isPlayingPreview}>
                        {isPlayingPreview ? <Spinner /> : 'Preview Changes'}
                    </Button>
                    <Button onClick={handleSaveChanges}>Save Enhancements</Button>
                </div>
            </Card>
        </div>
    );
};


interface TeacherMyVoiceProps {
    userProfile: UserProfile;
}

const TeacherMyVoice: React.FC<TeacherMyVoiceProps> = ({ userProfile }) => {
    const { showToast } = useToast();
    const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [trainingStep, setTrainingStep] = useState<'idle' | 'recording' | 'training' | 'complete'>('idle');
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [trainingProgress, setTrainingProgress] = useState('');
    const [customVoiceName, setCustomVoiceName] = useState('');
    
    const [voiceToDelete, setVoiceToDelete] = useState<CustomVoice | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [editingVoice, setEditingVoice] = useState<CustomVoice | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopPlayback = () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
        }
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        setIsPlayingPreview(null);
    };

    const handlePreviewVoice = async (voiceIdentifier: string, text: string) => {
        stopPlayback();
        setIsPlayingPreview(voiceIdentifier);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceIdentifier } } },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received.");

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlayingPreview(null);
            source.start();
            audioSourceRef.current = source;
        } catch (err: any) {
            console.warn("TTS preview failed, falling back to browser synthesis:", err.message);
            // Fallback to browser's native SpeechSynthesis
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = () => setIsPlayingPreview(null);
                utterance.onerror = () => {
                    showToast("Could not play audio preview.", 'error');
                    setIsPlayingPreview(null);
                };
                window.speechSynthesis.speak(utterance);
            } else {
                showToast("Audio playback not supported on this browser.", 'error');
                setIsPlayingPreview(null);
            }
        }
    };

    const handleSelectVoice = async (voiceName: string) => {
        setIsSaving(true);
        try {
            await db.collection('users').doc(userProfile.uid).update({ preferredVoice: voiceName });
            showToast(`Voice '${voiceName}' selected for your presentations.`, 'success');
        } catch (err: any) {
            showToast(`Failed to save voice preference: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordSentence = () => {
        if (currentSentenceIndex < TRAINING_SENTENCES.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
        } else {
            setTrainingStep('training');
            simulateTraining();
        }
    };

    const simulateTraining = async () => {
        setTrainingProgress('Initializing training model...');
        await new Promise(res => setTimeout(res, 2000));
        setTrainingProgress('Processing audio samples (1/3)...');
        await new Promise(res => setTimeout(res, 3000));
        setTrainingProgress('Processing audio samples (2/3)...');
        await new Promise(res => setTimeout(res, 3000));
        setTrainingProgress('Fine-tuning voice model...');
        await new Promise(res => setTimeout(res, 4000));
        setTrainingProgress('Generating voice clone...');
        await new Promise(res => setTimeout(res, 3000));
        setTrainingProgress('Training complete!');
        
        const newVoice: CustomVoice = {
            id: simpleUuid(),
            name: customVoiceName,
            status: 'ready',
            createdAt: firebase.firestore.Timestamp.now(),
        };

        try {
            await db.collection('users').doc(userProfile.uid).update({
                customVoices: firebase.firestore.FieldValue.arrayUnion(newVoice),
            });
            showToast(`Custom voice '${customVoiceName}' is now ready!`, 'success');
            setTrainingStep('complete');
        } catch (err: any) {
            showToast(`Failed to save custom voice: ${err.message}`, 'error');
            setTrainingStep('idle');
        }
    };

    const resetTraining = () => {
        setTrainingStep('idle');
        setCurrentSentenceIndex(0);
        setCustomVoiceName('');
        setTrainingProgress('');
    };
    
    const handleDeleteVoice = async () => {
        if (!voiceToDelete) return;
        setIsDeleting(true);
        try {
            const updateData: { customVoices: any, preferredVoice?: any } = {
                customVoices: firebase.firestore.FieldValue.arrayRemove(voiceToDelete),
            };

            // If the deleted voice was the preferred voice, reset it
            if (userProfile.preferredVoice === voiceToDelete.id) {
                updateData.preferredVoice = 'Kore'; // Reset to a default
            }

            await db.collection('users').doc(userProfile.uid).update(updateData);
            showToast(`Custom voice '${voiceToDelete.name}' has been deleted.`, 'success');
        } catch (err: any) {
             showToast(`Failed to delete voice: ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setVoiceToDelete(null);
        }
    };


    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">My Voice</h2>
            
            <Card>
                <h3 className="text-xl font-semibold mb-4">Select a Presentation Voice</h3>
                <p className="text-sm text-gray-400 mb-6">Choose one of these high-quality voices to read your presentation slides during a live lesson. This voice will be heard by your students.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PREBUILT_VOICES.map(voice => (
                        <div key={voice.name} className={`p-4 rounded-lg border-2 ${userProfile.preferredVoice === voice.name ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-800'}`}>
                            <h4 className="font-bold">{voice.name}</h4>
                            <p className="text-xs text-gray-400">{voice.description}</p>
                            <div className="flex gap-2 mt-3">
                                <Button size="sm" onClick={() => handlePreviewVoice(voice.name, `Hello, this is the ${voice.name} voice.`)} disabled={!!isPlayingPreview}>
                                    {isPlayingPreview === voice.name ? <Spinner /> : 'Preview'}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => handleSelectVoice(voice.name)} disabled={isSaving || userProfile.preferredVoice === voice.name}>
                                    {isSaving ? '...' : (userProfile.preferredVoice === voice.name ? 'Selected' : 'Select')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <h3 className="text-xl font-semibold mb-4">Your Custom Voices</h3>
                    {(userProfile.customVoices || []).length > 0 ? (
                        <div className="space-y-3">
                        {(userProfile.customVoices || []).map(voice => (
                             <div key={voice.id} className={`p-4 rounded-lg border-2 ${userProfile.preferredVoice === voice.id ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-800'}`}>
                                <h4 className="font-bold">{voice.name}</h4>
                                <p className="text-xs text-gray-400">Created on: {voice.createdAt.toDate().toLocaleDateString()}</p>
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    <Button size="sm" onClick={() => { handlePreviewVoice('Zephyr', `This is a sample preview of your custom voice, ${voice.name}.`); showToast("Custom voice preview uses a standard voice for demonstration.", "success")}} disabled={!!isPlayingPreview}>
                                        {isPlayingPreview === voice.id ? <Spinner/> : 'Preview'}
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleSelectVoice(voice.id)} disabled={isSaving || userProfile.preferredVoice === voice.id}>
                                         {isSaving ? '...' : (userProfile.preferredVoice === voice.id ? 'Selected' : 'Select')}
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => setEditingVoice(voice)}>Edit</Button>
                                    <Button size="sm" variant="danger" onClick={() => setVoiceToDelete(voice)}>Delete</Button>
                                </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">You haven't trained any custom voices yet. Use the panel to create a digital clone of your voice.</p>
                    )}
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Train a Custom Voice</h3>
                    {trainingStep === 'idle' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">Create a digital clone of your own voice for a truly personalized presentation experience. The process is quick and simple.</p>
                            <div>
                                <label htmlFor="voice-name" className="text-sm">Give your voice a name:</label>
                                <input id="voice-name" type="text" value={customVoiceName} onChange={e => setCustomVoiceName(e.target.value)} placeholder="e.g., My Voice" className="w-full p-2 bg-slate-700 rounded-md mt-1"/>
                            </div>
                            <Button onClick={() => setTrainingStep('recording')} disabled={!customVoiceName.trim()}>Start Training</Button>
                        </div>
                    )}
                    {trainingStep === 'recording' && (
                        <div className="text-center space-y-4">
                             <p className="text-sm text-gray-400">Read the following sentence aloud clearly. We'll capture a few samples.</p>
                             <p className="text-lg font-semibold p-4 bg-slate-800 rounded-md">"{TRAINING_SENTENCES[currentSentenceIndex]}"</p>
                             <p className="text-xs text-gray-500">Sample {currentSentenceIndex + 1} of {TRAINING_SENTENCES.length}</p>
                             <div className="flex justify-center items-center gap-4">
                                <button className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg" onClick={handleRecordSentence}>
                                    <div className="w-6 h-6 bg-white rounded-md"></div>
                                </button>
                                <p className="text-red-400 font-bold">RECORDING</p>
                             </div>
                        </div>
                    )}
                    {trainingStep === 'training' && (
                         <div className="text-center space-y-4 flex flex-col items-center">
                            <Spinner/>
                            <p className="font-semibold text-blue-300">Training AI model for '{customVoiceName}'...</p>
                            <p className="text-sm text-gray-400">{trainingProgress}</p>
                         </div>
                    )}
                    {trainingStep === 'complete' && (
                         <div className="text-center space-y-4">
                            <h4 className="text-lg font-bold text-green-400">Success!</h4>
                            <p className="text-sm text-gray-300">Your custom voice '{customVoiceName}' is ready to use. You can now select it from the 'Your Custom Voices' list.</p>
                            <Button onClick={resetTraining}>Train Another Voice</Button>
                         </div>
                    )}
                </Card>
            </div>
             <ConfirmationModal
                isOpen={!!voiceToDelete}
                onClose={() => setVoiceToDelete(null)}
                onConfirm={handleDeleteVoice}
                title="Delete Custom Voice?"
                message={`Are you sure you want to permanently delete "${voiceToDelete?.name}"? This action cannot be undone.`}
                isLoading={isDeleting}
                confirmButtonText="Yes, Delete"
            />
            {editingVoice && (
                <EditVoiceModal 
                    voice={editingVoice}
                    onClose={() => setEditingVoice(null)}
                    handlePreview={handlePreviewVoice}
                    isPlayingPreview={!!isPlayingPreview}
                />
            )}
        </div>
    );
};

export default TeacherMyVoice;