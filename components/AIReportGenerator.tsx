
import React, { useState } from 'react';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GoogleGenAI } from '@google/genai';
import { useToast } from './common/Toast';

const AIReportGenerator: React.FC = () => {
    const { showToast } = useToast();
    const [studentName, setStudentName] = useState('');
    const [gender, setGender] = useState('Male');
    const [performance, setPerformance] = useState('Excellent');
    const [attitude, setAttitude] = useState('');
    const [keyTraits, setKeyTraits] = useState('');
    
    const [generatedRemark, setGeneratedRemark] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!studentName.trim()) {
            showToast("Please enter a student name.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Write a professional report card remark for a student named ${studentName} (${gender}).
            
            Academic Performance: ${performance}
            Attitude/Behavior: ${attitude}
            Key Traits/Observations: ${keyTraits}
            
            The remark should be concise (2-4 sentences), constructive, and encouraging. Avoid repetition. Use professional educational language.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            setGeneratedRemark(response.text);
        } catch (err) {
            console.error(err);
            showToast("Failed to generate remark.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedRemark);
        showToast("Remark copied!", "success");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-400 mb-1">Student Name</label>
                        <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Kofi Mensah" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Academic Performance</label>
                    <select value={performance} onChange={e => setPerformance(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none">
                        <option value="Excellent">Excellent / High Achiever</option>
                        <option value="Good">Good / Above Average</option>
                        <option value="Average">Average / Consistent</option>
                        <option value="Struggling">Struggling / Needs Support</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Attitude / Behavior</label>
                    <input type="text" value={attitude} onChange={e => setAttitude(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500" placeholder="e.g. Respectful, Talkative, Leadership skills" />
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Specific Traits (Optional)</label>
                    <textarea rows={2} value={keyTraits} onChange={e => setKeyTraits(e.target.value)} className="w-full p-3 bg-slate-700 rounded-xl border border-slate-600 outline-none focus:border-blue-500 resize-none" placeholder="e.g. Good at math, needs to improve handwriting..." />
                </div>

                <Button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 text-lg shadow-lg shadow-purple-600/20 bg-gradient-to-r from-purple-600 to-blue-600">
                    {isLoading ? <Spinner /> : 'Generate Remark'}
                </Button>
            </div>

            <div className="flex flex-col h-full">
                 <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex-grow flex flex-col relative">
                    <div className="absolute top-4 right-4">
                         <button onClick={handleCopy} disabled={!generatedRemark} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors disabled:opacity-50" title="Copy">
                            📋
                        </button>
                    </div>
                    <h4 className="font-bold text-slate-300 mb-4">Generated Remark</h4>
                    <div className="flex-grow flex items-center justify-center">
                        {generatedRemark ? (
                            <p className="text-lg text-white leading-relaxed italic">"{generatedRemark}"</p>
                        ) : (
                            <div className="text-center text-slate-600">
                                <span className="text-4xl block mb-2 opacity-30">✍️</span>
                                <p>Fill the form to generate a professional remark.</p>
                            </div>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default AIReportGenerator;
