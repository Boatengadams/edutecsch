
// ... (imports)
import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from '../services/firebase';
import type { LiveLesson, LiveLessonStep, LiveLessonResponse, UserProfile, LiveAction, LiveActionType, DrawingElement, Point, DrawingToolType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import SirEduAvatar from './common/SirEduAvatar';
import { GoogleGenAI } from '@google/genai';
import { useToast } from './common/Toast';

interface TeacherLiveClassroomProps {
  lessonId: string;
  onClose: () => void;
  userProfile: UserProfile;
  setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}

export const TeacherLiveClassroom: React.FC<TeacherLiveClassroomProps> = ({ lessonId, onClose, userProfile, setToast }) => {
  const { showToast: useShowToast } = useToast(); // Local context toast if needed
  const [reconstructedLesson, setReconstructedLesson] = useState<LiveLesson | null>(null);
  const [responses, setResponses] = useState<LiveLessonResponse[]>([]);
  const [studentsInClass, setStudentsInClass] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'dynamics'>('board');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  // Whiteboard State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingToolType>('pen');
  const [currentColor, setCurrentColor] = useState('#ef4444'); // Default red
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingData, setDrawingData] = useState<DrawingElement[]>([]);
  const lastPoint = useRef<Point | null>(null);

  useEffect(() => {
    const unsubscribe = db.collection('liveLessons').doc(lessonId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as LiveLesson;
        setReconstructedLesson({ id: doc.id, ...data });
        // Sync drawing data from DB if it exists (handles refresh)
        if (data.drawingData) {
            setDrawingData(data.drawingData);
        }
      } else {
        onClose();
      }
    });
    return () => unsubscribe();
  }, [lessonId, onClose]);

  // ... (drawing logic useEffects and handlers)
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle resizing
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      drawingData.forEach(stroke => {
          ctx.beginPath();
          
          if (stroke.type === 'eraser') {
              ctx.globalCompositeOperation = 'destination-out';
              ctx.lineWidth = 20; 
          } else {
              ctx.globalCompositeOperation = 'source-over';
              ctx.strokeStyle = stroke.color;
              ctx.lineWidth = 3;
          }

          if ((stroke.type === 'pen' || stroke.type === 'eraser') && stroke.points && stroke.points.length > 0) {
              ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
              for (let i = 1; i < stroke.points.length; i++) {
                  ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
              }
          } else if (stroke.type === 'line' && stroke.points && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[stroke.points.length - 1];
              ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
              ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          } else if (stroke.type === 'rect' && stroke.points && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[stroke.points.length - 1];
              const w = (end.x - start.x) * canvas.width;
              const h = (end.y - start.y) * canvas.height;
              ctx.rect(start.x * canvas.width, start.y * canvas.height, w, h);
          } else if (stroke.type === 'circle' && stroke.points && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[stroke.points.length - 1];
              const radius = Math.sqrt(Math.pow((end.x - start.x) * canvas.width, 2) + Math.pow((end.y - start.y) * canvas.height, 2));
              ctx.arc(start.x * canvas.width, start.y * canvas.height, radius, 0, 2 * Math.PI);
          }
          
          ctx.stroke();
      });
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
  }, [drawingData, activeTab]);

  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      // Close menus when drawing starts
      setIsShapeMenuOpen(false);
      setIsColorMenuOpen(false);

      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const x = (clientX - rect.left) / canvas.width;
      const y = (clientY - rect.top) / canvas.height;
      
      lastPoint.current = { x, y };
      
      // Start a new stroke/shape
      const newStroke: DrawingElement = {
          type: currentTool,
          color: currentTool === 'eraser' ? '#000000' : currentColor,
          points: [{ x, y }, { x, y }] // Init with two points for shapes to have a valid end initially
      };
      
      setDrawingData(prev => [...prev, newStroke]);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !lastPoint.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const x = (clientX - rect.left) / canvas.width;
      const y = (clientY - rect.top) / canvas.height;

      setDrawingData(prev => {
          const newData = [...prev];
          const currentStroke = newData[newData.length - 1];
          
          if (currentStroke && currentStroke.points) {
              if (currentTool === 'pen' || currentTool === 'eraser') {
                  // For freehand, append points
                  currentStroke.points.push({ x, y });
              } else {
                  // For shapes/lines, only update the last point to "stretch" it
                  currentStroke.points[currentStroke.points.length - 1] = { x, y };
              }
          }
          return newData;
      });
      
      lastPoint.current = { x, y };
  };

  const handleStopDrawing = async () => {
      if (isDrawing) {
          setIsDrawing(false);
          lastPoint.current = null;
          // Sync to Firestore
          await db.collection('liveLessons').doc(lessonId).update({
              drawingData: drawingData
          });
      }
  };
  
  const handleClearBoard = async () => {
      if(window.confirm("Are you sure you want to clear the entire board? This cannot be undone.")) {
          setDrawingData([]);
          await db.collection('liveLessons').doc(lessonId).update({
              drawingData: []
          });
          setToast({ message: 'Board cleared', type: 'success' });
      }
  };

  useEffect(() => {
    if (reconstructedLesson?.classId) {
        const unsub = db.collection('users')
            .where('role', '==', 'student')
            .where('class', '==', reconstructedLesson.classId)
            .onSnapshot(snap => {
                setStudentsInClass(snap.docs.map(d => ({uid: d.id, ...d.data()} as UserProfile)));
            });
        return () => unsub();
    }
  }, [reconstructedLesson?.classId]);

  // ... (responses, actions, etc.)
  // Listen for responses specific to the ACTIVE ACTION
  useEffect(() => {
    if (!reconstructedLesson?.activeAction) {
        setResponses([]);
        return;
    }
    
    const q = db.collection('liveLessons').doc(lessonId).collection('responses')
        .where('actionId', '==', reconstructedLesson.activeAction.id);
        
    const unsubscribe = q.onSnapshot(snap => {
        setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveLessonResponse)));
    });
    return () => unsubscribe();
  }, [lessonId, reconstructedLesson?.activeAction?.id]);

  const triggerAction = async (type: LiveActionType, text: string, targetStudentId?: string, options?: string[]) => {
      const actionId = Date.now().toString();
      const action: LiveAction = {
          id: actionId,
          type,
          text,
          options,
          targetStudentId: targetStudentId || undefined,
          targetStudentName: targetStudentId ? studentsInClass.find(s => s.uid === targetStudentId)?.name : undefined,
          timestamp: Date.now(),
          relatedSlideContent: reconstructedLesson?.currentBoardContent // Save context
      };
      
      // Sanitize action to remove undefined fields
      const safeAction = JSON.parse(JSON.stringify(action));

      await db.collection('liveLessons').doc(lessonId).update({
          activeAction: safeAction
      });
      setToast({ message: `Action Sent: ${type === 'direct_question' ? 'Direct Question' : text}`, type: 'success' });
  };

  const handleGenerateSmartExplanation = async (confusionText: string) => {
      if (!reconstructedLesson) return;
      setIsGeneratingExplanation(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            The teacher is presenting a slide with the following content:
            "${reconstructedLesson.currentBoardContent.replace(/<[^>]*>/g, '')}"
            
            A student has indicated they are confused about this specific part:
            "${confusionText}"
            
            Provide a clear, simple, and encouraging explanation to clarify this specific point for the class. Keep it under 50 words.
          `;
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-preview',
              contents: prompt
          });
          
          const explanation = response.text;
          await triggerAction('explanation', explanation);
          
      } catch(err) {
          console.error(err);
          setToast({ message: 'Failed to generate explanation', type: 'error' });
      } finally {
          setIsGeneratingExplanation(false);
      }
  };

  const changeStep = async (newIndex: number) => {
    if (!reconstructedLesson || newIndex < 0 || newIndex >= reconstructedLesson.lessonPlan.length) return;
    
    const nextSlide = reconstructedLesson.lessonPlan[newIndex];
    const nextAudioUrl = nextSlide.audioUrl || null;

    // Clear drawings when changing slides
    setDrawingData([]);

    await db.collection('liveLessons').doc(lessonId).update({
      currentStepIndex: newIndex,
      currentBoardContent: nextSlide.boardContent,
      currentQuestion: nextSlide.question,
      currentAudioUrl: nextAudioUrl,
      activeAction: null,
      drawingData: [],
      pointerPosition: null,
    });
    
    // Automatically trigger question if present in new slide
    if (nextSlide.question) {
        // Determine action type based on question type
        if (nextSlide.question.type === 'Theory') {
             // For theory, we just want discussion, maybe "Ask for Questions" implicitly, 
             // or a custom "Discuss" action. For now, let's just show it on board.
             // If you want to force a prompt, uncomment below:
             // triggerAction('direct_question', nextSlide.question.text);
        } else {
             // Objective - Trigger Poll
             // Wait a moment for slide to load then trigger poll
             setTimeout(() => {
                 if (nextSlide.question?.options) {
                    triggerAction('poll', nextSlide.question.text, undefined, nextSlide.question.options);
                 }
             }, 1000);
        }
    }
  };

  const handleEndLesson = async () => {
    if (window.confirm("End this live lesson?")) {
      await db.collection('liveLessons').doc(lessonId).update({ status: 'ended' });
      onClose();
    }
  };

  if (!reconstructedLesson) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

  // --- Aggregation Logic ---
  const yesCount = responses.filter(r => r.answer === 'Yes').length;
  const noCount = responses.filter(r => r.answer === 'No').length;
  const totalRes = responses.length;
  
  const confusionPoints = responses
    .filter(r => r.confusionPoint)
    .reduce<Record<string, number>>((acc, curr) => {
        const point = curr.confusionPoint!;
        acc[point] = (acc[point] || 0) + 1;
        return acc;
    }, {});

  const sortedConfusion = Object.entries(confusionPoints).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shadow-md z-10">
        {/* ... top bar content ... */}
        <div className="flex items-center gap-4">
            <div className="bg-red-600 px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-xs font-bold uppercase tracking-wider">Live</span>
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-100">{reconstructedLesson.topic}</h2>
                <p className="text-xs text-slate-400">{reconstructedLesson.classId} &bull; {studentsInClass.length} Students</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('board')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'board' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
                Board View
            </button>
            <button 
                onClick={() => setActiveTab('dynamics')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dynamics' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
                Class Dynamics
            </button>
            <Button variant="danger" size="sm" onClick={handleEndLesson}>End Class</Button>
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* LEFT: Main Content (Always Visible but resized) */}
        <div className={`flex-grow flex flex-col relative transition-all duration-300 ${activeTab === 'dynamics' ? 'w-2/3' : 'w-full'}`}>
            {/* Slide Content & Whiteboard */}
            <div className="flex-grow relative overflow-hidden bg-slate-900">
                 {/* Slide Content Layer */}
                 <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-8 z-0">
                     <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                         <span className="text-9xl font-bold text-slate-700">UTOPIA</span>
                     </div>
                     <div className="prose-styles prose-2xl text-center max-w-4xl" dangerouslySetInnerHTML={{ __html: reconstructedLesson.currentBoardContent }} />
                 </div>

                 {/* Whiteboard Layer */}
                 {activeTab === 'board' && (
                     <canvas
                        ref={canvasRef}
                        className="absolute inset-0 z-10 cursor-crosshair touch-none"
                        onMouseDown={handleStartDrawing}
                        onMouseMove={handleDraw}
                        onMouseUp={handleStopDrawing}
                        onMouseLeave={handleStopDrawing}
                        onTouchStart={handleStartDrawing}
                        onTouchMove={handleDraw}
                        onTouchEnd={handleStopDrawing}
                     />
                 )}

                 {/* Modern Floating Toolbar (Dock) */}
                 {activeTab === 'board' && (
                     <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 flex flex-col gap-3 bg-slate-800/90 backdrop-blur-xl p-2 rounded-2xl border border-slate-700 shadow-2xl transition-all">
                         {/* ... toolbar buttons ... */}
                         <button 
                             onClick={() => { setCurrentTool('pen'); setIsShapeMenuOpen(false); setIsColorMenuOpen(false); }} 
                             className={`p-3 rounded-xl transition-all ${currentTool === 'pen' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                             title="Pen"
                         >
                             <span className="text-xl">✏️</span>
                         </button>

                         <button 
                             onClick={() => { setCurrentTool('eraser'); setIsShapeMenuOpen(false); setIsColorMenuOpen(false); }} 
                             className={`p-3 rounded-xl transition-all ${currentTool === 'eraser' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                             title="Eraser"
                         >
                             <span className="text-xl">🧽</span>
                         </button>

                         {/* Shapes Toggle */}
                         <div className="relative">
                             <button 
                                 onClick={() => { setIsShapeMenuOpen(!isShapeMenuOpen); setIsColorMenuOpen(false); }} 
                                 className={`p-3 rounded-xl transition-all ${['line', 'rect', 'circle'].includes(currentTool) ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                 title="Shapes"
                             >
                                 <span className="text-xl">📐</span>
                             </button>
                             
                             {/* Shapes Submenu - Popover to the right */}
                             {isShapeMenuOpen && (
                                 <div className="absolute left-full top-0 ml-3 bg-slate-800 border border-slate-700 rounded-xl p-2 flex flex-col gap-2 shadow-xl animate-fade-in-short z-40">
                                     <button onClick={() => { setCurrentTool('line'); setIsShapeMenuOpen(false); }} className={`p-2 rounded-lg hover:bg-slate-700 ${currentTool === 'line' ? 'bg-purple-600 text-white' : 'text-slate-300'}`} title="Line">📏</button>
                                     <button onClick={() => { setCurrentTool('rect'); setIsShapeMenuOpen(false); }} className={`p-2 rounded-lg hover:bg-slate-700 ${currentTool === 'rect' ? 'bg-purple-600 text-white' : 'text-slate-300'}`} title="Rectangle">⬜</button>
                                     <button onClick={() => { setCurrentTool('circle'); setIsShapeMenuOpen(false); }} className={`p-2 rounded-lg hover:bg-slate-700 ${currentTool === 'circle' ? 'bg-purple-600 text-white' : 'text-slate-300'}`} title="Circle">⭕</button>
                                 </div>
                             )}
                         </div>

                         {/* Color Picker */}
                         <div className="relative">
                              <button 
                                 onClick={() => { setIsColorMenuOpen(!isColorMenuOpen); setIsShapeMenuOpen(false); }}
                                 className="w-10 h-10 rounded-full border-2 border-white/20 shadow-sm mx-auto block transition-transform hover:scale-110 mt-1"
                                 style={{ backgroundColor: currentColor }}
                                 title="Color Palette"
                             />
                              {isColorMenuOpen && (
                                 <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-3 gap-2 shadow-xl w-40 animate-fade-in-short z-40">
                                     {['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#000000'].map(color => (
                                         <button
                                             key={color}
                                             onClick={() => { setCurrentColor(color); setIsColorMenuOpen(false); if(currentTool === 'eraser') setCurrentTool('pen'); }}
                                             className="w-8 h-8 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                                             style={{ backgroundColor: color }}
                                         />
                                     ))}
                                 </div>
                              )}
                         </div>

                         <div className="h-px bg-slate-700 w-full my-1"></div>

                         {/* Trash / Clear All */}
                         <button 
                             onClick={handleClearBoard} 
                             className="p-3 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-200 transition-all"
                             title="Erase All (Clear Board)"
                         >
                             <span className="text-xl">🗑️</span>
                         </button>
                     </div>
                 )}
            </div>

            {/* Navigation Bar */}
            <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 z-20">
                <Button onClick={() => changeStep(reconstructedLesson.currentStepIndex - 1)} disabled={reconstructedLesson.currentStepIndex === 0} variant="secondary">Previous Slide</Button>
                <span className="text-slate-400 font-mono">Slide {reconstructedLesson.currentStepIndex + 1} / {reconstructedLesson.lessonPlan.length}</span>
                <Button onClick={() => changeStep(reconstructedLesson.currentStepIndex + 1)} disabled={reconstructedLesson.currentStepIndex === reconstructedLesson.lessonPlan.length - 1}>Next Slide</Button>
            </div>
        </div>

        {/* RIGHT: Dynamics Panel */}
        {activeTab === 'dynamics' && (
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col animate-fade-in-right shadow-2xl z-20">
                <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="font-bold text-purple-300 mb-1">Interactive Checks</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => triggerAction('poll', 'Do you understand?', undefined, ['Yes', 'No'])} className="p-2 bg-slate-700 hover:bg-blue-600 rounded text-xs font-medium transition-colors border border-slate-600">
                            Check Understanding
                        </button>
                        <button onClick={() => triggerAction('poll', 'Can I proceed?', undefined, ['Yes', 'No'])} className="p-2 bg-slate-700 hover:bg-green-600 rounded text-xs font-medium transition-colors border border-slate-600">
                            Can I Proceed?
                        </button>
                        <button onClick={() => triggerAction('poll', 'Any questions?', undefined, ['No', 'Yes'])} className="p-2 bg-slate-700 hover:bg-orange-600 rounded text-xs font-medium transition-colors border border-slate-600">
                            Ask for Questions
                        </button>
                        <button onClick={() => triggerAction('celebration', 'Great job everyone!')} className="p-2 bg-slate-700 hover:bg-pink-600 rounded text-xs font-medium transition-colors border border-slate-600">
                            🎉 Celebrate
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {/* Active Action Monitor */}
                    {reconstructedLesson.activeAction ? (
                        <div className="bg-slate-800 rounded-xl p-4 border border-blue-500/30 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-sm text-blue-400 uppercase tracking-wider">Live Poll Active</h4>
                                <button onClick={() => db.collection('liveLessons').doc(lessonId).update({ activeAction: null })} className="text-xs text-red-400 hover:text-red-300">Stop</button>
                            </div>
                            <p className="text-lg font-semibold mb-4">{reconstructedLesson.activeAction.text}</p>
                            
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-400">Yes / Clear</span>
                                    <span className="font-bold">{yesCount}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${totalRes ? (yesCount/totalRes)*100 : 0}%` }}></div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm mt-2">
                                    <span className="text-red-400">No / Confused</span>
                                    <span className="font-bold">{noCount}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${totalRes ? (noCount/totalRes)*100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-6 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                            No active poll or question.
                        </div>
                    )}

                    {/* Confusion Analysis */}
                    {sortedConfusion.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-bold text-sm text-red-300 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                Confusion Hotspots
                            </h4>
                            {sortedConfusion.map(([text, count], idx) => (
                                <div key={idx} className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg hover:bg-red-900/30 transition-colors cursor-pointer group" onClick={() => handleGenerateSmartExplanation(text)}>
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs text-slate-300 line-clamp-2 italic">"...{text}..."</p>
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full">{count}</span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-red-900/30 flex justify-end">
                                        <button disabled={isGeneratingExplanation} className="text-xs text-red-400 font-medium flex items-center gap-1 group-hover:text-white transition-colors">
                                            {isGeneratingExplanation ? <Spinner /> : '✨ Explain with AI'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Student List */}
                    <div>
                        <h4 className="font-bold text-sm text-slate-400 mb-2 uppercase tracking-wider">Student Roster</h4>
                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {studentsInClass.map(s => (
                                <button 
                                    key={s.uid} 
                                    onClick={() => triggerAction('direct_question', `Hello ${s.name}, do you understand this part?`, s.uid)}
                                    className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-800 text-left group transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold group-hover:bg-blue-600 transition-colors">{(s.name || '?').charAt(0)}</div>
                                        <span className="text-sm text-slate-300 group-hover:text-white">{s.name}</span>
                                    </div>
                                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 border border-blue-500/30 px-1 rounded">Ask</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TeacherLiveClassroom;
