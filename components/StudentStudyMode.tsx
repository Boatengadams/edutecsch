
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, GES_SUBJECTS, Timetable } from '../types';
import FocusTimer from './FocusTimer';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GoogleGenAI, Modality } from '@google/genai';

interface StudentStudyModeProps {
  onExit: () => void;
  userProfile: UserProfile;
  timetable: Timetable | null;
}

// --- Local Types for this component ---
interface StudySlide {
  title: string;
  bullets: string[];
  teacherScript: string;
  summaryScript: string; // New: For the video recap
  imagePrompt: string;
  imageUrl?: string; // Filled later
  interactionType?: 'continue' | 'question' | 'video_summary';
  checkQuestion?: {
    question: string;
    options: string[];
    correctAnswer: string;
  } | null;
}

interface StudyModule {
  title: string;
  topic: string;
  slides: StudySlide[];
}

interface SummarySegment {
    videoUrl?: string;
    imageUrl?: string;
    audioUrl: string;
}
// --- End of Local Types ---

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper for audio decoding (Client-side TTS)
async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}

// Helper delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Internal Seamless Video Player for merged experience (Video + Audio)
const SeamlessVideoPlayer: React.FC<{ segments: SummarySegment[], onEnded: () => void }> = ({ segments, onEnded }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const bgMusicRef = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isImageSegment, setIsImageSegment] = useState(false);

    useEffect(() => {
        // Start background music with low volume
        if (bgMusicRef.current) {
            bgMusicRef.current.volume = 0.1; 
            bgMusicRef.current.play().catch(e => console.log("Bg music auto-play prevented", e));
        }
    }, []);

    useEffect(() => {
        const videoEl = videoRef.current;
        const audioEl = audioRef.current;
        const segment = segments[currentIndex];

        if (audioEl && segment) {
            audioEl.src = segment.audioUrl;
            
            if (segment.videoUrl) {
                setIsImageSegment(false);
                if (videoEl) {
                    videoEl.src = segment.videoUrl;
                    videoEl.load();
                    const playVideo = async () => {
                        try {
                            await videoEl.play();
                        } catch (e) {
                            console.log("Video auto-play prevented", e);
                        }
                    };
                    playVideo();
                }
            } else {
                setIsImageSegment(true);
            }

            const playAudio = async () => {
                try {
                    await audioEl.play();
                } catch (e) {
                    console.log("Audio auto-play prevented", e);
                }
            };
            playAudio();
        }

        // Preload next segment assets
        const nextIndex = (currentIndex + 1) % segments.length;
        const nextSeg = segments[nextIndex];
        if (nextSeg.videoUrl) {
            const preloadVideo = document.createElement('video');
            preloadVideo.src = nextSeg.videoUrl;
            preloadVideo.preload = 'auto';
        }
        if (nextSeg.audioUrl) {
            const preloadAudio = document.createElement('audio');
            preloadAudio.src = nextSeg.audioUrl;
            preloadAudio.preload = 'auto';
        }

    }, [currentIndex, segments]);

    // We drive the sequence primarily by AUDIO duration.
    // When audio ends, we go to the next segment. If it's the last segment, we loop back to 0.
    const handleAudioEnded = () => {
        setCurrentIndex(prev => (prev + 1) % segments.length);
    };

    const segment = segments[currentIndex];

    return (
        <div className="w-full h-full bg-black flex items-center justify-center rounded-xl overflow-hidden relative group">
            {/* Background Music - Relaxing Ambient Loop */}
            <audio ref={bgMusicRef} src="https://assets.mixkit.co/music/preview/mixkit-dreams-and-imagination-1244.mp3" loop />
            
            {isImageSegment ? (
                <div className="w-full h-full relative overflow-hidden">
                    {/* Ken Burns Effect for Static Images */}
                    <img 
                        key={currentIndex} // Force re-render for animation reset
                        src={segment?.imageUrl} 
                        className="w-full h-full object-cover animate-slow-zoom" 
                        alt="Summary Visual"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                </div>
            ) : (
                <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    muted // Video is muted because we play separate TTS audio
                    loop // Loop visual if audio is longer
                    playsInline
                />
            )}
            
            <audio 
                ref={audioRef}
                onEnded={handleAudioEnded}
                className="hidden"
            />
            
            <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                <p className="text-white/80 text-sm font-medium drop-shadow-md animate-pulse">
                    Playing Summary Loop...
                </p>
            </div>
            
            <style>{`
                @keyframes slowZoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
                .animate-slow-zoom {
                    animation: slowZoom 20s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

const StudentStudyMode: React.FC<StudentStudyModeProps> = ({ onExit, userProfile, timetable }) => {
  const [completedSessions, setCompletedSessions] = useState(0);
  
  // State for the "Learning Hub"
  const [learningHubStep, setLearningHubStep] = useState<'smart_plan' | 'module'>('smart_plan');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false); // Focus Layout Mode
  const [showFocusTimerOverlay, setShowFocusTimerOverlay] = useState(false); // Focus Session Overlay
  
  const [learningModule, setLearningModule] = useState<StudyModule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [exploreSubject, setExploreSubject] = useState(GES_SUBJECTS[0]);
  const [exploreTopic, setExploreTopic] = useState('');
  
  // Interactive State
  const [showCheckDialog, setShowCheckDialog] = useState(false); // Modal for next slide check
  const [checkDialogTitle, setCheckDialogTitle] = useState("Check Point");
  const [checkDialogMessage, setCheckDialogMessage] = useState("Ready to continue?");
  
  // Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Audio Preloading Cache
  const audioCache = useRef<Map<number, AudioBuffer>>(new Map());
  const preloadingRef = useRef<Set<number>>(new Set());

  // Video Background Generation State
  const [summarySegments, setSummarySegments] = useState<SummarySegment[]>([]);
  const [videoProgress, setVideoProgress] = useState(0);

  const handleSessionComplete = () => {
    setCompletedSessions(prev => prev + 1);
  };

  // Smart Plan Effect (Timetable + Performance)
  useEffect(() => {
      const initPlan = async () => {
        const now = new Date();
        const currentDay = DAYS[now.getDay()];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        let targetSubject = GES_SUBJECTS[0];
        let reason = "Let's learn something new!";

        // Priority 1: Timetable
        if (timetable && timetable.timetableData[currentDay]) {
            const periods = timetable.timetableData[currentDay];
            const currentTimeVal = currentHour * 60 + currentMinute;
            
            const currentPeriod = periods.find(p => {
                const [startH, startM] = p.startTime.split(':').map(Number);
                const [endH, endM] = p.endTime.split(':').map(Number);
                const startVal = startH * 60 + startM;
                const endVal = endH * 60 + endM;
                return currentTimeVal >= startVal && currentTimeVal < endVal;
            });

            if (currentPeriod && currentPeriod.subject) {
                targetSubject = currentPeriod.subject;
                reason = "It's time for this class on your timetable.";
            }
        }

        setExploreSubject(targetSubject);
        suggestTopic(targetSubject, reason);
      };
      
      initPlan();
  }, [timetable]);

  const suggestTopic = async (subject: string, context: string) => {
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Context: ${context}
            Student Class: ${userProfile.class}
            Subject: ${subject}
            
            Task: Suggest a single, specific, and interesting topic for this student to study right now.
            Return ONLY the topic name as a plain string.
          `;
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
          });
          if (response.text) setExploreTopic(response.text.trim());
      } catch (e) {
          console.error("Topic suggestion failed", e);
      }
  };

  // --- Audio Logic ---

  const stopAudio = () => {
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch (e) {}
          audioSourceRef.current.disconnect();
          audioSourceRef.current = null;
      }
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
      }
      setIsPlayingAudio(false);
      setAudioProgress(0);
  };

  const fetchAudioBuffer = async (text: string, voice: string = 'Puck'): Promise<AudioBuffer> => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data");

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      
      return await decodeAudioData(bytes, audioContextRef.current);
  };

  const playScript = async (text: string, index: number) => {
      if (!text) return;
      
      // STOP PREVIOUS AUDIO IMMEDIATELY
      stopAudio();
      setIsPlayingAudio(true);
      setAudioProgress(0);

      try {
          let buffer: AudioBuffer;

          // Check Cache First
          if (audioCache.current.has(index)) {
              buffer = audioCache.current.get(index)!;
          } else {
              buffer = await fetchAudioBuffer(text);
              audioCache.current.set(index, buffer);
          }

          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }

          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
          
          const startTime = audioContextRef.current.currentTime;
          const duration = buffer.duration;

          source.onended = () => {
              setIsPlayingAudio(false);
              setAudioProgress(100);
              if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          };
          
          source.start();
          audioSourceRef.current = source;

          // Animation Loop for Progress Bar
          const animate = () => {
              if (!audioContextRef.current) return;
              const elapsed = audioContextRef.current.currentTime - startTime;
              const progress = Math.min((elapsed / duration) * 100, 100);
              setAudioProgress(progress);
              
              if (progress < 100) {
                  animationFrameRef.current = requestAnimationFrame(animate);
              }
          };
          animationFrameRef.current = requestAnimationFrame(animate);

      } catch (err) {
          console.error("Audio playback error", err);
          setIsPlayingAudio(false);
      }
  };

  const preloadAudio = async (index: number) => {
      if (!learningModule) return;
      const slide = learningModule.slides[index];
      if (!slide || !slide.teacherScript || slide.interactionType === 'video_summary') return;
      
      // If already cached or currently preloading, skip
      if (audioCache.current.has(index) || preloadingRef.current.has(index)) return;

      preloadingRef.current.add(index);
      try {
          const buffer = await fetchAudioBuffer(slide.teacherScript);
          audioCache.current.set(index, buffer);
      } catch (e) {
          console.error(`Failed to preload audio for slide ${index}`, e);
      } finally {
          preloadingRef.current.delete(index);
      }
  };

  // Effect to manage preloading
  useEffect(() => {
      if (!learningModule) return;
      // Preload next 2 slides
      [1, 2].forEach(offset => {
          const nextIndex = currentSlideIndex + offset;
          if (nextIndex < learningModule.slides.length) {
              preloadAudio(nextIndex);
          }
      });
  }, [currentSlideIndex, learningModule]);

  // Effect to play audio when slide changes
  useEffect(() => {
      if (learningModule && learningModule.slides[currentSlideIndex]) {
          const slide = learningModule.slides[currentSlideIndex];
          
          // Stop any audio from previous slide immediately
          stopAudio();

          if (slide.interactionType !== 'video_summary') {
              const timer = setTimeout(() => {
                  playScript(slide.teacherScript, currentSlideIndex);
              }, 500);
              return () => {
                  clearTimeout(timer);
                  stopAudio();
              }
          }
      }
  }, [currentSlideIndex, learningModule]);

  // Background Video Generation
  useEffect(() => {
      if (learningModule && learningModule.slides && summarySegments.length === 0) {
          generateSummaryContent(learningModule.slides);
      }
  }, [learningModule]);

  const generateSummaryContent = async (slides: StudySlide[]) => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const segments: SummarySegment[] = [];
      const contentSlides = slides.filter(s => s.interactionType !== 'video_summary');
      const total = contentSlides.length;

      // Generate video segments sequentially
      for (let i = 0; i < total; i++) {
          const slide = contentSlides[i];
          try {
              // 1. Generate Audio Summary (using 'Fenrir' for a different narrator voice)
              let audioUrl = '';
              try {
                  const ttsResponse = await ai.models.generateContent({
                      model: "gemini-2.5-flash-preview-tts",
                      contents: [{ parts: [{ text: slide.summaryScript }] }],
                      config: {
                          responseModalities: [Modality.AUDIO],
                          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                      },
                  });
                  const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                  if (base64Audio) {
                      const binaryString = atob(base64Audio);
                      const len = binaryString.length;
                      const bytes = new Uint8Array(len);
                      for (let k = 0; k < len; k++) { bytes[k] = binaryString.charCodeAt(k); }
                      const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
                      audioUrl = URL.createObjectURL(audioBlob);
                  }
              } catch (ttsErr) {
                  console.warn("TTS generation failed for summary, skipping audio", ttsErr);
              }

              if (!audioUrl) continue; // Skip segment if audio failed

              // 2. Generate Video Clip with Rate Limit Handling & Fallback
              let videoUrl = '';
              const prompt = `${slide.imagePrompt}. Educational, animated style, clear visuals. High quality.`;
              
              let retries = 3;
              let delayTime = 15000; // Start with 15s delay if quota hit

              while (retries > 0) {
                  try {
                      // Always add a small natural delay between requests to be polite to the API
                      if (i > 0) await delay(5000);

                      let operation = await ai.models.generateVideos({
                          model: 'veo-3.1-fast-generate-preview',
                          prompt: prompt,
                          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
                      });
                      
                      while (!operation.done) {
                          await delay(5000);
                          operation = await ai.operations.getVideosOperation({ operation });
                      }
                      
                      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
                      if (uri) {
                          const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
                          if (res.ok) {
                              const blob = await res.blob();
                              videoUrl = URL.createObjectURL(blob);
                          }
                      }
                      break; // Success, exit retry loop
                  } catch (e: any) {
                      const msg = e.message || '';
                      // Check for Rate Limit (429) or Quota Exceeded errors
                      if (msg.includes('429') || e.status === 429 || e.code === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                          console.warn(`Rate limit hit on slide ${i}. Retrying in ${delayTime/1000}s... (${retries} attempts left)`);
                          await delay(delayTime);
                          delayTime *= 2; // Exponential backoff
                          retries--;
                      } else {
                          // Non-retryable error (e.g. prompt safety violation), break and fallback
                          console.warn(`Non-retryable video gen error on slide ${i}:`, e);
                          break;
                      }
                  }
              }

              // Use video if generated, otherwise fallback to static image
              if (videoUrl) {
                  segments.push({ videoUrl, audioUrl });
                  setSummarySegments(prev => [...prev, { videoUrl, audioUrl }]);
              } else if (slide.imageUrl) {
                  console.log(`Fallback to static image for slide ${i} due to video gen failure.`);
                  segments.push({ imageUrl: slide.imageUrl, audioUrl });
                  setSummarySegments(prev => [...prev, { imageUrl: slide.imageUrl, audioUrl }]);
              } else {
                  console.warn(`Skipping summary segment for slide ${i} - no video or image available.`);
              }
              
              setVideoProgress(((i + 1) / total) * 100);

          } catch (err) {
              console.error(`Segment generation failed for slide ${i}`, err);
          }
      }
  };

  const handleGenerateModule = async () => {
    if (!exploreTopic.trim() || !exploreSubject) return;

    setIsProcessing(true);
    setLearningModule(null);
    setCurrentSlideIndex(0);
    setError('');
    
    // Reset caches
    setSummarySegments([]);
    setVideoProgress(0);
    audioCache.current.clear();
    preloadingRef.current.clear();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are an expert tutor creating a "Study Mode" presentation for a student in class '${userProfile.class}'.
      Subject: '${exploreSubject}'. Topic: '${exploreTopic}'.
      
      Create a 5-slide learning module followed by a video summary slide.
      
      For EACH content slide, provide:
      1. 'title': Engaging slide title.
      2. 'bullets': Array of 3-4 short, clear bullet points.
      3. 'teacherScript': A comprehensive, conversational explanation (minimum 60-100 words). Write it exactly as a teacher would speak it. Use engaging and simple language.
      4. 'summaryScript': A narrative recap of this specific slide. This will be used for the video summary. Ensure it connects smoothly to the next slide conceptually to form a continuous story.
      5. 'imagePrompt': Highly descriptive prompt for an educational image related to this slide.
      6. 'checkQuestion': Optional multiple-choice question.
      
      Return ONLY a valid JSON object.
      {
        "title": "Module Title",
        "topic": "${exploreTopic}",
        "slides": [ ... ]
      }`;

      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const moduleData = JSON.parse(textResponse.text) as StudyModule;
      
      // Add Video Slide at end
      moduleData.slides.push({
          title: "Video Summary",
          bullets: ["Watch this seamless summary of today's lesson.", "Great job reaching the end!"],
          teacherScript: "Excellent work! Sit back and watch this video summary I've prepared for you.",
          summaryScript: "",
          imagePrompt: "",
          interactionType: "video_summary"
      });

      // Generate Images in Parallel for the content slides
      const imagePromises = moduleData.slides
        .filter(s => s.interactionType !== 'video_summary')
        .map(slide => 
            ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: slide.imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            })
        );

      const imageResponses = await Promise.all(imagePromises);
      
      let imgIdx = 0;
      moduleData.slides.forEach((slide) => {
          if (slide.interactionType !== 'video_summary') {
              const res = imageResponses[imgIdx];
              const part = res?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
              if (part && part.inlineData) {
                  slide.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              }
              imgIdx++;
          }
      });

      setLearningModule(moduleData); 
      setLearningHubStep('module');

    } catch (err: any) {
      console.error(`AI Explore Error:`, err);
      setError('Sorry, I was unable to generate the lesson. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerNextSlide = useCallback(() => {
      // Logic for the interactive "Question" buttons
      const randomTitles = ["Check Point", "Teacher's Question", "Pause for a sec", "Quick Check"];
      const randomMessages = [
          "Can I start the next part?",
          "Is everything clear so far?",
          "Are you ready to proceed?",
          "Shall we continue to the next slide?",
          "Did you understand the last point?"
      ];
      
      setCheckDialogTitle(randomTitles[Math.floor(Math.random() * randomTitles.length)]);
      setCheckDialogMessage(randomMessages[Math.floor(Math.random() * randomMessages.length)]);
      
      setShowCheckDialog(true);
  }, []);

  const confirmNextSlide = useCallback(() => {
      setShowCheckDialog(false);
      if (learningModule && currentSlideIndex < learningModule.slides.length - 1) {
          setCurrentSlideIndex(prev => prev + 1);
      }
  }, [learningModule, currentSlideIndex]);

  const handlePrevSlide = useCallback(() => {
      if (currentSlideIndex > 0) {
          setCurrentSlideIndex(prev => prev - 1);
      }
  }, [currentSlideIndex]);
  
  // Keyboard Navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight') {
             if (currentSlideIndex === learningModule?.slides.length! - 1) return;
             triggerNextSlide();
          }
          if (e.key === 'ArrowLeft') handlePrevSlide();
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerNextSlide, handlePrevSlide, currentSlideIndex, learningModule]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col font-sans text-slate-200 transition-all duration-500 ${isFocusMode ? 'bg-black' : 'bg-slate-950'}`}>
      
      {/* Header - Hidden in Focus Mode */}
      {!isFocusMode && (
          <header className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                    🚀
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Student Study Mode</h1>
                    {videoProgress > 0 && videoProgress < 100 && (
                        <div className="flex items-center gap-2 text-xs text-blue-400">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Building Video Summary... {Math.round(videoProgress)}%
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <button
                    onClick={() => setShowFocusTimerOverlay(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all text-sm text-slate-300 shadow-sm group"
                 >
                    <span className="group-hover:scale-110 transition-transform">⏱️</span>
                    <span>Focus Session</span>
                 </button>

                 <button onClick={onExit} className="flex items-center gap-2 p-2 px-3 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white border border-transparent hover:border-slate-700">
                    <span className="hidden sm:inline font-medium">Quit</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                 </button>
            </div>
          </header>
      )}

      {/* Main Content Area */}
      <main className="flex-grow relative overflow-hidden flex flex-col items-center justify-center">
        {/* Background Ambient */}
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ opacity: isFocusMode ? 0.2 : 1 }}>
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950"></div>
             <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[100px] rounded-full"></div>
             <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full"></div>
        </div>

        {learningHubStep === 'smart_plan' && !isFocusMode && (
            <div className="relative z-10 w-full max-w-4xl p-6 animate-fade-in-up">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 mb-4">
                        Ready to Learn?
                    </h2>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto">
                        I've analyzed your progress and schedule. Here is a suggested topic to boost your grades.
                    </p>
                </div>

                <Card className="!bg-slate-900/60 !backdrop-blur-xl border-slate-700 shadow-2xl p-8">
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerateModule(); }} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                                <select value={exploreSubject} onChange={e => setExploreSubject(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-600 rounded-xl text-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer">
                                    {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Topic</label>
                                <input type="text" value={exploreTopic} onChange={e => setExploreTopic(e.target.value)} placeholder="e.g., Photosynthesis" className="w-full p-4 bg-slate-800 border border-slate-600 rounded-xl text-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-500"/>
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <Button type="submit" disabled={isProcessing} className="w-full py-4 text-xl font-bold shadow-lg shadow-blue-600/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all transform hover:scale-[1.01]">
                                {isProcessing ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <Spinner /> Building Lesson...
                                    </span>
                                ) : 'Start Interactive Session 🚀'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}

        {learningHubStep === 'module' && learningModule && (
            <div className={`relative z-10 w-full h-full flex flex-col transition-all duration-500 ${isFocusMode ? 'p-0' : 'p-2 md:p-4'}`}>
                
                {/* Focus Toggle */}
                <div className={`absolute top-4 right-4 z-50 transition-opacity ${isFocusMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
                    <button 
                        onClick={() => setIsFocusMode(!isFocusMode)}
                        className="bg-black/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/80 transition-all border border-white/10"
                        title="Toggle Fullscreen Focus"
                    >
                        {isFocusMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                        )}
                    </button>
                </div>

                {/* Pro Side Navigation Paddles */}
                {currentSlideIndex > 0 && (
                    <button 
                        onClick={handlePrevSlide}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-6 h-32 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/30 transition-all rounded-r-3xl group"
                        title="Previous Slide (Left Arrow)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 transform group-hover:-translate-x-1 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                )}
                {currentSlideIndex < learningModule.slides.length - 1 && (
                    <button 
                        onClick={triggerNextSlide}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-6 h-32 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/30 transition-all rounded-l-3xl group"
                        title="Next Slide (Right Arrow)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 transform group-hover:translate-x-1 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                )}

                {/* Slide View Container */}
                <div className={`flex-grow flex items-center justify-center transition-all duration-500 ${isFocusMode ? 'w-full h-full' : 'p-0 md:p-8'}`}>
                    <div className={`bg-slate-900 border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col animate-fade-in-up transition-all duration-500 ${isFocusMode ? 'w-full h-full rounded-none border-0' : 'w-full max-w-7xl md:aspect-video h-full md:h-auto rounded-none md:rounded-2xl'}`}>
                        {/* Slide Content */}
                        {(() => {
                            const slide = learningModule.slides[currentSlideIndex];
                            
                            if (slide.interactionType === 'video_summary') {
                                return (
                                    <div className="w-full h-full bg-black relative">
                                        {summarySegments.length > 0 ? (
                                            <SeamlessVideoPlayer segments={summarySegments} onEnded={() => {}} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <Spinner />
                                                <p className="mt-4">Finalizing your video summary...</p>
                                                <p className="text-xs mt-2 text-slate-600">Generated {Math.round(videoProgress)}%</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Layout: Stack on Mobile, Split on Desktop
                            return (
                                <div className="w-full h-full flex flex-col md:flex-row relative">
                                    {/* Captions Overlay - Shows when audio plays */}
                                    {isPlayingAudio && (
                                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-40 animate-fade-in-up pointer-events-none">
                                            <div className="relative bg-black/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                                                
                                                {/* Pro Progress Bar wrapped around top */}
                                                <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(168,85,247,0.6)]" style={{ width: `${audioProgress}%` }}></div>
                                                
                                                <div className="flex gap-4 items-start">
                                                     <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-600 shadow-inner">
                                                        👨‍🏫
                                                     </div>
                                                     <div>
                                                         <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Teacher Speaking</h4>
                                                         <p className="text-lg text-white font-medium leading-relaxed font-serif">
                                                            {slide.teacherScript}
                                                         </p>
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Left (Top on Mobile): Image Panel */}
                                    <div className="w-full h-48 md:w-1/2 md:h-full shrink-0 relative overflow-hidden bg-black flex items-center justify-center">
                                        {slide.imageUrl ? (
                                            <img src={slide.imageUrl} alt="Slide Visual" className="w-full h-full object-cover transition-opacity duration-1000" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 animate-pulse flex items-center justify-center">
                                                <Spinner />
                                            </div>
                                        )}
                                        {/* Subtle gradient overlay at bottom for depth */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                                    </div>

                                    {/* Right (Bottom on Mobile): Content Panel */}
                                    <div className="w-full md:w-1/2 h-full p-4 md:p-12 flex flex-col justify-center bg-slate-900 relative overflow-y-auto custom-scrollbar">
                                        <div className="max-w-xl mx-auto w-full pb-20 md:pb-0">
                                            <span className="text-blue-500 font-mono text-xs uppercase tracking-widest mb-2 md:mb-4 block">Slide {currentSlideIndex + 1} of {learningModule.slides.length}</span>
                                            
                                            <h2 className="text-2xl md:text-4xl font-black text-white mb-4 md:mb-8 leading-tight">{slide.title}</h2>
                                            
                                            <ul className="space-y-4 md:space-y-6">
                                                {slide.bullets.map((bullet, idx) => (
                                                    <li key={idx} className="flex items-start gap-3 md:gap-4 text-base md:text-lg text-slate-300 font-medium">
                                                        <span className="text-blue-500 mt-1.5 flex-shrink-0 text-xs">●</span>
                                                        <span className="leading-relaxed">{bullet}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            
                                            {!isFocusMode && (
                                                <div className="mt-8 md:mt-10 pt-6 border-t border-slate-800">
                                                    <button 
                                                        onClick={() => playScript(slide.teacherScript, currentSlideIndex)} 
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all w-full md:w-auto justify-center ${isPlayingAudio ? 'bg-blue-600 border-blue-500 text-white animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                                                    >
                                                        {isPlayingAudio ? '🔊 Replay Audio' : '🔈 Listen Again'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Bottom Bar - Minimal now */}
                <div className={`bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 md:px-8 z-10 transition-all duration-300 ${isFocusMode ? 'h-0 opacity-0 overflow-hidden' : 'h-16'}`}>
                    
                    <div className="flex gap-2">
                         {/* Dots for progress */}
                        <div className="hidden sm:flex gap-1.5 items-center">
                            {learningModule.slides.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlideIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-700'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 md:gap-4">
                        <Button 
                            variant="ghost" 
                            onClick={onExit}
                            className="text-red-400 hover:bg-red-900/20 px-4 text-sm"
                        >
                            Quit Session
                        </Button>
                        {currentSlideIndex === learningModule.slides.length - 1 && (
                            <Button onClick={() => { handleSessionComplete(); onExit(); }} className="bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20 text-sm px-6">
                                Finish Lesson
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Check Question Modal (The "Next" button interaction) */}
        {showCheckDialog && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-short">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <div className="text-4xl mb-4">👩‍🏫</div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{checkDialogTitle}</h3>
                    <p className="text-slate-400 mb-6">{checkDialogMessage}</p>
                    
                    <div className="flex gap-4 justify-center">
                        <Button variant="secondary" onClick={() => setShowCheckDialog(false)} className="w-1/2">Wait</Button>
                        <Button onClick={confirmNextSlide} className="w-1/2 bg-green-600 hover:bg-green-500">Proceed</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Focus Timer Overlay */}
        {showFocusTimerOverlay && (
            <div 
                className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in-short"
                onClick={() => setShowFocusTimerOverlay(false)}
            >
                <div onClick={(e) => e.stopPropagation()}>
                    <Card className="!p-6 !bg-slate-900 border-slate-700 shadow-2xl w-auto min-w-[320px]">
                        <FocusTimer onSessionComplete={handleSessionComplete} />
                        <div className="mt-4 text-center">
                            <p className="text-xs text-slate-500 italic">Click anywhere outside to hide</p>
                        </div>
                    </Card>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default StudentStudyMode;
