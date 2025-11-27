
import React, { useState, useMemo, useEffect } from 'react';
import Card from './Card';
import { beceQuestions, BECE_SUBJECTS, beceDiagrams } from '../../data/becePastQuestions';
import AIAssistant from '../AIAssistant';

const years = Array.from({ length: 26 }, (_, i) => 2025 - i);

const BECEPastQuestionsView: React.FC = () => {
    const [selectedYear, setSelectedYear] = useState(2025);
    const [selectedSubject, setSelectedSubject] = useState('Integrated Science');
    const [activePaper, setActivePaper] = useState<'Objective' | 'Theory'>('Objective');
    
    const [aiSystemInstruction, setAiSystemInstruction] = useState('');
    const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);

    const paper = useMemo(() => {
        return beceQuestions.find(p => p.year === selectedYear && p.subject === selectedSubject);
    }, [selectedYear, selectedSubject]);

    const objectiveSections = useMemo(() => 
        paper ? paper.sections.filter(s => s.title.toUpperCase().includes('OBJECTIVE')) : [], 
    [paper]);

    const theorySections = useMemo(() => 
        paper ? paper.sections.filter(s => !s.title.toUpperCase().includes('OBJECTIVE')) : [], 
    [paper]);

    useEffect(() => {
        if (objectiveSections.length > 0) {
            setActivePaper('Objective');
        } else if (theorySections.length > 0) {
            setActivePaper('Theory');
        }
    }, [objectiveSections, theorySections]);

    useEffect(() => {
        const instruction = `You are an expert BECE tutor AI named 'Edu'. The user is currently viewing the ${selectedYear} ${selectedSubject} past questions. Your role is to help them understand the questions and answers.
- If asked to explain a concept, break it down simply.
- If asked for clarification on an answer, explain *why* it is the correct answer.
- Provide further examples if requested.
- Encourage the student and maintain a positive, supportive tone.
- Do not just give away answers if the student hasn't revealed them yet. Instead, guide them on how to approach the question.
- As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.`;
        setAiSystemInstruction(instruction);

        const prompts = [
            `Explain the answer to question 1(a)(i) in more detail.`,
            `Give me another example of an inclined plane.`,
            `What is the difference between mixed farming and mixed cropping?`,
            `Kofi, kyerɛkyerɛ carbon cycle no mu kɔ akyiri.`
        ];
        setAiSuggestedPrompts(prompts);
    }, [selectedYear, selectedSubject]);


    const sectionsToRender = activePaper === 'Objective' ? objectiveSections : theorySections;

    return (
        <div className="space-y-6">
            <Card fullHeight={false}>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold">BECE Past Questions Portal</h2>
                    <div className="flex gap-4">
                        <select
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="p-2 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {BECE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                             className="p-2 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {paper ? (
                    <div>
                        <div className="flex mb-6 border-b border-slate-700">
                            <button
                                onClick={() => setActivePaper('Objective')}
                                className={`px-4 py-2 text-lg font-semibold transition-colors disabled:text-gray-600 disabled:cursor-not-allowed ${activePaper === 'Objective' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                aria-current={activePaper === 'Objective'}
                                disabled={objectiveSections.length === 0}
                            >
                                Objective
                            </button>
                             <button
                                onClick={() => setActivePaper('Theory')}
                                className={`px-4 py-2 text-lg font-semibold transition-colors disabled:text-gray-600 disabled:cursor-not-allowed ${activePaper === 'Theory' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                aria-current={activePaper === 'Theory'}
                                disabled={theorySections.length === 0}
                            >
                                Theory
                            </button>
                        </div>

                        <div className="space-y-8">
                             {sectionsToRender.length > 0 ? (
                                sectionsToRender.map((section, secIndex) => (
                                    <div key={secIndex}>
                                        <h3 className="text-xl font-bold text-blue-300 border-b-2 border-blue-400 pb-2 mb-4">{section.title} ({section.marks} marks)</h3>
                                        <p className="text-sm italic text-gray-400 mb-6">{section.instructions}</p>
                                        <div className="space-y-6">
                                            {section.questions.map((q, qIndex) => (
                                                <Card key={qIndex} fullHeight={false}>
                                                    <p className="font-semibold text-lg mb-2">Question {q.number}</p>
                                                    <div className="prose-styles prose-invert" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                    
                                                    {q.diagramId && beceDiagrams[q.diagramId] && (
                                                        <div className="my-4" dangerouslySetInnerHTML={{ __html: beceDiagrams[q.diagramId] }} />
                                                    )}
                                                    
                                                    {q.options && q.answer ? (
                                                        <div className="mt-4 space-y-2">
                                                            {q.options.map(opt => (
                                                                <p key={opt.key} className="p-2 bg-slate-900/50 rounded-md">
                                                                    <strong>{opt.key}.</strong> {opt.text}
                                                                </p>
                                                            ))}
                                                            <details className="text-sm pt-2">
                                                                <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-semibold">Click to view correct answer</summary>
                                                                <p className="mt-2 p-3 bg-slate-800 rounded-md border border-slate-700 font-bold">
                                                                    Correct Answer: {q.answer}
                                                                </p>
                                                            </details>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4 mt-4">
                                                            {q.sub_questions?.map((sub, subIndex) => (
                                                                <div key={subIndex} className="p-3 bg-slate-900/50 rounded-lg">
                                                                    <p className="font-medium text-gray-300 mb-2">{sub.number} {sub.text}</p>
                                                                    {sub.diagramId && beceDiagrams[sub.diagramId] && (
                                                                        <div className="my-2" dangerouslySetInnerHTML={{ __html: beceDiagrams[sub.diagramId] }} />
                                                                    )}
                                                                    <details className="text-sm">
                                                                        <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-semibold">Click to view answer</summary>
                                                                        <div className="mt-2 p-3 bg-slate-800 rounded-md border border-slate-700 prose-styles prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: sub.answer.replace(/<div class="diagram-container" data-diagramid="([^"]*)"><\/div>/g, (match, p1) => beceDiagrams[p1] || '') }} />
                                                                    </details>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16">
                                    <p className="text-gray-400">No {activePaper} questions found for {selectedSubject} in {selectedYear}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-gray-400">No past question paper found for {selectedSubject} in {selectedYear}.</p>
                        <p className="text-sm text-gray-500">Please select another subject or year.</p>
                    </div>
                )}
            </Card>
             <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
        </div>
    );
};

export default BECEPastQuestionsView;
