
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

// Simple UUID generator since the import is not available
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

// Reusable Camera Modal Component
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
                            
                            {/* Grid overlay for document alignment */}
                            {!capturedImage && (
                                <div className="absolute inset-0 pointer-events-none opacity-30">
                                    <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                                        {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20"></div>)}
                                    </div>
                                </div>
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
                            {!capturedImage && (
                                <button 
                                    type="button" 
                                    onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}
                                    className="absolute bottom-6 right-6 p-3 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0 0-3.181-3.183a8.25 8.25 0 0 1 11.667 0l3.181 3.183" /></svg>
                                </button>
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
  classId?: string; // For teachers creating students
  availableStudents?: UserProfile[]; // For parent linking
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

    // Background upload of the image for records
    useEffect(() => {
        if (capturedImage && user) {
            const uploadEvidence = async () => {
                const blob = dataURItoBlob(capturedImage);
                if (blob) {
                    try {
                        const fileName = `admin-uploads/class-lists/${Date.now()}_${roleToRegister}.jpg`;
                        const storageRef = storage.ref(fileName);
                        await storageRef.put(blob, { contentType: 'image/jpeg' });
                        console.log("Class list image saved automatically for records.");
                    } catch (e) {
                        console.warn("Failed to auto-save class list image", e);
                    }
                }
            };
            uploadEvidence();
        }
    }, [capturedImage, user, roleToRegister]);

    const regenerateCredentials = useCallback((users: ParsedUser[]): ParsedUser[] => {
        const targetClass = teacherClassId || classIdForStudents;

        const getClassIdentifier = (cId: string): string => {
            if (!cId) return '';
            const lowerClassId = cId.toLowerCase().replace(/\s+/g, '');
            if (lowerClassId.startsWith('nursery')) return `n${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('kg')) return `kg${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('basic')) return `bs${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('jhs')) return `j${lowerClassId.slice(-1)}`;
            if (lowerClassId.startsWith('creche')) return 'cr';
            return '';
        };
    
        return users.map(user => {
            const nameParts = user.name.trim().split(/\s+/).filter(Boolean);
            if (nameParts.length === 0) {
                return { ...user, email: '', password: '' };
            }
            const nameForEmail = (nameParts.length > 1 ? nameParts[1] : nameParts[0]).toLowerCase().replace(/[^a-z0-9]/g, "");

            let email = user.email || '';
            let password = user.password || '';

            if (roleToRegister === 'student') {
                const classIdentifier = getClassIdentifier(targetClass);
                const emailName = `${nameForEmail}${schoolIdentifier}${classIdentifier}`;
                email = `${emailName}@gmail.com`;
                password = emailName;
            } else if (roleToRegister === 'teacher') {
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
                const lastNameIdentifier = lastName.substring(0, 2).toLowerCase();
                password = `${nameForEmail}${lastNameIdentifier}`; // Note: Teachers use form email, password is still generated
            } else {
                 // Parents and others get a random password for now
                 password = user.password || `${nameForEmail}${Math.random().toString(36).substring(2, 6)}`;
                 if (!email) {
                     email = `${nameForEmail}${Math.random().toString(36).substring(2, 4)}@gmail.com`;
                 }
            }
    
            return { ...user, email, password };
        });
    }, [schoolIdentifier, teacherClassId, classIdForStudents, roleToRegister]);

    const handleUserUpdate = useCallback((clientId: string, field: keyof ParsedUser, value: string) => {
        setParsedUsers(currentUsers => {
            const updatedUsers = currentUsers.map(u => 
                u.clientId === clientId ? { ...u, [field]: value } : u
            );
    
            if (field === 'name') {
                return regenerateCredentials(updatedUsers);
            }
    
            return updatedUsers;
        });
    }, [regenerateCredentials]);


    const handleCapture = (dataUrl: string) => {
        setCapturedImage(dataUrl);
        setStep('parsing');
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file (JPEG, PNG, etc.).');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                handleCapture(dataUrl); // Reuse the capture handler to trigger parsing
            };
            reader.onerror = () => {
                setError('Failed to read the file.');
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (step === 'parsing' && capturedImage) {
            const parseImage = async () => {
                setError('');
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: capturedImage.split(',')[1] } };
                    const prompt = "Analyze the image, which contains a list of user names. Extract each full name. Return ONLY a valid JSON object with a single root key 'users', which is an array of objects, where each object has a single 'name' key. Omit any rows that do not look like a name. Correct any obvious OCR errors in the names.";

                    const response = await ai.models.generateContent({
                        model: 'gemini-3-pro-preview',
                        contents: { parts: [imagePart, { text: prompt }] },
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT, properties: {
                                    users: { type: Type.ARRAY, items: {
                                        type: Type.OBJECT, properties: {
                                            name: { type: Type.STRING }
                                        }, required: ['name']
                                    }}
                                }, required: ['users']
                            }
                        }
                    });

                    const parsedData = JSON.parse(response.text) as { users: { name: string }[] };
                    
                    const initialUsers: ParsedUser[] = parsedData.users.map(user => ({
                        clientId: simpleUuid(),
                        id: 0,
                        name: user.name,
                        email: '',
                        password: '',
                        classId: ''
                    }));

                    setParsedUsers(regenerateCredentials(initialUsers));
                    setStep('review');
                } catch (err) {
                    setError("AI failed to parse the image. Please try again with a clearer picture.");
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
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-purple-500/20">
                            📸
                        </div>
                        <h3 className="text-2xl font-bold text-white">Snap to Register</h3>
                        <p className="text-slate-400 mt-2">
                            Instantly create accounts for {roleToRegister}s by taking a photo or uploading a class list.
                        </p>
                    </div>
                    
                    {/* Modern Tabs */}
                    <div className="flex p-1 bg-slate-800 rounded-xl mb-6 relative">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg transition-transform duration-300 ease-out shadow-md`}
                            style={{ transform: activeTab === 'camera' ? 'translateX(0)' : 'translateX(100%) translateX(4px)' }}
                        ></div>
                        <button 
                            onClick={() => setActiveTab('camera')} 
                            className={`relative z-10 w-1/2 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${activeTab === 'camera' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                            Use Camera
                        </button>
                        <button 
                            onClick={() => setActiveTab('upload')} 
                            className={`relative z-10 w-1/2 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${activeTab === 'upload' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                            Upload File
                        </button>
                    </div>

                    {error && <p className="text-red-400 text-sm mb-4 text-center bg-red-900/20 p-3 rounded-lg border border-red-500/30">{error}</p>}

                    <div className="h-48 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                        {activeTab === 'camera' && (
                            <div className="text-center animate-fade-in-short">
                                <Button size="lg" onClick={() => setStep('camera')} className="shadow-lg shadow-blue-500/20">Open Camera</Button>
                                <p className="text-xs text-slate-500 mt-3">Ensure good lighting for best results.</p>
                            </div>
                        )}
                        
                        {activeTab === 'upload' && (
                            <div className="animate-fade-in-short w-full h-full flex items-center justify-center">
                                 <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" /></svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-300">Click to upload image</p>
                                    <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
            // ... (Other cases remain unchanged)
            case 'parsing': return (
                <div className="text-center py-10">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Analyzing Image...</h4>
                    <p className="text-slate-400">AI is extracting names from your photo.</p>
                </div>
            );
            case 'review': return (
                <div className="animate-fade-in-up h-[70vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-white">Review & Edit</h3>
                            <p className="text-sm text-slate-400">Found {parsedUsers.length} names. Please verify.</p>
                        </div>
                        {roleToRegister === 'student' && !teacherClassId && (
                             <select 
                                value={classIdForStudents} 
                                onChange={e => setClassIdForStudents(e.target.value)} 
                                className="p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                             >
                                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </div>
                    
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        {parsedUsers.map((user, idx) => (
                            <div key={user.clientId} className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-mono w-6 text-right">{idx + 1}.</span>
                                        <input 
                                            type="text" 
                                            value={user.name} 
                                            onChange={e => handleUserUpdate(user.clientId, 'name', e.target.value)} 
                                            className="w-full p-2 bg-slate-900 rounded border border-slate-700 text-sm focus:border-blue-500 outline-none"
                                            placeholder="Name"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">✉️</span>
                                        <input 
                                            type="email" 
                                            value={user.email} 
                                            onChange={e => handleUserUpdate(user.clientId, 'email', e.target.value)} 
                                            className="w-full p-2 bg-slate-900 rounded border border-slate-700 text-sm text-slate-400 focus:text-white focus:border-blue-500 outline-none"
                                            placeholder="Email"
                                        />
                                    </div>
                                </div>
                                {roleToRegister === 'parent' && availableStudents.length > 0 && (
                                    <div className="flex items-center gap-2 pl-8">
                                        <span className="text-xs text-slate-500">Link Child:</span>
                                        <select 
                                            value={user.linkedStudentId || ''} 
                                            onChange={e => handleUserUpdate(user.clientId, 'linkedStudentId', e.target.value)}
                                            className="flex-grow p-1.5 bg-slate-900 rounded border border-slate-700 text-xs text-slate-300 focus:border-blue-500 outline-none"
                                        >
                                            <option value="">Select Student (Optional)</option>
                                            {availableStudents.map(student => (
                                                <option key={student.uid} value={student.uid}>{student.name} ({student.class})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800 flex-shrink-0">
                        <Button variant="secondary" onClick={() => setStep('initial')} className="flex-1">Start Over</Button>
                        <Button onClick={handleRegister} className="flex-[2] shadow-lg shadow-green-600/20 bg-gradient-to-r from-green-600 to-teal-600">
                            Confirm & Register {parsedUsers.filter(u => u.name).length} Users
                        </Button>
                    </div>
                </div>
            );
            case 'registering': return (
                <div className="text-center py-10">
                    <Spinner />
                    <h4 className="text-xl font-bold text-white mt-6 mb-2">Creating Accounts...</h4>
                    <p className="text-slate-400">Please wait while we set up the profiles.</p>
                </div>
            );
            case 'results': return (
                <div className="animate-fade-in-up h-[70vh] flex flex-col">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 border border-green-500/30">
                            🎉
                        </div>
                        <h3 className="text-2xl font-bold text-white">Registration Complete</h3>
                        <p className="text-sm text-yellow-400 mt-2 bg-yellow-900/30 inline-block px-4 py-1 rounded-full border border-yellow-500/20">
                            ⚠️ Accounts are pending admin approval
                        </p>
                    </div>

                    {registrationError && <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-3 rounded-lg">{registrationError}</p>}
                    
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {results?.map((res, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${res.success ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                                <div>
                                    <p className="font-bold text-slate-200">{res.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{res.email}</p>
                                </div>
                                <div className="text-right">
                                    {res.success ? (
                                        <>
                                            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">Success</span>
                                            <p className="text-[10px] text-slate-500 mt-1">Pass: {res.password}</p>
                                        </>
                                    ) : (
                                        <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">Failed</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center">
                        <Button onClick={onClose} className="w-full">Done</Button>
                    </div>
                </div>
            );
            default: return null;
        }
    };
    
    return (
        <>
            {step === 'camera' && <CameraModal onClose={() => setStep('initial')} onCapture={handleCapture} />}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
                <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col relative !p-6 shadow-2xl border-slate-700">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition-colors z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                    {renderContent()}
                </Card>
            </div>
        </>
    );
};

export default SnapToRegister;
