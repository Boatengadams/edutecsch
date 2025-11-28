
import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GoogleGenAI, Type } from '@google/genai';
import { useToast } from './common/Toast';

interface AIQuizGeneratorProps {
    userProfile: UserProfile;
}

const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({ userProfile }) => {
    const { showToast } = useToast();
    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [type, setType] = useState<'Objective' | 'Theory'>('Objective');
    const [difficulty, setDifficulty] = useState('Medium');
    
    const [generatedQuiz, setGeneratedQuiz] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const teacherSubjects = useMemo(() => {
        if (!userProfile || !userProfile.subjectsByClass) return [];
        return Array.from(new Set(Object.values(userProfile.subjectsByClass).flat()));
    }, [userProfile]);

    const teacherClasses = useMemo(() => {
        return userProfile.classesTaught || [];
    }, [userProfile]);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            showToast("Please enter a topic.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Generate a ${numQuestions}-question ${difficulty} level ${type} quiz for a ${gradeLevel} class on the subject of ${subject}. Topic: ${topic}.
            
            Format the output clearly. 
            If Objective: Numbered questions, 4 options (A-D), and indicate the correct answer at the end.
            If Theory: Numbered questions with marks allocated, and a marking scheme/answers at the end.
            
            Do NOT output JSON. Output formatted text ready to copy-paste into a document.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt
            });

            setGeneratedQuiz(response.text);
        } catch (err) {
            console.error(err);
            showToast("Failed to generate quiz.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedQuiz);
        showToast("Quiz copied to clipboard!", "success");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-1 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
                    <input type="text" list="subjects" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Science" />
                    <datalist id="subjects">
                        {teacherSubjects.map(s => <option key={s} value={s} />)}
                    </datalist>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Grade Level</label>
                    <input type="text" list="classes" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Basic 5" />
                    <datalist id="classes">
                        {teacherClasses.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Topic</label>
                    <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Photosynthesis" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Questions</label>
                        <input type="number" min="1" max="20" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none text-center" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none">
                            <option value="Objective">Objective</option>
                            <option value="Theory">Theory</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Difficulty</label>
                    <div className="flex bg-slate-700 rounded-xl p-1">
                        {['Easy', 'Medium', 'Hard'].map(d => (
                            <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${difficulty === d ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>{d}</button>
                        ))}
                    </div>
                </div>

                <Button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 text-lg shadow-lg shadow-blue-600/20">
                    {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner /> Generating...</span> : 'Generate Quiz'}
                </Button>
            </div>

            <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700/50">
                    <h4 className="font-bold text-slate-300">Output Preview</h4>
                    {generatedQuiz && (
                        <button onClick={handleCopy} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                            Copy to Clipboard
                        </button>
                    )}
                </div>
                <div className="flex-grow bg-slate-900 rounded-xl p-4 overflow-y-auto custom-scrollbar font-mono text-sm text-slate-300 whitespace-pre-wrap">
                    {generatedQuiz || <span className="text-slate-600 italic">Generated quiz will appear here...</span>}
                </div>
            </div>
        </div>
    );
};

export default AIQuizGenerator;
