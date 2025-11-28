
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
    
    // State to track which answers are revealed
    const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

    const paper = useMemo(() => {
        return beceQuestions.find(p => p.year === selectedYear && p.subject === selectedSubject);
    }, [selectedYear, selectedSubject]);

    const objectiveSections = useMemo(() => 
        paper ? paper.sections.filter(s => s.title.toUpperCase().includes('OBJECTIVE') || s.title.toUpperCase().includes('PAPER 1')) : [], 
    [paper]);

    const theorySections = useMemo(() => 
        paper ? paper.sections.filter(s => !s.title.toUpperCase().includes('OBJECTIVE') && !s.title.toUpperCase().includes('PAPER 1')) : [], 
    [paper]);

    useEffect(() => {
        if (objectiveSections.length > 0 && theorySections.length === 0) {
            setActivePaper('Objective');
        } else if (theorySections.length > 0 && objectiveSections.length === 0) {
            setActivePaper('Theory');
        } else {
             // Default preference
             setActivePaper('Objective');
        }
        // Reset revealed answers when paper changes
        setRevealedAnswers({});
    }, [paper, objectiveSections, theorySections]);

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
            `Explain the answer to question 1.`,
            `Give me another example similar to this question.`,
            `Kofi, kyerɛkyerɛ saa asɛm yi mu kɔ akyiri.`,
            `What topic is this question related to?`
        ];
        setAiSuggestedPrompts(prompts);
    }, [selectedYear, selectedSubject]);

    const toggleAnswer = (id: string) => {
        setRevealedAnswers(prev => ({...prev, [id]: !prev[id]}));
    };

    const sectionsToRender = activePaper === 'Objective' ? objectiveSections : theorySections;

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header Controls */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md rounded-xl">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="bg-blue-600 text-xs px-2 py-1 rounded">BECE</span> 
                            Past Questions Portal
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center lg:justify-end">
                        <select
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="p-2 bg-slate-800 rounded-lg border border-slate-700 focus:ring-2 focus:ring-blue-500 text-sm text-slate-200"
                        >
                            {BECE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                             className="w-24 p-2 bg-slate-800 rounded-lg border border-slate-700 focus:ring-2 focus:ring-blue-500 text-sm text-slate-200"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                             <button
                                onClick={() => setActivePaper('Objective')}
                                disabled={objectiveSections.length === 0}
                                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activePaper === 'Objective' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                            >
                                Objective
                            </button>
                             <button
                                onClick={() => setActivePaper('Theory')}
                                disabled={theorySections.length === 0}
                                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activePaper === 'Theory' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                            >
                                Theory
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow">
                {paper ? (
                    <div className="space-y-6 pb-10">
                         {sectionsToRender.length > 0 ? (
                            sectionsToRender.map((section, secIndex) => (
                                <div key={secIndex} className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
                                    {/* Section Header */}
                                    <div className="bg-slate-900/90 p-3 border-b border-slate-700 flex justify-between items-center sticky top-[76px] z-20 backdrop-blur-md">
                                        <div>
                                            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">{section.title}</h3>
                                            {section.instructions && (
                                                <p className="text-xs text-slate-400 mt-0.5">{section.instructions}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700 whitespace-nowrap">
                                            {section.marks} Marks
                                        </span>
                                    </div>

                                    {/* Questions List */}
                                    <div className="divide-y divide-slate-700/50 bg-slate-800/20">
                                        {section.questions.map((q, qIndex) => {
                                            const questionId = `${section.title}-${q.number}`;
                                            const isRevealed = revealedAnswers[questionId];

                                            return (
                                                <div key={qIndex} className="p-4 hover:bg-slate-800/40 transition-colors group">
                                                    <div className="flex gap-3 items-start">
                                                        {/* Question Number */}
                                                        <div className="flex-shrink-0 w-6 pt-0.5">
                                                            <span className="font-bold text-slate-400 text-sm">{q.number}.</span>
                                                        </div>
                                                        
                                                        <div className="flex-grow min-w-0">
                                                            {/* Main Question Text */}
                                                            <div className="prose-styles prose-invert text-[15px] text-slate-200 leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                            
                                                            {/* Main Diagram */}
                                                            {q.diagramId && beceDiagrams[q.diagramId] && (
                                                                <div className="my-3 bg-white rounded-lg p-2 inline-block max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: beceDiagrams[q.diagramId] }} />
                                                            )}
                                                            
                                                            {/* Objective Options - Grid Layout */}
                                                            {q.options && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                                                    {q.options.map(opt => (
                                                                        <div key={opt.key} className={`flex items-center px-3 py-2 rounded border transition-all ${isRevealed && q.answer?.includes(opt.key) ? 'bg-green-900/20 border-green-500/40' : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600'}`}>
                                                                            <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold mr-3 ${isRevealed && q.answer?.includes(opt.key) ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                                                {opt.key}
                                                                            </span>
                                                                            <span className={`text-sm ${isRevealed && q.answer?.includes(opt.key) ? 'text-green-300 font-medium' : 'text-slate-300'}`}>{opt.text}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Theory Sub-questions */}
                                                            {q.sub_questions && (
                                                                <div className="space-y-3 mb-3">
                                                                    {q.sub_questions.map((sub, subIndex) => (
                                                                        <div key={subIndex} className="pl-0">
                                                                            <div className="flex gap-2 mb-1">
                                                                                <span className="text-sm font-medium text-blue-300 flex-shrink-0">{sub.number}</span>
                                                                                <div className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: sub.text }} />
                                                                            </div>
                                                                             {sub.diagramId && beceDiagrams[sub.diagramId] && (
                                                                                <div className="my-2 bg-white p-1 rounded inline-block max-w-full" dangerouslySetInnerHTML={{ __html: beceDiagrams[sub.diagramId] }} />
                                                                            )}
                                                                            {/* Standard Answer */}
                                                                            {isRevealed && sub.answer && (
                                                                                 <div className="mt-1 ml-6 p-2 bg-blue-900/10 rounded border-l-2 border-blue-500/30 text-sm text-blue-100">
                                                                                     <div dangerouslySetInnerHTML={{ __html: sub.answer.replace(/<div class="diagram-container" data-diagramid="([^"]*)"><\/div>/g, (match, p1) => beceDiagrams[p1] || '') }} />
                                                                                 </div>
                                                                            )}
                                                                            
                                                                            {/* Sub-parts (e.g. i, ii, iii) */}
                                                                            {sub.sub_parts && (
                                                                                <div className="mt-2 space-y-2 ml-4 border-l border-slate-700 pl-3">
                                                                                    {sub.sub_parts.map((part, partIndex) => (
                                                                                        <div key={partIndex}>
                                                                                            <div className="flex gap-2 mb-1">
                                                                                                <span className="text-xs font-bold text-slate-400 flex-shrink-0">{part.number}</span>
                                                                                                <div className="text-xs text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: part.text }} />
                                                                                            </div>
                                                                                            {isRevealed && part.answer && (
                                                                                                <div className="mt-1 ml-6 p-2 bg-green-900/20 rounded border-l-2 border-green-500/30 text-xs text-green-200">
                                                                                                    <div dangerouslySetInnerHTML={{ __html: part.answer }} />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Answer Controls */}
                                                            <div className="flex items-center">
                                                                <button 
                                                                    onClick={() => toggleAnswer(questionId)}
                                                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors py-1 px-2 rounded hover:bg-blue-900/20 -ml-2"
                                                                >
                                                                    {isRevealed ? (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745A10.029 10.029 0 0 0 18 10c0-4.758-5.5-8-8-8a9.98 9.98 0 0 0-4.686 1.166L3.28 2.22ZM7.875 9.879a3 3 0 0 0 4.246 4.246l-4.246-4.246ZM10 5.996c-1.779 0-3.363.52-4.73 1.413L3.818 5.958A9.98 9.98 0 0 1 10 2a9.98 9.98 0 0 1 8 8c0 .52-.055 1.028-.16 1.518l-1.562-1.562A5.988 5.988 0 0 0 10 5.996Z" clipRule="evenodd" /></svg>
                                                                            Hide Answer
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                                                                            Check Answer
                                                                        </>
                                                                    )}
                                                                </button>
                                                                
                                                                {/* Simple correct answer text for non-subquestion types */}
                                                                {isRevealed && q.answer && !q.sub_questions && (
                                                                    <span className="ml-3 text-sm font-medium text-green-400 animate-fade-in-short">
                                                                        Correct Answer: <strong>{q.answer}</strong>
                                                                    </span>
                                                                )}
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                                <p className="text-gray-400 text-lg">No {activePaper} questions found for {selectedSubject} in {selectedYear}.</p>
                                <p className="text-sm text-gray-500 mt-2">Try checking the other paper type or a different year.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl opacity-50">📚</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Select a Paper</h3>
                        <p className="text-gray-400">Choose a subject and year from the top bar to begin studying.</p>
                    </div>
                )}
            </div>
             <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
        </div>
    );
};

export default BECEPastQuestionsView;
