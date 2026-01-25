import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { db, firebase, storage } from '../services/firebase';
import { Presentation, Quiz, GeneratedContent, SubjectsByClass, UserProfile, Slide, GES_SUBJECTS } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type firebase_app from 'firebase/compat/app';
import { useToast } from './common/Toast';
import SegmentedVideoPlayer from './common/SegmentedVideoPlayer';

const OMNI_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

const cleanJson = (text: string) => {
    return text.replace(/```json\n?|```/g, '').trim();
};

const sanitizeSlides = (slides: any[]): Slide[] => {
    if (!Array.isArray(slides)) return [];
    return slides.map(slide => ({
        title: String(slide.title || "Untitled Slide"),
        content: Array.isArray(slide.content) ? slide.content.map(String) : [String(slide.content || "")],
        imageUrl: String(slide.imageUrl || ""),
        imageStyle: (slide.imageStyle === 'contain' || slide.imageStyle === 'cover') ? slide.imageStyle : 'cover',
        layout: String(slide.layout || "standard"), // New: Standardized Layouts
        teacherScript: String(slide.teacherScript || ""),
        summaryScript: String(slide.summaryScript || ""),
    }));
};

interface PresentationGeneratorProps {
  onClose: () => void;
  classes: string[];
  subjectsByClass: SubjectsByClass | null;
  user: firebase_app.User | null;
  userProfile: UserProfile | null;
  initialContent?: GeneratedContent | null;
  onStartLiveLesson: (content: GeneratedContent) => void;
  setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}

