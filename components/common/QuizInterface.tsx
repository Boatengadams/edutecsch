import React, { useState } from 'react';
import { Assignment, UserProfile, Submission } from '../../types';
import { db, firebase } from '../../services/firebase';
import Card from './Card';
import Button from './Button';
import Spinner from './Spinner';
import { useToast } from './Toast';

interface QuizInterfaceProps {
    assignment: Assignment;
    userProfile?: UserProfile;
    onComplete?: () => void;
    readOnly?: boolean;
    showCorrectAnswers?: boolean;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ 
    assignment, 
    userProfile, 
    onComplete, 
    readOnly = false,
    showCorrectAnswers = false
}) => {
    const { showToast } = useToast();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [textAnswer, setTextAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (readOnly) return;
        if (!userProfile || !onComplete) return;

        setIsSubmitting(true);
        try {
            const submission: Omit<Submission, 'id'> = {
                assignmentId: assignment.id,
                studentId: userProfile.uid,
                studentName: userProfile.name,
                teacherId: assignment.teacherId,
                classId: assignment.classId,
                text: textAnswer,
                answers: answers,
                attachmentURL: '',
                attachmentName: '',
                submittedAt: firebase.firestore.Timestamp.now(),
                status: 'Submitted'
            };
            await db.collection('submissions').add(submission);
            showToast("Work submitted successfully!", "success");
            onComplete();
        } catch (e: any) {
            showToast(e.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <header className="space-y-2">
                <h3 className="text-3xl font-black text-white leading-tight">{assignment.title}</h3>
                <div className="flex flex-wrap gap-3">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 uppercase tracking-widest border border-blue-500/20">{assignment.subject}</span>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 uppercase tracking-widest border border-white/5">{assignment.type}</span>
                </div>
            </header>
            
            <div className="space-y-8">
                {assignment.type === 'Objective' && assignment.quiz?.quiz.map((q, idx) => (
                    <Card key={idx} className="!bg-slate-900/40 border-white/5">
                        <div className="space-y-4">
                            <p className="font-bold text-lg text-slate-200"><span className="text-blue-500 mr-2">{idx + 1}.</span> {q.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {q.options?.map(opt => {
                                    const isCorrect = showCorrectAnswers && opt === q.correctAnswer;
                                    const isSelected = answers[idx] === opt;
                                    
                                    return (
                                        <label 
                                            key={opt} 
                                            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                                readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-800'
                                            } ${
                                                isCorrect ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                                                isSelected ? 'bg-blue-600/20 border-blue-500 text-white' : 
                                                'bg-slate-950/50 border-white/5 text-slate-400'
                                            }`}
                                        >
                                            <input 
                                                type="radio" 
                                                name={`q-${idx}`} 
                                                checked={isSelected} 
                                                onChange={() => !readOnly && setAnswers({...answers, [idx]: opt})} 
                                                className="sr-only" 
                                                disabled={readOnly}
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                isCorrect ? 'bg-emerald-500 border-emerald-400' :
                                                isSelected ? 'bg-blue-500 border-blue-400' : 
                                                'border-slate-700'
                                            }`}>
                                                {isCorrect && <span className="text-[10px] text-white">✓</span>}
                                                {isSelected && !isCorrect && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                            </div>
                                            <span className="text-sm font-semibold">{opt}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {showCorrectAnswers && q.explanation && (
                                <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Teacher Explanation</p>
                                    <p className="text-xs text-slate-400 italic">{q.explanation}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}

                {assignment.type === 'Theory' && (
                    <div className="space-y-6">
                        <Card className="!bg-slate-900/40 border-white/5">
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                                {assignment.description}
                            </p>
                        </Card>
                        
                        {!readOnly && (
                            <textarea 
                                value={textAnswer} 
                                onChange={e => setTextAnswer(e.target.value)} 
                                placeholder="Compose your response here..." 
                                rows={10} 
                                className="w-full p-6 bg-slate-900 border border-white/10 rounded-3xl outline-none focus:ring-4 ring-blue-500/10 text-white transition-all resize-none shadow-inner"
                            />
                        )}
                        
                        {showCorrectAnswers && assignment.quiz?.quiz[0]?.correctAnswer && (
                            <Card className="!bg-emerald-500/5 border-emerald-500/20">
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Model Solution / Key Points</h4>
                                <div className="text-sm text-slate-300 whitespace-pre-wrap">{assignment.quiz.quiz[0].correctAnswer}</div>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {!readOnly && (
                <div className="pt-6">
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 text-sm">
                        {isSubmitting ? <Spinner /> : '🚀 Deploy Submission to Vault'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default QuizInterface;