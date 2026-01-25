import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GES_CLASSES, UserProfile } from '../types';
import type { ParsedUser, UserRole } from '../types';
import { useBatchCreateUsers } from '../hooks/useBatchCreateUsers';
import { useAuthentication } from '../hooks/useAuth';
import { storage } from '../services/firebase';
import { checkRateLimit, validateString } from '../utils/security';

// Simple UUID generator
const simpleUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

// Helper to convert dataURL to Blob for upload
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

const CameraModal: React.FC<{ onClose: () => void; onCapture: (dataUrl: string) => void; }> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState('');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                setCameraError("Could not access camera. Please check permissions.");
            }
        };
        startCamera();
        return () => {
            if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); }
        };
    }, [facingMode]);

    const handleCapture = () => {
        const video = videoRef.current;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                if (facingMode === 'user') {
                    context.translate(canvas.width, 0);
                    context.scale(-1, 1);
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                setCapturedImage(canvas.toDataURL('image/jpeg'));
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 flex justify-center items-center p-4 z-[150] backdrop-blur-xl animate-fade-in">
            <Card className="w-full max-w-xl animate-fade-in-up !bg-slate-900 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <span className="text-blue-400">📸</span> Sensor Input
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
                 </div>
                 
                 {cameraError ? <p className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 text-xs font-bold uppercase">{cameraError}</p> : (
                    <div className="space-y-6">
                        <div className="bg-black rounded-3xl overflow-hidden aspect-video relative border-2 border-white/5 shadow-inner group">
                            {capturedImage ? (
                                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                            ) : (
                                <>
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}></video>
                                    <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none"></div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-1 bg-blue-500/40 animate-pulse"></div>
                                </>
                            )}
                        </div>
                         <div className="flex justify-center gap-6">
                            {capturedImage ? ( 
                                <> 
                                    <Button variant="secondary" onClick={() => setCapturedImage(null)} className="px-8 rounded-xl font-black uppercase text-[10px]">Retake</Button> 
                                    <Button onClick={() => onCapture(capturedImage)} className="px-12 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/40">Initialize Scan</Button> 
                                </> 
                            ) : ( 
                                <button 
                                    onClick={handleCapture} 
                                    className="w-20 h-20 rounded-full bg-white border-8 border-slate-800 shadow-2xl active:scale-95 transition-all hover:border-blue-600 flex items-center justify-center group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-600 group-hover:scale-125 transition-transform"></div>
                                </button>
                            )}
                        </div>
                        <p className="text-[9px] text-slate-500 text-center font-black uppercase tracking-widest">Ensure text is legible and well-lit</p>
                    </div>
                 )}
            </Card>
        </div>
    );
};

interface SnapToRegisterProps {
  onClose: () => void;
  roleToRegister: UserRole;
  classId?: string;
}

const SnapToRegister: React.FC<SnapToRegisterProps> = ({ onClose, roleToRegister, classId: teacherClassId }) => {
    const { schoolSettings, user } = useAuthentication();
    const [step, setStep] = useState<'initial' | 'camera' | 'parsing' | 'review' | 'registering' | 'results'>('initial');
    const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
    const [error, setError] = useState('');

    const [classIdForStudents, setClassIdForStudents] = useState(teacherClassId || GES_CLASSES[0]);
    const [batchCreateUsers, { loading: isRegistering, results }] = useBatchCreateUsers();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const schoolIdentifier = (schoolSettings?.schoolName || 'EDUTECSCH').substring(0, 2).toLowerCase();

    const regenerateCredentials = useCallback((users: ParsedUser[]): ParsedUser[] => {
        const targetClass = teacherClassId || classIdForStudents;
        const getClassIdentifier = (cId: string): string => {
            const lowerClassId = cId.toLowerCase().replace(/\s+/g, '');
            if (lowerClassId.startsWith('nursery')) return `n${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('kg')) return `kg${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('basic')) return `bs${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('jhs')) return `j${lowerClassId.slice(-1)}`;
            return 'cr';
        };
    
        return users.map(user => {
            const nameParts = user.name.trim().split(/\s+/).filter(Boolean);
            if (nameParts.length === 0) return { ...user, email: '', password: '' };
            const nameForEmail = (nameParts.length > 1 ? nameParts[1] : nameParts[0]).toLowerCase().replace(/[^a-z0-9]/g, "");
            const classIdentifier = getClassIdentifier(targetClass);
            const email = `${nameForEmail}${schoolIdentifier}${classIdentifier}@gmail.com`;
            return { ...user, email, password: nameForEmail };
        });
    }, [schoolIdentifier, teacherClassId, classIdForStudents]);

    useEffect(() => {
        if (step === 'parsing' && capturedImage) {
            const parseImage = async () => {
                setError('');
                if (!checkRateLimit('snap_parse', 5, 300000)) {
                    setError("Security Rate Limit: Please wait 5 minutes.");
                    setStep('initial');
                    return;
                }

                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: capturedImage.split(',')[1] } };
                    const prompt = `Analyze this list of people. Extract full names of candidates for the role of ${roleToRegister}. Return JSON: { "users": [{ "name": "string" }] }`;

                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [imagePart, { text: prompt }] },
                        config: { responseMimeType: 'application/json' }
                    });

                    const parsedData = JSON.parse(response.text) as { users: { name: string }[] };
                    const initialUsers: ParsedUser[] = parsedData.users.map(u => ({
                        clientId: simpleUuid(),
                        id: 0,
                        name: validateString(u.name, 2, 100),
                        email: '',
                        password: '',
                        classId: ''
                    }));

                    setParsedUsers(regenerateCredentials(initialUsers));
                    setStep('review');
                } catch (err: any) {
                    setError(`Scan Failed: ${err.message}`);
                    setStep('initial');
                }
            };
            parseImage();
        }
    }, [step, capturedImage, regenerateCredentials, roleToRegister]);
    
    const handleRegister = async () => {
        setStep('registering');
        await batchCreateUsers(parsedUsers.filter(u => u.name && u.email), roleToRegister, roleToRegister === 'student' ? (teacherClassId || classIdForStudents) : undefined);
        setStep('results');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                setCapturedImage(reader.result as string);
                setStep('parsing');
            };
            reader.readAsDataURL(file);
        }
    };

    const renderContent = () => {
        switch (step) {
            case 'initial': return (
                <div className="animate-fade-in-up">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl shadow-blue-600/20">📸</div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Snap to Registry</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Batch Onboarding Assistant</p>
                    </div>
                    
                    <div className="flex bg-slate-800 p-1.5 rounded-2xl mb-8 border border-white/5">
                        <button onClick={() => setActiveTab('camera')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'camera' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Active Lens</button>
                        <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'upload' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Static Upload</button>
                    </div>

                    {error && <p className="text-red-400 text-[10px] font-black uppercase mb-6 text-center bg-red-900/10 border border-red-500/20 p-4 rounded-xl">{error}</p>}
                    
                    {roleToRegister === 'student' && !teacherClassId && (
                        <div className="mb-6 space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Class Registry</label>
                             <select value={classIdForStudents} onChange={e => setClassIdForStudents(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none">
                                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                        </div>
                    )}

                    <div className="h-56 flex items-center justify-center bg-slate-950 rounded-3xl border-2 border-dashed border-slate-800 group hover:border-blue-500/30 transition-all cursor-pointer overflow-hidden relative" onClick={() => activeTab === 'camera' ? setStep('camera') : fileInputRef.current?.click()}>
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-center relative z-10">
                            {activeTab === 'camera' ? (
                                <>
                                    <span className="text-4xl block mb-2">📸</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorize Camera Feed</p>
                                </>
                            ) : (
                                <>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    <span className="text-4xl block mb-2">📂</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Browse File System</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
            case 'parsing': return (
                <div className="text-center py-20 space-y-8">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter">Neural Parsing Active</h4>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Extracting Alpha Credentials...</p>
                    </div>
                </div>
            );
            case 'review': return (
                <div className="flex flex-col h-[75vh]">
                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Data Verification</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Audit the extracted list before registry commit</p>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto space-y-3 pr-4 custom-scrollbar bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                        {parsedUsers.map((user) => (
                            <div key={user.clientId} className="group flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">{user.name.charAt(0)}</div>
                                <div className="flex-grow">
                                    <input 
                                        type="text" 
                                        value={user.name} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setParsedUsers(current => current.map(u => u.clientId === user.clientId ? { ...u, name: val } : u));
                                        }} 
                                        className="w-full bg-transparent font-bold text-white outline-none focus:text-blue-400 transition-colors uppercase text-sm" 
                                    />
                                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">{user.email}</p>
                                </div>
                                <button 
                                    onClick={() => setParsedUsers(prev => prev.filter(u => u.clientId !== user.clientId))}
                                    className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <Button variant="secondary" onClick={() => setStep('initial')} className="py-5 font-black uppercase text-[10px] tracking-widest rounded-2xl">Abort</Button>
                        <Button onClick={handleRegister} className="py-5 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-900/40">Secure Register</Button>
                    </div>
                </div>
            );
            case 'registering': return (
                <div className="text-center py-20 space-y-8">
                    <Spinner />
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter">Encrypting Profiles</h4>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Establishing Secure Vault Links...</p>
                    </div>
                </div>
            );
            case 'results': return (
                <div className="flex flex-col h-[75vh]">
                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Protocol Terminated</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Batch registration status report</p>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto space-y-3 pr-4 custom-scrollbar">
                        {results?.map((res, idx) => (
                            <div key={idx} className={`p-5 rounded-2xl border flex items-center justify-between group transition-all ${res.success ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${res.success ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                        {res.success ? '✓' : '!'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white uppercase text-xs">{res.name}</p>
                                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">{res.success ? `PASS: ${res.password}` : `FAIL: ${res.error}`}</p>
                                    </div>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${res.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {res.success ? 'AUTHORIZED' : 'REJECTED'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Button onClick={onClose} className="mt-8 py-5 font-black uppercase tracking-[0.3em] rounded-2xl">Close Terminal</Button>
                </div>
            );
            default: return null;
        }
    };
    
    return (
        <>
            {step === 'camera' && <CameraModal onClose={() => setStep('initial')} onCapture={(data) => { setCapturedImage(data); setStep('parsing'); }} />}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-[120]">
                <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col relative !p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-white/5 bg-slate-900 rounded-[3rem]">
                    <button onClick={onClose} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors p-2 bg-white/5 rounded-full">✕</button>
                    {renderContent()}
                </Card>
            </div>
        </>
    );
};

export default SnapToRegister;