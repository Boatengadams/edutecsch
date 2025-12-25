
import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from '../services/firebase';
import type { LiveLesson, LiveLessonResponse, UserProfile, LiveAction, LiveActionType, DrawingElement, Point, DrawingToolType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import SirEduAvatar from './common/SirEduAvatar';
import { useToast } from './common/Toast';

interface TeacherLiveClassroomProps {
  lessonId: string;
  onClose: () => void;
  userProfile: UserProfile;
  setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}

export const TeacherLiveClassroom: React.FC<TeacherLiveClassroomProps> = ({ lessonId, onClose, userProfile, setToast }) => {
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [responses, setResponses] = useState<LiveLessonResponse[]>([]);
  const [studentsInClass, setStudentsInClass] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'dynamics' | 'roster'>('board');

  // Whiteboard State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingToolType>('pen');
  const [currentColor, setCurrentColor] = useState('#ef4444');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingData, setDrawingData] = useState<DrawingElement[]>([]);
  const lastPoint = useRef<Point | null>(null);

  useEffect(() => {
    const unsubscribe = db.collection('liveLessons').doc(lessonId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as LiveLesson;
        setLesson({ id: doc.id, ...data });
        if (data.drawingData) setDrawingData(data.drawingData);
      } else {
        onClose();
      }
    });
    return () => unsubscribe();
  }, [lessonId, onClose]);

  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      drawingData.forEach(stroke => {
          ctx.beginPath();
          if (stroke.type === 'eraser') {
              ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 30; 
          } else {
              ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = stroke.color; ctx.lineWidth = 4;
          }
          if ((stroke.type === 'pen' || stroke.type === 'eraser') && stroke.points && stroke.points.length > 0) {
              ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
              for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
          } else if (stroke.type === 'line' && stroke.points && stroke.points.length >= 2) {
              ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
              ctx.lineTo(stroke.points[stroke.points.length - 1].x * canvas.width, stroke.points[stroke.points.length - 1].y * canvas.height);
          } else if (stroke.type === 'rect' && stroke.points && stroke.points.length >= 2) {
              const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1];
              ctx.rect(start.x * canvas.width, start.y * canvas.height, (end.x - start.x) * canvas.width, (end.y - start.y) * canvas.height);
          } else if (stroke.type === 'circle' && stroke.points && stroke.points.length >= 2) {
              const start = stroke.points[0]; const end = stroke.points[stroke.points.length - 1];
              const r = Math.sqrt(Math.pow((end.x - start.x) * canvas.width, 2) + Math.pow((end.y - start.y) * canvas.height, 2));
              ctx.arc(start.x * canvas.width, start.y * canvas.height, r, 0, 2 * Math.PI);
          }
          ctx.stroke();
      });
      ctx.globalCompositeOperation = 'source-over';
  }, [drawingData, activeTab, lesson?.currentStepIndex]);

  const handleStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (currentTool === 'laser') return;
      setIsDrawing(true);
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) / canvas.width;
      const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) / canvas.height;
      lastPoint.current = { x, y };
      setDrawingData(prev => [...prev, { type: currentTool, color: currentTool === 'eraser' ? '#000000' : currentColor, points: [{ x, y }, { x, y }] }]);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) / canvas.width;
      const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) / canvas.height;

      if (currentTool === 'laser') {
          db.collection('liveLessons').doc(lessonId).update({ pointerPosition: { x, y } });
          return;
      }

      if (!isDrawing || !lastPoint.current) return;
      setDrawingData(prev => {
          const newData = [...prev]; const currentStroke = newData[newData.length - 1];
          if (currentStroke && currentStroke.points) {
              if (currentTool === 'pen' || currentTool === 'eraser') currentStroke.points.push({ x, y });
              else currentStroke.points[currentStroke.points.length - 1] = { x, y };
          }
          return newData;
      });
      lastPoint.current = { x, y };
  };

  const handleStopDrawing = async () => {
      if (currentTool === 'laser') {
          db.collection('liveLessons').doc(lessonId).update({ pointerPosition: null });
          return;
      }
      if (isDrawing) {
          setIsDrawing(false); lastPoint.current = null;
          await db.collection('liveLessons').doc(lessonId).update({ drawingData: drawingData });
      }
  };

  useEffect(() => {
    if (lesson?.classId) {
        const unsub = db.collection('users').where('role', '==', 'student').where('class', '==', lesson.classId)
            .onSnapshot(snap => setStudentsInClass(snap.docs.map(d => ({uid: d.id, ...d.data()} as UserProfile))));
        return () => unsub();
    }
  }, [lesson?.classId]);

  useEffect(() => {
    if (!lesson?.activeAction) { setResponses([]); return; }
    const unsubscribe = db.collection('liveLessons').doc(lessonId).collection('responses')
        .where('actionId', '==', lesson.activeAction.id)
        .onSnapshot(snap => setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveLessonResponse))));
    return () => unsubscribe();
  }, [lessonId, lesson?.activeAction?.id]);

  const triggerAction = async (type: LiveActionType, text: string, targetStudentId?: string, options?: string[]) => {
      const action: LiveAction = { id: Date.now().toString(), type, text, options, targetStudentId, timestamp: Date.now(), relatedSlideContent: lesson?.currentBoardContent };
      await db.collection('liveLessons').doc(lessonId).update({ activeAction: JSON.parse(JSON.stringify(action)) });
      setToast({ message: `Sent: ${text.substring(0, 20)}...`, type: 'success' });
  };

  const changeStep = async (newIndex: number) => {
    if (!lesson || newIndex < 0 || newIndex >= lesson.lessonPlan.length) return;
    const nextStep = lesson.lessonPlan[newIndex];
    setDrawingData([]);
    await db.collection('liveLessons').doc(lessonId).update({
      currentStepIndex: newIndex, 
      currentBoardContent: nextStep.boardContent, 
      currentQuestion: nextStep.question,
      currentImageUrl: nextStep.imageUrl || '',
      currentImageStyle: nextStep.imageStyle || 'cover',
      currentTeacherScript: nextStep.teacherScript || '',
      currentAudioUrl: nextStep.audioUrl || null, 
      activeAction: null, 
      drawingData: [], 
      pointerPosition: null
    });
    if (nextStep.question?.options) triggerAction('poll', nextStep.question.text, undefined, nextStep.question.options);
  };

  if (!lesson) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

  return (
    <div className="h-full flex flex-col bg-[#020617] text-white overflow-hidden font-sans">
      <header className="flex items-center justify-between px-8 py-4 bg-slate-900 border-b border-white/5 shadow-2xl z-50">
        <div className="flex items-center gap-6">
            <div className="flex flex-col">
                <h2 className="text-xl font-black tracking-tight text-white uppercase">{lesson.topic}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lesson.classId} &bull; {studentsInClass.length} STUDENTS LIVE</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {['board', 'dynamics', 'roster'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {tab}
                </button>
            ))}
            <div className="h-8 w-px bg-slate-700 mx-2"></div>
            <Button variant="danger" size="sm" onClick={() => { if(window.confirm("End session?")) { db.collection('liveLessons').doc(lessonId).update({ status: 'ended' }); onClose(); } }}>End Session</Button>
        </div>
      </header>

      <div className="flex-grow flex overflow-hidden">
        <div className={`flex-grow flex flex-col relative transition-all duration-500 ${activeTab !== 'board' ? 'w-2/3' : 'w-full'}`}>
            
            {/* IMMERSIVE SPLIT STAGE */}
            <div className="flex-grow flex flex-col md:flex-row relative bg-[#0f172a] shadow-inner overflow-hidden">
                 
                 {/* Left Panel: High-fidelity Visual */}
                 <div className="w-full md:w-1/2 h-48 md:h-full relative overflow-hidden bg-black flex items-center justify-center">
                    {lesson.currentImageUrl ? (
                        <img 
                            src={lesson.currentImageUrl} 
                            alt="Visual Support" 
                            className={`w-full h-full object-${lesson.currentImageStyle || 'cover'} transition-all duration-1000`} 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 opacity-20">
                            <span className="text-9xl mb-4">💡</span>
                            <p className="font-black uppercase tracking-[1em]">Visual Input</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                 </div>

                 {/* Right Panel: Content Board */}
                 <div className="w-full md:w-1/2 h-full flex flex-col bg-white overflow-y-auto p-12 relative">
                    <div className="prose-styles prose-xl !text-slate-900 leading-tight w-full" dangerouslySetInnerHTML={{ __html: lesson.currentBoardContent }} />
                    
                    {lesson.currentTeacherScript && (
                         <div className="mt-auto pt-8 border-t border-slate-100">
                             <h4 className="text-blue-600 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="text-lg">👨‍🏫</span> Teacher Script
                             </h4>
                             <p className="text-sm text-slate-500 italic leading-relaxed">
                                "{lesson.currentTeacherScript}"
                             </p>
                         </div>
                    )}
                 </div>

                 {/* Whiteboard Overlay Layer */}
                 <canvas 
                    ref={canvasRef} 
                    className={`absolute inset-0 z-20 touch-none ${currentTool === 'laser' ? 'cursor-none' : 'cursor-crosshair'}`} 
                    onMouseDown={handleStartDrawing} 
                    onMouseMove={handleDraw} 
                    onMouseUp={handleStopDrawing} 
                    onTouchStart={handleStartDrawing} 
                    onTouchMove={handleDraw} 
                    onTouchEnd={handleStopDrawing} 
                 />
                 
                 {/* Laser Pointer */}
                 {lesson.pointerPosition && (
                     <div className="absolute z-30 pointer-events-none w-6 h-6 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] border-2 border-white/50" style={{ left: `calc(${lesson.pointerPosition.x} * 100%)`, top: `calc(${lesson.pointerPosition.y} * 100%)`, transform: 'translate(-50%, -50%)' }}>
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                 )}

                 {/* Toolbox Dock */}
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 bg-slate-900/90 backdrop-blur-2xl p-2.5 rounded-3xl border border-white/10 shadow-2xl">
                     <button onClick={() => setCurrentTool('pen')} className={`p-4 rounded-2xl transition-all ${currentTool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>✏️</button>
                     <button onClick={() => setCurrentTool('laser')} className={`p-4 rounded-2xl transition-all ${currentTool === 'laser' ? 'bg-red-600 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-800'}`}>🔦</button>
                     <button onClick={() => setCurrentTool('eraser')} className={`p-4 rounded-2xl transition-all ${currentTool === 'eraser' ? 'bg-pink-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>🧽</button>
                     <div className="h-px bg-white/10 mx-2"></div>
                     <button onClick={() => { setDrawingData([]); db.collection('liveLessons').doc(lessonId).update({ drawingData: [] }); }} className="p-4 rounded-2xl text-red-400 hover:bg-red-900/20">🗑️</button>
                 </div>
            </div>

            <div className="h-24 bg-slate-900 border-t border-white/5 flex items-center justify-between px-10">
                <button onClick={() => changeStep(lesson.currentStepIndex - 1)} disabled={lesson.currentStepIndex === 0} className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-20 font-bold uppercase tracking-widest text-xs transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg> Previous
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black text-lg tracking-tighter">{lesson.currentStepIndex + 1} / {lesson.lessonPlan.length}</span>
                    <div className="flex gap-1.5 mt-2">
                        {lesson.lessonPlan.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === lesson.currentStepIndex ? 'w-10 bg-blue-500' : 'w-2 bg-slate-800'}`}></div>)}
                    </div>
                </div>
                <button onClick={() => changeStep(lesson.currentStepIndex + 1)} disabled={lesson.currentStepIndex === lesson.lessonPlan.length - 1} className="flex items-center gap-2 text-blue-500 hover:text-blue-400 disabled:opacity-20 font-bold uppercase tracking-widest text-xs transition-colors">
                    Next <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>

        {activeTab === 'dynamics' && (
            <aside className="w-[450px] bg-slate-900 border-l border-white/5 flex flex-col animate-fade-in-right p-6 space-y-6 overflow-hidden">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Interaction Center</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => triggerAction('poll', 'Ready to move forward?', undefined, ['Yes', 'Wait'])} className="p-4 bg-slate-800 rounded-2xl hover:bg-emerald-600 transition-all text-xs font-bold uppercase border border-white/5">👍 Ready Check</button>
                    <button onClick={() => triggerAction('poll', 'Any questions so far?', undefined, ['None', 'I Have A Question'])} className="p-4 bg-slate-800 rounded-2xl hover:bg-amber-600 transition-all text-xs font-bold uppercase border border-white/5">❓ Q&A Hook</button>
                </div>

                {lesson.activeAction && (
                    <div className="bg-slate-800 rounded-3xl p-6 border border-blue-500/30 shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black bg-blue-500 px-2.5 py-1 rounded-full uppercase tracking-widest">Live Poll</span>
                            <span className="text-xs text-slate-500 font-mono">{responses.length} Responded</span>
                        </div>
                        <p className="text-lg font-bold mb-6 text-white leading-tight">"{lesson.activeAction.text}"</p>
                        
                        <div className="space-y-4">
                            {lesson.activeAction.options?.map(opt => {
                                const count = responses.filter(r => r.answer === opt).length;
                                const pct = responses.length ? (count/responses.length)*100 : 0;
                                return (
                                    <div key={opt} className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase"><span>{opt}</span><span>{count}</span></div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pct}%` }}></div></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <div className="bg-slate-800/40 rounded-3xl p-6 flex-grow flex flex-col items-center justify-center border border-white/5 italic text-slate-500 text-center">
                    <div className="mb-4"><SirEduAvatar isSpeaking={false} /></div>
                    <p className="text-xs max-w-[200px]">Class insights and real-time activity metrics will populate here.</p>
                </div>
            </aside>
        )}

        {activeTab === 'roster' && (
            <aside className="w-[450px] bg-slate-900 border-l border-white/5 flex flex-col animate-fade-in-right overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Student Attendance</h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black">{studentsInClass.length} Active</span>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {studentsInClass.map(s => {
                        const hasHandRaised = lesson.raisedHands?.includes(s.uid);
                        return (
                            <div key={s.uid} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${hasHandRaised ? 'bg-amber-900/20 border-amber-500/50 shadow-lg scale-[1.02]' : 'bg-slate-800/40 border-transparent hover:bg-slate-800'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-sm border border-white/5">{(s.name || '?').charAt(0)}</div>
                                    <div>
                                        <p className="text-sm font-bold text-white truncate max-w-[150px]">{s.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{hasHandRaised ? 'Waiting for help' : 'Engaged'}</p>
                                    </div>
                                </div>
                                {hasHandRaised && <span className="text-2xl animate-bounce">✋</span>}
                            </div>
                        );
                    })}
                </div>
            </aside>
        )}
      </div>
    </div>
  );
};

export default TeacherLiveClassroom;
