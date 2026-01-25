
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
// FIX: Import missing useToast hook
import { useToast } from './common/Toast';

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
  // FIX: Initialize useToast hook
  const { showToast } = useToast();
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
      const prompt = `You are an expert teacher creating an assignment for a '${classId}' class on '${subject}'. Topic: '${topicForAI}'.
      Generate ${aiNumQuestions} questions (${aiQuestionType}). Ensure clear explanations for answers. Return JSON: { "quiz": [{ "question": "string", "options": ["string"], "correctAnswer": "string", "explanation": "string" }] }`;
  
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: {
              responseMimeType: 'application/json',
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
           setTitle(`Assignment: ${topicForAI}`);
           setDescription(`Automated assessment focused on ${topicForAI} within the ${subject} curriculum.`);
           setStep('preview');
           showToast("Protocol synthesized via AI", "success");
      }
    } catch (err: any) {
      setAiError(`Neural Error: ${err.message}`);
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
      setError(`Deployment Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-4 z-[100] animate-fade-in">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col !p-0 overflow-hidden border-white/10 shadow-3xl bg-slate-900">
        <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
            <div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest">
                    {step === 'preview' ? 'Visual Audit' : (assignment ? 'Update Protocol' : 'Deploy Assessment')}
                </h3>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">{classId} &bull; {subject || 'Awaiting Selection'}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-all p-2 bg-white/5 rounded-full">✕</button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-10 custom-scrollbar">
            {step === 'form' ? (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Class Registry</label>
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Protocol Type</label>
                            <select value={assignmentType} onChange={e => setAssignmentType(e.target.value as AssignmentType)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/30">
                                <option value="Theory">Theory (Open Response)</option>
                                <option value="Objective">Objective (MCQ/Quiz)</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* AI ASSISTANT PANEL - GLASS STYLE */}
                    <div className="p-8 bg-blue-600/5 rounded-[2.5rem] border border-blue-500/20 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl font-black group-hover:scale-110 transition-transform">🤖</div>
                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                            Neural Generator Agent
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Topic for Synthesis</label>
                                <input type="text" placeholder="e.g. Photosynthesis & Cellular Respiration" value={topicForAI} onChange={e => setTopicForAI(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quantities</label>
                                    <input type="number" min="1" max="25" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value))} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-center font-bold text-white" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Depth</label>
                                    <select value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as any)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-blue-400">
                                        <option value="Objective">FACTUAL (MCQ)</option>
                                        <option value="Theory">ANALYTICAL</option>
                                        <option value="Mixed">COMPREHENSIVE</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <Button type="button" onClick={handleGenerateWithAI} disabled={isGenerating} className="w-full !py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40 bg-gradient-to-r from-blue-600 to-indigo-600">
                            {isGenerating ? <div className="flex items-center gap-2"><Spinner /> ARCHITECTING...</div> : '🚀 Deploy Neural Synthesis'}
                        </Button>
                        {aiError && <p className="text-red-400 text-[10px] font-black uppercase text-center mt-2 animate-shake">{aiError}</p>}
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Manual Identity</label>
                            <input type="text" placeholder="Protocol Headline" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-lg font-bold text-white outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Instructions</label>
                            <textarea placeholder="Outline the constraints or theoretical prompts..." value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full p-5 bg-slate-950 border border-white/10 rounded-2xl text-sm text-slate-300 outline-none focus:border-blue-500 resize-none shadow-inner" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registry Deadline</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white focus:border-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Automated Launch Time</label>
                                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white focus:border-blue-500" />
                            </div>
                        </div>

                        <div className="p-5 bg-slate-950 border border-white/5 rounded-2xl flex items-center justify-between group/file hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl group-hover/file:scale-110 transition-transform">📎</div>
                                <div>
                                    <p className="text-xs font-bold text-slate-300">{file ? file.name : (existingAttachment.name || 'No supporting asset')}</p>
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">PDF / DOCX / IMAGE (MAX 20MB)</p>
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => (document.getElementById('file-trigger') as HTMLInputElement).click()} className="text-[9px] font-black uppercase py-2.5 px-6">Upload Asset</Button>
                            <input id="file-trigger" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="hidden"/>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in-up space-y-8">
                    <div className="flex justify-between items-center bg-blue-600/10 p-6 rounded-3xl border border-blue-500/20">
                        <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl">🧿</div>
                             <div>
                                 <p className="text-lg font-black text-white uppercase tracking-widest">Protocol Inspection Mode</p>
                                 <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest italic mt-1">Live rendering of the learner end-point experience</p>
                             </div>
                        </div>
                        <Button variant="secondary" onClick={() => setStep('form')} className="text-[10px] font-black px-8 py-3 rounded-xl border border-white/10">Abort Preview</Button>
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

        <footer className="px-10 py-8 border-t border-white/5 bg-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-6">
            {error && <p className="text-red-400 text-[10px] font-black uppercase flex items-center gap-3 bg-red-900/10 px-4 py-2 rounded-lg border border-red-500/20"><span>⚠️</span> {error}</p>}
            <div className="flex gap-4 w-full sm:w-auto">
                {step === 'form' && (
                    <Button variant="secondary" onClick={() => setStep('preview')} className="flex-1 sm:flex-none py-4 px-10 text-xs font-black uppercase tracking-widest rounded-xl border border-white/10" disabled={!title}>Visual Audit</Button>
                )}
                <Button onClick={handleFinalSave} disabled={isLoading || !title} className="flex-1 sm:flex-none py-4 px-16 text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                    {isLoading ? <Spinner /> : (assignment ? 'Update Registry' : 'Commit Protocol')}
                </Button>
            </div>
        </footer>
      </Card>
    </div>
  );
};

export default AssignmentModal;
