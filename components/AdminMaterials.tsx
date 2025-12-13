
import React, { useState, useRef } from 'react';
import { db, storage, firebase } from '../services/firebase';
import { useAuthentication } from '../hooks/useAuth';
import { useToast } from './common/Toast';
import { GES_CLASSES, GES_SUBJECTS, TeachingMaterial } from '../types';
import Card from './common/Card';

const AdminMaterials: React.FC = () => {
    const { user, userProfile } = useAuthentication();
    const { showToast } = useToast();
    const [targetClass, setTargetClass] = useState<string>('All');
    const [targetSubject, setTargetSubject] = useState<string>(GES_SUBJECTS[0]);
    const [uploadQueue, setUploadQueue] = useState<{ file: File; progress: number; status: 'pending' | 'uploading' | 'completed' | 'error' }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                progress: 0,
                status: 'pending' as const
            }));
            setUploadQueue(prev => [...prev, ...newFiles]);
            processQueue(newFiles);
        }
    };

    const processQueue = async (items: typeof uploadQueue) => {
        if (!user || !userProfile) return;

        items.forEach(async (item) => {
            // Update status to uploading
            setUploadQueue(prev => prev.map(q => q.file === item.file ? { ...q, status: 'uploading' } : q));

            try {
                // 1. Create Firestore Doc Ref first (optimistic)
                const docRef = db.collection('teachingMaterials').doc();
                const storagePath = `teachingMaterials/${docRef.id}/${item.file.name}`;
                const storageRef = storage.ref(storagePath);
                
                const uploadTask = storageRef.put(item.file);

                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadQueue(prev => prev.map(q => q.file === item.file ? { ...q, progress } : q));
                    },
                    (error) => {
                        console.error("Upload error:", error);
                        setUploadQueue(prev => prev.map(q => q.file === item.file ? { ...q, status: 'error' } : q));
                        showToast(`Failed to upload ${item.file.name}: ${error.message}`, 'error');
                    },
                    async () => {
                        try {
                            // Upload complete
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            
                            const materialData: TeachingMaterial = {
                                id: docRef.id,
                                title: item.file.name.split('.')[0], // Default title is filename
                                targetClasses: [targetClass], 
                                subject: targetSubject, // Added subject
                                uploaderId: user.uid,
                                uploaderName: userProfile.name,
                                originalFileName: item.file.name,
                                aiFormattedContent: downloadURL, // Storing URL here
                                createdAt: firebase.firestore.Timestamp.now()
                            };

                            await docRef.set(materialData);
                            
                            setUploadQueue(prev => prev.map(q => q.file === item.file ? { ...q, status: 'completed', progress: 100 } : q));
                            
                            // Remove from queue after a delay
                            setTimeout(() => {
                                setUploadQueue(prev => prev.filter(q => q.file !== item.file));
                            }, 2000);
                            
                            showToast(`${item.file.name} uploaded successfully!`, 'success');
                        } catch (err: any) {
                             console.error("Firestore save error:", err);
                             setUploadQueue(prev => prev.map(q => q.file === item.file ? { ...q, status: 'error' } : q));
                             showToast(`Failed to save record for ${item.file.name}`, 'error');
                        }
                    }
                );

            } catch (err: any) {
                console.error(err);
                setUploadQueue(prev => prev.map(q => q.file === item.file ? { ...q, status: 'error' } : q));
                showToast(`Critical upload error: ${err.message}`, 'error');
            }
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Teaching Materials</h3>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Upload New Material</h4>
                <div className="flex gap-4 mb-4">
                     <select value={targetClass} onChange={e => setTargetClass(e.target.value)} className="p-2 bg-slate-900 border border-slate-600 rounded text-sm text-white">
                        <option value="All">All Classes</option>
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={targetSubject} onChange={e => setTargetSubject(e.target.value)} className="p-2 bg-slate-900 border border-slate-600 rounded text-sm text-white">
                        {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                
                <div 
                    className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
                    <span className="text-4xl mb-2 block">📂</span>
                    <p className="text-slate-300 font-medium">Click to upload documents</p>
                    <p className="text-xs text-slate-500 mt-1">PDFs, Word Docs, Images</p>
                </div>
            </div>

            {uploadQueue.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Upload Queue</h4>
                    {uploadQueue.map((item, idx) => (
                        <div key={idx} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                            <span className="text-sm truncate max-w-[200px]">{item.file.name}</span>
                            <div className="flex items-center gap-3">
                                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-300`} style={{ width: `${item.progress}%` }}></div>
                                </div>
                                <span className="text-xs text-slate-400 w-8 text-right">{item.status === 'completed' ? 'Done' : item.status === 'error' ? 'Err' : `${Math.round(item.progress)}%`}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default AdminMaterials;
