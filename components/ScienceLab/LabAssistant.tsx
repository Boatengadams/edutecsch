
import React, { useState } from 'react';
import { LabType, LabLevel } from '../../types';
import { GoogleGenAI } from '@google/genai';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

interface LabAssistantProps {
    activeLab: LabType;
    level: LabLevel;
}

const LabAssistant: React.FC<LabAssistantProps> = ({ activeLab, level }) => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAsk = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                You are a smart lab assistant in a virtual ${level} school science lab.
                Current Lab: ${activeLab}.
                User Query: "${query}"
                
                Provide a short, helpful, and scientifically accurate answer. 
                If the user is asking about an experiment, give a safety tip first.
                Keep it under 60 words.
            `;
            
            const res = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            
            setResponse(res.text);
        } catch (err) {
            setResponse("I'm having trouble connecting to the science database right now.");
        } finally {
            setIsLoading(false);
            setQuery('');
        }
    };

    const suggestions = [
        "What happens if I mix Acid and Base?",
        "How do I use the microscope?",
        "Explain Ohm's Law.",
        "What safety gear do I need?"
    ];

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl shadow-lg shadow-blue-500/20 animate-pulse">
                    🤖
                </div>
                <div>
                    <h3 className="font-bold text-white">Lab Partner</h3>
                    <p className="text-xs text-blue-400">AI-Powered Support</p>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto mb-4 space-y-4 custom-scrollbar">
                {response ? (
                    <div className="bg-slate-800/80 p-4 rounded-tl-xl rounded-tr-xl rounded-br-xl border border-slate-700 text-sm leading-relaxed text-slate-200 shadow-sm animate-fade-in-up">
                        {response}
                    </div>
                ) : (
                    <div className="text-center mt-10">
                        <p className="text-slate-500 text-sm mb-4">Ask me anything about your experiment!</p>
                        <div className="space-y-2">
                            {suggestions.map((s, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => { setQuery(s); handleAsk(); }}
                                    className="block w-full p-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors text-left"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleAsk} className="relative">
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a question..."
                    className="w-full p-3 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                    {isLoading ? <Spinner /> : '➤'}
                </button>
            </form>
        </div>
    );
};

export default LabAssistant;
