import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

interface LabAssistantProps {
    activeLab: string;
    level: string;
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

    return (
        <div className="h-full flex flex-col p-8 bg-slate-900/50 backdrop-blur-3xl">
            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-white/5">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-4xl shadow-2xl border-2 border-white/20">👨‍🔬</div>
                <div>
                    <h3 className="font-black text-white text-2xl tracking-tighter uppercase">Dr. Adams</h3>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em] mt-1">Senior Technical Intelligence</p>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto mb-10 space-y-6 custom-scrollbar pr-4">
                {!response && (
                    <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] rounded-tl-none text-sm text-blue-200 leading-relaxed italic">
                        "Ready to explore the ${activeLab}? Ask me about the apparatus or safety protocols."
                    </div>
                )}
                
                {response && (
                    <div className="bg-slate-800/80 p-6 rounded-[2rem] rounded-tl-none border border-white/5 text-sm leading-relaxed text-slate-200 shadow-3xl animate-fade-in-up">
                        <p className="font-bold text-blue-400 uppercase text-[10px] mb-3 tracking-widest">Scientific Briefing:</p>
                        {response}
                    </div>
                )}
            </div>

            <form onSubmit={handleAsk} className="relative group">
                <div className="absolute inset-0 bg-blue-500/5 blur-xl group-focus-within:bg-blue-500/10 transition-all rounded-2xl"></div>
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Brief Dr. Adams..."
                    className="relative w-full p-5 bg-slate-950/80 border border-white/10 rounded-2xl text-sm outline-none focus:ring-2 ring-blue-500/30 text-white placeholder-slate-700 font-medium"
                />
                <button type="submit" disabled={isLoading} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-white p-2 transition-colors">
                    {isLoading ? <Spinner /> : '🚀'}
                </button>
            </form>
        </div>
    );
};

export default LabAssistant;