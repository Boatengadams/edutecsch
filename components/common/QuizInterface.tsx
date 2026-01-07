
import React, { useState } from 'react';
import { Assignment, UserProfile, Submission } from '../../types';
import { db, firebase } from '../../services/firebase';
import Card from './Card';
import Button from './Button';
import Spinner from './Spinner';
import { useToast } from './Toast';

interface QuizInterfaceProps {
    assignment: Assignment;
    userProfile: UserProfile;
    onComplete: () => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ assignment, userProfile, onComplete }) => {
    const { showToast } = useToast();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [textAnswer, setTextAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
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
        <Card className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-black mb-1">{assignment.title}</h3>
            <p className="text-slate-500 text-sm mb-6">{assignment.subject}</p>
            
            <div className="space-y-8 mb-10">
                {assignment.type === 'Objective' && assignment.quiz?.quiz.map((q, idx) => (
                    <div key={idx} className="space-y-3">
                        <p className="font-bold text-white"><span className="text-blue-500 mr-2">{idx + 1}.</span> {q.question}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options?.map(opt => (
                                <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${answers[idx] === opt ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                    <input type="radio" name={`q-${idx}`} checked={answers[idx] === opt} onChange={() => setAnswers({...answers, [idx]: opt})} className="sr-only" />
                                    <div className={`w-4 h-4 rounded-full border-2 ${answers[idx] === opt ? 'bg-blue-500 border-blue-400' : 'border-slate-700'}`}></div>
                                    <span className="text-sm font-medium">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}

                {assignment.type === 'Theory' && (
                    <div className="space-y-4">
                        <p className="text-slate-300 leading-relaxed bg-slate-900/50 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">{assignment.description}</p>
                        <textarea 
                            value={textAnswer} 
                            onChange={e => setTextAnswer(e.target.value)} 
                            placeholder="Write your answer here..." 
                            rows={10} 
                            className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 outline-none focus:ring-2 ring-blue-500/30"
                        />
                    </div>
                )}
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 shadow-xl shadow-blue-900/30">
                {isSubmitting ? <Spinner /> : '🚀 Submit Final Answers'}
            </Button>
        </Card>
    );
};

export default QuizInterface;
