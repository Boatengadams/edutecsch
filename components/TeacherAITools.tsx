import React, { useState } from 'react';
import { UserProfile } from '../types';
import Card from './common/Card';
import StudentGroupSuggester from './StudentGroupSuggester';
import LessonPlanGenerator from './LessonPlanGenerator';

interface TeacherAIToolsProps {
    students: UserProfile[];
    userProfile: UserProfile;
}

const TeacherAITools: React.FC<TeacherAIToolsProps> = ({ students, userProfile }) => {
    const [activeTool, setActiveTool] = useState<'suggester' | 'planner'>('suggester');

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">AI Teacher Tools</h2>
            <Card>
                <div className="flex border-b border-slate-700 mb-6">
                    <button 
                        onClick={() => setActiveTool('suggester')}
                        className={`px-4 py-2 text-sm font-medium ${activeTool === 'suggester' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
                    >
                        Student Group Suggester
                    </button>
                    <button 
                        onClick={() => setActiveTool('planner')}
                        className={`px-4 py-2 text-sm font-medium ${activeTool === 'planner' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
                    >
                        Lesson Plan Generator
                    </button>
                </div>

                <div className="animate-fade-in-short">
                    {activeTool === 'suggester' && <StudentGroupSuggester students={students} userProfile={userProfile} />}
                    {activeTool === 'planner' && <LessonPlanGenerator userProfile={userProfile} />}
                </div>
            </Card>
        </div>
    );
};

export default TeacherAITools;
