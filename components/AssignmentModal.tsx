
import React, { useState, useEffect, useMemo } from 'react';
import { db, storage, firebase } from '../services/firebase';
import type { Assignment, UserProfile, SubjectsByClass, AssignmentType, Quiz, QuizQuestion } from '../types';
import { GES_SUBJECTS } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import type firebase_app from 'firebase/compat/app';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';

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
        setError('');
        setAiError('');
        setIsLoading(false);
        setUploadProgress(0);
    }
  }, [assignment, classes, isOpen]);

  useEffect(() => {
      if (!assignment) {
          setSubject(subjectsForClass[0] || '');
      }
  }, [subjectsForClass, assignment]);

  const handleGenerateWithAI = async () => {
    if (!topicForAI || !classId || !subject) {
      setAiError("Please set a Topic, Class, and Subject before generating.");
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
  
      const prompt = `You are an expert educator creating an assignment for a '${classId}' class on the subject of '${subject}'. The topic is '${topicForAI}'.
      Generate an assignment with ${aiNumQuestions} questions based on the type '${aiQuestionType}'.
      Return ONLY a valid JSON object matching the provided schema.`;
  
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: {
              responseMimeType: 'application/json',
              responseSchema: responseSchema,
          }
      });
  
      const result = JSON.parse(response.text);
      let generatedQuiz: QuizQuestion[] = [];
      
      if (result.quiz && Array.isArray(result.quiz)) {
           generatedQuiz = result.quiz.map((q: any) => ({
               question: q.question,
               options: q.options || [],
               correctAnswer: q.correctAnswer,
               explanation: q.explanation,
               type: (q.options && q.options.length > 0) ? 'Objective' : 'Theory'
           }));
      }
  
      setTitle(`Assignment: ${topicForAI}`);
      setDescription(`Assignment on ${topicForAI}. Please complete all questions.`);

      if (generatedQuiz.length > 0) {
        setQuiz({ quiz: generatedQuiz });
        const allObjective = generatedQuiz.every(q => q.type === 'Objective');
        setAssignmentType(allObjective ? 'Objective' : 'Theory');
      } else {
        setQuiz(null);
        setAssignmentType('Theory');
      }
  
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setAiError(`Failed to generate content: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !classId || !subject) {
      setError('Title, description, class, and subject are required.');
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
          await docRef.update({ attachmentURL: url, attachmentName: file.name });
        }
      }
      onClose();
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
      <Card className="w-full max-w-2xl h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-shrink-0">
                 <h3 className="text-xl font-bold">{assignment ? 'Edit Assignment' : 'Create New Assignment'}</h3>
                 {isOmni && <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">Global Subject Access Enabled</p>}
            </div>
            
            <div className="flex-grow overflow-y-auto py-4 pr-2 space-y-4 my-4 border-y border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="classId" className="block text-sm font-medium text-gray-300">Class</label>
                        <select id="classId" value={classId} onChange={e => setClassId(e.target.value)} required className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600">
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
                        <select id="subject" value={subject} onChange={e => setSubject(e.target.value)} required disabled={subjectsForClass.length === 0} className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600">
                            {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="assignmentType" className="block text-sm font-medium text-gray-300">Type</label>
                        <select id="assignmentType" value={assignmentType} onChange={e => setAssignmentType(e.target.value as AssignmentType)} required className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600">
                            <option value="Theory">Theory</option>
                            <option value="Objective">Objective</option>
                        </select>
                    </div>
                </div>
                
                <div className="p-4 bg-slate-900/50 rounded-lg space-y-3 border border-blue-500/30">
                    <h4 className="font-semibold text-blue-300">Generate with AI</h4>
                    <input type="text" placeholder="Assignment Topic (for AI)" value={topicForAI} onChange={e => setTopicForAI(e.target.value)} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" />
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow">
                            <label htmlFor="ai-q-type" className="text-xs text-slate-400">Format</label>
                            <select id="ai-q-type" value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as any)} className="w-full mt-1 p-2 bg-slate-700 rounded-md border border-slate-600">
                                <option value="Objective">Objective</option>
                                <option value="Theory">Theory</option>
                                <option value="Mixed">Mixed</option>
                            </select>
                        </div>
                        <Button type="button" onClick={handleGenerateWithAI} disabled={isGenerating} variant="secondary">
                            {isGenerating ? <Spinner/> : 'Generate'}
                        </Button>
                    </div>
                    {aiError && <p className="text-red-400 text-sm">{aiError}</p>}
                </div>

                <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" />
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300">Due Date</label>
                        <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-300">Schedule (Optional)</label>
                        <input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600 text-sm" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300">Attachment (Optional)</label>
                    <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
            </div>

            <div className="flex-shrink-0 pt-2">
                {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Assignment'}</Button>
                </div>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default AssignmentModal;
