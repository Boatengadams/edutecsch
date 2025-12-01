
import React, { useState, useEffect, useRef } from 'react';
import { db, storage, firebase } from '../services/firebase';
import { TeachingMaterial } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import ConfirmationModal from './common/ConfirmationModal';
import Button from './common/Button';
import { useAuthentication } from '../hooks/useAuth';

const AdminMaterials: React.FC = () => {
    const { user, userProfile } = useAuthentication();
    const { showToast } = useToast();
    const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [materialToDelete, setMaterialToDelete] = useState<TeachingMaterial | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Upload State
    const [isDragging, setIsDragging] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<{ file: File; progress: number; status: 'pending' | 'uploading' | 'completed' | 'error' }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = db.collection('teachingMaterials')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingMaterial)));
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const newQueue = Array.from(files).map(file => ({
            file,
            progress: 0,
            status: 'pending' as const
        }));
        setUploadQueue(prev => [...prev, ...newQueue]);
        processQueue(newQueue);
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
                        showToast(`Failed to upload ${item.file.name}`, 'error');
                    },
                    async () => {
                        // Upload complete
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        
                        const materialData: TeachingMaterial = {
                            id: docRef.id,
                            title: item.file.name.split('.')[0], // Default title is filename
                            targetClasses: ['All'], // Default to all, can edit later
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
                    }
                );

            } catch (err) {
                console.error(err);
            }
        });
    };

    const handleDelete = async () => {
        if (!materialToDelete) return;
        setIsDeleting(true);
        try {
            if (materialToDelete.originalFileName) {
                const storagePath = `teachingMaterials/${materialToDelete.id}/${materialToDelete.originalFileName}`;
                try {
                    await storage.ref(storagePath).delete();
                } catch (e) {
                    console.warn("File not found in storage, proceeding to delete document.", e);
                }
            }
            await db.collection('teachingMaterials').doc(materialToDelete.id).delete();
            showToast('Material deleted successfully.', 'success');
        } catch (err: any) {
            showToast(`Failed to delete: ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setMaterialToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="p-2 bg-blue-600 rounded-lg shadow-lg">📚</span> Teaching Materials Library
            </h2>

            {/* Upload Area */}
            <div 
                className={`border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-800/50'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFiles(e.dataTransfer.files);
                }}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-3xl animate-bounce">
                        ☁️
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-200">Drag & Drop files here</h3>
                        <p className="text-slate-400 text-sm mt-1">or click to browse documents (PDF, DOCX, PPTX)</p>
                    </div>
                    <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary">Browse Files</Button>
                </div>

                {/* Upload Queue Progress */}
                {uploadQueue.length > 0 && (
                    <div className="mt-8 space-y-3 text-left max-w-xl mx-auto">
                        {uploadQueue.map((item, idx) => (
                            <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 truncate w-3/4">{item.file.name}</span>
                                    <span className={item.status === 'error' ? 'text-red-400' : 'text-blue-400'}>
                                        {item.status === 'completed' ? 'Done' : `${Math.round(item.progress)}%`}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${item.status === 'completed' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                            <tr>
                                <th className="px-4 py-3">File Name</th>
                                <th className="px-4 py-3">Uploaded By</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center"><Spinner/></td></tr>
                            ) : materials.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center">No materials uploaded yet.</td></tr>
                            ) : (
                                materials.map(mat => (
                                    <tr key={mat.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-700 rounded text-xl">📄</div>
                                                <div>
                                                    <p className="font-medium text-white">{mat.title}</p>
                                                    <p className="text-xs text-slate-500">{mat.originalFileName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{mat.uploaderName}</td>
                                        <td className="px-4 py-3">{mat.createdAt?.toDate().toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-3">
                                                <a href={mat.aiFormattedContent} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">Download</a>
                                                <button 
                                                    onClick={() => setMaterialToDelete(mat)} 
                                                    className="text-red-400 hover:text-red-300 font-medium"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmationModal 
                isOpen={!!materialToDelete}
                onClose={() => setMaterialToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Material"
                message={<span>Are you sure you want to permanently delete <strong>{materialToDelete?.title}</strong>?</span>}
                confirmButtonText="Yes, Delete"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AdminMaterials;
