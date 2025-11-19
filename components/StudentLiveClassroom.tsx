
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, firebase } from '../services/firebase';
import { LiveLesson, LiveLessonResponse, UserProfile, BreakoutWhiteboard, DrawingElement, Point, DrawingToolType } from '../types';
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
  
  // Drawing State
  const [toolMode, setToolMode] = useState<DrawingToolType | 'none'>('pen');
  const [drawColor, setDrawColor] = useState('#3B82F6'); // blue-500
  const [textInput, setTextInput] = useState<{ x: number, y: number, text: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const currentElement = useRef<DrawingElement | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<UserProfile | null>(null);
  
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
        if ((roomData as { students: {uid: string, name: string}[] }).students.some(s => s.uid === userProfile.uid)) {
            return roomId;
        }
    }
    return null;
  }, [lesson, userProfile.uid]);

  const isDrawingAllowed = !!(lesson?.whiteboardActive || studentRoomId);

  const htmlContent = reconstructedLesson?.lessonPlan[reconstructedLesson.currentStepIndex]?.boardContent;
  useLiveLessonAudio(htmlContent, teacherProfile);

  useEffect(() => {
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    const unsubscribeLesson = lessonRef.onSnapshot(doc => {
      if (doc.exists) {
        const lessonData = { id: doc.id, ...doc.data() } as LiveLesson;
        if (lessonData.status !== 'active' && lessonData.status !== 'starting') { 
            onClose(); 
        }
        setLesson(lessonData);
        setLoading(false);

        if (!teacherProfile && lessonData.teacherId) {
            db.collection('users').doc(lessonData.teacherId).get().then(teacherDoc => {
                if (teacherDoc.exists) {
                    setTeacherProfile(teacherDoc.data() as UserProfile);
                }
            });
        }
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
  }, [lessonId, onClose, userProfile.uid, teacherProfile]);

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
  
  
  const redrawCanvas = useCallback((history: DrawingElement[] | undefined) => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;

    const elementsToDraw = history || [];

    const renderElement = (el: DrawingElement) => {
        ctx.strokeStyle = el.color;
        ctx.fillStyle = el.color;
        ctx.lineWidth = el.type === 'eraser' ? 20 : 4;
        
        if (el.type === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        if (el.type === 'pen' || el.type === 'eraser') {
            if (!el.points || el.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(el.points[0].x * width, el.points[0].y * height);
            for (let i = 1; i < el.points.length; i++) {
                ctx.lineTo(el.points[i].x * width, el.points[i].y * height);
            }
            ctx.stroke();
        } else if (el.type === 'rect') {
            if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
                ctx.strokeRect(el.x * width, el.y * height, el.width * width, el.height * height);
            }
        } else if (el.type === 'circle') {
             if (el.x !== undefined && el.y !== undefined && el.width !== undefined) {
                ctx.beginPath();
                const r = Math.abs(el.width * width) / 2;
                const cx = (el.x * width) + (el.width * width) / 2;
                const cy = (el.y * height) + (el.height * height) / 2;
                ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                ctx.stroke();
             }
        } else if (el.type === 'text') {
             if (el.x !== undefined && el.y !== undefined && el.text) {
                 ctx.font = 'bold 20px sans-serif';
                 ctx.fillText(el.text, el.x * width, el.y * height);
             }
        }
        ctx.globalCompositeOperation = 'source-over';
    };

    elementsToDraw.forEach(renderElement);
    if (isDrawing.current && currentElement.current) {
        renderElement(currentElement.current);
    }
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
    const pos = getCoords(e);
    if (!pos) return;

    if (toolMode === 'text') {
        setTextInput({ x: pos.x, y: pos.y, text: '' });
        return;
    }

    isDrawing.current = true;
    if (toolMode === 'pen' || toolMode === 'eraser') {
        currentElement.current = { type: toolMode, points: [pos], color: drawColor, id: Date.now().toString() };
    } else if (toolMode === 'rect' || toolMode === 'circle') {
        currentElement.current = { type: toolMode, x: pos.x, y: pos.y, width: 0, height: 0, color: drawColor, id: Date.now().toString() };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingAllowed || !isDrawing.current || !currentElement.current) return;
    const pos = getCoords(e);
    if (!pos) return;
    
    if (toolMode === 'pen' || toolMode === 'eraser') {
         currentElement.current.points?.push(pos);
    } else if (toolMode === 'rect' || toolMode === 'circle') {
         currentElement.current.width = pos.x - (currentElement.current.x || 0);
         currentElement.current.height = pos.y - (currentElement.current.y || 0);
    }
    
    const history = (studentRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData);
    redrawCanvas(history);
  };

  const handleMouseUp = async () => {
    if (!isDrawingAllowed || !isDrawing.current || !currentElement.current) return;
    isDrawing.current = false;
    
    // Basic validation
    let isValid = false;
    if ((toolMode === 'pen' || toolMode === 'eraser') && (currentElement.current.points?.length || 0) > 1) isValid = true;
    if ((toolMode === 'rect' || toolMode === 'circle') && (Math.abs(currentElement.current.width || 0) > 0.01)) isValid = true;
    
    if (isValid) {
        let docRef;
        if (studentRoomId) {
            docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(studentRoomId);
        } else {
            docRef = db.collection('liveLessons').doc(lessonId);
        }
        await docRef.update({
            drawingData: firebase.firestore.FieldValue.arrayUnion(currentElement.current)
        });
    }
    currentElement.current = null;
  };
  
  const handleTextSubmit = async () => {
      if (!textInput || !textInput.text.trim()) {
          setTextInput(null);
          return;
      }
      const textElement: DrawingElement = {
          id: Date.now().toString(),
          type: 'text',
          x: textInput.x,
          y: textInput.y,
          text: textInput.text,
          color: drawColor,
          height: 0.05
      };
      
      let docRef;
      if (studentRoomId) {
          docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(studentRoomId);
      } else {
          // Students typically can't draw on main board unless explicitly allowed, but here we assume logic holds
          docRef = db.collection('liveLessons').doc(lessonId);
      }
      await docRef.update({
          drawingData: firebase.firestore.FieldValue.arrayUnion(textElement)
      });
      setTextInput(null);
  };
  
  const handleUndo = async () => {
      const currentData = studentRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData;
      if (!currentData || currentData.length === 0) return;
      
      const newData = currentData.slice(0, -1);
      let docRef;
      if (studentRoomId) {
          docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(studentRoomId);
      } else {
          docRef = db.collection('liveLessons').doc(lessonId);
      }
      await docRef.update({ drawingData: newData });
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
  
    if (reconstructedLesson.status === 'starting') {
        return (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col justify-center items-center">
                <Spinner />
                <h2 className="text-2xl font-bold mt-4">Lesson is starting...</h2>
                <p className="mt-2 text-gray-400">Loading lesson content, please wait.</p>
            </div>
        );
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
                    <TrackedReading htmlContent={reconstructedLesson.currentBoardContent} />
                 </div>
            </div>
        </>
    );
  };
  
  const DrawingToolbar = () => {
    if (!isDrawingAllowed) return null;
    // Only show tools if in breakout room, usually students only watch the main board.
    if (!studentRoomId) return null;

    const colors = ['#3B82F6', '#EF4444', '#FACC15', '#4ADE80', '#FFFFFF'];
    const canUndo = (breakoutWhiteboard?.drawingData?.length || 0) > 0;

    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded-lg shadow-lg flex items-center gap-1.5 z-20">
            {toolMode !== 'eraser' && (
                <>
                    {colors.map(color => (
                        <button key={color} onClick={() => setDrawColor(color)} className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                    <div className="w-px h-6 bg-slate-600 mx-1"></div>
                </>
            )}
             <Button size="sm" variant="secondary" onClick={() => setToolMode(toolMode === 'pen' ? 'none' : 'pen')} className={toolMode === 'pen' ? '!bg-blue-600' : ''} title="Pen">✏️</Button>
             <Button size="sm" variant="secondary" onClick={() => setToolMode(toolMode === 'eraser' ? 'none' : 'eraser')} className={toolMode === 'eraser' ? '!bg-blue-600' : ''} title="Eraser">🧹</Button>
             <Button size="sm" variant="secondary" onClick={() => setToolMode(toolMode === 'rect' ? 'none' : 'rect')} className={toolMode === 'rect' ? '!bg-blue-600' : ''} title="Rectangle">⬜</Button>
             <Button size="sm" variant="secondary" onClick={() => setToolMode(toolMode === 'circle' ? 'none' : 'circle')} className={toolMode === 'circle' ? '!bg-blue-600' : ''} title="Circle">⚪</Button>
             <Button size="sm" variant="secondary" onClick={() => setToolMode(toolMode === 'text' ? 'none' : 'text')} className={toolMode === 'text' ? '!bg-blue-600' : ''} title="Text">T</Button>
             <div className="w-px h-6 bg-slate-600 mx-1"></div>
             <Button size="sm" variant="secondary" onClick={handleUndo} disabled={!canUndo}>Undo</Button>
        </div>
    );
  };
  

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/50 rounded-lg relative">
      <header className="flex-shrink-0 pb-4 mb-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{reconstructedLesson.topic}</h2>
          <p className="text-sm text-gray-400">{reconstructedLesson.subject} by {reconstructedLesson.teacherName}</p>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
        <div className="md:col-span-2 relative h-full">
          <DrawingToolbar />
          {textInput && (
                <div className="absolute z-30" style={{ top: textInput.y * (boardRef.current?.clientHeight || 0), left: textInput.x * (boardRef.current?.clientWidth || 0) }}>
                    <input 
                        autoFocus
                        value={textInput.text} 
                        onChange={e => setTextInput({ ...textInput, text: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit(); }}
                        onBlur={handleTextSubmit}
                        className="bg-transparent border-b border-blue-500 text-white focus:outline-none"
                        style={{ color: drawColor, fontSize: '20px', fontWeight: 'bold' }}
                    />
                </div>
            )}
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
