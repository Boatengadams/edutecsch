import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, Timetable, GES_SUBJECTS } from '../types';
import FocusTimer from './FocusTimer';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import SegmentedVideoPlayer from './common/SegmentedVideoPlayer';
import { db, storage } from '../services/firebase';

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface StudySlide {
  title: string;
  bullets: string[];
  teacherScript: string;
  summaryScript: string;
  imagePrompt: string;
  layout?: string;
  imageUrl?: string;
}

interface StudyModule {
  title: string;
  topic: string;
  slides: StudySlide[];
  videoSummaryPrompts?: string[];
}

interface StudentStudyModeProps {
  onExit: () => void;
  userProfile: UserProfile;
  timetable: Timetable | null;
}

export const StudentStudyMode: React.FC<StudentStudyModeProps> = ({ onExit, userProfile, timetable }) => {
  const [completedSessions, setCompletedSessions] = useState(0);
  const [learningHubStep, setLearningHubStep] = useState<'smart_plan' | 'module'>('smart_plan');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showFocusTimerOverlay, setShowFocusTimerOverlay] = useState(false);
  const [learningModule, setLearningModule] = useState<StudyModule | null>(null);
  const [videoSegments, setVideoSegments] = useState<string[]>([]);
  const [showVideoSummary, setShowVideoSummary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState('');
  const [exploreSubject, setExploreSubject] = useState(GES_SUBJECTS[0]);
  const [exploreTopic, setExploreTopic] = useState('');

  useEffect(() => {
    const initPlan = async () => {
      const now = new Date();
      const currentDay = DAYS[now.getDay()];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      let targetSubject = GES_SUBJECTS[0];

      if (timetable && timetable.timetableData[currentDay]) {
        const periods = timetable.timetableData[currentDay];
        const currentTimeVal = currentHour * 60 + currentMinute;
        const currentPeriod = periods.find(p => {
          const [startH, startM] = p.startTime.split(':').map(Number);
          const [endH, endM] = p.endTime.split(':').map(Number);
          return currentTimeVal >= (startH * 60 + startM) && currentTimeVal < (endH * 60 + endM);
        });
        if (currentPeriod && currentPeriod.subject) {
          targetSubject = currentPeriod.subject;
        }
      }
      setExploreSubject(targetSubject);
    };
    initPlan();
  }, [timetable, userProfile.class]);

  const handleSessionComplete = useCallback(() => {
    setCompletedSessions(prev => prev + 1);
    setShowFocusTimerOverlay(false);
  }, []);

  const generateModule = async () => {
    if (!exploreTopic) return;
    setIsProcessing(true);
    setLoadingProgress(0);
    setError('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Create a 5-slide immersive study module for class ${userProfile.class} on ${exploreSubject}: ${exploreTopic}. 
      Each slide must have: title, bullets (array), layout (hero/split-left/split-right/full-text), teacherScript, and summaryScript.
      Include a "videoSummaryPrompts" array of 5 descriptions for an 8s summary video segments.
      Return JSON.`;
      
      const res = await ai.models.generateContent({ 
          model: 'gemini-3-pro-preview', 
          contents: prompt, 
          config: { responseMimeType: 'application/json' } 
      });
      
      const data = JSON.parse(res.text) as StudyModule;
      setLearningModule(data);
      setLoadingProgress(30);

      // Segmented Video synthesis for the student module
      const segmentUrls: string[] = [];
      const prompts = data.videoSummaryPrompts || [];
      for (let i = 0; i < 5; i++) {
          setLoadingProgress(30 + (i * 14));
          const p = prompts[i] || `Summary of ${exploreTopic} stage ${i+1}`;
          let operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: p,
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });
          while (!operation.done) {
              await new Promise(r => setTimeout(r, 5000));
              operation = await ai.operations.getVideosOperation({ operation });
          }
          const link = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (link) {
              const fetchRes = await fetch(`${link}&key=${process.env.API_KEY}`);
              const blob = await fetchRes.blob();
              const ref = storage.ref(`study_mode/${userProfile.uid}/${Date.now()}_v_${i}.mp4`);
              await ref.put(blob);
              segmentUrls.push(await ref.getDownloadURL());
          }
      }
      setVideoSegments(segmentUrls);
      setLearningHubStep('module');
    } catch (err) { 
        setError('Neural synchronization failed. Please retry.'); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  return (
    <div className="h-full bg-slate-950 p-6 sm:p-10 overflow-y-auto custom-scrollbar relative">
      <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Deep <span className="text-blue-500">Learning</span></h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Authorized Research Environment</p>
        </div>
        <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setShowFocusTimerOverlay(true)} className="px-6 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest shadow-lg">⏱️ Focus Timer</Button>
             <Button variant="secondary" onClick={onExit} className="px-8 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest shadow-lg">Abort Session</Button>
        </div>
      </div>

      {learningHubStep === 'smart_plan' ? (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in-up">
          <Card className="!bg-slate-900/60 !p-10 border-white/5 shadow-3xl rounded-[3rem]">
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] mb-8">Mission Briefing</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target domain</label>
                      <select value={exploreSubject} onChange={e => setExploreSubject(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/20">
                        {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Specific Research Topic</label>
                      <input 
                        type="text" 
                        value={exploreTopic} 
                        onChange={e => setExploreTopic(e.target.value)} 
                        placeholder="e.g. Kinetic Energy in Physics" 
                        className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/20 placeholder-slate-800" 
                      />
                  </div>
              </div>
              <Button onClick={generateModule} disabled={isProcessing || !exploreTopic} className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/30 text-sm">
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2"><Spinner /> Launching Protocol...</div>
                        <div className="w-48 h-1 bg-white/10 rounded-full mt-2"><div className="h-full bg-white" style={{width: `${loadingProgress}%`}}></div></div>
                    </div>
                ) : 'Initialize Module 🚀'}
              </Button>
              {error && <p className="text-red-400 text-[10px] font-black uppercase text-center bg-red-900/10 py-3 rounded-xl border border-red-500/20">{error}</p>}
            </div>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/40 border-white/5 text-center p-8 rounded-[2rem] shadow-xl">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Total Focus Time</p>
                <p className="text-4xl font-black text-white">{completedSessions * 25} <span className="text-lg opacity-40">MIN</span></p>
            </Card>
            <Card className="bg-blue-900/10 border-blue-500/20 text-center p-8 rounded-[2rem] shadow-xl">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">XP Yield</p>
                <p className="text-4xl font-black text-white">{completedSessions * 50}</p>
            </Card>
            <Card className="bg-slate-900/40 border-white/5 text-center p-8 rounded-[2rem] shadow-xl">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Rank Standing</p>
                <p className="text-4xl font-black text-white">#{userProfile.level || 1}</p>
            </Card>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
          {learningModule && (
            <div className="flex flex-col lg:row gap-8">
                 <Card className="flex-grow min-h-[600px] flex flex-col !p-0 overflow-hidden border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] bg-slate-900 rounded-[3rem]">
                    <div className="p-6 border-b border-white/5 bg-slate-800/40 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg">📖</div>
                             <div>
                                 <h4 className="text-lg font-black text-white uppercase tracking-tighter">{learningModule.title}</h4>
                                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentSlideIndex + 1} / {learningModule.slides.length} SECTIONS</p>
                             </div>
                        </div>
                        <div className="flex gap-1">
                            {learningModule.slides.map((_, i) => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlideIndex ? 'w-10 bg-blue-500 shadow-[0_0_10px_blue]' : 'w-2 bg-slate-800'}`}></div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-grow p-10 sm:p-16 flex flex-col md:flex-row gap-12 overflow-y-auto custom-scrollbar">
                        <div className="flex-1 space-y-8">
                            <h3 className="text-3xl sm:text-5xl font-black text-white leading-none tracking-tighter uppercase border-l-4 border-blue-500 pl-8">{learningModule.slides[currentSlideIndex].title}</h3>
                            <ul className="space-y-6">
                              {learningModule.slides[currentSlideIndex].bullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${i * 200}ms` }}>
                                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shadow-[0_0_10px_blue] flex-shrink-0"></div>
                                    <span className="text-lg sm:text-2xl text-slate-300 font-medium leading-relaxed">{b}</span>
                                </li>
                              ))}
                            </ul>
                        </div>
                        
                        <div className="w-full md:w-[40%] aspect-square bg-slate-950 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center p-10 relative overflow-hidden group shadow-inner">
                             <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                             <span className="text-6xl sm:text-8xl mb-6 relative z-10 group-hover:scale-110 transition-transform">🎓</span>
                             <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] relative z-10 leading-relaxed">Visual intelligence encrypted in this protocol.</p>
                             <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex-grow w-full sm:w-auto">
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-blue-500 transition-all duration-700 shadow-[0_0_10px_blue]" style={{ width: `${((currentSlideIndex + 1) / learningModule.slides.length) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <Button variant="secondary" disabled={currentSlideIndex === 0} onClick={() => setCurrentSlideIndex(p => p - 1)} className="flex-1 sm:flex-none px-10 rounded-xl font-black uppercase text-[10px]">Prev</Button>
                            {currentSlideIndex === learningModule.slides.length - 1 ? (
                                <Button onClick={() => setShowVideoSummary(true)} className="flex-1 sm:flex-none px-12 rounded-xl font-black uppercase text-[10px] bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40">Complete Protocol 📽️</Button>
                            ) : (
                                <Button onClick={() => setCurrentSlideIndex(p => p + 1)} className="flex-1 sm:flex-none px-12 rounded-xl font-black uppercase text-[10px] shadow-blue-900/40">Next Protocol</Button>
                            )}
                        </div>
                    </div>
                 </Card>
            </div>
          )}
        </div>
      )}

      {showVideoSummary && videoSegments.length > 0 && (
          <SegmentedVideoPlayer urls={videoSegments} onClose={() => { setShowVideoSummary(false); setLearningHubStep('smart_plan'); }} />
      )}

      {showFocusTimerOverlay && (
        <div className="fixed inset-0 bg-slate-950/95 z-[300] backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-lg w-full relative !bg-slate-900 border-white/10 p-10 rounded-[3rem] shadow-[0_60px_120px_-20px_rgba(0,0,0,1)]">
            <button className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full" onClick={() => setShowFocusTimerOverlay(false)}>✕</button>
            <FocusTimer onSessionComplete={handleSessionComplete} />
            <p className="text-[9px] text-slate-500 text-center uppercase font-black tracking-widest mt-10">Protocols will notify you upon cycle completion.</p>
          </Card>
        </div>
      )}
    </div>
  );
};