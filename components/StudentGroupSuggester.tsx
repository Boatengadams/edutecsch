import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import Button from './common/Button';
import { db } from '../services/firebase';
// FIX: Import Spinner component to resolve 'Cannot find name' error.
import Spinner from './common/Spinner';

type GroupingStrategy = 'random' | 'mixed-academic' | 'similar-academic' | 'diverse-style' | 'similar-style';

const LEARNING_STYLES: UserProfile['learningStyle'][] = ['visual', 'auditory', 'kinesthetic', 'reading/writing'];

interface StudentGroupSuggesterProps {
    students: UserProfile[];
    userProfile: UserProfile;
}

const StudentGroupSuggester: React.FC<StudentGroupSuggesterProps> = ({ students: allStudents, userProfile }) => {
    const [selectedClass, setSelectedClass] = useState(userProfile.classesTaught?.[0] || '');
    const [numGroups, setNumGroups] = useState(3);
    const [strategy, setStrategy] = useState<GroupingStrategy>('random');
    const [generatedGroups, setGeneratedGroups] = useState<UserProfile[][] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const teacherClasses = useMemo(() => Array.from(new Set([
        ...(userProfile.classesTaught || []),
        ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : []),
    ])), [userProfile]);

    const handleGenerateGroups = async () => {
        setIsLoading(true);
        setError('');
        setGeneratedGroups(null);

        const studentsInClass = allStudents.filter(s => s.class === selectedClass);
        if (studentsInClass.length < numGroups) {
            setError('Number of groups cannot be more than the number of students.');
            setIsLoading(false);
            return;
        }

        let sortedStudents = [...studentsInClass];

        if (strategy === 'mixed-academic' || strategy === 'similar-academic') {
            // This is a simplified academic performance metric. A real-world scenario would be more complex.
            const submissions = await db.collection('submissions').where('classId', '==', selectedClass).get();
            const studentScores: { [uid: string]: { total: number, count: number } } = {};
            
            submissions.docs.forEach(doc => {
                const sub = doc.data();
                if (sub.grade && sub.grade.includes('/')) {
                    const [score, max] = sub.grade.split('/').map(Number);
                    if (!isNaN(score) && !isNaN(max) && max > 0) {
                        if (!studentScores[sub.studentId]) studentScores[sub.studentId] = { total: 0, count: 0 };
                        studentScores[sub.studentId].total += (score / max);
                        studentScores[sub.studentId].count++;
                    }
                }
            });

            sortedStudents.sort((a, b) => {
                const avgA = studentScores[a.uid] ? studentScores[a.uid].total / studentScores[a.uid].count : 0;
                const avgB = studentScores[b.uid] ? studentScores[b.uid].total / studentScores[b.uid].count : 0;
                return avgB - avgA; // Sort descending by average score
            });

            if (strategy === 'similar-academic') {
                // For similar academic grouping, just chunk the sorted list.
                // This is already the default behavior after sorting.
            }

        } else if (strategy === 'diverse-style' || strategy === 'similar-style') {
             // Simulate learning styles as they are not in the DB
            sortedStudents.forEach(s => {
                if (!s.learningStyle) {
                    s.learningStyle = LEARNING_STYLES[Math.floor(Math.random() * LEARNING_STYLES.length)];
                }
            });
            if (strategy === 'similar-style') {
                sortedStudents.sort((a, b) => (a.learningStyle || '').localeCompare(b.learningStyle || ''));
            }
        } else { // random
            sortedStudents.sort(() => Math.random() - 0.5);
        }

        const groups: UserProfile[][] = Array.from({ length: numGroups }, () => []);
        
        if (strategy === 'mixed-academic') { // Snake draft for mixed academic
            let direction = 1;
            let groupIndex = 0;
            sortedStudents.forEach(student => {
                groups[groupIndex].push(student);
                groupIndex += direction;
                if (groupIndex >= numGroups) {
                    direction = -1;
                    groupIndex = numGroups - 1;
                }
                if (groupIndex < 0) {
                    direction = 1;
                    groupIndex = 0;
                }
            });
        } else { // Default chunking for all other strategies
            sortedStudents.forEach((student, index) => {
                groups[index % numGroups].push(student);
            });
        }

        setGeneratedGroups(groups);
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold">Student Group Suggester</h3>
                <p className="text-sm text-gray-400 mt-1">Automatically create student groups based on different strategies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="text-sm">Class</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 mt-1 bg-slate-700 rounded-md">
                        {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-sm">Number of Groups</label>
                    <input type="number" min="1" value={numGroups} onChange={e => setNumGroups(Number(e.target.value))} className="w-full p-2 mt-1 bg-slate-700 rounded-md"/>
                </div>
                 <Button onClick={handleGenerateGroups} disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? <Spinner /> : 'Generate Groups'}
                </Button>
            </div>
            <div>
                <label className="text-sm">Grouping Strategy</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {(['random', 'mixed-academic', 'similar-academic', 'diverse-style', 'similar-style'] as GroupingStrategy[]).map(s => (
                        <button key={s} onClick={() => setStrategy(s)} className={`px-3 py-1 text-xs rounded-full border ${strategy === s ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`}>
                            {s.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            
            {generatedGroups && (
                <div className="pt-6 border-t border-slate-700">
                    <h4 className="text-lg font-bold mb-4">Suggested Groups</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {generatedGroups.map((group, index) => (
                            <div key={index} className="p-4 bg-slate-800 rounded-lg">
                                <h5 className="font-bold border-b border-slate-600 pb-2 mb-2">Group {index + 1}</h5>
                                <ul className="space-y-1 text-sm">
                                    {group.map(student => <li key={student.uid}>{student.name}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentGroupSuggester;