import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, Timetable, GES_SUBJECTS } from '../types';
import FocusTimer from './FocusTimer';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface StudySlide {
  title: string;
  bullets: string[];
  teacherScript: string;
  summaryScript: string;
  imagePrompt: string;
  imageUrl?: string;
  interactionType?: 'content' | 'video_summary';
  checkQuestion?: {
    question: string;
    options: string[];
    correctAnswer: string;
  };
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

interface StudentStudyModeProps {
  onExit: () => void;
  userProfile: UserProfile;
  timetable: Timetable | null;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export const StudentStudyMode: React.FC<StudentStudyModeProps> = ({ onExit, userProfile, timetable }) => {
  const [completedSessions, setCompletedSessions] = useState(0);
  const [learningHubStep, setLearningHubStep] = useState<'smart_plan' | 'module'>('smart_plan');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showFocusTimerOverlay, setShowFocusTimerOverlay] = useState(false);
  const [learningModule, setLearningModule] = useState<StudyModule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [exploreSubject, setExploreSubject] = useState(GES_SUBJECTS[0]);
  const [exploreTopic, setExploreTopic] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [summarySegments, setSummarySegments] = useState<SummarySegment[]>([]);
  const [videoProgress, setVideoProgress] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCache = useRef<Map<number, AudioBuffer>>(new Map());
  const preloadingRef = useRef<Set<number>>(new Set());

  const handleSessionComplete = () => setCompletedSessions(prev => prev + 1);

  useEffect(() => {
    const initPlan = async () => {
      const now = new Date();
      const currentDay = DAYS[now.getDay()];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      let targetSubject = GES_SUBJECTS[0];
      let reason = "Let's learn something new!";

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
          reason = "It's time for this class on your timetable.";
        }
      }
      setExploreSubject(targetSubject);
      suggestTopic(targetSubject, reason);
    };
    initPlan();
  }, [timetable, userProfile.class]);

  const suggestTopic = async (subject: string, context: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Context: ${context}. Student Class: ${userProfile.class}. Subject: ${subject}. Task: Suggest a single, specific topic to study now. Return ONLY the topic name.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      if (response.text) setExploreTopic(response.text.trim());
    } catch (e) { console.error("Topic suggestion failed", e); }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsPlayingAudio(false);
    setAudioProgress(0);
  };

  const fetchAudioBuffer = async (text: string): Promise<AudioBuffer> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data");
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return await decodeAudioData(bytes, audioContextRef.current);
  };

  const playScript = async (text: string, index: number) => {
    if (!text) return;
    stopAudio();
    setIsPlayingAudio(true);
    try {
      let buffer = audioCache.current.get(index) || await fetchAudioBuffer(text);
      audioCache.current.set(index, buffer);
      if (!audioContextRef.current) return;
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      const startTime = audioContextRef.current.currentTime;
      source.onended = () => setIsPlayingAudio(false);
      source.start();
      audioSourceRef.current = source;
      const animate = () => {
        if (!audioContextRef.current) return;
        const prog = Math.min(((audioContextRef.current.currentTime - startTime) / buffer.duration) * 100, 100);
        setAudioProgress(prog);
        if (prog < 100) animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } catch (err) { console.error(err); setIsPlayingAudio(false); }
  };

  const generateModule = async () => {
    setIsProcessing(true);
    setError('');
    setSummarySegments([]);
    audioCache.current.clear();
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Create a 5-slide study module for class ${userProfile.class} on ${exploreSubject}: ${exploreTopic}. 
      Include title, bullets, teacherScript (detailed), summaryScript (concise), and imagePrompt for each. Return JSON.`;
      const res = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
      const data = JSON.parse(res.text) as StudyModule;
      data.slides.push({ title: "Summary", bullets: ["Lesson wrap-up"], teacherScript: "Great job today!", summaryScript: "", imagePrompt: "", interactionType: "video_summary" });
      setLearningModule(data);
      setLearningHubStep('module');
    } catch (err) { setError('Failed to generate lesson.'); } finally { setIsProcessing(false); }
  };

  return (
    <div className="h-full bg-slate-950 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Study Mode</h2>
        <Button variant="secondary" onClick={onExit}>Exit</Button>
      </div>

      {learningHubStep === 'smart_plan' ? (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
          <Card>
            <h3 className="text-xl font-bold mb-4">Study Planner</h3>
            <div className="space-y-4">
              <select value={exploreSubject} onChange={e => setExploreSubject(e.target.value)} className="w-full p-3 bg-slate-800 rounded-xl text-white outline-none">
                {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" value={exploreTopic} onChange={e => setExploreTopic(e.target.value)} placeholder="Topic..." className="w-full p-3 bg-slate-800 rounded-xl text-white outline-none" />
              <Button onClick={generateModule} disabled={isProcessing} className="w-full py-4">{isProcessing ? <Spinner /> : 'Launch Lesson 🚀'}</Button>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-blue-900/10 border-blue-500/20 text-center"><p className="text-xs text-blue-400 font-bold uppercase">Sessions</p><p className="text-2xl font-black text-white">{completedSessions}</p></Card>
            <Card className="bg-purple-900/10 border-purple-500/20 text-center cursor-pointer" onClick={() => setShowFocusTimerOverlay(true)}><p className="text-xs text-purple-400 font-bold uppercase">Timer</p><p className="text-2xl font-black text-white">Focus</p></Card>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
          {learningModule && (
            <Card className="min-h-[500px] flex flex-col">
              <h3 className="text-2xl font-bold mb-4">{learningModule.slides[currentSlideIndex].title}</h3>
              <div className="flex-grow">
                <ul className="space-y-3">
                  {learningModule.slides[currentSlideIndex].bullets.map((b, i) => <li key={i} className="text-lg text-slate-300">• {b}</li>)}
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between items-center">
                <div className="flex-grow mr-4">
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${audioProgress}%` }}></div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" disabled={currentSlideIndex === 0} onClick={() => setCurrentSlideIndex(p => p - 1)}>Prev</Button>
                    <Button disabled={currentSlideIndex === learningModule.slides.length - 1} onClick={() => setCurrentSlideIndex(p => p + 1)}>Next</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {showFocusTimerOverlay && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4">
          <Card className="max-w-md w-full relative">
            <button className="absolute top-4 right-4 text-slate-500 hover:text-white" onClick={() => setShowFocusTimerOverlay(false)}>✕</button>
            <FocusTimer onSessionComplete={handleSessionComplete} />
          </Card>
        </div>
      )}
    </div>
  );
};
