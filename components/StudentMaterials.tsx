import React, { useState, useEffect, useMemo } from 'react';
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
    const filteredVideos = filterSubject === 'All' ? videos : videos.filter(v => v.targetClasses.includes(userProfile.class!)); // Simplified

    if (loading) return <div className="p-20 flex justify-center"><Spinner /></div>;

    return (
        <div className="space-y-10 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Knowledge <span className="text-blue-500">Vault</span></h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Certified Instructional Assets</p>
                </div>
                <div className="w-full md:w-64 relative group">
                    <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-all rounded-2xl"></div>
                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="relative z-10 w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-blue-400 outline-none focus:ring-2 ring-blue-500/30 shadow-xl">
                        <option value="All">All Research Domains</option>
                        {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Documents Column */}
                <section className="lg:col-span-7 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 border-l-2 border-blue-500 pl-4">Document Repository</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredMaterials.map(m => (
                            <Card key={m.id} className="relative group p-6 !bg-slate-900/40 border-white/5 hover:border-blue-500/30 transition-all rounded-[2rem] shadow-xl overflow-hidden h-fit">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-6xl group-hover:scale-125 transition-transform pointer-events-none">📄</div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-blue-500/20">📄</div>
                                    <div className="min-w-0">
                                        <p className="font-black text-white truncate uppercase text-sm tracking-tight group-hover:text-blue-400 transition-colors">{m.title}</p>
                                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{m.subject} &bull; Staff: {m.uploaderName.split(' ')[0]}</p>
                                    </div>
                                </div>
                                <div className="mt-8 pt-4 border-t border-white/5 flex justify-end relative z-10">
                                    <a href={m.aiFormattedContent} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-slate-800 hover:bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-lg">Download Protocol</a>
                                </div>
                            </Card>
                        ))}
                        {filteredMaterials.length === 0 && (
                            <div className="col-span-full py-20 text-center opacity-10">
                                <span className="text-6xl">📭</span>
                                <p className="mt-4 font-black uppercase tracking-[0.3em] text-xs">No documents indexed</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Video Column */}
                <section className="lg:col-span-5 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 border-l-2 border-purple-500 pl-4">Digital Lectures</h3>
                    <div className="space-y-6">
                        {filteredVideos.map(v => (
                            <Card key={v.id} className="!p-0 overflow-hidden rounded-[2.5rem] bg-slate-900/60 border-white/5 shadow-2xl group">
                                <div className="relative aspect-video bg-black overflow-hidden">
                                    <video src={v.videoUrl} controls className="w-full h-full object-cover" />
                                    <div className="absolute top-4 left-4 z-10"><span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 text-purple-400">LECTURE 4K</span></div>
                                </div>
                                <div className="p-8">
                                    <h4 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-2">{v.title}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Creator: {v.creatorName}</p>
                                    <p className="text-sm text-slate-400 leading-relaxed font-medium line-clamp-2">{v.description}</p>
                                </div>
                            </Card>
                        ))}
                        {filteredVideos.length === 0 && (
                            <div className="py-20 text-center opacity-10">
                                <span className="text-6xl">📽️</span>
                                <p className="mt-4 font-black uppercase tracking-[0.3em] text-xs">No media transmissions</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StudentMaterials;