
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

interface PresentationGeneratorProps {
  onClose: () => void;
  classes: string[];
  subjectsByClass: SubjectsByClass | null;
  user: firebase_app.User | null;
  userProfile: UserProfile | null;
  initialContent?: GeneratedContent | null;
  onStartLiveLesson: (content: GeneratedContent) => void;
  setToast?: (toast: { message: string, type: 'success' | 'error' } | null) => void; // Made optional as we use useToast internally now
}

export const PresentationGenerator: React.FC<PresentationGeneratorProps> = ({ onClose, classes, subjectsByClass, user, userProfile, initialContent = null, onStartLiveLesson }) => {
  const { showToast } = useToast();
  // Form state
  const [targetClasses, setTargetClasses] = useState<string[]>(initialContent?.classes || (classes.length > 0 ? [classes[0]] : []));
  const [subject, setSubject] = useState(initialContent?.subject || '');
  const [topic, setTopic] = useState(initialContent?.topic || '');
  const [audience, setAudience] = useState(initialContent?.audience || '');
  const [subjectsForClass, setSubjectsForClass] = useState<string[]>([]);
  
  // Content state (local buffer for edits, synced with Firestore)
  const [presentation, setPresentation] = useState<Presentation | null>(initialContent?.presentation || null);
  const [quiz, setQuiz] = useState<Quiz | null>(initialContent?.quiz || null);
  
  // UI/Control state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [savedContentId, setSavedContentId] = useState<string | null>(initialContent?.id || null);
  const [view, setView] = useState<'form' | 'presentation' | 'quiz'>(
    initialContent ? 'presentation' : 'form'
  );
  
  // Loading/Error state
  const [loadingState, setLoadingState] = useState<'idle' | 'generating_presentation' | 'generating_quiz' | 'saving'>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<number, 'loading' | 'loaded' | 'error'>>({});

  // Refs for managing updates
  const isUpdatingFromFirestore = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (subjectsByClass && targetClasses.length > 0) {
        const subjectsOfSelectedClasses = targetClasses.map(c => subjectsByClass[c] || []);
        // Find common subjects (intersection)
        const commonSubjects = subjectsOfSelectedClasses.reduce((a, b) => a.filter(c => b.includes(c)));
        setSubjectsForClass(commonSubjects);

        if (!initialContent && isInitialMount.current) {
            setSubject(commonSubjects[0] || '');
        } else if (subject && !commonSubjects.includes(subject)) {
             setSubject(commonSubjects[0] || '');
        }
    } else {
        setSubjectsForClass([]);
        setSubject('');
    }
    if (isInitialMount.current) {
        isInitialMount.current = false;
    }
  }, [targetClasses, subjectsByClass, initialContent, subject]);

  // Debounced save function
  const debouncedSave = useDebounce(async (newPresentation: Presentation, newQuiz: Quiz | null, newTopic: string, newAudience: string) => {
    if (isUpdatingFromFirestore.current || !savedContentId) return;
    try {
      await db.collection('generatedContent').doc(savedContentId).update({
        presentation: newPresentation,
        quiz: newQuiz,
        topic: newTopic,
        audience: newAudience,
      });
    } catch (err) {
      console.error("Debounced save failed: ", err);
      setError("Failed to save recent changes.");
    }
  }, 1000);

  useEffect(() => {
    if (presentation && !isUpdatingFromFirestore.current && savedContentId) {
       debouncedSave(presentation, quiz, topic, audience);
    }
  }, [presentation, quiz, topic, audience, debouncedSave, savedContentId]);

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
        
        // Step 1: Generate Text Content
        setLoadingMessage('Generating presentation text...');
        const audienceInstruction = audience ? `The presentation should be tailored for the following audience: ${audience}.` : '';
        const textPrompt = `Create a professional educational presentation for classes '${targetClasses.join(', ')}' on the subject '${subject}'. The topic is '${topic}'. 
        ${audienceInstruction}
        The presentation should have between 5 and 8 slides. Each slide must have:
        1. A concise 'title'.
        2. 'content' as an array of strings (bullet points).
        
        Do not include image URLs. Return ONLY the valid JSON object with a root "slides" key.`;

        const textResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: textPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        slides: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.ARRAY, items: { type: Type.STRING } },
                                },
                                required: ['title', 'content']
                            }
                        }
                    },
                    required: ['slides']
                }
            }
        });

        const presentationTextContent = JSON.parse(textResponse.text) as { slides: Omit<Slide, 'imageUrl'>[] };
        
        // Step 2: Generate Image for each slide
        const slidesWithImages: Slide[] = [];
        for (let i = 0; i < presentationTextContent.slides.length; i++) {
            const slide = presentationTextContent.slides[i];
            setLoadingMessage(`Generating image ${i + 1} of ${presentationTextContent.slides.length}...`);
            
            const imagePrompt = `A high-quality, photorealistic, educational image for a presentation slide. The slide title is "${slide.title}". The key points on the slide are: "${slide.content.join('; ')}". The image should be simple, clear, and directly illustrate the main concept of the slide.`;

            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            let imageUrl = ''; 
            const parts = imageResponse.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
            }
            
            slidesWithImages.push({
                title: slide.title,
                content: slide.content,
                imageUrl: imageUrl,
                imageStyle: 'cover'
            });
        }

        const newPresentation: Presentation = { slides: slidesWithImages };
        
        // Step 3: Generate Quiz
        setLoadingMessage('Generating quiz...');
        const quizPrompt = `Based on the topic "${topic}", generate a 5-question multiple choice quiz.
        Return ONLY a valid JSON object with a root "quiz" key containing an array of questions.
        Each question must have: "question", "options" (array of 4 strings), "correctAnswer" (string matching one option).`;

        const quizResponse = await ai.models.generateContent({
             model: 'gemini-3-pro-preview',
             contents: quizPrompt,
             config: {
                 responseMimeType: 'application/json',
                 responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         quiz: {
                             type: Type.ARRAY,
                             items: {
                                 type: Type.OBJECT,
                                 properties: {
                                     question: { type: Type.STRING },
                                     options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                     correctAnswer: { type: Type.STRING }
                                 },
                                 required: ['question', 'options', 'correctAnswer']
                             }
                         }
                     }
                 }
             }
        });
        
        const quizData = JSON.parse(quizResponse.text) as Quiz;

        setPresentation(newPresentation);
        setQuiz(quizData);
        setView('presentation');
        
        // Save to Firestore
        const newContentRef = await db.collection('generatedContent').add({
            teacherId: user.uid,
            teacherName: userProfile.name,
            classes: targetClasses,
            subject,
            topic,
            audience: audience || null,
            presentation: newPresentation,
            quiz: quizData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            collaboratorUids: [],
            collaborators: [],
        });
        setSavedContentId(newContentRef.id);
        showToast('Presentation generated and saved!', 'success');

    } catch (err: any) {
        console.error("Generation Error:", err);
        setError(`Failed to generate content: ${err.message}`);
    } finally {
        setLoadingState('idle');
        setLoadingMessage('');
    }
  };

  const renderForm = () => (
      <form onSubmit={handleGenerate} className="space-y-4 overflow-y-auto max-h-[70vh] p-1">
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="text-sm font-medium text-gray-300">Target Class(es)</label>
                  <div className="mt-1 max-h-32 overflow-y-auto p-2 bg-slate-700 rounded-md border border-slate-600 grid grid-cols-2 gap-2">
                      {classes.map(cls => (
                          <label key={cls} className="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" checked={targetClasses.includes(cls)} onChange={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className="rounded bg-slate-800 border-slate-500" />
                              <span className="text-sm">{cls}</span>
                          </label>
                      ))}
                  </div>
              </div>
              <div>
                  <label className="text-sm font-medium text-gray-300">Subject</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600">
                      {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
          </div>
          <div>
              <label className="text-sm font-medium text-gray-300">Topic</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The Solar System" className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" required />
          </div>
          <div>
              <label className="text-sm font-medium text-gray-300">Audience / Tone (Optional)</label>
              <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Fun and engaging for kids" className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
          </div>
          <Button type="submit" disabled={loadingState !== 'idle'} className="w-full">
              {loadingState !== 'idle' ? <span className="flex items-center justify-center gap-2"><Spinner /> {loadingMessage}</span> : 'Generate Presentation'}
          </Button>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>
  );

  const renderPresentation = () => {
      if (!presentation) return null;
      const slide = presentation.slides[currentSlide];
      return (
          <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Slide {currentSlide + 1} / {presentation.slides.length}</h3>
                  <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setView('quiz')}>View Quiz</Button>
                      <Button size="sm" onClick={() => savedContentId && onStartLiveLesson({ id: savedContentId, teacherId: user?.uid || '', teacherName: userProfile?.name || '', classes: targetClasses, subject, topic, presentation, quiz, createdAt: firebase.firestore.Timestamp.now(), collaboratorUids: [], collaborators: [] })}>Start Live Lesson</Button>
                  </div>
              </div>
              <div className="flex-grow bg-slate-900 rounded-xl overflow-hidden relative flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-black">
                      {slide.imageUrl && <img src={slide.imageUrl} alt="Slide" className="w-full h-full object-contain" />}
                  </div>
                  <div className="w-full md:w-1/2 p-6 overflow-y-auto">
                      <h2 className="text-2xl font-bold mb-4">{slide.title}</h2>
                      <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
                          {slide.content.map((point, idx) => <li key={idx}>{point}</li>)}
                      </ul>
                  </div>
              </div>
              <div className="flex justify-between mt-4">
                  <Button variant="secondary" disabled={currentSlide === 0} onClick={() => setCurrentSlide(prev => prev - 1)}>Previous</Button>
                  <Button variant="secondary" disabled={currentSlide === presentation.slides.length - 1} onClick={() => setCurrentSlide(prev => prev + 1)}>Next</Button>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
        <Card className="w-full max-w-5xl h-[90vh] flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4">
                <h2 className="text-2xl font-bold">AI Presentation Generator</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
             </div>
             <div className="flex-grow overflow-hidden">
                 {view === 'form' && renderForm()}
                 {view === 'presentation' && renderPresentation()}
                 {view === 'quiz' && quiz && (
                     <div className="h-full overflow-y-auto">
                         <div className="flex justify-between mb-4">
                             <h3 className="text-xl font-bold">Generated Quiz</h3>
                             <Button size="sm" variant="secondary" onClick={() => setView('presentation')}>Back to Slides</Button>
                         </div>
                         {quiz.quiz.map((q, i) => (
                             <div key={i} className="mb-6 p-4 bg-slate-800 rounded-lg">
                                 <p className="font-bold mb-2">{i + 1}. {q.question}</p>
                                 <ul className="list-disc list-inside pl-4 text-gray-300">
                                     {q.options.map((opt, idx) => (
                                         <li key={idx} className={opt === q.correctAnswer ? 'text-green-400 font-bold' : ''}>{opt}</li>
                                     ))}
                                 </ul>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        </Card>
    </div>
  );
};
