
import React, { useState, useEffect, useMemo } from 'react';
import { db, storage, firebase } from '../services/firebase';
import type { Assignment, UserProfile, SubjectsByClass, AssignmentType, Quiz, QuizQuestion } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import type firebase_app from 'firebase/compat/app';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  classes: string[];
  user: firebase_app.User;
  userProfile: UserProfile;
  teacherSubjectsByClass: UserProfile['subjectsByClass'];
}

// Helper for date inputs
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
  const [scheduledAt, setScheduledAt] = useState(''); // New state for schedule
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


  const subjectsForClass = useMemo(() => {
    return teacherSubjectsByClass?.[classId] || [];
  }, [classId, teacherSubjectsByClass]);

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
            // A simple way to get topic from title for re-generation
            if (assignment.title.toLowerCase().startsWith('assignment:')) {
                setTopicForAI(assignment.title.substring(11).trim());
            }
        } else {
            // Reset form for new assignment
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
      if (!assignment) { // Only auto-select for new assignments
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
  
      const objectiveQuestionSchema = {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: 'The question text.' },
          options: { type: Type.ARRAY, description: 'An array of 4 string options for the multiple choice.', items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING, description: 'The text of the correct option.' },
        },
        required: ['question', 'options', 'correctAnswer'],
      };
  
      const theoryQuestionSchema = {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: 'The main theory question text.' },
            sub_questions: { type: Type.ARRAY, description: 'An array of sub-question strings, if any.', items: { type: Type.STRING } },
          },
          required: ['question'],
      };
      
      const schemaProperties: any = {};
      const requiredProperties: string[] = [];
  
      if (aiQuestionType === 'Objective' || aiQuestionType === 'Mixed') {
          schemaProperties.objectiveQuestions = { type: Type.ARRAY, items: objectiveQuestionSchema };
          requiredProperties.push('objectiveQuestions');
      }
      if (aiQuestionType === 'Theory' || aiQuestionType === 'Mixed') {
          schemaProperties.theoryQuestions = { type: Type.ARRAY, items: theoryQuestionSchema };
          requiredProperties.push('theoryQuestions');
      }
  
      const responseSchema = {
          type: Type.OBJECT,
          properties: schemaProperties,
          required: requiredProperties,
      };
  
      const prompt = `You are an expert educator creating an assignment for a '${classId}' class on the subject of '${subject}'. The topic is '${topicForAI}'.
  
      Generate an assignment with ${aiNumQuestions} questions based on the type '${aiQuestionType}'.
      
      - For 'Objective' questions, provide a clear question, exactly four distinct multiple-choice options, and identify the correct answer text. The options should be plausible.
      - For 'Theory' questions, provide an open-ended question that encourages critical thinking. You can include sub-parts.
      
      Your response MUST be a valid JSON object matching the provided schema.`;
  
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: {
              responseMimeType: 'application/json',
              responseSchema: responseSchema,
          }
      });
  
      const result = JSON.parse(response.text);
      let generatedDescription = '';
      let answerKey = '';
      let generatedQuiz: QuizQuestion[] = [];
  
      if (result.objectiveQuestions) {
          generatedDescription += `This is a quiz for the topic "${topicForAI}". Please select the correct answer for each question.\n\n`;
          answerKey += 'OBJECTIVE ANSWERS\n';
          result.objectiveQuestions.forEach((q: any, index: number) => {
              answerKey += `${index + 1}. ${q.correctAnswer}\n`;

              generatedQuiz.push({
                  question: q.question,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
              });
          });
      }
  
      if (result.theoryQuestions) {
          generatedDescription += (generatedDescription ? '\n\n' : '') + 'THEORY QUESTIONS\n\n';
          result.theoryQuestions.forEach((q: any, index: number) => {
              generatedDescription += `Question ${index + 1}: ${q.question}\n`;
              if (q.sub_questions && q.sub_questions.length > 0) {
                  q.sub_questions.forEach((sub: string, subIndex: number) => {
                      generatedDescription += `  ${String.fromCharCode(97 + subIndex)}) ${sub}\n`;
                  });
              }
              generatedDescription += '\n';
          });
      }
  
      setTitle(`Assignment: ${topicForAI}`);
      setDescription(`${generatedDescription}${answerKey ? `\n\nTEACHER'S ANSWER KEY (Important: Remove before saving!)\n${answerKey}` : ''}`);

      if (generatedQuiz.length > 0) {
        setQuiz({ quiz: generatedQuiz });
        if (result.theoryQuestions) {
            setAssignmentType('Theory'); // If mixed, default to theory for text entry, quiz data is still saved
        } else {
            setAssignmentType('Objective');
        }
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
    setError('');
    
    try {
      let attachmentURL = existingAttachment.url;
      let attachmentName = existingAttachment.name;

      const assignmentData: any = {
        title,
        description,
        classId,
        subject,
        type: assignmentType,
        teacherId: user.uid,
        teacherName: userProfile.name,
        dueDate: dueDate || null,
        scheduledAt: scheduledAt ? firebase.firestore.Timestamp.fromDate(new Date(scheduledAt)) : null,
      };

      if (assignmentType === 'Objective') {
        assignmentData.quiz = quiz;
      } else {
        assignmentData.quiz = null;
      }

      if (assignment) { // Editing existing assignment
        const docRef = db.collection('assignments').doc(assignment.id);

        if (file) { // New file is being uploaded
          // Delete old file if it exists
          if (existingAttachment.url) {
            try {
                await storage.refFromURL(existingAttachment.url).delete();
            } catch (deleteError) {
                console.warn("Could not delete old attachment:", deleteError);
            }
          }

          // Upload new file
          const storagePath = `assignments/${assignment.id}/${file.name}`;
          const uploadTask = storage.ref(storagePath).put(file);
          uploadTask.on('state_changed', snapshot => {
              setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          });
          await uploadTask;
          attachmentURL = await uploadTask.snapshot.ref.getDownloadURL();
          attachmentName = file.name;
        }

        await docRef.update({
          ...assignmentData,
          attachmentURL,
          attachmentName,
        });

      } else { // Creating new assignment
        const docRef = await db.collection('assignments').add({
          ...assignmentData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          attachmentURL: '',
          attachmentName: '',
        });

        if (file) {
          const storagePath = `assignments/${docRef.id}/${file.name}`;
          const uploadTask = storage.ref(storagePath).put(file);
          uploadTask.on('state_changed', snapshot => {
              setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          });
          await uploadTask;
          attachmentURL = await uploadTask.snapshot.ref.getDownloadURL();
          attachmentName = file.name;
          await docRef.update({ attachmentURL, attachmentName });
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Error saving assignment:", err);
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
                            {subjectsForClass.length > 0 ? (
                            subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)
                            ) : (
                            <option>No assigned subjects for this class</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="assignmentType" className="block text-sm font-medium text-gray-300">Type</label>
                        <select id="assignmentType" value={assignmentType} onChange={e => setAssignmentType(e.target.value as AssignmentType)} required className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600">
                            <option value="Theory">Theory</option>
                            <option value="Objective">Objective (Quiz)</option>
                        </select>
                    </div>
                </div>
                
                <div className="p-4 bg-slate-900/50 rounded-lg space-y-3 border border-blue-500/30">
                    <h4 className="font-semibold text-blue-300">Generate with AI</h4>
                    <p className="text-xs text-gray-400">Fill in the topic below, then let Edu generate the assignment for you.</p>
                    <input type="text" placeholder="Assignment Topic (for AI)" value={topicForAI} onChange={e => setTopicForAI(e.target.value)} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" />
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label htmlFor="ai-num-q" className="text-sm">Number of Questions</label>
                            <input id="ai-num-q" type="number" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value))} min="1" max="10" className="w-24 mt-1 p-2 bg-slate-700 rounded-md border border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="ai-q-type" className="text-sm">Question Type</label>
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
                
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required rows={8} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600" />
                
                {assignmentType === 'Objective' && quiz && (
                    <div className="mt-4 p-4 bg-slate-800 rounded-lg space-y-4">
                        <h4 className="font-semibold text-gray-300">Objective Questions Preview</h4>
                        {quiz.quiz.map((q, index) => (
                            <div key={index} className="text-sm">
                                <p className="font-semibold text-gray-200">{index + 1}. {q.question}</p>
                                <ul className="list-disc list-inside pl-4 text-gray-400">
                                    {q.options.map((opt, optIndex) => (
                                        <li key={optIndex} className={opt === q.correctAnswer ? 'text-green-400' : ''}>
                                            {opt} {opt === q.correctAnswer && '(Correct)'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300">Due Date (Optional)</label>
                        <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-300">Schedule Publication (Optional)</label>
                        <input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-700 border border-slate-600 text-sm" />
                         <p className="text-xs text-gray-400 mt-1">Students won't see this until the set time.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300">Attachment (Optional)</label>
                    {existingAttachment.name && !file && (
                    <div className="text-sm text-gray-400 p-2 bg-slate-700 rounded-md my-1">
                        Current file: {existingAttachment.name}
                    </div>
                    )}
                    <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
            </div>

            <div className="flex-shrink-0 pt-2">
                {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-slate-600 rounded-full h-2.5 mb-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                )}

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
