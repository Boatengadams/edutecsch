
import React, { useState, useEffect } from 'react';
import { db, functions } from '../services/firebase';
import { TeachingMaterial } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';

const AdminMaterials: React.FC = () => {
    const { showToast } = useToast();
    const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = db.collection('teachingMaterials')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingMaterial)));
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Permanently delete this material?')) return;
        setDeletingId(id);
        try {
            const deleteResource = functions.httpsCallable('deleteResource');
            await deleteResource({ resourceType: 'teachingMaterial', resourceId: id });
            showToast('Material deleted', 'success');
        } catch (err: any) {
            showToast(`Failed to delete: ${err.message}`, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Teaching Materials Library</h2>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                            <tr>
                                <th className="px-4 py-3">Title</th>
                                <th className="px-4 py-3">Classes</th>
                                <th className="px-4 py-3">Uploader</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center"><Spinner/></td></tr>
                            ) : materials.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center">No materials uploaded yet.</td></tr>
                            ) : (
                                materials.map(mat => (
                                    <tr key={mat.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700">
                                        <td className="px-4 py-3 font-medium text-white">{mat.title}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {mat.targetClasses.map(c => (
                                                    <span key={c} className="px-1.5 py-0.5 bg-slate-600 rounded text-xs">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{mat.uploaderName}</td>
                                        <td className="px-4 py-3">{mat.createdAt?.toDate().toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => handleDelete(mat.id)} 
                                                disabled={deletingId === mat.id}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                            >
                                                {deletingId === mat.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AdminMaterials;
