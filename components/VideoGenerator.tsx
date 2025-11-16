import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { db, storage, firebase } from '../services/firebase';
import type { UserProfile, VideoContent, SubjectsByClass } from '../types';

interface VideoGeneratorProps {
    onClose: () => void;
    userProfile: UserProfile;
    allClasses: string[];
    subjectsByClass: SubjectsByClass | null;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const videoStyles = ["Cinematic", "Anime", "Documentary", "Vlog", "Stop Motion", "Claymation", "Watercolor", "Pixel Art", "Black and White", "Vintage Film", "Other"];
const musicStyles = ["Upbeat Instrumental", "Calm & Relaxing", "Orchestral", "Lo-fi Beats", "Acoustic Guitar", "Electronic", "No Music", "Other"];


const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onClose, userProfile, allClasses, subjectsByClass }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<string>(videoStyles[0]);
    const [customStyle, setCustomStyle] = useState<string>('');
    const [selectedMusic, setSelectedMusic] = useState<string>(musicStyles[0]);
    const [customMusic, setCustomMusic] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const [selectedClass, setSelectedClass] = useState(allClasses[0] || '');
    const [subjectsForClass, setSubjectsForClass] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    const [videoDetails, setVideoDetails] = useState({ title: '', description: '', targetClasses: [] as string[]});

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (subjectsByClass && selectedClass) {
            const newSubjects = subjectsByClass[selectedClass] || [];
            setSubjectsForClass(newSubjects);
            setSelectedSubject(newSubjects[0] || '');
        }
    }, [selectedClass, subjectsByClass]);

    const handleStartOver = () => {
        setImageFile(null);
        setImagePreview(null);
        setPrompt('');
        setSelectedStyle(videoStyles[0]);
        setCustomStyle('');
        setSelectedMusic(musicStyles[0]);
        setCustomMusic('');
        setGeneratedVideoBlob(null);
        setGeneratedVideoUrl(null);
        setError('');
        setVideoDetails({ title: '', description: '', targetClasses: [] });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleStartOver();
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGenerateVideo = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to describe the video.');
            return;
        }
        if (!selectedClass || !selectedSubject) {
            setError('Please select a class and subject.');
            return;
        }

        setIsLoading(true);
        setError('');
        setGeneratedVideoUrl(null);
        setGeneratedVideoBlob(null);
        setLoadingMessage('Initializing...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            setLoadingMessage('Preparing video request...');
            const imageBase64 = imageFile ? await blobToBase64(imageFile) : null;
            const style = selectedStyle === 'Other' ? customStyle : selectedStyle;
            const backgroundMusic = selectedMusic === 'Other' ? customMusic : selectedMusic === 'No Music' ? '' : selectedMusic;

            let operation;

            if (imageBase64 && imageFile) {
                setLoadingMessage('Sending request to high-quality likeness model...');
                
                const finalPrompt = `A photorealistic video of the person in the reference image, acting as a teacher for a '${selectedClass}' class on '${selectedSubject}'. The teacher is ${prompt}. Video style: ${style}. ${backgroundMusic ? `Include background music that is: ${backgroundMusic}.` : 'No background music.'}`;
                
                const referenceImagesPayload = [{
                    image: { imageBytes: imageBase64, mimeType: imageFile.type },
                    referenceType: 'ASSET',
                }];

                operation = await ai.models.generateVideos({
                    model: 'veo-3.1-generate-preview',
                    prompt: finalPrompt,
                    config: {
                        numberOfVideos: 1,
                        referenceImages: referenceImagesPayload,
                        resolution: '720p',
                        aspectRatio: '16:9'
                    }
                });

            } else {
                setLoadingMessage('Sending request to standard model...');
                const finalPrompt = `An educational video for a '${selectedClass}' class studying '${selectedSubject}'. The video is about: ${prompt}. Video style: ${style}. ${backgroundMusic ? `Include background music that is: ${backgroundMusic}.` : 'No background music.'}`;

                operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: finalPrompt,
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: aspectRatio,
                    },
                });
            }
            
            setLoadingMessage('Waiting for generation to start...');
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({ operation: operation });

                const progress = operation.metadata?.progress as { percentage?: number; state?: string };
                if (progress) {
                    const stateMessage = progress.state ? progress.state.charAt(0).toUpperCase() + progress.state.slice(1).toLowerCase().replace(/_/g, " ") : 'Processing...';
                    setLoadingMessage(`Status: ${stateMessage}`);
                }
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

            if (downloadLink) {
                setLoadingMessage("Finalizing video...");

                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.statusText}`);
                
                const videoBlob = await videoResponse.blob();
                setGeneratedVideoBlob(videoBlob);
                setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
            } else {
                if (operation.error) {
                    console.error("Veo operation failed:", operation.error);
                    throw new Error(`Video generation failed: ${operation.error.message}`);
                }
                throw new Error("Video generation completed, but no video was returned. This can happen due to safety filters. Please try modifying your prompt.");
            }

        } catch (err: any) {
            console.error("Video generation failed:", err);
            let errorMessage = err.message || "An error occurred during video generation. Please try again.";
            if (err.message?.includes("Requested entity was not found")) {
                errorMessage = "Your API key seems invalid or is missing permissions. Please contact an administrator.";
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSaveVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!generatedVideoBlob || !userProfile || !videoDetails.title.trim()) {
            setError("Please provide a title for the video.");
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            setLoadingMessage("Uploading video to storage...");
            const collectionRef = db.collection('videoContent').doc(userProfile.uid).collection('videos');
            const docRef = collectionRef.doc();
            const storagePath = `videoContent/${userProfile.uid}/${docRef.id}.mp4`;
            const storageRef = storage.ref(storagePath);
            await storageRef.put(generatedVideoBlob);
            const downloadURL = await storageRef.getDownloadURL();

            setLoadingMessage("Saving details to database...");
            const videoData: Omit<VideoContent, 'id'> = {
                title: videoDetails.title,
                description: videoDetails.description,
                creatorId: userProfile.uid,
                creatorName: userProfile.name,
                videoUrl: downloadURL,
                storagePath: storagePath,
                targetClasses: videoDetails.targetClasses,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                expiresAt: firebase.firestore.Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000)
            };

            await docRef.set(videoData);
            onClose();

        } catch(err: any) {
            console.error("Error saving video:", err);
            setError("Failed to save video. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClassChange = (className: string) => {
        setVideoDetails(prev => ({
            ...prev,
            targetClasses: prev.targetClasses.includes(className) 
                ? prev.targetClasses.filter(c => c !== className)
                : [...prev.targetClasses, className]
        }));
    };
    
    const renderGenerator = () => (
        <form onSubmit={handleSaveVideo}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Controls */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="video-gen-class" className="text-sm font-medium text-gray-300">Class</label>
                            <select id="video-gen-class" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600">
                                {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="video-gen-subject" className="text-sm font-medium text-gray-300">Subject</label>
                            <select id="video-gen-subject" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={subjectsForClass.length === 0} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600">
                                {subjectsForClass.length > 0 ? subjectsForClass.map(s => <option key={s} value={s}>{s}</option>) : <option>Select a class first</option>}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-300">Teacher Likeness Image (Optional)</label>
                        <input ref={fileInputRef} id="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleFileChange} />
                        <div onClick={() => fileInputRef.current?.click()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-blue-500">
                            {imagePreview ? <img src={imagePreview} alt="Preview" className="mx-auto max-h-40 rounded-md" /> : <div className="space-y-1 text-center"><svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><p className="text-sm text-gray-400">Click to upload a photo</p></div>}
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="prompt" className="text-sm font-medium text-gray-300">Prompt / Description</label>
                        <textarea id="prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., explaining the water cycle using a whiteboard" required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300">Style</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {videoStyles.map(style => (
                                    <button
                                        key={style}
                                        type="button"
                                        onClick={() => setSelectedStyle(style)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                            selectedStyle === style
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-gray-300'
                                        }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                            {selectedStyle === 'Other' && (
                                <input
                                    type="text"
                                    value={customStyle}
                                    onChange={e => setCustomStyle(e.target.value)}
                                    placeholder="Describe custom style"
                                    className="mt-2 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm"
                                />
                            )}
                        </div>
                         <div>
                           <label className="text-sm font-medium text-gray-300">Background Music</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {musicStyles.map(music => (
                                    <button
                                        key={music}
                                        type="button"
                                        onClick={() => setSelectedMusic(music)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                            selectedMusic === music
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-gray-300'
                                        }`}
                                    >
                                        {music}
                                    </button>
                                ))}
                            </div>
                           {selectedMusic === 'Other' && (
                               <input 
                                   type="text" 
                                   value={customMusic} 
                                   onChange={e => setCustomMusic(e.target.value)}
                                   placeholder="Describe custom music"
                                   className="mt-2 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm"
                               />
                           )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-300">Aspect Ratio</label>
                        {imageFile && <span className="text-xs text-yellow-400 ml-2">(Locked to 16:9 for likeness generation)</span>}
                        <div className="flex flex-wrap sm:flex-nowrap gap-4 mt-1">
                            <label className={`flex items-center p-3 border-2 rounded-md w-full ${aspectRatio === '16:9' || !!imageFile ? 'border-blue-500' : 'border-slate-600'} ${imageFile ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                <input type="radio" name="aspectRatio" value="16:9" checked={aspectRatio === '16:9' || !!imageFile} onChange={() => setAspectRatio('16:9')} disabled={!!imageFile} className="sr-only"/>
                                <span className="w-16 h-9 bg-slate-600 rounded-sm mr-3"></span>16:9
                            </label>
                            <label className={`flex items-center p-3 border-2 rounded-md w-full ${aspectRatio === '9:16' && !imageFile ? 'border-blue-500' : 'border-slate-600'} ${imageFile ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                <input type="radio" name="aspectRatio" value="9:16" checked={aspectRatio === '9:16' && !imageFile} onChange={() => setAspectRatio('9:16')} disabled={!!imageFile} className="sr-only"/>
                                <span className="w-9 h-16 bg-slate-600 rounded-sm mr-3"></span>9:16
                            </label>
                        </div>
                    </div>
                     <p className="text-xs text-gray-400 text-center">
                        The Veo video model may require a project with billing enabled.
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Learn more</a>.
                    </p>

                    <div className="flex gap-2 pt-2">
                        <Button type="button" onClick={handleGenerateVideo} disabled={isLoading} className="flex-grow">
                            {isLoading ? 'Generating...' : generatedVideoUrl ? 'Regenerate' : 'Generate Video'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleStartOver} disabled={isLoading}>Start Over</Button>
                    </div>
                </div>

                {/* Right Side: Preview & Metadata */}
                <div className="space-y-4">
                    <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-center aspect-video">
                        {isLoading ? (
                            <div className="text-center w-full px-4 flex flex-col items-center justify-center">
                                <Spinner />
                                <p className="mt-4 text-sm">{loadingMessage}</p>
                            </div>
                         )
                         : error ? <p className="text-red-400 text-center">{error}</p>
                         : generatedVideoUrl ? <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full max-h-full rounded-md"></video>
                         : <p className="text-gray-500">Video preview will appear here.</p>}
                    </div>

                    {generatedVideoUrl && !isLoading && (
                        <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg">
                             <h3 className="text-lg font-semibold">Save Your Video</h3>
                            <input type="text" placeholder="Video Title" value={videoDetails.title} onChange={e => setVideoDetails({...videoDetails, title: e.target.value})} required className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" />
                            <textarea placeholder="Description (Optional)" value={videoDetails.description} onChange={e => setVideoDetails({...videoDetails, description: e.target.value})} className="w-full p-2 h-20 bg-slate-700 rounded-md border border-slate-600" />
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Share with Classes</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 bg-slate-700 rounded-md max-h-24 overflow-y-auto">
                                    {allClasses.map(c => <label key={c} className="flex items-center space-x-2 p-1.5"><input type="checkbox" checked={videoDetails.targetClasses.includes(c)} onChange={() => handleClassChange(c)} className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-500 rounded focus:ring-blue-500"/><span>{c}</span></label>)}
                                </div>
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full">{isLoading ? loadingMessage : 'Save and Publish Video'}</Button>
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-5xl">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">AI Video Generator</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                 </div>
                 {renderGenerator()}
            </Card>
        </div>
    );
};

export default VideoGenerator;
