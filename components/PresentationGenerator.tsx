
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { db, firebase, storage } from '../services/firebase';
import { Presentation, Quiz, GeneratedContent, SubjectsByClass, Collaborator, UserProfile, Slide, AssignmentType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type firebase_app from 'firebase/compat/app';
import { useToast } from './common/Toast';
import TTSAudioPlayer from './common/TTSAudioPlayer';
import { useAuthentication } from '../hooks/useAuth';

const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutIdRef = useRef<number | null>(null);
    return useMemo(() => {
        return (...args: any[]) => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
            timeoutIdRef.current = window.setTimeout(() => {
                callback(...args);
            }, delay);
        };
    }, [callback, delay]);
};

const cleanJson = (text: string) => {
    return text.replace(/```json\n?|```/g, '').trim();
};

// Helper to ensure content is a flat array of strings (Firestore requirement)
const sanitizeSlides = (slides: any[]): Slide[] => {
    return slides.map(slide => {
        let safeContent: string[] = [];
        if (Array.isArray(slide.content)) {
            // Flatten deeply nested arrays and convert non-strings to strings
            safeContent = slide.content.flat(Infinity).map((item: any) => 
                (item === null || item === undefined) ? "" : String(item)
            ).filter((str: string) => str.trim() !== "");
        } else if (typeof slide.content === 'string') {
            safeContent = [slide.content];
        }

        return {
            title: slide.title || "Untitled Slide",
            content: safeContent,
            imageUrl: slide.imageUrl || "",
            imageStyle: slide.imageStyle || 'cover',
            // FIX: Avoid passing 'undefined' to Firestore. Conditionally add audioUrl.
            ...(slide.audioUrl ? { audioUrl: slide.audioUrl } : {})
        };
    });
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
  const { schoolSettings } = useAuthentication();
  const [targetClasses, setTargetClasses] = useState<string[]>(initialContent?.classes || (classes.length > 0 ? [classes[0]] : []));
  const [subject, setSubject] = useState(initialContent?.subject || '');
  const [topic, setTopic] = useState(initialContent?.topic || '');
  const [audience, setAudience] = useState(initialContent?.audience || '');
  const [subjectsForClass, setSubjectsForClass] = useState<string[]>([]);
  
  // Quiz Generation Settings
  const [quizNumQuestions, setQuizNumQuestions] = useState(5);
  const [quizType, setQuizType] = useState<'Objective' | 'Theory' | 'Mixed'>('Objective');
  
  const [presentation, setPresentation] = useState<Presentation | null>(initialContent?.presentation || null);
  const [quiz, setQuiz] = useState<Quiz | null>(initialContent?.quiz || null);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [savedContentId, setSavedContentId] = useState<string | null>(initialContent?.id || null);
  const [view, setView] = useState<'form' | 'presentation' | 'quiz'>(
    initialContent ? 'presentation' : 'form'
  );
  
  const [loadingState, setLoadingState] = useState<'idle' | 'generating_presentation' | 'generating_quiz' | 'saving'>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  const isUpdatingFromFirestore = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (subjectsByClass && targetClasses.length > 0) {
        const subjectsOfSelectedClasses = targetClasses.map(c => subjectsByClass[c] || []);
        if (subjectsOfSelectedClasses.length > 0) {
            const commonSubjects = subjectsOfSelectedClasses.reduce((a, b) => a.filter(c => b.includes(c)));
            setSubjectsForClass(commonSubjects);

            if (!initialContent && isInitialMount.current) {
                setSubject(commonSubjects[0] || '');
            } else if (subject && !commonSubjects.includes(subject)) {
                setSubject(commonSubjects[0] || '');
            }
        } else {
            setSubjectsForClass([]);
        }
    } else {
        setSubjectsForClass([]);
        setSubject('');
    }
    if (isInitialMount.current) {
        isInitialMount.current = false;
    }
  }, [targetClasses, subjectsByClass, initialContent, subject]);

  // Manual Save Function
  const handleSaveToLibrary = async () => {
      if (!presentation || !user || !userProfile || !savedContentId) return;
      setLoadingState('saving');
      try {
          const safeSlides = sanitizeSlides(presentation.slides);
          const safePresentation = { slides: safeSlides };
          const safeQuiz = quiz ? JSON.parse(JSON.stringify(quiz)) : null;

          const dataToSave = {
              teacherId: user.uid,
              teacherName: userProfile.name,
              classes: targetClasses,
              subject,
              topic,
              audience: audience || null,
              presentation: safePresentation,
              quiz: safeQuiz,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              // Ensure the user is in the collaborator list so they can update the doc
              collaboratorUids: firebase.firestore.FieldValue.arrayUnion(user.uid),
          };

          await db.collection('generatedContent').doc(savedContentId).set(dataToSave, { merge: true });
          setToast({ message: 'Presentation saved to Library!', type: 'success' });
          onClose(); // Close modal after saving
      } catch (err: any) {
          console.error("Save Error:", err);
          setToast({ message: `Failed to save: ${err.message}`, type: 'error' });
      } finally {
          setLoadingState('idle');
      }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !user || !userProfile || !subject || targetClasses.length === 0) {
        setError("Please fill out all fields and select at least one class.");
        return;
    }

    setLoadingState('generating_presentation');
    setError('');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        setLoadingMessage('Architecting presentation structure...');
        const audienceInstruction = audience ? `Tailor the tone for: ${audience}.` : '';
        
        // Professional Prompt
        const textPrompt = `
        Act as a world-class Educational Content Architect. Create a high-impact, visually structured presentation for students in '${targetClasses.join(', ')}' on '${subject}'.
        
        **Topic:** ${topic}
        ${audienceInstruction}
        
        **Requirements:**
        1. **Structure**: Create 6-9 slides. Flow: Hook -> Concept -> Deep Dive -> Real World Application -> Summary.
        2. **Content**: Use bullet points that are punchy, clear, and pedagogically sound. Avoid walls of text.
        3. **Tone**: Professional, inspiring, and authoritative yet accessible.
        
        **JSON Schema:**
        Return ONLY a valid JSON object with this structure:
        {
          "slides": [
            {
              "title": "Slide Title",
              "content": ["Point 1", "Point 2", "Point 3"]
            }
          ]
        }
        `;

        const textResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Using stronger model for quality
            contents: textPrompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const cleanedJson = cleanJson(textResponse.text);
        const presentationTextContent = JSON.parse(cleanedJson) as { slides: Omit<Slide, 'imageUrl'>[] };
        
        const slidesWithImages: Slide[] = presentationTextContent.slides.map(slide => {
            const sanitizedContent = Array.isArray(slide.content)
                ? slide.content.flat(Infinity).map(item => String(item || '')).filter(Boolean)
                : [];

            return {
                title: slide.title || "Untitled Slide",
                content: sanitizedContent,
                imageUrl: "", 
                imageStyle: 'cover'
            };
        });

        const newPresentation: Presentation = { slides: slidesWithImages };
        setPresentation(newPresentation);
        
        // Initial Save to create ID
        const newContentRef = await db.collection('generatedContent').add({
            teacherId: user.uid,
            teacherName: userProfile.name,
            classes: targetClasses,
            subject,
            topic,
            audience: audience || null,
            presentation: { slides: sanitizeSlides(slidesWithImages) },
            quiz: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            collaboratorUids: [user.uid],
            collaborators: [{ uid: user.uid, name: userProfile.name, email: userProfile.email }],
        });
        setSavedContentId(newContentRef.id);

        // Generate Quiz
        await generateQuiz(ai, topic, quizNumQuestions, quizType);
        
        setView('presentation');

    } catch (err: any) {
        console.error("Generation Error:", err);
        setError(`Failed to generate content: ${err.message}`);
    } finally {
        setLoadingState('idle');
        setLoadingMessage('');
    }
  };

  const generateQuiz = async (ai: GoogleGenAI, topic: string, numQuestions: number, type: 'Objective' | 'Theory' | 'Mixed') => {
      setLoadingMessage('Designing assessment module...');
      
      const prompt = `Create a professional-grade assessment for the topic "${topic}".
      Quantity: ${numQuestions} questions.
      Format: ${type}.
      
      - Objective: Provide 'options' (4 choices) and 'correctAnswer'.
      - Theory: Provide 'correctAnswer' as a model answer/rubric. Leave 'options' empty.
      - Explanation: Mandatory clear reasoning for the answer.

      Return valid JSON under a root "quiz" key.`;

      const quizResponse = await ai.models.generateContent({
             model: 'gemini-3-pro-preview',
             contents: prompt,
             config: { responseMimeType: 'application/json' }
        });
        
        const cleanedQuizJson = cleanJson(quizResponse.text);
        const quizDataRaw = JSON.parse(cleanedQuizJson) as Quiz;
        
        let quizData: Quiz | null = null;
        if (quizDataRaw && Array.isArray(quizDataRaw.quiz)) {
            quizData = {
                quiz: quizDataRaw.quiz.map(q => ({
                    question: q.question || "Question text missing",
                    options: Array.isArray(q.options) 
                        ? q.options.flat(Infinity).map(opt => String(opt)).filter(Boolean)
                        : [],
                    correctAnswer: q.correctAnswer || "",
                    explanation: q.explanation || "",
                    type: (q.options && q.options.length > 0) ? 'Objective' : 'Theory'
                }))
            };
        }
        setQuiz(quizData);
  }

  const handleRegenerateQuiz = async () => {
      if (!topic) return;
      setLoadingState('generating_quiz');
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          await generateQuiz(ai, topic, quizNumQuestions, quizType);
          setToast({ message: 'Quiz regenerated!', type: 'success' });
      } catch (err: any) {
          setToast({ message: `Failed to regenerate quiz: ${err.message}`, type: 'error' });
      } finally {
          setLoadingState('idle');
      }
  }

  const handleStartLive = () => {
      if (savedContentId && presentation) {
          onStartLiveLesson({ 
              id: savedContentId, 
              teacherId: user?.uid || '', 
              teacherName: userProfile?.name || '', 
              classes: targetClasses, 
              subject, 
              topic, 
              presentation, 
              quiz, 
              createdAt: firebase.firestore.Timestamp.now(), 
              collaboratorUids: [], 
              collaborators: [] 
          });
      }
  };

  const renderForm = () => (
      <form onSubmit={handleGenerate} className="space-y-8 p-4 lg:p-8 overflow-y-auto h-full custom-scrollbar">
          <div className="text-center mb-8">
              <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">AI Studio</h3>
              <p className="text-slate-400">Design world-class learning materials in seconds.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                  <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-inner">
                      <h4 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-4">Core Metadata</h4>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                              <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                                  {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Topic</label>
                              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quantum Physics for Kids" className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" required />
                          </div>
                           <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience (Tone)</label>
                              <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Engaging, rigorous, playful" className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                   <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-inner">
                      <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-4">Target & Assessment</h4>
                       <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Target Class(es)</label>
                              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-700 custom-scrollbar">
                                  {classes.map(cls => (
                                      <label key={cls} className={`flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-colors ${targetClasses.includes(cls) ? 'bg-blue-600/20' : 'hover:bg-slate-800'}`}>
                                          <input type="checkbox" checked={targetClasses.includes(cls)} onChange={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className="rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-500" />
                                          <span className="text-sm text-slate-200">{cls}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs text-slate-400 mb-1">Questions</label>
                                  <input type="number" min="1" max="20" value={quizNumQuestions} onChange={e => setQuizNumQuestions(Number(e.target.value))} className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 text-center" />
                              </div>
                              <div>
                                  <label className="block text-xs text-slate-400 mb-1">Format</label>
                                  <select value={quizType} onChange={e => setQuizType(e.target.value as any)} className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 text-sm">
                                      <option value="Objective">Objective</option>
                                      <option value="Theory">Theory</option>
                                      <option value="Mixed">Mixed</option>
                                  </select>
                              </div>
                          </div>
                       </div>
                   </div>
              </div>
          </div>

          <div className="pt-6">
            <Button type="submit" disabled={loadingState !== 'idle'} className="w-full py-4 text-lg font-bold shadow-xl shadow-purple-600/20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_auto] animate-gradient hover:scale-[1.01] transition-transform">
                {loadingState !== 'idle' ? (
                    <div className="flex items-center justify-center gap-3">
                        <Spinner /> 
                        <span className="animate-pulse">{loadingMessage}</span>
                    </div>
                ) : 'Generate Professional Content'}
            </Button>
          </div>
          {error && <p className="text-red-400 text-center bg-red-900/20 p-3 rounded-xl border border-red-500/30">{error}</p>}
      </form>
  );

  const renderPresentation = () => {
      if (!presentation) return null;
      const slide = presentation.slides[currentSlide];
      
      // Determine layout based on content length
      const isHeroSlide = currentSlide === 0 || slide.content.length < 3;
      const isContentHeavy = slide.content.length > 5;

      return (
          <div className="flex flex-col h-full bg-slate-950">
              {/* Toolbar */}
              <div className="h-16 px-6 flex justify-between items-center bg-slate-900 border-b border-slate-800 flex-shrink-0 z-20">
                  <div className="flex items-center gap-4">
                      <span className="text-slate-400 font-mono text-xs uppercase tracking-widest">Slide {currentSlide + 1}/{presentation.slides.length}</span>
                      <div className="h-4 w-px bg-slate-700"></div>
                      <h3 className="text-sm font-bold text-white truncate max-w-xs">{topic}</h3>
                  </div>
                  <div className="flex gap-3">
                      <Button size="sm" variant="secondary" onClick={() => setView('quiz')} className="hidden sm:flex">View Quiz</Button>
                      <Button size="sm" variant="secondary" onClick={handleSaveToLibrary} disabled={loadingState === 'saving'}>
                          {loadingState === 'saving' ? <Spinner/> : 'Save'}
                      </Button>
                      <Button size="sm" onClick={handleStartLive} className="bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20">
                         <span className="mr-2">📡</span> Go Live
                      </Button>
                  </div>
              </div>

              {/* Slide Stage */}
              <div className="flex-grow flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-black relative">
                  {/* The Slide - 16:9 Container */}
                  <div className="w-full max-w-6xl aspect-video bg-slate-900 rounded-xl shadow-2xl overflow-hidden relative border border-slate-800 flex flex-col animate-fade-in-up transform transition-all">
                        {/* Slide Background Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-800 via-transparent to-transparent"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
                        
                        {/* Slide Content */}
                        <div className={`flex-grow p-8 sm:p-12 z-10 flex flex-col ${isHeroSlide ? 'justify-center items-center text-center' : 'justify-start'}`}>
                            
                            {/* Header */}
                            <h2 className={`font-black text-white mb-8 leading-tight drop-shadow-lg ${isHeroSlide ? 'text-4xl sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400' : 'text-3xl sm:text-4xl'}`}>
                                {slide.title}
                            </h2>

                            {/* Body Content */}
                            <div className={`w-full ${isHeroSlide ? 'max-w-3xl' : 'grid grid-cols-1 lg:grid-cols-5 gap-8'}`}>
                                <div className={`${isHeroSlide ? '' : 'lg:col-span-3'}`}>
                                    <ul className="space-y-4">
                                        {slide.content.map((point, idx) => (
                                            <li key={idx} className={`flex items-start gap-3 text-slate-300 ${isHeroSlide ? 'text-xl justify-center' : 'text-lg'}`}>
                                                {!isHeroSlide && <span className="text-blue-500 mt-1.5 text-xs">●</span>}
                                                <span className="leading-relaxed">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                {/* Visual Placeholder (Right side for content slides) */}
                                {!isHeroSlide && (
                                    <div className="hidden lg:flex lg:col-span-2 flex-col justify-center">
                                        <div className="aspect-square rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                                            <div className="text-6xl opacity-20 group-hover:opacity-30 transition-opacity transform group-hover:scale-110 duration-500">
                                                💡
                                            </div>
                                        </div>
                                        <p className="text-center text-xs text-slate-600 mt-3 font-mono">VISUAL PLACEHOLDER</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="h-12 px-8 flex items-center justify-between border-t border-white/5 bg-black/20 backdrop-blur-sm text-xs font-mono text-slate-500 z-20">
                            <span>{schoolSettings?.schoolName || 'UTOPIA'}</span>
                            <span>{subject.toUpperCase()}</span>
                        </div>
                  </div>
              </div>

              {/* Navigation Controls */}
              <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-6 z-20">
                  <button 
                    onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))} 
                    disabled={currentSlide === 0}
                    className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-all border border-slate-700 shadow-lg"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>

                  {/* Slide Dots */}
                  <div className="flex gap-2 overflow-x-auto max-w-[200px] px-2 scrollbar-hide">
                      {presentation.slides.map((_, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => setCurrentSlide(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${currentSlide === idx ? 'bg-blue-500 scale-125' : 'bg-slate-700 hover:bg-slate-600'}`}
                          />
                      ))}
                  </div>

                  <button 
                    onClick={() => setCurrentSlide(prev => Math.min(presentation.slides.length - 1, prev + 1))} 
                    disabled={currentSlide === presentation.slides.length - 1}
                    className="p-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 transition-all border border-blue-500 shadow-lg shadow-blue-900/20"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-0 sm:p-4 z-50">
        <Card className="w-full max-w-[1600px] h-full sm:h-[95vh] flex flex-col !p-0 !bg-slate-900 border-slate-800 overflow-hidden shadow-2xl rounded-none sm:rounded-2xl">
             {/* Main Toolbar (only visible in Form/Quiz view, hidden in Presentation view which has its own) */}
             {view !== 'presentation' && (
                 <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">✨</span> AI Content Generator
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                 </div>
             )}
             
             <div className="flex-grow overflow-hidden relative">
                 {view === 'form' && renderForm()}
                 {view === 'presentation' && (
                     <>
                        {/* Close button overlay for presentation view */}
                        <button onClick={onClose} className="absolute top-4 right-4 z-50 text-slate-500 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-sm transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                        {renderPresentation()}
                     </>
                 )}
                 {view === 'quiz' && quiz && (
                     <div className="h-full overflow-y-auto flex flex-col bg-slate-900 p-4 sm:p-8 custom-scrollbar">
                         <div className="flex justify-between items-center mb-6 flex-shrink-0">
                             <div>
                                <h3 className="text-2xl font-bold text-white">Assessment Module</h3>
                                <p className="text-slate-400 text-sm">{topic} • {quiz.quiz.length} Questions</p>
                             </div>
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={handleRegenerateQuiz} disabled={loadingState !== 'idle'}>
                                    {loadingState === 'generating_quiz' ? <Spinner/> : 'Regenerate'}
                                </Button>
                                <Button size="sm" onClick={() => setView('presentation')}>Back to Slides</Button>
                             </div>
                         </div>
                         
                         <div className="max-w-4xl mx-auto w-full space-y-6 pb-8">
                             {quiz.quiz.map((q, i) => (
                                 <div key={i} className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-lg">
                                     <div className="flex justify-between items-start mb-4">
                                         <div className="flex gap-3">
                                             <span className="flex-shrink-0 w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                                             <p className="font-bold text-lg text-white leading-snug pt-1">{q.question}</p>
                                         </div>
                                         <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${q.type === 'Objective' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-purple-500/10 text-purple-300 border-purple-500/30'}`}>
                                             {q.type || 'Objective'}
                                         </span>
                                     </div>
                                     
                                     {q.options && q.options.length > 0 ? (
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-11">
                                             {q.options.map((opt, idx) => (
                                                 <div key={idx} className={`p-3 rounded-xl border transition-all ${opt === q.correctAnswer ? 'bg-green-500/10 border-green-500/50 text-green-200' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`}>
                                                     <div className="flex items-center gap-2">
                                                         {opt === q.correctAnswer && <span className="text-green-500">✓</span>}
                                                         <span>{opt}</span>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     ) : (
                                         <div className="ml-11 p-4 bg-slate-900/50 rounded-xl border border-slate-700 border-dashed text-slate-500 italic text-sm">
                                             Open-ended theory question.
                                         </div>
                                     )}
                                     
                                     <div className="mt-4 ml-11 p-4 bg-blue-900/10 rounded-xl border border-blue-500/20 flex gap-3">
                                         <span className="text-xl">💡</span>
                                         <div>
                                             <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">Answer & Explanation</p>
                                             <p className="text-sm text-slate-300 font-medium">{q.correctAnswer}</p>
                                             {q.explanation && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{q.explanation}</p>}
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
        </Card>
    </div>
  );
};
