import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, firebase } from '../services/firebase';
import { LiveLesson, LiveLessonResponse, BreakoutWhiteboard, Stroke, Point, UserProfile } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import SirEduAvatar from './common/SirEduAvatar';
import { useLiveLessonAudio } from '../hooks/useLiveLessonAudio';

interface TeacherLiveClassroomProps {
  lessonId: string;
  onClose: () => void;
  setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}

export const TeacherLiveClassroom: React.FC<TeacherLiveClassroomProps> = ({ lessonId, onClose, setToast }) => {
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [slideImages, setSlideImages] = useState<Record<string, { imageUrl: string; imageStyle: string }>>({});
  const [responses, setResponses] = useState<LiveLessonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  
  const [toolMode, setToolMode] = useState<'none' | 'draw' | 'pointer'>('none');
  const [drawColor, setDrawColor] = useState('#EF4444'); // red-500

  // New feature states
  const [showBreakoutModal, setShowBreakoutModal] = useState(false);
  const [numBreakoutRooms, setNumBreakoutRooms] = useState(2);
  const [viewingBreakoutRoomId, setViewingBreakoutRoomId] = useState<string | null>(null);
  const [breakoutWhiteboard, setBreakoutWhiteboard] = useState<BreakoutWhiteboard | null>(null);

  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenShareIntervalRef = useRef<number | null>(null);

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

  const { isPlaying: isSirEduSpeaking } = useLiveLessonAudio(reconstructedLesson, reconstructedLesson?.currentStepIndex ?? 0);

  // Main lesson listener
  useEffect(() => {
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    const unsubscribeLesson = lessonRef.onSnapshot(doc => {
      if (doc.exists) {
        setLesson({ id: doc.id, ...doc.data() } as LiveLesson);
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

    const responsesRef = lessonRef.collection('responses');
    const unsubscribeResponses = responsesRef.onSnapshot(snap => {
      setResponses(snap.docs.map(doc => doc.data() as LiveLessonResponse));
    });

    return () => {
      unsubscribeLesson();
      unsubscribeImages();
      unsubscribeResponses();
      lessonRef.update({ pointerPosition: null });
       // Cleanup screen sharing elements if they exist
      if (screenShareVideoRef.current) document.body.removeChild(screenShareVideoRef.current);
      if (screenShareCanvasRef.current) document.body.removeChild(screenShareCanvasRef.current);
      if (screenShareIntervalRef.current) clearInterval(screenShareIntervalRef.current);
    };
  }, [lessonId, onClose]);

  // Listener for a specific breakout room's whiteboard
  useEffect(() => {
    if (!viewingBreakoutRoomId) {
        setBreakoutWhiteboard(null);
        return;
    }
    const unsub = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId)
        .onSnapshot(doc => {
            setBreakoutWhiteboard(doc.exists ? doc.data() as BreakoutWhiteboard : null);
        });
    return () => unsub();
  }, [viewingBreakoutRoomId, lessonId]);


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
      const drawingHistory = viewingBreakoutRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData;
      redrawCanvas(drawingHistory);
  }, [lesson?.drawingData, breakoutWhiteboard, viewingBreakoutRoomId, redrawCanvas]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(() => {
        const history = viewingBreakoutRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData;
        redrawCanvas(history);
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, [lesson?.drawingData, viewingBreakoutRoomId, breakoutWhiteboard, redrawCanvas]);

  const getCoords = (e: React.MouseEvent): Point | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolMode !== 'draw') return;
    isDrawing.current = true;
    const pos = getCoords(e);
    if (!pos) return;
    currentStroke.current = { points: [pos], color: drawColor };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCoords(e);
    if (!pos) return;

    if (toolMode === 'draw' && isDrawing.current && currentStroke.current) {
        currentStroke.current.points.push(pos);
        const history = (viewingBreakoutRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData);
        const currentHistory = Array.isArray(history) ? history : [];
        redrawCanvas([...currentHistory, currentStroke.current]);
    }

    if (toolMode === 'pointer') {
        db.collection('liveLessons').doc(lessonId).update({ pointerPosition: pos });
    }
  };

  const handleMouseUp = async () => {
    if (toolMode !== 'draw' || !isDrawing.current) return;
    isDrawing.current = false;
    
    if (currentStroke.current && currentStroke.current.points.length > 1) {
        let docRef;
        if (viewingBreakoutRoomId) {
            docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId);
        } else {
            docRef = db.collection('liveLessons').doc(lessonId);
        }
        await docRef.update({
            drawingData: firebase.firestore.FieldValue.arrayUnion(currentStroke.current)
        });
    }
    currentStroke.current = null;
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    if (toolMode === 'pointer') {
        db.collection('liveLessons').doc(lessonId).update({ pointerPosition: null });
    }
  };

  const handleClearDrawing = async () => {
    let docRef;
    if (viewingBreakoutRoomId) {
        docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId);
    } else {
        docRef = db.collection('liveLessons').doc(lessonId);
    }
    await docRef.update({ drawingData: [] });
  };
  
    const handleToggleWhiteboard = async () => {
        await db.collection('liveLessons').doc(lessonId).update({
            whiteboardActive: !lesson?.whiteboardActive
        });
    };

    const handleToggleScreenShare = async () => {
        const lessonRef = db.collection('liveLessons').doc(lessonId);
        if (lesson?.screenShareActive) {
            if (screenShareIntervalRef.current) clearInterval(screenShareIntervalRef.current);
            screenShareStreamRef.current?.getTracks().forEach(track => track.stop());
            screenShareStreamRef.current = null;
            screenShareIntervalRef.current = null;
            await lessonRef.update({ screenShareActive: false, screenShareFrame: null });
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenShareStreamRef.current = stream;
                
                if (!screenShareVideoRef.current) {
                    screenShareVideoRef.current = document.createElement('video');
                    screenShareVideoRef.current.autoplay = true;
                    screenShareVideoRef.current.style.display = 'none';
                    document.body.appendChild(screenShareVideoRef.current);
                }
                screenShareVideoRef.current.srcObject = stream;
                
                if (!screenShareCanvasRef.current) {
                    screenShareCanvasRef.current = document.createElement('canvas');
                    screenShareCanvasRef.current.style.display = 'none';
                    document.body.appendChild(screenShareCanvasRef.current);
                }
                const canvas = screenShareCanvasRef.current;
                const video = screenShareVideoRef.current;
                const ctx = canvas.getContext('2d');

                await lessonRef.update({ screenShareActive: true });
                
                screenShareIntervalRef.current = window.setInterval(() => {
                    if (ctx && video.readyState >= 2) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                        const frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                        lessonRef.update({ screenShareFrame: frame });
                    }
                }, 500); // 2 frames per second

                stream.getVideoTracks()[0].onended = () => {
                    handleToggleScreenShare(); // Stop sharing if user stops it from browser UI
                };

            } catch (err) {
                console.error("Screen sharing failed:", err);
                setToast({ message: "Screen sharing failed to start.", type: 'error' });
            }
        }
    };

  const handleCreateBreakoutRooms = async () => {
    if (!lesson) return;
    const studentsQuery = await db.collection('users').where('role', '==', 'student').where('class', '==', lesson.classId).get();
    const allStudents = studentsQuery.docs.map(doc => ({ uid: doc.id, name: doc.data().name })) as {uid: string, name: string}[];
    
    // Shuffle students
    const shuffled = allStudents.sort(() => 0.5 - Math.random());
    
    const rooms: LiveLesson['breakoutRooms'] = {};
    for (let i = 0; i < numBreakoutRooms; i++) {
        rooms[`Room ${i + 1}`] = { students: [] };
    }
    shuffled.forEach((student, index) => {
        const roomIndex = index % numBreakoutRooms;
        rooms[`Room ${roomIndex + 1}`].students.push(student);
    });

    const batch = db.batch();
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    batch.update(lessonRef, {
        breakoutRoomsActive: true,
        breakoutRooms: rooms
    });

    // Clear main drawing data
    batch.update(lessonRef, { drawingData: [] });
    
    // Create whiteboard docs for each room
    for (let i = 0; i < numBreakoutRooms; i++) {
        const roomRef = lessonRef.collection('breakoutWhiteboards').doc(`Room ${i + 1}`);
        batch.set(roomRef, { id: `Room ${i+1}`, drawingData: [] });
    }

    await batch.commit();
    setShowBreakoutModal(false);
  };
  
  const handleCloseBreakoutRooms = async () => {
    setViewingBreakoutRoomId(null);
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    
    const batch = db.batch();
    batch.update(lessonRef, {
        breakoutRoomsActive: false,
        breakoutRooms: null
    });
    
    // Delete all breakout whiteboard subcollections
    const whiteboardsSnapshot = await lessonRef.collection('breakoutWhiteboards').get();
    whiteboardsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
  };

  const changeStep = async (newIndex: number) => {
    if (!reconstructedLesson || newIndex < 0 || newIndex >= reconstructedLesson.lessonPlan.length) return;

    await db.collection('liveLessons').doc(lessonId).update({
      currentStepIndex: newIndex,
      currentBoardContent: reconstructedLesson.lessonPlan[newIndex].boardContent,
      currentQuestion: reconstructedLesson.lessonPlan[newIndex].question,
      drawingData: [], // Clear drawing on slide change
      pointerPosition: null,
    });
  };

  const handleEndLesson = async () => {
    setIsEnding(true);
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    try {
        const batch = db.batch();
        batch.update(lessonRef, { status: 'ended' });

        // Delete sub-collections
        const [responsesSnap, imagesSnap, whiteboardsSnap] = await Promise.all([
            lessonRef.collection('responses').get(),
            lessonRef.collection('images').get(),
            lessonRef.collection('breakoutWhiteboards').get()
        ]);
        responsesSnap.forEach(doc => batch.delete(doc.ref));
        imagesSnap.forEach(doc => batch.delete(doc.ref));
        whiteboardsSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        onClose();
    } catch (err) {
        console.error("Error ending lesson:", err);
        // Fallback to simple update if batch fails
        await lessonRef.update({ status: 'ended' });
        onClose();
    }
  };

  if (loading || !reconstructedLesson) {
    return <div className="flex justify-center items-center h-full"><Spinner /><p className="ml-4">Loading Classroom...</p></div>;
  }
  
  const currentQuestion = reconstructedLesson.currentQuestion;
  const questionResponses = currentQuestion ? responses.filter(r => r.questionId === currentQuestion.id) : [];
  const correctAnswers = questionResponses.filter(r => r.isCorrect).length;
  const responseRate = questionResponses.length > 0 ? (correctAnswers / questionResponses.length) * 100 : 0;

  const renderMainContent = () => {
    if (lesson?.screenShareActive) {
        return <div className="w-full h-full bg-black flex items-center justify-center"><p className="text-white">You are sharing your screen</p></div>;
    }
    if (viewingBreakoutRoomId && lesson?.breakoutRooms) {
        const roomData = lesson.breakoutRooms[viewingBreakoutRoomId];
        return (
            <div className="p-4">
                <h3 className="text-xl font-bold">Viewing Breakout Room: {viewingBreakoutRoomId}</h3>
                <ul className="list-disc list-inside text-sm mt-2">
                    {(roomData as any).students.map((s: any) => <li key={s.uid}>{s.name}</li>)}
                </ul>
            </div>
        );
    }
    return (
        <div className="prose-styles prose-invert p-6 bg-slate-900 h-full overflow-y-auto" dangerouslySetInnerHTML={{ __html: reconstructedLesson.currentBoardContent }} />
    );
  };
  
  const DrawingToolbar = () => {
    const colors = ['#EF4444', '#3B82F6', '#FACC15', '#4ADE80', '#FFFFFF'];
    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded-lg shadow-lg flex items-center gap-1.5 z-20">
            {colors.map(color => (
                <button key={color} onClick={() => setDrawColor(color)} className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
            <div className="w-px h-6 bg-slate-600 mx-1"></div>
            <Button size="sm" variant="secondary" onClick={handleClearDrawing}>Clear</Button>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/50 rounded-lg">
      {/* Header */}
      <header className="flex-shrink-0 pb-4 mb-4 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{reconstructedLesson.topic}</h2>
          <p className="text-sm text-gray-400">{reconstructedLesson.subject} - {reconstructedLesson.classId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => changeStep(reconstructedLesson.currentStepIndex - 1)} disabled={reconstructedLesson.currentStepIndex === 0}>Prev</Button>
          <span>Step {reconstructedLesson.currentStepIndex + 1} / {reconstructedLesson.lessonPlan.length}</span>
          <Button onClick={() => changeStep(reconstructedLesson.currentStepIndex + 1)} disabled={reconstructedLesson.currentStepIndex >= reconstructedLesson.lessonPlan.length - 1}>Next</Button>
          <Button variant="danger" onClick={handleEndLesson} disabled={isEnding}>{isEnding ? 'Ending...' : 'End Lesson'}</Button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
        
        {/* Main Content Area */}
        <div className="md:col-span-2 relative h-full">
            <DrawingToolbar />
            <Card className="h-full" ref={boardRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" />
                {renderMainContent()}
            </Card>
            {reconstructedLesson?.pointerPosition && !viewingBreakoutRoomId && (
                <div className="absolute w-4 h-4 bg-red-500 rounded-full pointer-events-none z-20 shadow-[0_0_8px_4px_rgba(239,68,68,0.7)] transform -translate-x-1/2 -translate-y-1/2" 
                    style={{ left: `${reconstructedLesson.pointerPosition.x * 100}%`, top: `${reconstructedLesson.pointerPosition.y * 100}%`, transition: 'left 0.05s linear, top 0.05s linear' }} 
                />
            )}
            <div className="absolute bottom-0 left-4 pointer-events-none"><SirEduAvatar isSpeaking={isSirEduSpeaking} /></div>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-4 overflow-hidden">
          {/* Collaboration Tools */}
          <Card fullHeight={false}>
            <h3 className="text-lg font-bold mb-2">Collaboration Tools</h3>
             <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={lesson?.whiteboardActive ? 'primary' : 'secondary'} onClick={handleToggleWhiteboard}>Whiteboard</Button>
                <Button size="sm" variant={lesson?.screenShareActive ? 'primary' : 'secondary'} onClick={handleToggleScreenShare}>{lesson?.screenShareActive ? 'Stop Sharing' : 'Share Screen'}</Button>
                <Button size="sm" variant={lesson?.breakoutRoomsActive ? 'primary' : 'secondary'} onClick={() => lesson?.breakoutRoomsActive ? handleCloseBreakoutRooms() : setShowBreakoutModal(true)}>
                    {lesson?.breakoutRoomsActive ? 'Close Rooms' : 'Breakout Rooms'}
                </Button>
             </div>
          </Card>
          {/* FIX: Restore the "Question Responses" card that was overwritten by pasted code. */}
          <Card className="flex-grow flex flex-col">
            <h3 className="text-xl font-bold mb-4 flex-shrink-0">Question Responses</h3>
            <div className="flex-grow overflow-y-auto">
                {currentQuestion ? (
                    <div>
                        <p className="font-semibold mb-4">{currentQuestion.text}</p>
                        <div className="text-sm space-y-2">
                            <p><strong>Total Responses:</strong> {questionResponses.length}</p>
                            <p><strong>Correct Answers:</strong> {correctAnswers}</p>
                            <p><strong>Correct Rate:</strong> <span className="font-bold">{responseRate.toFixed(0)}%</span></p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 text-center pt-8">No question is currently active.</p>
                )}
            </div>
          </Card>
        </div>
      </div>
      {/* Breakout Room Modal */}
      {showBreakoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card>
                <h3 className="text-lg font-bold">Create Breakout Rooms</h3>
                <div className="my-4">
                    <label htmlFor="num-rooms" className="block text-sm">Number of Rooms</label>
                    <input id="num-rooms" type="number" min="2" max="10" value={numBreakoutRooms} onChange={e => setNumBreakoutRooms(parseInt(e.target.value))} className="w-full p-2 mt-1 bg-slate-700 rounded-md" />
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleCreateBreakoutRooms}>Create Rooms</Button>
                    <Button variant="secondary" onClick={() => setShowBreakoutModal(false)}>Cancel</Button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};
