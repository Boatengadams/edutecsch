import React, { useState, useEffect, useMemo } from 'react';
import { db, storage, firebase } from '../services/firebase';
import type { Assignment, UserProfile, AssignmentType, Quiz, QuizQuestion } from '../types';
import { GES_SUBJECTS } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import type firebase_app from 'firebase/compat/app';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';
import QuizInterface from './common/QuizInterface';

const OMNI_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  classes: string[];
  user: firebase_app.User;
  userProfile: UserProfile;
  teacherSubjectsByClass: UserProfile['subjectsByClass'];
}

const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - (offset*60*1000));
    return adjusted.toISOString().slice(0, 16);
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, assignment, classes, user, userProfile, teacherSubjectsByClass }) => {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState(classes[0] || '');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState({ name: '', url: '' });
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('Theory');
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI Generator State
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiQuestionType, setAiQuestionType] = useState<'Objective' | 'Theory' | 'Mixed'>('Objective');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [topicForAI, setTopicForAI] = useState('');

  const isOmni = useMemo(() => OMNI_EMAILS.includes(user?.email || ""), [user]);

  const subjectsForClass = useMemo(() => {
    if (isOmni) return GES_SUBJECTS;
    return teacherSubjectsByClass?.[classId] || [];
  }, [classId, teacherSubjectsByClass, isOmni]);

  useEffect(() => {
    if (isOpen) {
        if (assignment) {
            setTitle(assignment.title);
            setDescription(assignment.description);
            setClassId(assignment.classId);
            setDueDate(assignment.dueDate || '');
            setScheduledAt(assignment.scheduledAt ? formatDateForInput(assignment.scheduledAt.toDate()) : '');
            setExistingAttachment({ name: assignment.attachmentName, url: assignment.attachmentURL });
            setSubject(assignment.subject || '');
            setAssignmentType(assignment.type || 'Theory');
            setQuiz(assignment.quiz || null);
            if (assignment.title.toLowerCase().startsWith('assignment:')) {
                setTopicForAI(assignment.title.substring(11).trim());
            }
        } else {
            setTitle('');
            setDescription('');
            setTopicForAI('');
            setClassId(classes[0] || '');
            setDueDate('');
            setScheduledAt('');
            setFile(null);
            setExistingAttachment({ name: '', url: '' });
            setSubject('');
            setAssignmentType('Theory');
            setQuiz(null);
        }
        setStep('form');
        setError('');
        setAiError('');
        setIsLoading(false);
        setUploadProgress(0);
    }
  }, [assignment, classes, isOpen]);

  useEffect(() => {
      if (!assignment && subjectsForClass.length > 0 && !subject) {
          setSubject(subjectsForClass[0] || '');
      }
  }, [subjectsForClass, assignment, subject]);

  const handleGenerateWithAI = async () => {
    if (!topicForAI || !classId || !subject) {
      setAiError("Set Topic, Class, and Subject before generating.");
      return;
    }
    setIsGenerating(true);
    setAiError('');
  
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseSchema = {
          type: Type.OBJECT,
          properties: {
              quiz: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          question: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          correctAnswer: { type: Type.STRING },
                          explanation: { type: Type.STRING },
                      },
                      required: ['question', 'correctAnswer']
                  }
              }
          }
      };
  
      const prompt = `You are an expert teacher creating an assignment for a '${classId}' class on '${subject}'. Topic: '${topicForAI}'.
      Generate ${aiNumQuestions} questions (${aiQuestionType}). Ensure clear explanations for answers. Return JSON.`;
  
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: {
              responseMimeType: 'application/json',
              responseSchema: responseSchema,
          }
      });
  
      const result = JSON.parse(response.text);
      if (result.quiz && Array.isArray(result.quiz)) {
           const generatedQuiz: QuizQuestion[] = result.quiz.map((q: any) => ({
               question: q.question,
               options: q.options || [],
               correctAnswer: q.correctAnswer,
               explanation: q.explanation,
               type: (q.options && q.options.length > 0) ? 'Objective' : 'Theory'
           }));
           setQuiz({ quiz: generatedQuiz });
           const allObjective = generatedQuiz.every(q => q.type === 'Objective');
           setAssignmentType(allObjective ? 'Objective' : 'Theory');
           setTitle(`AI-Gen: ${topicForAI}`);
           setDescription(`Comprehensive task evaluating knowledge on ${topicForAI}.`);
           setStep('preview');
      }
  
    } catch (err: any) {
      setAiError(`Failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalSave = async () => {
    if (!title || !description || !classId || !subject) {
      setError('Title, description, class, and subject are required.');
      setStep('form');
      return;
    }
    setIsLoading(true);
    try {
      let attachmentURL = existingAttachment.url;
      let attachmentName = existingAttachment.name;
      const assignmentData: any = {
        title, description, classId, subject, type: assignmentType,
        teacherId: user.uid, teacherName: userProfile.name,
        dueDate: dueDate || null,
        scheduledAt: scheduledAt ? firebase.firestore.Timestamp.fromDate(new Date(scheduledAt)) : null,
        quiz: quiz || null
      };

      if (assignment) {
        const docRef = db.collection('assignments').doc(assignment.id);
        if (file) {
          if (existingAttachment.url) { try { await storage.refFromURL(existingAttachment.url).delete(); } catch (e) {} }
          const uploadTask = storage.ref(`assignments/${assignment.id}/${file.name}`).put(file);
          uploadTask.on('state_changed', s => setUploadProgress((s.bytesTransferred/s.totalBytes)*100));
          await uploadTask;
          attachmentURL = await uploadTask.snapshot.ref.getDownloadURL();
          attachmentName = file.name;
        }
        await docRef.update({ ...assignmentData, attachmentURL, attachmentName });
      } else {
        const docRef = await db.collection('assignments').add({ ...assignmentData, createdAt: firebase.firestore.FieldValue.serverTimestamp(), attachmentURL: '', attachmentName: '' });
        if (file) {
          const uploadTask = storage.ref(`assignments/${docRef.id}/${file.name}`).put(file);
          uploadTask.on('state_changed', s => setUploadProgress((s.bytesTransferred/s.totalBytes)*100));
          await uploadTask;
          const url = await uploadTask.snapshot.ref.getDownloadURL();
          await docRef.update({ attachmentURL: url, attachmentName: file.name, id: docRef.id });
        } else {
          await docRef.update({ id: docRef.id });
        }
      }
      onClose();
    } catch (err: any) {
      setError(`Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-4 z-[100] animate-fade-in">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col !p-0 overflow-hidden border-white/10 shadow-3xl">
        <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
            <div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest">
                    {step === 'preview' ? 'Preview Protocol' : (assignment ? 'Update Protocol' : 'Deploy New Task')}
                </h3>
                {step === 'form' && isOmni && <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Master Subject Access</p>}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-all p-2 bg-white/5 rounded-full">✕</button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-10 custom-scrollbar">
            {step === 'form' ? (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Class</label>
                            <select value={classId} onChange={e => setClassId(e.target.value)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/30">
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subject domain</label>
                            <select value={subject} onChange={e => setSubject(e.target.value)} required disabled={subjectsForClass.length === 0} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/30">
                                {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assessment Format</label>
                            <select value={assignmentType} onChange={e => setAssignmentType(e.target.value as AssignmentType)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/30">
                                <option value="Theory">Theory (Open Response)</option>
                                <option value="Objective">Objective (Quiz)</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* AI ASSISTANT PANEL */}
                    <div className="p-8 bg-blue-600/5 rounded-[2.5rem] border border-blue-500/20 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl font-black group-hover:scale-110 transition-transform">🤖</div>
                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            Neural Generator
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Knowledge Topic</label>
                                <input type="text" placeholder="e.g. Plate Tectonics in Ghana" value={topicForAI} onChange={e => setTopicForAI(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Question Count</label>
                                    <input type="number" min="1" max="20" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value))} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-center font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">AI Strategy</label>
                                    <select value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as any)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-blue-400">
                                        <option value="Objective">MCQ ONLY</option>
                                        <option value="Theory">THEORY ONLY</option>
                                        <option value="Mixed">HYBRID</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <Button type="button" onClick={handleGenerateWithAI} disabled={isGenerating} className="w-full !py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/30">
                            {isGenerating ? <div className="flex items-center gap-2"><Spinner /> Processing Intelligence...</div> : '🚀 Synthesize Task'}
                        </Button>
                        {aiError && <p className="text-red-400 text-[10px] font-black uppercase text-center mt-2">{aiError}</p>}
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Manual Content (Overrides AI)</label>
                            <input type="text" placeholder="Task Title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-lg font-bold text-white outline-none focus:border-blue-500" />
                        </div>
                        <textarea placeholder="Instructional text or Theory prompt..." value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full p-5 bg-slate-950 border border-white/10 rounded-2xl text-sm text-slate-300 outline-none focus:border-blue-500 resize-none" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Deadline Date</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Auto-Deploy At</label>
                                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white" />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl">📎</div>
                                <div>
                                    <p className="text-xs font-bold text-slate-300">{file ? file.name : (existingAttachment.name || 'No attachment')}</p>
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Max 10MB PDF/DOCX</p>
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => (document.getElementById('file-trigger') as HTMLInputElement).click()} className="text-[10px] font-black uppercase">Browse</Button>
                            <input id="file-trigger" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="hidden"/>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in-up space-y-8">
                    <div className="flex justify-between items-center bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl">👀</div>
                             <div>
                                 <p className="text-sm font-black text-white uppercase tracking-widest">Protocol Inspection</p>
                                 <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest italic">Live rendering of student experience</p>
                             </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setStep('form')} className="text-[10px] font-black">Back to Edit</Button>
                    </div>
                    
                    <QuizInterface 
                        assignment={{ 
                            id: 'preview', 
                            title, 
                            description, 
                            classId, 
                            subject, 
                            type: assignmentType, 
                            quiz, 
                            teacherId: user.uid, 
                            teacherName: userProfile.name, 
                            createdAt: firebase.firestore.Timestamp.now(), 
                            dueDate, 
                            attachmentURL: '', 
                            attachmentName: '' 
                        }} 
                        readOnly={true}
                        showCorrectAnswers={true}
                    />
                </div>
            )}
        </div>

        <footer className="px-8 py-6 border-t border-white/5 bg-slate-900/80 flex flex-col sm:flex-row justify-between items-center gap-4">
            {error && <p className="text-red-400 text-[10px] font-black uppercase flex items-center gap-2">⚠️ {error}</p>}
            <div className="flex gap-4 w-full sm:w-auto">
                {step === 'form' && (
                    <Button variant="secondary" onClick={() => setStep('preview')} className="flex-1 sm:flex-none py-3 px-8 text-xs font-black uppercase tracking-widest" disabled={!title}>Preview</Button>
                )}
                <Button onClick={handleFinalSave} disabled={isLoading || !title} className="flex-1 sm:flex-none py-3 px-12 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/30">
                    {isLoading ? <Spinner /> : (assignment ? 'Update Registry' : 'Commit Protocol')}
                </Button>
            </div>
        </footer>
      </Card>
    </div>
  );
};

export default AssignmentModal;