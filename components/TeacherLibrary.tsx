
import React, { useState, useEffect } from 'react';
import { db, firebase } from '../services/firebase';
import { GeneratedContent, UserProfile, VideoContent } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { PresentationGenerator } from './PresentationGenerator';
import VideoGenerator from './VideoGenerator';
import { useToast } from './common/Toast';

interface TeacherLibraryProps {
    user: firebase.User;
    userProfile: UserProfile;
    teacherClasses: string[];
    onStartLiveLesson: (content: GeneratedContent) => void;
}

const TeacherLibrary: React.FC<TeacherLibraryProps> = ({ user, userProfile, teacherClasses }) => {
    const { showToast } = useToast();
    const [contents, setContents] = useState<GeneratedContent[]>([]);
    const [videos, setVideos] = useState<VideoContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGenerator, setShowGenerator] = useState(false);
    const [showVideoGen, setShowVideoGen] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        const unsub1 = db.collection('generatedContent').where('teacherId', '==', user.uid).onSnapshot(
            snap => {
                setContents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedContent)));
            },
            err => {
                console.warn("Content library listener status:", err.message);
                setLoading(false);
            }
        );

        const unsub2 = db.collection('videoContent').doc(user.uid).collection('videos').onSnapshot(
            snap => {
                setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoContent)));
            },
            err => {
                console.warn("Video library listener status:", err.message);
                setLoading(false);
            }
        );

        setLoading(false);
        return () => { unsub1(); unsub2(); };
    }, [user.uid]);

    const startLesson = async (content: GeneratedContent) => {
        try {
            const lessonRef = db.collection('liveLessons').doc();
            await lessonRef.set({
                id: lessonRef.id,
                teacherId: user.uid,
                teacherName: userProfile.name,
                classId: content.classes[0],
                subject: content.subject,
                topic: content.topic,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                currentStepIndex: 0,
                lessonPlan: content.presentation.slides.map(s => ({
                    boardContent: s.content.join('<br>'),
                    imageUrl: s.imageUrl || '',
                    teacherScript: s.teacherScript || '',
                    question: null
                })),
                currentBoardContent: content.presentation.slides[0]?.content.join('<br>') || '',
                sourcePresentationId: content.id
            });
            showToast("Live lesson started!", "success");
        } catch (e: any) {
            showToast(e.message, "error");
        }
    };

    const deleteContent = async (id: string) => {
        if (window.confirm("Permanently delete this asset?")) {
            try {
                await db.collection('generatedContent').doc(id).delete();
                showToast("Asset deleted.", "info");
            } catch (e: any) {
                showToast(e.message, "error");
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Resource Library</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowVideoGen(true)}>🎥 Create Video</Button>
                    <Button onClick={() => setShowGenerator(true)}>✨ Generate Slides</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <Spinner /> : contents.map(item => (
                    <Card key={item.id} className="group overflow-hidden border-blue-500/10 hover:border-blue-500/50 transition-all">
                        <div className="h-40 bg-slate-900 flex items-center justify-center text-4xl opacity-40 group-hover:opacity-100 transition-opacity">
                            {item.presentation.slides[0]?.imageUrl ? <img src={item.presentation.slides[0].imageUrl} className="w-full h-full object-cover" /> : '📄'}
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-white truncate">{item.topic}</h4>
                            <p className="text-xs text-slate-500 uppercase font-black mt-1">{item.subject} &bull; {item.classes.join(', ')}</p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <Button size="sm" onClick={() => startLesson(item)}>Start Live</Button>
                                <Button size="sm" variant="danger" onClick={() => deleteContent(item.id)}>Delete</Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {contents.length === 0 && !loading && <div className="col-span-full py-20 text-center text-slate-600 italic">No presentations generated yet.</div>}
            </div>

            {showGenerator && <PresentationGenerator onClose={() => setShowGenerator(false)} classes={teacherClasses} subjectsByClass={userProfile.subjectsByClass || null} user={user} userProfile={userProfile} onStartLiveLesson={startLesson} setToast={(t) => t && showToast(t.message, t.type)} />}
            {showVideoGen && <VideoGenerator onClose={() => setShowVideoGen(false)} userProfile={userProfile} allClasses={teacherClasses} subjectsByClass={userProfile.subjectsByClass || null} />}
        </div>
    );
};

export default TeacherLibrary;
