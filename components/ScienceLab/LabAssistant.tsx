
import React, { useState } from 'react';
import { LabType, LabLevel } from '../../types';
import { GoogleGenAI } from '@google/genai';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

// Dr. Adams Avatar SVG
const ADAMS_SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="90" fill="#f1f5f9" stroke="#475569" stroke-width="4"/>
  <path d="M60 70 Q 100 30 140 70 Q 160 60 170 90 L 160 100" stroke="#1e293b" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M60 70 Q 40 90 30 110" stroke="#1e293b" stroke-width="12" fill="none" stroke-linecap="round"/>
  <g transform="translate(0, 5)">
    <circle cx="70" cy="95" r="18" fill="#ffffff" stroke="#000" stroke-width="3"/>
    <circle cx="130" cy="95" r="18" fill="#ffffff" stroke="#000" stroke-width="3"/>
    <line x1="88" y1="95" x2="112" y2="95" stroke="#000" stroke-width="3"/>
    <line x1="52" y1="95" x2="35" y2="90" stroke="#000" stroke-width="3"/>
    <line x1="148" y1="95" x2="165" y2="90" stroke="#000" stroke-width="3"/>
  </g>
  <circle cx="70" cy="100" r="4" fill="#000"/>
  <circle cx="130" cy="100" r="4" fill="#000"/>
  <path d="M85 140 Q 100 150 115 140" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M40 190 Q 100 210 160 190 L 160 160 Q 100 140 40 160 Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M100 160 L 100 200" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M100 160 L 95 175 L 100 190 L 105 175 Z" fill="#ef4444"/>
</svg>
`;

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
                Act as Dr. Adams, a friendly and expert senior lab technician in a virtual ${level} school science lab.
                Current Lab Context: ${activeLab}.
                User Query: "${query}"
                
                Provide a short, helpful, and scientifically accurate answer. 
                If the user is asking about an experiment, give a safety tip first.
                Keep it under 60 words. Use a supportive tone.
            `;
            
            // FIX: Updated model name to 'gemini-3-flash-preview' for basic text tasks as per guidelines.
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
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
        "How do I use the Potentiometer?",
        "Explain Hooke's Law.",
        "Safety first?",
        "What apparatus do I need?"
    ];

    return (
        <div className="h-full flex flex-col p-4 bg-slate-900">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-4">
                <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 overflow-hidden shadow-lg flex-shrink-0">
                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: ADAMS_SVG }} />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg">Dr. Adams</h3>
                    <p className="text-xs text-blue-400 font-medium">Senior Lab Technician</p>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto mb-4 space-y-4 custom-scrollbar">
                {!response && (
                    <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl rounded-tl-none text-xs text-blue-200 leading-relaxed">
                        Hello! I'm Dr. Adams. I'm here to guide you through your experiments. Need help setting up the apparatus?
                    </div>
                )}
                
                {response ? (
                    <div className="bg-slate-800/80 p-4 rounded-xl rounded-tl-none border border-slate-700 text-sm leading-relaxed text-slate-200 shadow-sm animate-fade-in-up">
                        {response}
                    </div>
                ) : (
                    <div className="mt-6">
                        <p className="text-slate-500 text-xs mb-3 uppercase font-bold tracking-wider">Suggested Questions</p>
                        <div className="space-y-2">
                            {suggestions.map((s, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => { setQuery(s); handleAsk(); }}
                                    className="block w-full p-2.5 text-xs bg-slate-800 hover:bg-slate-700 hover:border-blue-500/50 text-slate-300 rounded-lg border border-slate-700 transition-all text-left"
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
                    placeholder="Ask Dr. Adams..."
                    className="w-full p-3 pr-10 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-500"
                />
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 p-1 transition-colors"
                >
                    {isLoading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" /></svg>}
                </button>
            </form>
        </div>
    );
};

export default LabAssistant;
