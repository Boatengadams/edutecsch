
import React, { useState } from 'react';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GoogleGenAI } from '@google/genai';
import { useToast } from './common/Toast';

const AICommunicationHelper: React.FC = () => {
    const { showToast } = useToast();
    const [recipientType, setRecipientType] = useState('Parent');
    const [recipientName, setRecipientName] = useState('');
    const [topic, setTopic] = useState('');
    const [keyPoints, setKeyPoints] = useState('');
    const [tone, setTone] = useState('Professional');
    const [medium, setMedium] = useState('Email');
    
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            showToast("Please enter a topic.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Draft a ${tone.toLowerCase()} ${medium} to a ${recipientType} named ${recipientName || '[Name]'}.
            
            Topic: ${topic}
            Key Points to Include: ${keyPoints}
            
            Ensure the language is appropriate for a school setting. If it's a WhatsApp message, keep it brief. If it's an email, include a subject line.`;

            // FIX: Updated model name to 'gemini-3-flash-preview' for basic text tasks as per guidelines.
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });

            setGeneratedMessage(response.text);
        } catch (err) {
            console.error(err);
            showToast("Failed to generate message.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedMessage);
        showToast("Message copied!", "success");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Recipient</label>
                        <select value={recipientType} onChange={e => setRecipientType(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none">
                            <option>Parent</option>
                            <option>Student</option>
                            <option>Colleague</option>
                            <option>Headmaster</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Format</label>
                        <select value={medium} onChange={e => setMedium(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none">
                            <option>Email</option>
                            <option>WhatsApp / SMS</option>
                            <option>Formal Letter</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Recipient Name (Optional)</label>
                    <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Mrs. Owusu" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Topic / Subject</label>
                    <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Late arrival, Outstanding performance" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Key Points to Mention</label>
                    <textarea rows={3} value={keyPoints} onChange={e => setKeyPoints(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500 resize-none" placeholder="e.g. Missed 3 days, needs medical report..." />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Tone</label>
                    <div className="flex bg-slate-700 rounded-xl p-1">
                        {['Professional', 'Friendly', 'Urgent', 'Stern'].map(t => (
                            <button key={t} onClick={() => setTone(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tone === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>{t}</button>
                        ))}
                    </div>
                </div>

                <Button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 text-lg shadow-lg shadow-green-600/20 bg-gradient-to-r from-green-600 to-teal-600">
                    {isLoading ? <Spinner /> : 'Draft Message'}
                </Button>
            </div>

            <div className="flex flex-col h-full">
                 <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex-grow flex flex-col relative">
                    <div className="absolute top-4 right-4">
                         <button onClick={handleCopy} disabled={!generatedMessage} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors disabled:opacity-50" title="Copy">
                            📋
                        </button>
                    </div>
                    <h4 className="font-bold text-slate-300 mb-4">Draft</h4>
                    <div className="flex-grow bg-white text-slate-800 rounded-xl p-6 overflow-y-auto shadow-inner font-serif whitespace-pre-wrap">
                        {generatedMessage || <span className="text-slate-400 italic font-sans">Message draft will appear here...</span>}
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default AICommunicationHelper;
