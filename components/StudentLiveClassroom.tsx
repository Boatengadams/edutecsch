import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, firebase } from '../services/firebase';
import { LiveLesson, LiveLessonResponse, UserProfile, BreakoutWhiteboard, Stroke, Point } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useLiveLessonAudio } from '../hooks/useLiveLessonAudio';
import TrackedReading from './common/TrackedReading';

interface StudentLiveClassroomProps {
  lessonId: string;
  userProfile: UserProfile;
  onClose: () => void;
}

const StudentLiveClassroom: React.FC<StudentLiveClassroomProps> = ({ lessonId, userProfile, onClose }) => {
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [slideImages, setSlideImages] = useState<Record<string, { imageUrl: string; imageStyle: string }>>({});
  const [loading, setLoading] = useState(true);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [breakoutWhiteboard, setBreakoutWhiteboard] = useState<BreakoutWhiteboard | null>(null);
  
  const [drawColor, setDrawColor] = useState('#3B82F6'); // blue-500
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  
  const reconstructedLesson = useMemo(() => {
    if (!lesson) return null;
    
    const hasImages = Object.keys(slideImages).length > 0;
    if (!hasImages && lesson.lessonPlan.some(step => step.boardContent.includes('<img'))) {
        return lesson;
    }
    if (!hasImages) {
        return lesson;
    }

    const newLessonPlan = lesson.lessonPlan.map((step, index) => {
        const imageData = slideImages[index.toString()];
        if (imageData && !step.boardContent.includes('<img')) {
            const imageHtml = `<div style="text-align: center; margin-top: 1rem;"><img src="${imageData.imageUrl}" alt="Slide Image" style="max-height: 300px; border-radius: 8px; display: inline-block; object-fit: ${imageData.imageStyle || 'contain'};" /></div>`;
            return { ...step, boardContent: step.boardContent + imageHtml };
        }
        return step;
    });

    return {
        ...lesson,
        lessonPlan: newLessonPlan,
        currentBoardContent: newLessonPlan[lesson.currentStepIndex].boardContent,
    };
  }, [lesson, slideImages]);

  const studentRoomId = useMemo(() => {
    if (!lesson?.breakoutRoomsActive || !lesson.breakoutRooms) return null;
    for (const [roomId, roomData] of Object.entries(lesson.breakoutRooms)) {
        // FIX: Cast roomData to its expected type to resolve 'students' property does not exist error.
        if ((roomData as { students: {uid: string, name: string}[] }).students.some(s => s.uid === userProfile.uid)) {
            return roomId;
        }
    }
    return null;
  }, [lesson, userProfile.uid]);

  const isDrawingAllowed = !!(lesson?.whiteboardActive || studentRoomId);

  const { highlightRange } = useLiveLessonAudio(reconstructedLesson, reconstructedLesson?.currentStepIndex ?? 0);

  useEffect(() => {
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    const unsubscribeLesson = lessonRef.onSnapshot(doc => {
      if (doc.exists) {
        const lessonData = { id: doc.id, ...doc.data() } as LiveLesson;
        if (lessonData.status !== 'active') { onClose(); }
        setLesson(lessonData);
        setLoading(false);
      } else {
        onClose();
      }
    });
    
    const imagesRef = lessonRef.collection('images');
    const unsubscribeImages = imagesRef.onSnapshot(snap => {
        const imagesData: Record<string, any> = {};
        snap.forEach(doc => { imagesData[doc.id] = doc.data(); });
        setSlideImages(imagesData);
    });

    const responsesRef = lessonRef.collection('responses').where('studentId', '==', userProfile.uid);
    const unsubscribeResponses = responsesRef.onSnapshot(snap => {
        const answeredIds = new Set<string>();
        snap.forEach(doc => { answeredIds.add(doc.data().questionId); });
        setAnsweredQuestionIds(answeredIds);
    });

    return () => {
      unsubscribeLesson();
      unsubscribeImages();
      unsubscribeResponses();
    };
  }, [lessonId, onClose, userProfile.uid]);

  // Listener for this student's breakout room whiteboard
  useEffect(() => {
    if (!studentRoomId) {
        setBreakoutWhiteboard(null);
        return;
    }
    const unsub = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(studentRoomId)
        .onSnapshot(doc => {
            setBreakoutWhiteboard(doc.exists ? doc.data() as BreakoutWhiteboard : null);
        });
    return () => unsub();
  }, [studentRoomId, lessonId]);
  
  
  const redrawCanvas = useCallback((history: Stroke[] | undefined) => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;

    if (!Array.isArray(history)) {
        return;
    }

    history.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        }
        ctx.stroke();
    });
  }, []);

  useEffect(() => {
    const drawingHistory = studentRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData;
    redrawCanvas(drawingHistory);
  }, [lesson?.drawingData, breakoutWhiteboard, studentRoomId, redrawCanvas]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    
    const observer = new ResizeObserver(() => {
        const history = studentRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData;
        redrawCanvas(history);
    });

    observer.observe(board);
    return () => observer.disconnect();
  }, [lesson?.drawingData, studentRoomId, breakoutWhiteboard, redrawCanvas]);

  const getCoords = (e: React.MouseEvent): Point | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawingAllowed) return;
    isDrawing.current = true;
    const pos = getCoords(e);
    if (!pos) return;
    currentStroke.current = { points: [pos], color: drawColor };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingAllowed || !isDrawing.current || !currentStroke.current) return;
    const pos = getCoords(e);
    if (!pos) return;
    currentStroke.current.points.push(pos);
    const history = (studentRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData);
    const currentHistory = Array.isArray(history) ? history : [];
    redrawCanvas([...currentHistory, currentStroke.current]);
  };

  const handleMouseUp = async () => {
    if (!isDrawingAllowed || !isDrawing.current) return;
    isDrawing.current = false;
    
    if (currentStroke.current && currentStroke.current.points.length > 1) {
        let docRef;
        if (studentRoomId) {
            docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(studentRoomId);
        } else {
            docRef = db.collection('liveLessons').doc(lessonId);
        }
        await docRef.update({
            drawingData: firebase.firestore.FieldValue.arrayUnion(currentStroke.current)
        });
    }
    currentStroke.current = null;
  };
  
  const handleAnswerSubmit = async (answer: string) => {
    if (!lesson || !lesson.currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    const question = lesson.currentQuestion;

    const responseData: Omit<LiveLessonResponse, 'id'> = {
        lessonId,
        studentId: userProfile.uid,
        studentName: userProfile.name,
        questionId: question.id,
        answer,
        isCorrect: answer === question.correctAnswer,
        timestamp: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
    };
    
    try {
        await db.collection('liveLessons').doc(lessonId).collection('responses').add(responseData);
        setAnsweredQuestionIds(prev => new Set(prev).add(question.id));
    } catch (error) {
        console.error("Failed to submit answer:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading || !reconstructedLesson) {
    return <div className="flex justify-center items-center h-full"><Spinner /><p className="ml-4">Joining Classroom...</p></div>;
  }

  const currentQuestion = reconstructedLesson.currentQuestion;
  const hasAnsweredCurrent = currentQuestion ? answeredQuestionIds.has(currentQuestion.id) : true;

  const renderMainContent = () => {
    if (lesson?.screenShareActive) {
        return <div className="w-full h-full bg-black flex items-center justify-center"><img src={`data:image/jpeg;base64,${lesson.screenShareFrame}`} alt="Shared Screen" className="max-w-full max-h-full object-contain" /></div>;
    }
    if (studentRoomId && lesson?.breakoutRooms) {
        const room = lesson.breakoutRooms[studentRoomId];
        return (
            <div className="p-4 flex flex-col h-full">
                <h3 className="text-xl font-bold">Breakout Room: {studentRoomId}</h3>
                <p className="text-sm text-gray-400">Work with your group on the whiteboard.</p>
                <div className="mt-4">
                    <h4 className="font-semibold">Members:</h4>
                    <ul className="list-disc list-inside text-sm">
                        {(room as any).students.map((s: any) => <li key={s.uid}>{s.name} {s.uid === userProfile.uid && '(You)'}</li>)}
                    </ul>
                </div>
            </div>
        );
    }
    return (
        <>
            <h3 className="text-xl font-bold mb-4 flex-shrink-0">On The Board</h3>
            <div className="flex-grow overflow-y-auto bg-slate-900 p-6 rounded-md prose-styles prose-invert relative">
                 <div className="relative z-0">
                    <TrackedReading htmlContent={reconstructedLesson.currentBoardContent} highlightRange={highlightRange} />
                 </div>
            </div>
        </>
    );
  };
  
  const DrawingToolbar = () => {
    if (!isDrawingAllowed) return null;
    const colors = ['#3B82F6', '#EF4444', '#FACC15', '#4ADE80', '#FFFFFF'];
    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded-lg shadow-lg flex items-center gap-1.5 z-20">
            {colors.map(color => (
                <button key={color} onClick={() => setDrawColor(color)} className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/50 rounded-lg">
      <header className="flex-shrink-0 pb-4 mb-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{reconstructedLesson.topic}</h2>
          <p className="text-sm text-gray-400">{reconstructedLesson.subject} by {reconstructedLesson.teacherName}</p>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
        <div className="md:col-span-2 relative h-full">
          <DrawingToolbar />
          <Card className="h-full flex flex-col" fullHeight={false} ref={boardRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
             <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" />
             {renderMainContent()}
          </Card>
           {reconstructedLesson?.pointerPosition && (
                <div className="absolute w-4 h-4 bg-red-500 rounded-full pointer-events-none z-20 shadow-[0_0_8px_4px_rgba(239,68,68,0.7)] transform -translate-x-1/2 -translate-y-1/2" 
                    style={{ left: `${reconstructedLesson.pointerPosition.x * 100}%`, top: `${reconstructedLesson.pointerPosition.y * 100}%`, transition: 'left 0.05s linear, top 0.05s linear' }} 
                />
            )}
        </div>

        <Card className="md:col-span-1 flex flex-col">
          <h3 className="text-xl font-bold mb-4 flex-shrink-0">Your Response</h3>
          <div className="flex-grow overflow-y-auto">
            {currentQuestion ? (
                <div>
                    <p className="font-semibold mb-4">{currentQuestion.text}</p>
                    <div className="space-y-2">
                        {currentQuestion.options.map((option, index) => (
                            <Button key={index} onClick={() => handleAnswerSubmit(option)} disabled={hasAnsweredCurrent || isSubmitting} className="w-full text-left justify-start" variant="secondary">
                                {option}
                            </Button>
                        ))}
                    </div>
                    {hasAnsweredCurrent && <p className="text-sm text-green-400 mt-4 text-center">Your answer has been submitted!</p>}
                </div>
            ) : (
                <p className="text-sm text-gray-400 text-center pt-8">The teacher has not asked a question yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentLiveClassroom;