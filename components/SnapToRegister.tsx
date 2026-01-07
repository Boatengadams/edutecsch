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
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
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
        <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center p-4 z-[60] backdrop-blur-sm">
            <Card className="w-full max-w-lg animate-fade-in-up">
                 <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-blue-400">📸</span> Take a Picture
                 </h3>
                 {cameraError ? <p className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-500/30">{cameraError}</p> : (
                    <div className="space-y-4">
                        <div className="bg-black rounded-2xl overflow-hidden aspect-video relative border border-slate-700 shadow-2xl">
                            {capturedImage ? (
                                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                            ) : (
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}></video>
                            )}
                        </div>
                         <div className="flex justify-center gap-4">
                            {capturedImage ? ( 
                                <> 
                                    <Button variant="secondary" onClick={() => setCapturedImage(null)}>Retake</Button> 
                                    <Button onClick={() => onCapture(capturedImage)}>Use Photo</Button> 
                                </> 
                            ) : ( 
                                <button onClick={handleCapture} className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-lg active:scale-95 transition-transform"></button>
                            )}
                        </div>
                    </div>
                 )}
                 <div className="mt-6 flex justify-end">
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
                 </div>
            </Card>
        </div>
    );
};

interface SnapToRegisterProps {
  onClose: () => void;
  roleToRegister: UserRole;
  classId?: string;
  availableStudents?: UserProfile[];
}

const SnapToRegister: React.FC<SnapToRegisterProps> = ({ onClose, roleToRegister, classId: teacherClassId, availableStudents = [] }) => {
    const { schoolSettings, user } = useAuthentication();
    const [step, setStep] = useState<'initial' | 'camera' | 'parsing' | 'review' | 'registering' | 'results'>('initial');
    const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
    const [error, setError] = useState('');

    const [classIdForStudents, setClassIdForStudents] = useState(teacherClassId || GES_CLASSES[0]);
    const [batchCreateUsers, { loading: isRegistering, error: registrationError, results }] = useBatchCreateUsers();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const schoolIdentifier = (schoolSettings?.schoolName || 'EDUTECSCH').substring(0, 2).toLowerCase();

    useEffect(() => {
        if (capturedImage && user) {
            const uploadEvidence = async () => {
                const blob = dataURItoBlob(capturedImage);
                if (blob) {
                    try {
                        const fileName = `admin-uploads/class-lists/${Date.now()}_${roleToRegister}.jpg`;
                        const storageRef = storage.ref(fileName);
                        await storageRef.put(blob, { contentType: 'image/jpeg' });
                    } catch (e) {
                        console.warn("Secure evidence sync failed", e);
                    }
                }
            };
            uploadEvidence();
        }
    }, [capturedImage, user, roleToRegister]);

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
                
                // SECURITY: Rate limit checking
                if (!checkRateLimit('snap_parse', 3, 300000)) { // 3 parses per 5 mins
                    setError("Security Rate Limit Exceeded. Please wait a few minutes before trying another scan.");
                    setStep('initial');
                    return;
                }

                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: capturedImage.split(',')[1] } };
                    const prompt = "Analyze the image and extract a JSON list of full names. Output: { users: [{ name: string }] }";

                    const response = await ai.models.generateContent({
                        model: 'gemini-3-pro-preview',
                        contents: { parts: [imagePart, { text: prompt }] },
                        config: { responseMimeType: 'application/json' }
                    });

                    const parsedData = JSON.parse(response.text) as { users: { name: string }[] };
                    const initialUsers: ParsedUser[] = parsedData.users.map(user => ({
                        clientId: simpleUuid(),
                        id: 0,
                        name: validateString(user.name, 2, 100),
                        email: '',
                        password: '',
                        classId: ''
                    }));

                    setParsedUsers(regenerateCredentials(initialUsers));
                    setStep('review');
                } catch (err: any) {
                    setError(`Secure parsing failed: ${err.message}`);
                    setStep('initial');
                }
            };
            parseImage();
        }
    }, [step, capturedImage, regenerateCredentials]);
    
    const handleRegister = async () => {
        setStep('registering');
        await batchCreateUsers(parsedUsers.filter(u => u.name && u.email), roleToRegister, roleToRegister === 'student' ? (teacherClassId || classIdForStudents) : undefined);
        setStep('results');
    };

    const renderContent = () => {
        switch (step) {
            case 'initial': return (
                <div className="animate-fade-in-up">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">📸</div>
                        <h3 className="text-2xl font-bold text-white">Snap to Register</h3>
                        <p className="text-slate-400 mt-2">Strict validation enforced for all entries.</p>
                    </div>
                    <div className="flex p-1 bg-slate-800 rounded-xl mb-6">
                        <button onClick={() => setActiveTab('camera')} className={`flex-1 py-3 text-sm font-bold rounded-lg ${activeTab === 'camera' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Camera</button>
                        <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3 text-sm font-bold rounded-lg ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Upload</button>
                    </div>
                    {error && <p className="text-red-400 text-sm mb-4 text-center bg-red-900/20 p-3 rounded-lg border border-red-500/30">{error}</p>}
                    <div className="h-48 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                        {activeTab === 'camera' ? <Button onClick={() => setStep('camera')}>Open Camera</Button> : (
                            <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50" onClick={() => fileInputRef.current?.click()}>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                <p className="text-sm font-medium text-slate-300">Click to upload class list</p>
                            </div>
                        )}
                    </div>
                </div>
            );
            case 'parsing': return <div className="text-center py-10"><Spinner /><h4 className="text-xl font-bold text-white mt-4">Verifying & Parsing...</h4></div>;
            case 'review': return (
                <div className="h-[70vh] flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-4">Validate Data</h3>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2 bg-slate-900/50 p-4 rounded-xl">
                        {parsedUsers.map((user) => (
                            <div key={user.clientId} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <input type="text" value={user.name} onChange={e => {
                                    const val = e.target.value;
                                    setParsedUsers(current => current.map(u => u.clientId === user.clientId ? { ...u, name: val } : u));
                                }} className="w-full p-2 bg-slate-900 rounded border border-slate-700 text-sm" />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800">
                        <Button variant="secondary" onClick={() => setStep('initial')} className="flex-1">Start Over</Button>
                        <Button onClick={handleRegister} className="flex-[2] bg-green-600">Secure Register</Button>
                    </div>
                </div>
            );
            case 'registering': return <div className="text-center py-10"><Spinner /><h4 className="text-xl font-bold text-white mt-4">Encrypting Profiles...</h4></div>;
            case 'results': return (
                <div className="h-[70vh] flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-4">Registration Finalized</h3>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {results?.map((res, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${res.success ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                                <p className="font-bold text-slate-200">{res.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{res.success ? 'Authorized' : 'Rejected'}</p>
                            </div>
                        ))}
                    </div>
                    <Button onClick={onClose} className="mt-4">Done</Button>
                </div>
            );
            default: return null;
        }
    };

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => handleCapture(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCapture = (dataUrl: string) => {
        setCapturedImage(dataUrl);
        setStep('parsing');
    };
    
    return (
        <>
            {step === 'camera' && <CameraModal onClose={() => setStep('initial')} onCapture={handleCapture} />}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
                <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col relative !p-6 shadow-2xl">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                    {renderContent()}
                </Card>
            </div>
        </>
    );
};

export default SnapToRegister;