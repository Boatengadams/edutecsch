import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GoogleGenAI } from '@google/genai';

interface LessonPlanGeneratorProps {
    userProfile: UserProfile;
}

const LessonPlanGenerator: React.FC<LessonPlanGeneratorProps> = ({ userProfile }) => {
    const [topic, setTopic] = useState('');
    const [selectedClass, setSelectedClass] = useState(userProfile.classesTaught?.[0] || '');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [objectives, setObjectives] = useState('');
    const [duration, setDuration] = useState(45);
    
    const [generatedPlan, setGeneratedPlan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const teacherClasses = useMemo(() => Array.from(new Set([
        ...(userProfile.classesTaught || []),
        ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : []),
    ])), [userProfile]);

    const subjectsForClass = useMemo(() => {
        return userProfile.subjectsByClass?.[selectedClass] || [];
    }, [selectedClass, userProfile.subjectsByClass]);

    useEffect(() => {
        if (subjectsForClass.length > 0 && !subjectsForClass.includes(selectedSubject)) {
            setSelectedSubject(subjectsForClass[0]);
        }
    }, [subjectsForClass, selectedSubject]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setGeneratedPlan('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                You are an expert curriculum designer for a school in Ghana. Create a detailed and engaging lesson plan based on the following information:
                - **Class:** ${selectedClass}
                - **Subject:** ${selectedSubject}
                - **Topic:** ${topic}
                - **Duration:** ${duration} minutes
                - **Learning Objectives:** By the end of the lesson, students should be able to: ${objectives}

                Structure the lesson plan with the following sections, formatted as clean HTML using tags like <h3>, <p>, <ul>, and <li>:
                1.  **Introduction/Hook:** An engaging activity or question to capture students' interest (5-10 minutes).
                2.  **Main Activities/Presentation:** Step-by-step teacher and student activities. Explain the core concepts clearly. (20-25 minutes).
                3.  **Student Practice/Group Work:** A hands-on activity for students to apply what they've learned. (10-15 minutes).
                4.  **Assessment/Check for Understanding:** How the teacher will gauge student comprehension (e.g., exit ticket, quick quiz, Q&A).
                5.  **Conclusion/Wrap-up:** A summary of the key takeaways.

                Ensure the content is appropriate for the specified class level in the Ghanaian educational context.
            `;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setGeneratedPlan(response.text);
        } catch (err: any) {
            setError('Failed to generate lesson plan. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold">AI Lesson Plan Generator</h3>
                <p className="text-sm text-gray-400 mt-1">Describe your lesson, and let Edu draft a plan for you.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleGenerate} className="space-y-4">
                     <div>
                        <label className="text-sm">Topic</label>
                        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., The Water Cycle" required className="w-full p-2 mt-1 bg-slate-700 rounded-md"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm">Class</label>
                            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 mt-1 bg-slate-700 rounded-md">
                                {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm">Subject</label>
                            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={subjectsForClass.length === 0} className="w-full p-2 mt-1 bg-slate-700 rounded-md">
                                {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm">Learning Objectives</label>
                        <textarea value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="e.g., - Describe the stages of the water cycle&#10;- Explain the importance of water" rows={3} required className="w-full p-2 mt-1 bg-slate-700 rounded-md" />
                    </div>
                     <div>
                        <label className="text-sm">Duration (minutes)</label>
                        <input type="number" min="15" max="120" step="5" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-2 mt-1 bg-slate-700 rounded-md"/>
                    </div>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner /> : 'Generate Lesson Plan'}
                    </Button>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </form>

                <div className="bg-slate-800 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Generated Plan</h4>
                    {isLoading && !generatedPlan ? (
                        <div className="flex justify-center items-center h-full"><Spinner /></div>
                    ) : generatedPlan ? (
                        <div className="prose-styles prose-invert max-h-[60vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: generatedPlan }} />
                    ) : (
                        <p className="text-gray-500 text-center py-16">Your generated lesson plan will appear here.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonPlanGenerator;
