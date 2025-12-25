
import React, { useState } from 'react';
import { UserProfile } from '../types';
import Card from './common/Card';
import StudentGroupSuggester from './StudentGroupSuggester';
import LessonPlanGenerator from './LessonPlanGenerator';
import AIQuizGenerator from './AIQuizGenerator';
import AIReportGenerator from './AIReportGenerator';
import AICommunicationHelper from './AICommunicationHelper';

interface TeacherAIToolsProps {
    students: UserProfile[];
    userProfile: UserProfile;
}

type ToolType = 'suggester' | 'planner' | 'quiz' | 'report' | 'email' | null;

const TeacherAITools: React.FC<TeacherAIToolsProps> = ({ students, userProfile }) => {
    const [activeTool, setActiveTool] = useState<ToolType>(null);

    const tools = [
        { id: 'planner', title: 'Lesson Designer', icon: '📝', description: 'Generate comprehensive lesson plans with objectives, activities, and assessment strategies.' },
        { id: 'suggester', title: 'Group Architect', icon: '👥', description: 'Create balanced student groups based on academic performance or randomized diversity.' },
        { id: 'quiz', title: 'Quiz Master', icon: '🧠', description: 'Instantly generate objective or theory quizzes on any topic with answer keys.' },
        { id: 'report', title: 'Report Card Assistant', icon: '📊', description: 'Draft professional, personalized remarks for student report cards based on performance traits.' },
        { id: 'email', title: 'Parent Communicator', icon: '✉️', description: 'Compose professional and diplomatic emails or messages to parents regarding student progress.' },
    ];

    const renderActiveTool = () => {
        switch (activeTool) {
            case 'suggester': return <StudentGroupSuggester students={students} userProfile={userProfile} />;
            case 'planner': return <LessonPlanGenerator userProfile={userProfile} />;
            case 'quiz': return <AIQuizGenerator userProfile={userProfile} />;
            case 'report': return <AIReportGenerator />;
            case 'email': return <AICommunicationHelper />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🤖
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">AI Copilot</h2>
                    <p className="text-sm text-slate-400">Your intelligent teaching assistant suite.</p>
                </div>
            </div>

            {activeTool ? (
                <div className="flex-grow flex flex-col animate-fade-in-up">
                    <button onClick={() => setActiveTool(null)} className="mb-4 self-start flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">
                        ← Back to Tools
                    </button>
                    <Card className="flex-grow overflow-hidden flex flex-col !p-0 bg-slate-900 border-slate-800">
                        <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                             <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                 <span>{tools.find(t => t.id === activeTool)?.icon}</span>
                                 {tools.find(t => t.id === activeTool)?.title}
                             </h3>
                        </div>
                        <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">{renderActiveTool()}</div>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    {tools.map(tool => (
                        <button key={tool.id} onClick={() => setActiveTool(tool.id as ToolType)} className="group relative p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800 hover:border-blue-500/50 transition-all duration-300 text-left flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden">
                            <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
                            <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner border border-slate-600 group-hover:border-blue-500/30">
                                {tool.icon}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{tool.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{tool.description}</p>
                            <div className="mt-auto pt-4 flex items-center text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">Launch Tool →</div>
                        </button>
                    ))}
                    <div className="p-6 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-center opacity-60 cursor-not-allowed">
                        <span className="text-3xl mb-2 grayscale">🚀</span>
                        <h3 className="text-md font-bold text-slate-500">More Coming Soon</h3>
                        <p className="text-xs text-slate-600 mt-1">Grading Assistant & Analytics</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAITools;