export const PresentationGenerator: React.FC<PresentationGeneratorProps> = ({ onClose, classes, subjectsByClass, user, userProfile, initialContent = null, onStartLiveLesson, setToast }) => {
  const { showToast } = useToast();
  const [targetClasses, setTargetClasses] = useState<string[]>(initialContent?.classes || (classes.length > 0 ? [classes[0]] : []));
  const [subject, setSubject] = useState(initialContent?.subject || '');
  const [topic, setTopic] = useState(initialContent?.topic || '');
  const [subtopic, setSubtopic] = useState(''); // New: Subtopic Support
  const [subjectsForClass, setSubjectsForClass] = useState<string[]>([]);
  
  const [presentation, setPresentation] = useState<Presentation | null>(initialContent?.presentation || null);
  const [videoSegments, setVideoSegments] = useState<string[]>([]); // URLs of 5 segments
  const [currentSlide, setCurrentSlide] = useState(0);
  const [savedContentId, setSavedContentId] = useState<string | null>(initialContent?.id || null);
  const [view, setView] = useState<'form' | 'presentation'>(initialContent ? 'presentation' : 'form');
  const [loadingState, setLoadingState] = useState<'idle' | 'generating_presentation' | 'generating_video' | 'saving'>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  const isOmni = useMemo(() => OMNI_EMAILS.includes(user?.email || ""), [user]);

  useEffect(() => {
    if (isOmni) {
        setSubjectsForClass(GES_SUBJECTS);
    } else if (subjectsByClass && targetClasses.length > 0) {
        const subjectsOfSelectedClasses = targetClasses.map(c => subjectsByClass[c] || []);
        const commonSubjects = subjectsOfSelectedClasses.length > 0 
            ? subjectsOfSelectedClasses.reduce((a, b) => a.filter(c => b.includes(c)))
            : [];
        setSubjectsForClass(commonSubjects);
    } else {
        setSubjectsForClass([]);
    }
  }, [targetClasses, subjectsByClass, isOmni]);

  useEffect(() => {
      if (!initialContent && subjectsForClass.length > 0 && !subject) {
          setSubject(subjectsForClass[0]);
      }
  }, [subjectsForClass, initialContent, subject]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !user || !userProfile || !subject) return;
    setLoadingState('generating_presentation');
    setLoadingProgress(10);
    setError('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        setLoadingMessage('Architecting knowledge structure...');
        
        const systemInstruction = `You are a world-class academic designer. Generate a standardized 6-slide presentation. 
        Each slide MUST have: 
        1. title (string)
        2. content (array of bullet strings)
        3. layout (string: "hero", "split-left", "split-right", "full-text")
        4. imagePrompt (string for DALL-E style visual)
        5. teacherScript (string)
        6. summaryScript (string)
        
        Also provide a "videoSummaryPrompts" array containing exactly 5 sequential image/action descriptions for a continuous 40-second summary video (8s per segment).`;

        const prompt = `Create a presentation for ${targetClasses.join(', ')} on ${subject}. 
        Main Topic: ${topic}. ${subtopic ? `Focus specifically on: ${subtopic}.` : ""}
        Return JSON format.`;

        const res = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt, 
            config: { 
                systemInstruction,
                responseMimeType: 'application/json' 
            } 
        });

        const data = JSON.parse(cleanJson(res.text));
        const safeSlides = sanitizeSlides(data.slides);
        setPresentation({ slides: safeSlides });
        setLoadingProgress(40);

        // Step 2: Segmented Video Generation
        setLoadingState('generating_video');
        setLoadingMessage('Synthesizing reinforcement media (5 segments)...');
        
        const segmentUrls: string[] = [];
        const videoPrompts = data.videoSummaryPrompts || [];
        
        for (let i = 0; i < 5; i++) {
            setLoadingProgress(40 + (i * 10));
            setLoadingMessage(`Rendering Segment ${i + 1}/5...`);
            
            const segmentPrompt = videoPrompts[i] || `Detailed summary of ${topic} part ${i+1}, educational cinematic style.`;
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: segmentPrompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const videoBlob = await videoResponse.blob();
                const storageRef = storage.ref(`presentation_media/${user.uid}/${Date.now()}_seg_${i}.mp4`);
                await storageRef.put(videoBlob);
                const url = await storageRef.getDownloadURL();
                segmentUrls.push(url);
            }
        }

        setVideoSegments(segmentUrls);
        setLoadingProgress(100);

        const docRef = await db.collection('generatedContent').add({ 
            teacherId: user.uid, 
            teacherName: userProfile.name, 
            classes: targetClasses, 
            subject, 
            topic, 
            subtopic,
            presentation: { slides: safeSlides }, 
            videoSegments: segmentUrls,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
            collaboratorUids: [user.uid] 
        });
        setSavedContentId(docRef.id);
        setView('presentation');
        showToast("Protocol finalized with reinforcement media.", "success");

    } catch (err: any) { 
        setError(err.message); 
        showToast("Neural link failed. Partial data may be lost.", "error");
    } finally { 
        setLoadingState('idle'); 
    }
  };

  const renderForm = () => (
      <form onSubmit={handleGenerate} className="space-y-8 p-8 overflow-y-auto h-full bg-slate-900/40">
          <div className="text-center mb-12">
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tighter">STUDIO PROTOCOL</h3>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.5em] mt-3">Advanced Instructional Synthesis</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="!bg-slate-800/30 border-blue-500/10 p-8 space-y-6 shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                      <span className="text-2xl">🎯</span>
                      <h4 className="font-black text-white uppercase text-sm tracking-widest">Targeting</h4>
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Subject domain</label>
                      <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 outline-none text-white font-bold transition-all focus:border-blue-500">
                          {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Core Topic</label>
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quantum Mechanics" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 outline-none text-white font-bold placeholder-slate-700 focus:border-blue-500 transition-all" required />
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Specific Subtopic (Optional)</label>
                      <input type="text" value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="e.g. Wave-Particle Duality" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 outline-none text-white font-bold placeholder-slate-700 focus:border-blue-500 transition-all" />
                  </div>
              </Card>

              <Card className="!bg-slate-800/30 border-purple-500/10 p-8 space-y-6 shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                      <span className="text-2xl">👥</span>
                      <h4 className="font-black text-white uppercase text-sm tracking-widest">Scope Target</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto p-4 bg-slate-950 rounded-2xl border border-white/5 custom-scrollbar">
                      {classes.map(cls => (
                          <label key={cls} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${targetClasses.includes(cls) ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-900 border-transparent text-slate-500 hover:text-slate-300'}`}>
                              <input type="checkbox" checked={targetClasses.includes(cls)} onChange={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className="sr-only" />
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${targetClasses.includes(cls) ? 'bg-blue-500 border-blue-400' : 'border-slate-700'}`}>
                                {targetClasses.includes(cls) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest">{cls}</span>
                          </label>
                      ))}
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase text-center leading-relaxed">Integrated visuals and reinforcement video will be automatically embedded based on selected scope.</p>
              </Card>
          </div>

          <div className="pt-8">
              <Button type="submit" disabled={loadingState !== 'idle'} className="w-full py-8 text-xl font-black uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(59,130,246,0.3)] rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-none">
                  {loadingState !== 'idle' ? (
                      <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-4">
                              <Spinner />
                              <span>{loadingMessage}</span>
                          </div>
                          <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-white transition-all duration-500" style={{ width: `${loadingProgress}%` }}></div>
                          </div>
                      </div>
                  ) : '🚀 INITIALIZE SYNTHESIS'}
              </Button>
              {error && <p className="text-red-400 text-xs font-black uppercase text-center mt-6 tracking-widest animate-pulse">PROTOCOL FAULT: {error}</p>}
          </div>
      </form>
  );

  const renderPresentation = () => {
    if (!presentation) return null;
    const isLastSlide = currentSlide === presentation.slides.length - 1;
    const slide = presentation.slides[currentSlide];

    return (
        <div className="h-full flex flex-col bg-[#020617] animate-fade-in">
            {/* Standardized Template Engine */}
            <div className="flex-grow flex items-center justify-center p-6 sm:p-12 overflow-hidden relative">
                {/* Background Decor */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[150px]"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[150px]"></div>
                </div>

                <Card className="w-full max-w-7xl h-full flex flex-col !p-0 overflow-hidden bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-none">
                    <div className="flex-grow flex flex-col md:flex-row">
                        {/* Slide Layout Switcher */}
                        {slide.layout === 'hero' ? (
                            <div className="w-full h-full relative overflow-hidden bg-slate-900">
                                <img src={slide.imageUrl} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-20 z-10">
                                    <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-8 drop-shadow-2xl">{slide.title}</h1>
                                    <div className="h-2 w-24 bg-blue-500 rounded-full shadow-[0_0_30px_blue] mb-12"></div>
                                    <div className="space-y-4">
                                        {slide.content.map((p, i) => (
                                            <p key={i} className="text-xl md:text-3xl text-blue-100 font-bold uppercase tracking-widest">{p}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : slide.layout === 'split-left' ? (
                            <>
                                <div className="w-full md:w-1/2 h-48 md:h-full relative overflow-hidden bg-slate-200">
                                    <img src={slide.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="w-full md:w-1/2 p-12 md:p-24 flex flex-col justify-center">
                                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter mb-10 border-l-8 border-blue-600 pl-8 leading-none">{slide.title}</h2>
                                    <ul className="space-y-6">
                                        {slide.content.map((p, i) => (
                                            <li key={i} className="flex items-start gap-4">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                                                <span className="text-lg md:text-2xl text-slate-600 font-medium leading-relaxed">{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : slide.layout === 'split-right' ? (
                            <>
                                <div className="w-full md:w-1/2 p-12 md:p-24 flex flex-col justify-center order-2 md:order-1">
                                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter mb-10 border-r-8 border-indigo-600 pr-8 text-right leading-none">{slide.title}</h2>
                                    <ul className="space-y-6">
                                        {slide.content.map((p, i) => (
                                            <li key={i} className="flex items-start justify-end gap-4 text-right">
                                                <span className="text-lg md:text-2xl text-slate-600 font-medium leading-relaxed">{p}</span>
                                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0"></div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="w-full md:w-1/2 h-48 md:h-full relative overflow-hidden bg-slate-200 order-1 md:order-2">
                                    <img src={slide.imageUrl} className="w-full h-full object-cover" />
                                </div>
                            </>
                        ) : (
                            <div className="w-full p-12 md:p-24 flex flex-col items-center justify-center text-center">
                                <h2 className="text-5xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter mb-16">{slide.title}</h2>
                                <div className="max-w-4xl space-y-8">
                                    {slide.content.map((p, i) => (
                                        <p key={i} className="text-2xl md:text-4xl text-slate-500 font-medium leading-snug">"{p}"</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar & Navigation */}
                    <div className="h-32 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-12 sm:px-20 shrink-0">
                        <div className="flex-1 hidden sm:block">
                            <div className="h-1.5 w-48 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${((currentSlide + 1) / presentation.slides.length) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="flex gap-4 sm:gap-6">
                            <button onClick={() => setCurrentSlide(p => Math.max(0, p - 1))} disabled={currentSlide === 0} className="px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all disabled:opacity-10">Back</button>
                            {isLastSlide ? (
                                <Button onClick={() => setView('form')} className="px-12 py-4 rounded-full font-black uppercase tracking-widest shadow-xl">Complete Module</Button>
                            ) : (
                                <Button onClick={() => setCurrentSlide(p => p + 1)} className="px-16 py-4 rounded-full font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Proceed →</Button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* SEAMLESS REINFORCEMENT VIDEO - Overlay on last slide */}
            {isLastSlide && videoSegments.length > 0 && (
                <div className="fixed inset-0 z-[100] animate-fade-in">
                    <SegmentedVideoPlayer urls={videoSegments} onClose={() => setCurrentSlide(0)} />
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-0 sm:p-4 z-50">
        <Card className="w-full max-w-[1600px] h-full sm:h-[95vh] flex flex-col !p-0 !bg-slate-900 border-slate-800 overflow-hidden shadow-2xl rounded-none sm:rounded-[3rem]">
             <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-900 relative z-50">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xl shadow-[0_0_15px_blue]">✨</div>
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">Instructional Architect</h2>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="flex-grow overflow-hidden">{view === 'form' ? renderForm() : renderPresentation()}</div>
        </Card>
    </div>
  );
};