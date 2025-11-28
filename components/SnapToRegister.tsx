
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GES_CLASSES } from '../types';
import type { ParsedUser, UserRole } from '../types';
import { useBatchCreateUsers } from '../hooks/useBatchCreateUsers';
import { useAuthentication } from '../hooks/useAuth';

// Simple UUID generator since the import is not available
const simpleUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-[60]">
            <Card className="w-full max-w-lg">
                 <h3 className="text-lg font-bold mb-4">Take a Picture</h3>
                 {cameraError ? <p className="text-red-400">{cameraError}</p> : (
                    <div className="space-y-4">
                        <div className="bg-black rounded-md overflow-hidden aspect-video">
                            {capturedImage ? <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}></video>}
                        </div>
                         <div className="flex justify-center gap-4">
                            {capturedImage ? ( <> <Button onClick={() => setCapturedImage(null)}>Retake</Button> <Button onClick={() => onCapture(capturedImage)}>Use Photo</Button> </> ) : ( <Button onClick={handleCapture}>Capture</Button> )}
                            <Button type="button" variant="secondary" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}>Switch Camera</Button>
                        </div>
                    </div>
                 )}
                 <Button variant="secondary" onClick={onClose} className="w-full mt-4">Cancel</Button>
            </Card>
        </div>
    );
};


interface SnapToRegisterProps {
  onClose: () => void;
  roleToRegister: UserRole;
  classId?: string; // For teachers creating students
}

const SnapToRegister: React.FC<SnapToRegisterProps> = ({ onClose, roleToRegister, classId: teacherClassId }) => {
    const { schoolSettings } = useAuthentication();
    const [step, setStep] = useState<'initial' | 'camera' | 'parsing' | 'review' | 'registering' | 'results'>('initial');
    const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
    const [error, setError] = useState('');

    const [classIdForStudents, setClassIdForStudents] = useState(teacherClassId || GES_CLASSES[0]);
    
    const [batchCreateUsers, { loading: isRegistering, error: registrationError, results }] = useBatchCreateUsers();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const schoolIdentifier = (schoolSettings?.schoolName || 'EDUTECSCH').substring(0, 2).toLowerCase();

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
                 password = `${nameForEmail}${Math.random().toString(36).substring(2, 6)}`;
            }
    
            return { ...user, email, password };
        });
    }, [schoolIdentifier, teacherClassId, classIdForStudents, roleToRegister]);

    const handleUserUpdate = useCallback((clientId: string, field: 'name' | 'email', value: string) => {
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
                    const prompt = "Analyze the image, which contains a list of user names. Extract each full name. Return ONLY a valid JSON object with a single root key 'users', which is an array of objects, where each object has a single 'name' key. Omit any rows that do not look like a name.";

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
                <div>
                    <h3 className="text-xl font-bold text-center">Snap to Register</h3>
                    <p className="text-gray-400 my-4 text-center">Register multiple {roleToRegister}s at once using your camera or by uploading an image of a list.</p>
                    
                    <div className="flex border-b border-slate-700 mb-4">
                        <button 
                            onClick={() => setActiveTab('camera')} 
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'camera' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Use Camera
                        </button>
                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Upload File
                        </button>
                    </div>

                    {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

                    {activeTab === 'camera' && (
                        <div className="text-center animate-fade-in-short">
                            <p className="text-sm text-gray-400 mb-4">Use your device's camera to take a picture of a list of names.</p>
                            <Button onClick={() => setStep('camera')}>Open Camera</Button>
                        </div>
                    )}
                    
                    {activeTab === 'upload' && (
                        <div className="animate-fade-in-short">
                             <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <div className="flex text-sm text-gray-400">
                                        <p className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-blue-500">
                                            <span>Upload a file</span>
                                        </p>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
            case 'parsing': return <div className="text-center"><Spinner /><p className="mt-4">AI is parsing the image...</p></div>;
            case 'review': return (
                <div>
                    <h3 className="text-xl font-bold mb-2">Review Extracted Users</h3>
                    <p className="text-sm text-gray-400 mb-4">Correct any mistakes before registering. You can remove users by clearing their name.</p>
                    {roleToRegister === 'student' && !teacherClassId && (
                         <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300">Assign all to Class</label>
                            <select value={classIdForStudents} onChange={e => setClassIdForStudents(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 rounded-md">
                                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                    )}
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {parsedUsers.map(user => (
                            <div key={user.clientId} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input type="text" value={user.name} onChange={e => handleUserUpdate(user.clientId, 'name', e.target.value)} className="p-2 bg-slate-800 rounded-md" />
                                <input type="email" value={user.email} onChange={e => handleUserUpdate(user.clientId, 'email', e.target.value)} className="p-2 bg-slate-800 rounded-md" />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleRegister}>Register {parsedUsers.filter(u => u.name).length} Users</Button>
                        <Button variant="secondary" onClick={() => setStep('initial')}>Start Over</Button>
                    </div>
                </div>
            );
            case 'registering': return <div className="text-center"><Spinner /><p className="mt-4">Registering users...</p></div>;
            case 'results': return (
                <div>
                    <h3 className="text-xl font-bold mb-2">Registration Results</h3>
                    <p className="text-sm text-yellow-400 mb-4 p-2 bg-yellow-900/50 rounded-md">
                        <strong>Important:</strong> Successfully created users are still 'Pending Approval' and will need to be approved by an admin before they can log in.
                    </p>
                    {registrationError && <p className="text-red-400 text-sm mb-4">{registrationError}</p>}
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {results?.map(res => (
                            <div key={res.email} className={`p-3 rounded-md ${res.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                                <p className="font-semibold">{res.name} ({res.email})</p>
                                {res.success ? <p className="text-sm text-green-300">Success! Password: <strong>{res.password}</strong></p> : <p className="text-sm text-red-300">Failed: {res.error}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            );
            default: return null;
        }
    };
    
    return (
        <>
            {step === 'camera' && <CameraModal onClose={() => setStep('initial')} onCapture={handleCapture} />}
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                <Card className="w-full max-w-xl">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
                    {renderContent()}
                </Card>
            </div>
        </>
    );
};

export default SnapToRegister;