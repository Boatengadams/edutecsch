import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, firebase } from '../services/firebase';
import { LiveLesson, LiveLessonResponse, BreakoutWhiteboard, DrawingElement, Point, UserProfile, DrawingToolType, SavedWhiteboard } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useLiveLessonAudio } from '../hooks/useLiveLessonAudio';
import { useToast } from './common/Toast';

interface TeacherLiveClassroomProps {
  lessonId: string;
  userProfile: UserProfile;
  onClose: () => void;
}

export const TeacherLiveClassroom: React.FC<TeacherLiveClassroomProps> = ({ lessonId, userProfile, onClose }) => {
  const { showToast } = useToast();
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [slideImages, setSlideImages] = useState<Record<string, { imageUrl: string; imageStyle: string }>>({});
  const [responses, setResponses] = useState<LiveLessonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  
  // Drawing State
  const [toolMode, setToolMode] = useState<DrawingToolType | 'pointer' | 'none'>('none');
  const [drawColor, setDrawColor] = useState('#EF4444'); // red-500
  const [textInput, setTextInput] = useState<{ x: number, y: number, text: string } | null>(null);

  // Save/Load Board State
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [saveBoardName, setSaveBoardName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedBoards, setSavedBoards] = useState<SavedWhiteboard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

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
  const currentElement = useRef<DrawingElement | null>(null);

  const reconstructedLesson = useMemo(() => {
    if (!lesson) return null;
    
    const hasImages = Object.keys(slideImages).length > 0;
    
    const newLessonPlan = lesson.lessonPlan.map((step, index) => {
        const imageData = slideImages[index.toString()];
        if (imageData) {
            const imageHtml = `<div style="text-align: center; margin-top: 1rem;"><img src="${imageData.imageUrl}" alt="Slide Image" style="max-height: 300px; border-radius: 8px; display: inline-block; object-fit: ${imageData.imageStyle || 'contain'};" /></div>`;
             // Avoid duplicating the image if it's already there (e.g., from a previous reconstruction)
            if (!step.boardContent.includes('<img')) {
                return { ...step, boardContent: step.boardContent + imageHtml };
            }
        }
        return step;
    });

    return {
        ...lesson,
        lessonPlan: newLessonPlan,
        currentBoardContent: newLessonPlan[lesson.currentStepIndex]?.boardContent || lesson.currentBoardContent,
    };
  }, [lesson, slideImages]);

  const htmlContent = reconstructedLesson?.lessonPlan[reconstructedLesson.currentStepIndex]?.boardContent;
  useLiveLessonAudio(htmlContent, userProfile);

  // Main lesson listener
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
      if (screenShareIntervalRef.current) clearInterval(screenShareIntervalRef.current);
      screenShareStreamRef.current?.getTracks().forEach(track => track.stop());
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
    // If drawing locally, push the current element to the list for preview
    if (isDrawing.current && currentElement.current) {
       // We can't easily modify the readonly prop, so we just render it after
    }

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
    if (toolMode === 'none' || toolMode === 'pointer') return;
    
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
    const pos = getCoords(e);
    if (!pos) return;

    if (isDrawing.current && currentElement.current) {
        if (toolMode === 'pen' || toolMode === 'eraser') {
             currentElement.current.points?.push(pos);
        } else if (toolMode === 'rect' || toolMode === 'circle') {
             currentElement.current.width = pos.x - (currentElement.current.x || 0);
             currentElement.current.height = pos.y - (currentElement.current.y || 0);
        }
        
        const history = (viewingBreakoutRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData);
        redrawCanvas(history);
    }

    if (toolMode === 'pointer') {
        db.collection('liveLessons').doc(lessonId).update({ pointerPosition: pos });
    }
  };

  const handleMouseUp = async () => {
    if (!isDrawing.current || !currentElement.current) return;
    isDrawing.current = false;
    
    // Validation to ensure we have enough data to save
    let isValid = false;
    if ((toolMode === 'pen' || toolMode === 'eraser') && (currentElement.current.points?.length || 0) > 1) isValid = true;
    if ((toolMode === 'rect' || toolMode === 'circle') && (Math.abs(currentElement.current.width || 0) > 0.01)) isValid = true;

    if (isValid) {
        let docRef;
        if (viewingBreakoutRoomId) {
            docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId);
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
          height: 0.05 // Approximate height for rendering
      };
      
      let docRef;
      if (viewingBreakoutRoomId) {
          docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId);
      } else {
          docRef = db.collection('liveLessons').doc(lessonId);
      }
      await docRef.update({
          drawingData: firebase.firestore.FieldValue.arrayUnion(textElement)
      });
      setTextInput(null);
  };

  const handleMouseLeave = () => {
    if (isDrawing.current) handleMouseUp();
    if (toolMode === 'pointer') {
        db.collection('liveLessons').doc(lessonId).update({ pointerPosition: null });
    }
  };

  const handleClearDrawing = async () => {
    if(!window.confirm("Clear entire whiteboard?")) return;
    let docRef;
    if (viewingBreakoutRoomId) {
        docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId);
    } else {
        docRef = db.collection('liveLessons').doc(lessonId);
    }
    await docRef.update({ drawingData: [] });
  };
  
  const handleUndo = async () => {
      const currentData = viewingBreakoutRoomId ? breakoutWhiteboard?.drawingData : lesson?.drawingData;
      if (!currentData || currentData.length === 0) return;
      
      const newData = currentData.slice(0, -1);
      let docRef;
      if (viewingBreakoutRoomId) {
          docRef = db.collection('liveLessons').doc(lessonId).collection('breakoutWhiteboards').doc(viewingBreakoutRoomId);
      } else {
          docRef = db.collection('liveLessons').doc(lessonId);
      }
      await docRef.update({ drawingData: newData });
  };
  
  // Save/Load Logic
  const fetchSavedBoards = async () => {
      setLoadingBoards(true);
      const snaps = await db.collection('users').doc(userProfile.uid).collection('savedWhiteboards').orderBy('createdAt', 'desc').get();
      setSavedBoards(snaps.docs.map(d => ({ id: d.id, ...d.data() } as SavedWhiteboard)));
      setLoadingBoards(false);
      setShowLoadModal(true);
  };
  
  const handleSaveBoard = async () => {
      if (!saveBoardName.trim()) return;
      setIsSavingBoard(true);
      const currentData = lesson?.drawingData || [];
      try {
          await db.collection('users').doc(userProfile.uid).collection('savedWhiteboards').add({
              teacherId: userProfile.uid,
              name: saveBoardName,
              data: currentData,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          setShowSaveModal(false);
          setSaveBoardName('');
      } catch (e) {
          console.error("Save failed", e);
      } finally {
          setIsSavingBoard(false);
      }
  };
  
  const handleLoadBoard = async (board: SavedWhiteboard) => {
       if (!confirm("Loading a board will replace current drawings. Continue?")) return;
       await db.collection('liveLessons').doc(lessonId).update({ drawingData: board.data });
       setShowLoadModal(false);
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
                    handleToggleScreenShare();
                };

            } catch (err) {
                console.error("Screen sharing failed:", err);
                showToast("Screen sharing failed to start.", 'error');
            }
        }
    };

  const handleCreateBreakoutRooms = async () => {
    if (!lesson) return;
    const studentsQuery = await db.collection('users').where('role', '==', 'student').where('class', '==', lesson.classId).get();
    const allStudents = studentsQuery.docs.map(doc => ({ uid: doc.id, name: doc.data().name })) as {uid: string, name: string}[];
    
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

    batch.update(lessonRef, { drawingData: [] });
    
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
      drawingData: [], 
      pointerPosition: null,
    });
  };

  const handleEndLesson = async () => {
    setIsEnding(true);
    const lessonRef = db.collection('liveLessons').doc(lessonId);
    try {
        const batch = db.batch();
        batch.update(lessonRef, { status: 'ended' });

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
        await lessonRef.update({ status: 'ended' });
        onClose();
    }
  };
  
  if (loading || !reconstructedLesson) {
    return <div className="flex justify-center items-center h-full"><Spinner /><p className="ml-4">Loading Classroom...</p></div>;
  }
  
  if (reconstructedLesson.status === 'starting') {
    return (
        <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col justify-center items-center">
            <Spinner />
            <h2 className="text-2xl font-bold mt-4">Preparing Lesson...</h2>
            <p className="mt-2 text-gray-400">Uploading images and preparing the classroom for students.</p>
        </div>
    );
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
  
  const DrawingToolbar: React.FC = () => {
    if (toolMode === 'none') return null;
    const colors = ['#EF4444', '#3B82F6', '#FACC15', '#4ADE80', '#FFFFFF'];
    const canUndo = viewingBreakoutRoomId ? (breakoutWhiteboard?.drawingData?.length || 0) > 0 : (lesson?.drawingData?.length || 0) > 0;
    
    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded-lg shadow-lg flex items-center gap-1.5 z-20">
             {toolMode !== 'eraser' && toolMode !== 'pointer' && (
                <>
                    {colors.map(color => (
                        <button key={color} onClick={() => setDrawColor(color)} className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                    <div className="w-px h-6 bg-slate-600 mx-1"></div>
                </>
            )}
            <Button size="sm" variant="secondary" onClick={handleUndo} disabled={!canUndo}>Undo</Button>
            <Button size="sm" variant="secondary" onClick={handleClearDrawing}>Clear</Button>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/50 rounded-lg relative">
        <header className="flex-shrink-0 pb-4 mb-4 border-b border-slate-700 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold">{reconstructedLesson.topic}</h2>
                <p className="text-sm text-gray-400">{reconstructedLesson.subject} - {reconstructedLesson.classId}</p>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => setShowSaveModal(true)} variant="secondary">Save Board</Button>
                <Button onClick={fetchSavedBoards} variant="secondary">Load Board</Button>
                <Button onClick={handleEndLesson} variant="danger" disabled={isEnding}>
                    {isEnding ? 'Ending...' : 'End Lesson'}
                </Button>
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
                <Card className="h-full flex flex-col" fullHeight={false} ref={boardRef} 
                    onMouseDown={handleMouseDown} 
                    onMouseMove={handleMouseMove} 
                    onMouseUp={handleMouseUp} 
                    onMouseLeave={handleMouseLeave}>
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
                <h3 className="text-xl font-bold mb-4 flex-shrink-0">Controls &amp; Responses</h3>
                <div className="flex-grow overflow-y-auto space-y-4">
                    {currentQuestion ? (
                        <div>
                            <p className="font-semibold">{currentQuestion.text}</p>
                            <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                                <p className="text-sm text-gray-400">Response Rate</p>
                                <p className="text-2xl font-bold">{responseRate.toFixed(0)}% Correct</p>
                                <p className="text-xs text-gray-500">{correctAnswers} of {questionResponses.length} answered correctly</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No question active.</p>
                    )}
                     <div className="space-y-2 pt-4 border-t border-slate-700">
                        <h4 className="font-semibold text-gray-300">Tools</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="secondary" onClick={() => setToolMode(toolMode === 'pointer' ? 'none' : 'pointer')} className={toolMode === 'pointer' ? '!bg-blue-600' : ''} title="Laser Pointer">👆</Button>
                            <Button variant="secondary" onClick={() => setToolMode(toolMode === 'pen' ? 'none' : 'pen')} className={toolMode === 'pen' ? '!bg-blue-600' : ''} title="Pen">✏️</Button>
                            <Button variant="secondary" onClick={() => setToolMode(toolMode === 'eraser' ? 'none' : 'eraser')} className={toolMode === 'eraser' ? '!bg-blue-600' : ''} title="Eraser">🧹</Button>
                            <Button variant="secondary" onClick={() => setToolMode(toolMode === 'rect' ? 'none' : 'rect')} className={toolMode === 'rect' ? '!bg-blue-600' : ''} title="Rectangle">⬜</Button>
                            <Button variant="secondary" onClick={() => setToolMode(toolMode === 'circle' ? 'none' : 'circle')} className={toolMode === 'circle' ? '!bg-blue-600' : ''} title="Circle">⚪</Button>
                            <Button variant="secondary" onClick={() => setToolMode(toolMode === 'text' ? 'none' : 'text')} className={toolMode === 'text' ? '!bg-blue-600' : ''} title="Text">T</Button>
                        </div>
                         <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button variant="secondary" onClick={handleToggleWhiteboard} className={lesson?.whiteboardActive ? '!bg-blue-600' : ''}>Whiteboard Mode</Button>
                            <Button variant="secondary" onClick={handleToggleScreenShare} className={lesson?.screenShareActive ? '!bg-red-600' : ''}>{lesson?.screenShareActive ? 'Stop Share' : 'Screen Share'}</Button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-700">
                        <h4 className="font-semibold text-gray-300">Breakout Rooms</h4>
                        {lesson?.breakoutRoomsActive ? (
                            <div className="space-y-2">
                                <Button onClick={handleCloseBreakoutRooms} variant="danger" className="w-full">Close All Rooms</Button>
                                 <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(lesson.breakoutRooms || {}).map(roomId => (
                                        <Button key={roomId} variant="secondary" onClick={() => setViewingBreakoutRoomId(roomId)} className={viewingBreakoutRoomId === roomId ? '!bg-blue-600' : ''}>{roomId}</Button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Button onClick={() => setShowBreakoutModal(true)} variant="secondary" className="w-full">Create Rooms</Button>
                        )}
                    </div>

                </div>

                 <div className="flex-shrink-0 flex items-center justify-between mt-4">
                    <Button onClick={() => changeStep(reconstructedLesson.currentStepIndex - 1)} disabled={reconstructedLesson.currentStepIndex === 0}>Prev</Button>
                    <span className="text-sm text-gray-400">Step {reconstructedLesson.currentStepIndex + 1} / {reconstructedLesson.lessonPlan.length}</span>
                    <Button onClick={() => changeStep(reconstructedLesson.currentStepIndex + 1)} disabled={reconstructedLesson.currentStepIndex >= reconstructedLesson.lessonPlan.length - 1}>Next</Button>
                </div>
            </Card>
        </div>
         {showBreakoutModal && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-30">
                <Card>
                    <h3 className="text-lg font-bold mb-4">Create Breakout Rooms</h3>
                    <div className="flex items-center gap-4">
                        <label htmlFor="num-rooms">Number of rooms:</label>
                        <input id="num-rooms" type="number" min="2" max="10" value={numBreakoutRooms} onChange={e => setNumBreakoutRooms(Number(e.target.value))} className="w-20 p-2 bg-slate-700 rounded-md" />
                    </div>
                     <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={() => setShowBreakoutModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateBreakoutRooms}>Create</Button>
                    </div>
                </Card>
            </div>
        )}
        {showSaveModal && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-30">
                <Card className="w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4">Save Whiteboard</h3>
                    <input 
                        type="text" 
                        value={saveBoardName} 
                        onChange={e => setSaveBoardName(e.target.value)} 
                        placeholder="Board Name (e.g., Algebra Notes)" 
                        className="w-full p-2 bg-slate-700 rounded-md mb-4" 
                    />
                     <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveBoard} disabled={!saveBoardName.trim() || isSavingBoard}>{isSavingBoard ? 'Saving...' : 'Save'}</Button>
                    </div>
                </Card>
            </div>
        )}
        {showLoadModal && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-30">
                <Card className="w-full max-w-lg h-[60vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Load Whiteboard</h3>
                        <button onClick={() => setShowLoadModal(false)} className="text-gray-400 hover:text-white">&times;</button>
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {loadingBoards ? <Spinner /> : savedBoards.length === 0 ? <p className="text-gray-400">No saved boards found.</p> : 
                         savedBoards.map(board => (
                             <button key={board.id} onClick={() => handleLoadBoard(board)} className="w-full text-left p-3 bg-slate-700 rounded-md hover:bg-slate-600">
                                 <p className="font-bold">{board.name}</p>
                                 <p className="text-xs text-gray-400">{board.createdAt?.toDate().toLocaleString()}</p>
                             </button>
                         ))
                        }
                    </div>
                </Card>
            </div>
        )}
    </div>
  );
};
