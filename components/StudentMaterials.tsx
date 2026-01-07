
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { UserProfile, TeachingMaterial, VideoContent, GES_SUBJECTS } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';

const StudentMaterials: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
    const [videos, setVideos] = useState<VideoContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState('All');

    useEffect(() => {
        const unsub1 = db.collection('teachingMaterials')
            .where('targetClasses', 'array-contains', userProfile.class)
            .onSnapshot(
                snap => setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingMaterial))),
                err => console.warn("Materials listener error:", err.message)
            );
            
        const unsub2 = db.collection('videoContent')
            .where('targetClasses', 'array-contains', userProfile.class)
            .onSnapshot(
                snap => setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoContent))),
                err => console.warn("Video content listener error:", err.message)
            );

        setLoading(false);
        return () => { unsub1(); unsub2(); };
    }, [userProfile.class]);

    const filteredMaterials = filterSubject === 'All' ? materials : materials.filter(m => m.subject === filterSubject);

    if (loading) return <div className="p-20 flex justify-center"><Spinner /></div>;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Study Materials</h2>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                    <option value="All">All Subjects</option>
                    {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Documents & Handouts</h3>
                    <div className="space-y-3">
                        {filteredMaterials.map(m => (
                            <Card key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-xl">📄</div>
                                    <div>
                                        <p className="font-bold text-white">{m.title}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black">{m.subject} &bull; {m.uploaderName}</p>
                                    </div>
                                </div>
                                <a href={m.aiFormattedContent} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-xs font-bold">Download</a>
                            </Card>
                        ))}
                        {filteredMaterials.length === 0 && <p className="text-slate-600 italic py-4">No documents found.</p>}
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Video Lessons</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {videos.map(v => (
                            <Card key={v.id} className="!p-0 overflow-hidden">
                                <video src={v.videoUrl} controls className="w-full aspect-video bg-black" />
                                <div className="p-4">
                                    <h4 className="font-bold text-white">{v.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{v.description}</p>
                                </div>
                            </Card>
                        ))}
                        {videos.length === 0 && <p className="text-slate-600 italic py-4">No videos available.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StudentMaterials;
