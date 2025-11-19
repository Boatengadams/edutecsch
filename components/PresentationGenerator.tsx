
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { db, firebase, storage } from '../services/firebase';
import { Presentation, Quiz, GeneratedContent, SubjectsByClass, Collaborator, UserProfile, Slide, AssignmentType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type firebase_app from 'firebase/compat/app';

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

interface ShareModalProps {
    onClose: () => void;
    content: GeneratedContent | null;
    ownerName: string;
    currentUser: UserProfile | null;
}

const ShareModal: React.FC<ShareModalProps> = ({ onClose, content, ownerName, currentUser }) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!content) return null;

    const handleAddCollaborator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const userQuery = await db.collection('users')
                .where('email', '==', inviteEmail.trim())
                .where('role', '==', 'teacher')
                .get();

            if (userQuery.empty) {
                throw new Error("No approved teacher found with that email.");
            }
            const collaboratorUser = userQuery.docs[0].data() as UserProfile;
            
            if (collaboratorUser.uid === content.teacherId) {
                throw new Error("You cannot add the owner as a collaborator.");
            }
            if (content.collaboratorUids?.includes(collaboratorUser.uid)) {
                 throw new Error("This user is already a collaborator.");
            }

            const newCollaborator: Collaborator = {
                uid: collaboratorUser.uid,
                name: collaboratorUser.name,
                email: collaboratorUser.email
            };

            await db.collection('generatedContent').doc(content.id).update({
                collaborators: firebase.firestore.FieldValue.arrayUnion(newCollaborator),
                collaboratorUids: firebase.firestore.FieldValue.arrayUnion(collaboratorUser.uid)
            });

            setSuccess(`Successfully added ${collaboratorUser.name} to the presentation.`);
            setInviteEmail('');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCollaborator = async (collaborator: Collaborator) => {
        if (window.confirm(`Are you sure you want to remove ${collaborator.name}?`)) {
            await db.collection('generatedContent').doc(content.id).update({
                collaborators: firebase.firestore.FieldValue.arrayRemove(collaborator),
                collaboratorUids: firebase.firestore.FieldValue.arrayRemove(collaborator.uid)
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-[60]">
            <Card className="w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Share Presentation</h3>
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">Owner: {ownerName}</p>
                    <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Collaborators</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {content.collaborators?.map(c => (
                                <div key={c.uid} className="flex justify-between items-center bg-slate-700 p-2 rounded">
                                    <p>{c.name} ({c.email})</p>
                                    {currentUser?.uid === content.teacherId && content.teacherId !== c.uid && (
                                      <button onClick={() => handleRemoveCollaborator(c)} className="text-red-400 hover:text-red-300 font-bold">&times;</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <form onSubmit={handleAddCollaborator} className="space-y-2">
                        <label htmlFor="invite-email" className="text-sm font-medium text-gray-300">Invite by Email</label>
                        <div className="flex gap-2">
                            <input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="teacher.email@example.com"
                                className="w-full p-2 rounded bg-slate-700 border border-slate-600"
                            />
                            <Button type="submit" disabled={loading}>{loading ? '...' : 'Add'}</Button>
                        </div>
                    </form>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {success && <p className="text-green-400 text-sm">{success}</p>}
                </div>
                <Button variant="secondary" onClick={onClose} className="w-full mt-4">Done</Button>
            </Card>
        </div>
    );
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

const compressImage = (file: Blob, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1280;
                const scaleSize = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};


export const PresentationGenerator: React.FC<PresentationGeneratorProps> = ({ onClose, classes, subjectsByClass, user, userProfile, initialContent = null, onStartLiveLesson, setToast }) => {
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
  const [showAnswers, setShowAnswers] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(initialContent?.id || null);
  const [view, setView] = useState<'form' | 'presentation' | 'quiz' | 'preview'>(
    initialContent ? 'presentation' : 'form'
  );
  
  // Loading/Error state
  const [loadingState, setLoadingState] = useState<'idle' | 'generating_presentation' | 'generating_quiz' | 'saving_assignment' | 'saving'>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<number, 'loading' | 'loaded' | 'error'>>({});
  const [regeneratingImageIndex, setRegeneratingImageIndex] = useState<number | null>(null);
  const imageReplaceInputRef = useRef<HTMLInputElement>(null);
  const uploadProgressRef = useRef(0);


  // Assignment Modal State
  const [isAssigningQuiz, setIsAssigningQuiz] = useState(false);
  const [assignmentDetails, setAssignmentDetails] = useState({ title: '', classId: (initialContent?.classes && initialContent.classes[0]) || (classes.length > 0 ? classes[0] : ''), dueDate: '' });
  
  // Collaboration State
  const [showShareModal, setShowShareModal] = useState(false);
  const [fullContent, setFullContent] = useState<GeneratedContent | null>(initialContent);
  

  // Refs for managing updates
  const isUpdatingFromFirestore = useRef(false);
  const isInitialMount = useRef(true);

  const handleTargetClassChange = (className: string) => {
    setTargetClasses(prev => {
        if (prev.includes(className)) {
            // Prevent unselecting the last item
            if (prev.length === 1) return prev;
            return prev.filter(c => c !== className);
        } else {
            return [...prev, className];
        }
    });
  };

  // Update subjects list when target classes change
  useEffect(() => {
    if (subjectsByClass && targetClasses.length > 0) {
        const subjectsOfSelectedClasses = targetClasses.map(c => subjectsByClass[c] || []);
        
        // Find common subjects (intersection)
        const commonSubjects = subjectsOfSelectedClasses.reduce((a, b) => a.filter(c => b.includes(c)));
        
        setSubjectsForClass(commonSubjects);

        // If current subject is no longer valid, or on first load of a new presentation, reset it
        if (!initialContent && isInitialMount.current) {
            setSubject(commonSubjects[0] || '');
        } else if (subject && !commonSubjects.includes(subject)) {
             setSubject(commonSubjects[0] || '');
        }
    } else {
        setSubjectsForClass([]);
        setSubject('');
    }

    // This ref is just to prevent resetting the subject on the very first render when editing
    if (isInitialMount.current) {
        isInitialMount.current = false;
    }
  }, [targetClasses, subjectsByClass, initialContent, isInitialMount, subject]);
  
  // Sync class for assignment with target classes
  useEffect(() => {
    if (targetClasses.length > 0 && !targetClasses.includes(assignmentDetails.classId)) {
        setAssignmentDetails(prev => ({...prev, classId: targetClasses[0]}));
    } else if (targetClasses.length === 0) {
        setAssignmentDetails(prev => ({...prev, classId: ''}));
    }
  }, [targetClasses, assignmentDetails.classId]);


  // Real-time collaboration listener
  useEffect(() => {
    if (!savedContentId || !user || !userProfile) return;

    // Join live session
    const docRef = db.collection('generatedContent').doc(savedContentId);
    const currentUserCollaborator: Collaborator = { uid: user.uid, name: userProfile.name, email: userProfile.email };
    docRef.update({ liveCollaborators: firebase.firestore.FieldValue.arrayUnion(currentUserCollaborator) });

    const unsubscribe = docRef.onSnapshot(doc => {
      if (doc.exists) {
        isUpdatingFromFirestore.current = true;
        const data = { id: doc.id, ...doc.data() } as GeneratedContent;
        setFullContent(data);
        setPresentation(data.presentation);
        setQuiz(data.quiz);
        setTopic(data.topic);
        setAudience(data.audience || '');
        isUpdatingFromFirestore.current = false;
      } else {
        setError("This content seems to have been deleted.");
        onClose();
      }
    }, err => {
        console.error("Error listening to presentation content:", err);
        setError("Connection lost. Please reopen the presentation.");
    });

    // Leave live session on unmount
    return () => {
      unsubscribe();
      docRef.update({ liveCollaborators: firebase.firestore.FieldValue.arrayRemove(currentUserCollaborator) });
    };

  }, [savedContentId, user, userProfile, onClose]);

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

  // Trigger debounced save on content change
  useEffect(() => {
    if (presentation && !isUpdatingFromFirestore.current && !initialContent) {
        // This effect is for initial save after generation, subsequent saves are handled by the next effect
    } else if (presentation && !isUpdatingFromFirestore.current && savedContentId) {
       debouncedSave(presentation, quiz, topic, audience);
    }
  }, [presentation, quiz, topic, audience, debouncedSave, initialContent, savedContentId]);

  
  const resetAll = () => {
    if (initialContent) {
        onClose();
        return;
    }
    setPresentation(null);
    setQuiz(null);
    setCurrentSlide(0);
    setShowAnswers(false);
    setView('form');
    setError('');
    setTopic('');
    setAudience('');
    setSubject('');
    setLoadingMessage('');
    setSavedContentId(null);
    setImageLoadStatus({});
  };

  const handleUpdateSlide = (index: number, field: 'title' | 'content' | 'imageStyle' | 'imageUrl', value: string | string[] | 'contain' | 'cover') => {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    const updatedSlide = { ...newSlides[index] };
    
    // FIX: Handle 'imageStyle' separately to satisfy its specific type.
    if (field === 'content') {
        updatedSlide[field] = value as string[];
    } else if (field === 'title' || field === 'imageUrl') {
        updatedSlide[field] = value as string;
    } else if (field === 'imageStyle') {
        updatedSlide[field] = value as 'contain' | 'cover';
    }
    
    newSlides[index] = updatedSlide;
    setPresentation({ ...presentation, slides: newSlides });
};

  const handleUpdateQuizQuestion = (index: number, field: 'question' | 'options' | 'correctAnswer', value: string | string[]) => {
      if (!quiz) return;
      const newQuestions = [...quiz.quiz];
      if (field === 'options') {
          newQuestions[index] = { ...newQuestions[index], [field]: value as string[] };
      } else {
          newQuestions[index] = { ...newQuestions[index], [field]: value as string };
      }
      setQuiz({ ...quiz, quiz: newQuestions });
  };
  
  const handleAssignQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !quiz || !topic) return;

    setLoadingState('saving_assignment');
    setError('');

    try {
        const assignmentData = {
            title: assignmentDetails.title || `Quiz: ${topic}`,
            description: `This is an objective quiz for the topic "${topic}". Please select the correct answer for each question.`,
            classId: assignmentDetails.classId,
            teacherId: user.uid,
            teacherName: userProfile.name,
            dueDate: assignmentDetails.dueDate || null,
            attachmentURL: '',
            attachmentName: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            subject: subject,
            type: 'Objective' as AssignmentType,
            quiz: quiz,
        };

        await db.collection('assignments').add(assignmentData);

        setIsAssigningQuiz(false);
        setAssignmentDetails({ title: '', classId: targetClasses[0], dueDate: '' });
        setToast({ message: 'Quiz assigned successfully!', type: 'success' });
    } catch (err: any) {
        setError(`Failed to create assignment: ${err.message}`);
        setToast({ message: `Failed to create assignment: ${err.message}`, type: 'error' });
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
        
        // Step 1: Generate Text Content
        setLoadingMessage('Generating presentation text...');
        const audienceInstruction = audience ? `The presentation should be tailored for the following audience: ${audience}.` : '';
        const textPrompt = `Create a professional educational presentation for classes '${targetClasses.join(', ')}' on the subject '${subject}'. The topic is '${topic}'. 
        ${audienceInstruction}
        The presentation should have between 8 and 12 slides. Each slide must have:
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
        
        if (!presentationTextContent.slides || presentationTextContent.slides.length === 0) {
            throw new Error("AI failed to generate slide text content.");
        }

        // Step 2: Generate Image for each slide
        const slidesWithImages: Slide[] = [];
        for (let i = 0; i < presentationTextContent.slides.length; i++) {
            const slide = presentationTextContent.slides[i];
            setLoadingMessage(`Generating image ${i + 1} of ${presentationTextContent.slides.length}...`);
            setImageLoadStatus(prev => ({ ...prev, [i]: 'loading' }));
            
            const imagePrompt = `A high-quality, photorealistic, educational image for a presentation slide. The slide title is "${slide.title}". The key points on the slide are: "${slide.content.join('; ')}". The image should be simple, clear, and directly illustrate the main concept of the slide.`;

            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            let imageUrl = ''; // Fallback
            const parts = imageResponse.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                    break;
                }
            }
            
            if (!imageUrl) {
                console.warn(`Could not generate image for slide ${i + 1}: ${slide.title}`);
                setImageLoadStatus(prev => ({ ...prev, [i]: 'error' }));
            }

            slidesWithImages.push({
                ...slide,
                imageUrl: imageUrl,
                imageStyle: 'contain',
            });
        }
        
        // Step 3: Finalize and set state
        const finalPresentation: Presentation = { slides: slidesWithImages };
        setPresentation(finalPresentation);
        setView('preview');

    } catch (err: any) {
        console.error(err);
        setError("Failed to generate presentation. The AI might be busy or an error occurred. Please try again in a moment.");
    } finally {
        setLoadingState('idle');
    }
};

const savePresentation = async (): Promise<GeneratedContent | null> => {
    if (!presentation || !user || !userProfile) {
        setError("Missing required data to save.");
        return null;
    }
    
    setError('');

    try {
        const slidesToSave = [...presentation.slides];
        const docRef = db.collection('generatedContent').doc();
        const docRefId = docRef.id;

        uploadProgressRef.current = 0;
        setLoadingMessage(`Optimizing and uploading images... (0/${slidesToSave.length})`);

        const uploadPromises = slidesToSave.map(async (slide, i) => {
            if (slide.imageUrl && slide.imageUrl.startsWith('data:')) {
                const response = await fetch(slide.imageUrl);
                const blob = await response.blob();
                const compressedBlob = await compressImage(blob);
                
                const storagePath = `generatedContent/${user.uid}/${docRefId}/slide_${i}.jpg`;
                const storageRef = storage.ref(storagePath);
                
                await storageRef.put(compressedBlob);
                const downloadURL = await storageRef.getDownloadURL();
                
                uploadProgressRef.current += 1;
                setLoadingMessage(`Optimizing and uploading images... (${uploadProgressRef.current}/${slidesToSave.length})`);

                return downloadURL;
            }
            uploadProgressRef.current += 1;
            setLoadingMessage(`Optimizing and uploading images... (${uploadProgressRef.current}/${slidesToSave.length})`);
            return slide.imageUrl;
        });
        
        const uploadedImageUrls = await Promise.all(uploadPromises);

        const finalSlides = slidesToSave.map((slide, i) => ({
            ...slide,
            imageUrl: uploadedImageUrls[i] || slide.imageUrl,
        }));
        
        const finalPresentation: Presentation = { slides: finalSlides };

        const expiresAtTimestamp = firebase.firestore.Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000);
        
        const contentData: Omit<GeneratedContent, 'id'> = {
            teacherId: user.uid,
            teacherName: userProfile.name,
            classes: targetClasses,
            subject,
            topic,
            audience,
            presentation: finalPresentation,
            quiz: quiz,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
            expiresAt: expiresAtTimestamp,
            collaboratorUids: [user.uid],
            collaborators: [{ uid: user.uid, name: userProfile.name, email: userProfile.email }]
        };

        await docRef.set(contentData);

        return {
            id: docRef.id,
            ...contentData,
            createdAt: firebase.firestore.Timestamp.now(),
            expiresAt: expiresAtTimestamp,
        } as GeneratedContent;

    } catch (err: any) {
        console.error("Error saving presentation:", err);
        const errorMessage = `Failed to save presentation: ${err.message}.`;
        setError(errorMessage);
        setToast({ message: errorMessage, type: 'error' });
        return null;
    }
};

const handleSaveToLibrary = async () => {
    if (!presentation || !user || !userProfile) {
        setError("Missing required data to save.");
        return;
    }
    setLoadingState('saving');
    const savedContent = await savePresentation();
    setLoadingState('idle');
    if (savedContent) {
        setToast({ message: "Presentation saved to your library!", type: 'success' });
        onClose();
    }
};

const handleStartOptimistically = () => {
    if (!presentation || !user || !userProfile) return;
    const optimisticContent: GeneratedContent = {
      id: '', // Empty ID signifies it's new and unsaved
      teacherId: user.uid,
      teacherName: userProfile.name,
      classes: targetClasses,
      subject,
      topic,
      audience,
      presentation,
      quiz,
      createdAt: firebase.firestore.Timestamp.now(),
      collaboratorUids: [user.uid],
      collaborators: [{ uid: user.uid, name: userProfile.name, email: userProfile.email }],
    };
    onStartLiveLesson(optimisticContent);
};


const handleDiscardPreview = () => {
    resetAll();
};

const handleGenerateQuiz = async () => {
    if (!presentation) return;
    setLoadingState('generating_quiz');
    setLoadingMessage('Generating quiz...');
    setError('');

    const presentationContent = presentation.slides.map(s => `Slide: ${s.title}\n${s.content.join('\n- ')}`).join('\n\n');
    const prompt = `Based on the following presentation content about "${topic}", generate a 10-question multiple-choice quiz. Each question must have a 'question' text, an array of 4 distinct string 'options', and the 'correctAnswer' which must exactly match one of the options.
    
    Presentation Content:
    ${presentationContent}
    
    Return ONLY the valid JSON object.`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
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
                    },
                    required: ['quiz']
                }
            }
        });

        const result = JSON.parse(response.text) as Quiz;
        setQuiz(result);
        setView('quiz');

    } catch (err) {
        console.error("Error generating quiz:", err);
        setError("Failed to generate quiz. Please try again.");
    } finally {
        setLoadingState('idle');
    }
};

    const handleAddPoint = (slideIndex: number) => {
        const newSlides = [...(presentation?.slides || [])];
        newSlides[slideIndex].content.push('New point');
        setPresentation({ slides: newSlides });
    };

    const handleRemovePoint = (slideIndex: number, pointIndex: number) => {
        const newSlides = [...(presentation?.slides || [])];
        newSlides[slideIndex].content.splice(pointIndex, 1);
        setPresentation({ slides: newSlides });
    };

    const handleImageReplace = async (e: React.ChangeEvent<HTMLInputElement>, slideIndex: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                handleUpdateSlide(slideIndex, 'imageUrl', dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRegenerateImage = async (slideIndex: number) => {
        if (!presentation) return;
        setRegeneratingImageIndex(slideIndex);
        try {
            const slide = presentation.slides[slideIndex];
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const imagePrompt = `A high-quality, photorealistic, educational image for a presentation slide. The slide title is "${slide.title}". The key points on the slide are: "${slide.content.join('; ')}". The image should be simple, clear, and directly illustrate the main concept of the slide. Regenerate a new, different image based on this.`;
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            let imageUrl = '';
            const parts = imageResponse.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
            }
            if (imageUrl) {
                handleUpdateSlide(slideIndex, 'imageUrl', imageUrl);
            }
        } catch (err) {
            console.error(err);
            setError('Image regeneration failed.');
        } finally {
            setRegeneratingImageIndex(null);
        }
    };

    const handleToggleImageFit = (slideIndex: number) => {
        const currentStyle = presentation?.slides[slideIndex].imageStyle;
        handleUpdateSlide(slideIndex, 'imageStyle', currentStyle === 'cover' ? 'contain' : 'cover');
    };

  
    const renderSlideThumbnails = () => (
        <div className="flex-shrink-0 flex items-center gap-3 overflow-x-auto pb-4">
            {presentation?.slides.map((slide, index) => (
                <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-40 h-24 rounded-md flex-shrink-0 overflow-hidden relative border-2 transition-colors ${currentSlide === index ? 'border-blue-500' : 'border-slate-600 hover:border-slate-500'}`}
                >
                    {imageLoadStatus[index] === 'loading' && <div className="absolute inset-0 bg-slate-700 shimmer-bg"></div>}
                    {imageLoadStatus[index] === 'error' && <div className="absolute inset-0 bg-slate-700 flex items-center justify-center text-xs text-red-400">Error</div>}
                    
                    {slide.imageUrl && imageLoadStatus[index] !== 'error' ? (
                        <img 
                            src={slide.imageUrl} 
                            alt={slide.title} 
                            className={`w-full h-full object-${slide.imageStyle || 'contain'}`}
                            onLoad={() => setImageLoadStatus(prev => ({ ...prev, [index]: 'loaded' }))}
                            onError={() => setImageLoadStatus(prev => ({ ...prev, [index]: 'error' }))}
                        />
                    ) : (
                         <div className="w-full h-full bg-slate-700 p-2 flex items-center justify-center">
                            <p className="text-xs text-gray-400 line-clamp-2">{slide.title}</p>
                        </div>
                    )}
                     <div className="absolute bottom-0 right-0 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded-tl-md">{index + 1}</div>
                </button>
            ))}
        </div>
    );

  const activeSlide = presentation?.slides[currentSlide];

  const renderContent = () => {
    const isGeneratingOnForm = loadingState !== 'idle' && view === 'form';
    const isSavingContent = loadingState === 'saving';

    if (isGeneratingOnForm || isSavingContent) {
        return <div className="flex flex-col items-center justify-center h-full"><Spinner /><p className="mt-4 text-gray-400">{loadingMessage}</p></div>;
    }
    
    switch (view) {
      case 'form':
        return (
          <form onSubmit={handleGenerate} className="space-y-4">
            <h3 className="text-xl font-bold">Generate New Presentation</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300">Target Classes</label>
              <div className="mt-2 grid grid-cols-3 md:grid-cols-4 gap-2">
                  {classes.map(c => <label key={c} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-700 cursor-pointer"><input type="checkbox" checked={targetClasses.includes(c)} onChange={() => handleTargetClassChange(c)} className="h-4 w-4 rounded bg-slate-700" /><span>{c}</span></label>)}
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
                <select id="subject" value={subject} onChange={e => setSubject(e.target.value)} required disabled={subjectsForClass.length === 0} className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600">
                    {subjectsForClass.length > 0 ? subjectsForClass.map(s => <option key={s} value={s}>{s}</option>) : <option>Select a class first</option>}
                </select>
                </div>
                 <div>
                    <label htmlFor="audience" className="block text-sm font-medium text-gray-300">Target Audience (Optional)</label>
                    <input id="audience" type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g., Beginners, Advanced students" className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600" />
                </div>
            </div>
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300">Topic</label>
              <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., The Ecosystem" className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600" />
            </div>
            <Button type="submit" disabled={loadingState !== 'idle'}>
              {loadingState === 'generating_presentation' ? 'Generating...' : 'Generate Presentation'}
            </Button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </form>
        );
    case 'preview':
    case 'presentation':
    case 'quiz': // Add 'quiz' case to share the layout
        return (
          <div className="flex flex-col h-full">
             <header className="flex-shrink-0 flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b border-slate-700">
                <div className="flex-grow">
                    <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="text-2xl font-bold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded-md p-1 w-full" />
                    <p className="text-sm text-gray-400 px-1">For {targetClasses.join(', ')} - {subject}</p>
                </div>
              <div className="flex gap-2">
                {view === 'presentation' && <Button variant="secondary" onClick={() => setShowShareModal(true)}>Share</Button>}
                {quiz && <Button variant="secondary" onClick={() => setView(view === 'presentation' ? 'quiz' : 'presentation')}>{view === 'presentation' ? 'View Quiz' : 'View Slides'}</Button>}
                {!quiz && <Button onClick={handleGenerateQuiz} disabled={loadingState !== 'idle'}>{loadingState === 'generating_quiz' ? <Spinner/> : 'Generate Quiz'}</Button>}
                {view === 'preview' ? <Button variant="secondary" onClick={handleDiscardPreview}>Discard</Button> : <Button variant="danger" onClick={onClose}>Close</Button>}
              </div>
            </header>

            {error && <p className="text-red-400 text-sm mb-2 p-2 bg-red-900/20 rounded">{error}</p>}

            {view === 'presentation' || view === 'preview' ? (
              <div className="flex-grow flex flex-col overflow-hidden">
                {activeSlide && (
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 rounded-md flex items-center justify-center overflow-hidden relative">
                            {regeneratingImageIndex === currentSlide && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"><Spinner/></div>}
                            {activeSlide.imageUrl ? <img src={activeSlide.imageUrl} alt={activeSlide.title} className={`w-full h-full object-${activeSlide.imageStyle || 'contain'}`} /> : <div className="text-gray-500">Image not available</div>}
                            <div className="absolute top-2 right-2 bg-slate-900/80 p-1.5 rounded-md space-y-1.5">
                                <input type="file" ref={imageReplaceInputRef} onChange={e => handleImageReplace(e, currentSlide)} accept="image/*" className="hidden"/>
                                <Button size="sm" variant="secondary" className="w-full" onClick={() => imageReplaceInputRef.current?.click()}>Replace</Button>
                                <Button size="sm" variant="secondary" className="w-full" onClick={() => handleRegenerateImage(currentSlide)}>Regenerate</Button>
                                <Button size="sm" variant="secondary" className="w-full" onClick={() => handleToggleImageFit(currentSlide)}>{activeSlide.imageStyle === 'cover' ? 'Fit: Contain' : 'Fit: Cover'}</Button>
                            </div>
                        </div>
                        <div className="overflow-y-auto pr-2">
                            <textarea value={activeSlide.title} onChange={e => handleUpdateSlide(currentSlide, 'title', e.target.value)} rows={2} className="text-2xl font-bold bg-transparent w-full border-0 focus:ring-1 focus:ring-blue-500 rounded-md p-1 resize-none" />
                            <ul className="space-y-2 mt-4">
                                {activeSlide.content.map((point, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <span className="text-gray-400">•</span>
                                        <input type="text" value={point} onChange={e => handleUpdateSlide(currentSlide, 'content', activeSlide.content.map((p, pi) => pi === i ? e.target.value : p))} className="bg-transparent w-full border-0 focus:ring-1 focus:ring-blue-500 rounded-md p-1" />
                                        <button onClick={() => handleRemovePoint(currentSlide, i)} className="text-red-400 hover:text-red-300 text-lg">&times;</button>
                                    </li>
                                ))}
                            </ul>
                            <Button size="sm" variant="secondary" onClick={() => handleAddPoint(currentSlide)} className="mt-2">+ Add Point</Button>
                        </div>
                    </div>
                )}
                <div className="flex-shrink-0 flex items-center justify-between mt-4">
                    <Button onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0}>Prev</Button>
                    <span className="text-sm">Slide {currentSlide + 1} of {presentation?.slides.length}</span>
                    <Button onClick={() => setCurrentSlide(s => Math.min(presentation?.slides.length ? presentation.slides.length - 1 : 0, s + 1))} disabled={!presentation || currentSlide === presentation.slides.length - 1}>Next</Button>
                </div>
                <div className="mt-4">{renderSlideThumbnails()}</div>
              </div>
            ) : (
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-xl font-bold">Quiz on {fullContent?.topic}</h3>
                         <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setShowAnswers(!showAnswers)}>{showAnswers ? 'Hide Answers' : 'Show Answers'}</Button>
                            <Button onClick={() => setIsAssigningQuiz(true)}>Assign as Homework</Button>
                         </div>
                    </div>
                    {quiz?.quiz.map((q, i) => (
                        <div key={i} className="mb-4 p-4 bg-slate-900/50 rounded-lg">
                            <p className="font-semibold">{i + 1}. {q.question}</p>
                            <div className="mt-2 space-y-1 text-sm">
                                {q.options.map((opt, optIndex) => (
                                    <p key={optIndex} className={`p-1 rounded ${showAnswers && opt === q.correctAnswer ? 'bg-green-500/30 font-bold' : ''}`}>
                                        {String.fromCharCode(97 + optIndex)}) {opt}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {view === 'preview' && (
                 <div className="flex-shrink-0 pt-4 flex gap-2">
                    <Button onClick={handleSaveToLibrary} disabled={loadingState !== 'idle'}>
                        Save to Library
                    </Button>
                    <Button onClick={handleStartOptimistically} disabled={loadingState !== 'idle'}>
                        Start Live Lesson
                    </Button>
                </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
      <Card className="w-full max-w-6xl h-[95vh] flex flex-col">
        {renderContent()}
      </Card>
      {isAssigningQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[55]">
            <Card className="w-full max-w-md">
                <form onSubmit={handleAssignQuiz} className="space-y-4">
                    <h3 className="text-lg font-bold">Assign Quiz</h3>
                    <input type="text" placeholder="Assignment Title" value={assignmentDetails.title} onChange={e => setAssignmentDetails({...assignmentDetails, title: e.target.value})} className="w-full p-2 bg-slate-700 rounded-md" />
                    <select value={assignmentDetails.classId} onChange={e => setAssignmentDetails({...assignmentDetails, classId: e.target.value})} className="w-full p-2 bg-slate-700 rounded-md">
                        {targetClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="date" value={assignmentDetails.dueDate} onChange={e => setAssignmentDetails({...assignmentDetails, dueDate: e.target.value})} className="w-full p-2 bg-slate-700 rounded-md"/>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={loadingState === 'saving_assignment'}>{loadingState === 'saving_assignment' ? 'Assigning...' : 'Assign'}</Button>
                        <Button type="button" variant="secondary" onClick={() => setIsAssigningQuiz(false)}>Cancel</Button>
                    </div>
                </form>
            </Card>
        </div>
      )}
      {showShareModal && userProfile && (
        <ShareModal 
            onClose={() => setShowShareModal(false)}
            content={fullContent}
            ownerName={fullContent?.teacherName || ''}
            currentUser={userProfile}
        />
      )}
    </div>
  );
};
