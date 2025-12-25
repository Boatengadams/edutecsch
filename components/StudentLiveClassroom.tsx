import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from '../services/firebase';
import type { LiveLesson, LiveLessonResponse, UserProfile } from '../types';
import Spinner from './common/Spinner';
import SirEduAvatar from './common/SirEduAvatar';
// FIX: Added Card import which was missing and causing errors on lines 163 and 166.
import Card from './common/Card';
import Button from './common/Button';
import { useLiveLessonAudio } from '../hooks/useLiveLessonAudio';
import { useToast } from './common/Toast';

interface StudentLiveClassroomProps {
  lessonId: string;
  userProfile: UserProfile;
  onClose: () => void;
}

const REACTIONS = ['👍', '👏', '❤️', '🤯', '😮', '❓'];

const StudentLiveClassroom: React.FC<StudentLiveClassroomProps> = ({ lessonId, userProfile, onClose }) => {
  const { showToast } = useToast();
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [hasResponded, setHasResponded] = useState(false);
  const [confusionMode, setConfusionMode] = useState(false);
  const [isRaisingHand, setIsRaisingHand] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const unsubscribe = db.collection('liveLessons').doc(lessonId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as LiveLesson;
        setLesson({ id: doc.id, ...data });
        if (data.status === 'ended') { showToast("Lesson ended", "info"); onClose(); }
        setIsRaisingHand(data.raisedHands?.includes(userProfile.uid) || false);
      } else onClose();
    });
    return () => unsubscribe();
  }, [lessonId, userProfile.uid, onClose]);

  useEffect(() => {
      const canvas = canvasRef.current; if (!canvas || !lesson) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      if (lesson.drawingData) {
          lesson.drawingData.forEach(stroke => {
              ctx.beginPath();
              if (stroke.type === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 30; }
              else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = stroke.color; ctx.lineWidth = 4; }
              if ((stroke.type === 'pen' || stroke.type === 'eraser') && stroke.points) {
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
      }
  }, [lesson?.drawingData, lesson?.currentStepIndex]);

  const { isPlaying, playAudio } = useLiveLessonAudio(lesson?.currentBoardContent, null, lesson?.currentAudioUrl, lesson?.activeAction);
  
  const handleEnableAudio = () => { setAudioEnabled(true); playAudio(); };

  const handleResponse = async (answer: string) => {
      handleEnableAudio(); if (!lesson || !lesson.activeAction) return;
      const response: Omit<LiveLessonResponse, 'id'> = { lessonId: lesson.id, studentId: userProfile.uid, studentName: userProfile.name, actionId: lesson.activeAction.id, answer, timestamp: firebase.firestore.Timestamp.now() };
      await db.collection('liveLessons').doc(lessonId).collection('responses').add(response);
      setHasResponded(true); setConfusionMode(false);
      if (lesson.currentQuestion?.correctAnswer === answer) {
          const newXP = (userProfile.xp || 0) + 25;
          db.collection('users').doc(userProfile.uid).update({ xp: newXP });
          showToast("Brilliant! +25 XP", "success");
      }
  };

  const toggleRaiseHand = async () => {
      handleEnableAudio();
      const status = !isRaisingHand;
      await db.collection('liveLessons').doc(lessonId).update({
          raisedHands: status ? firebase.firestore.FieldValue.arrayUnion(userProfile.uid) : firebase.firestore.FieldValue.arrayRemove(userProfile.uid)
      });
      setIsRaisingHand(status);
  };

  if (!lesson) return <div className="flex h-screen items-center justify-center bg-slate-900"><Spinner /></div>;

  const showOverlay = lesson.activeAction && (lesson.activeAction.type === 'poll' || (lesson.activeAction.type === 'direct_question' && lesson.activeAction.targetStudentId === userProfile.uid)) && !hasResponded;

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Dynamic Immersive Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
              <div className="bg-red-600 px-4 py-1.5 rounded-full flex items-center gap-2.5 shadow-2xl border border-red-400/50">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
                  <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Session</span>
              </div>
              {!audioEnabled && (
                  <button onClick={handleEnableAudio} className="bg-blue-600 px-5 py-2 rounded-full flex items-center gap-2 shadow-2xl animate-bounce transition-transform active:scale-95 border border-blue-400">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Enable Classroom Audio 🔊</span>
                  </button>
              )}
          </div>
          <button onClick={onClose} className="pointer-events-auto bg-white/5 hover:bg-white/10 backdrop-blur-3xl text-white p-3 rounded-full border border-white/10 transition-all hover:rotate-90">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
      </header>

      {/* Presentation Stage */}
      <div className="flex-grow flex items-center justify-center p-4 md:p-12 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1),transparent_70%)]"></div>
           
           {/* Floating AI Teacher */}
           <div className="absolute bottom-16 left-10 z-30 transition-all duration-500 scale-110">
               <SirEduAvatar isSpeaking={isPlaying} />
           </div>

           {/* The Interactive Board */}
           <div className="w-full max-w-7xl aspect-video bg-white rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col border border-white/20">
                <div className="absolute inset-0 overflow-y-auto p-12 md:p-24 flex flex-col justify-center items-center z-10">
                    <div className="prose-styles prose-2xl text-center w-full !text-slate-900 leading-tight" dangerouslySetInnerHTML={{ __html: lesson.currentBoardContent }} />
                </div>
                {/* Whiteboard Overlay */}
                <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none w-full h-full" />
                
                {/* Teacher Pointer Layer */}
                {lesson.pointerPosition && (
                    <div className="absolute z-40 pointer-events-none w-6 h-6 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] border-2 border-white/50" style={{ left: `calc(${lesson.pointerPosition.x} * 100%)`, top: `calc(${lesson.pointerPosition.y} * 100%)`, transform: 'translate(-50%, -50%)' }}>
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                )}
           </div>
      </div>
      
      {/* Interaction Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center z-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-3xl p-3 rounded-full border border-white/5 shadow-2xl">
              <button onClick={toggleRaiseHand} className={`p-4 rounded-full transition-all flex items-center justify-center text-2xl shadow-lg ${isRaisingHand ? 'bg-amber-500 text-black animate-pulse scale-125' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="Raise Hand">✋</button>
              <div className="h-10 w-px bg-slate-700 mx-2"></div>
              {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { handleEnableAudio(); showToast(`Sent ${emoji}`, 'info'); }} className="p-3 text-2xl hover:scale-125 transition-transform hover:rotate-12">{emoji}</button>
              ))}
          </div>
      </div>

      {/* Interactive Overlays */}
      {lesson.activeAction?.type === 'explanation' && (
          <div className="absolute top-24 right-10 max-w-sm w-full z-50 animate-fade-in-right">
              <Card className="!bg-blue-600 text-white border-blue-400 shadow-2xl">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 opacity-80">Teacher Insight</h4>
                  <p className="text-lg font-bold leading-tight">{lesson.activeAction.text}</p>
              </Card>
          </div>
      )}

      {showOverlay && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-3xl p-10 relative overflow-hidden animate-fade-in-up">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
                  <h3 className="text-center text-3xl font-black text-white mb-3 tracking-tight">CLASS CHECK-IN</h3>
                  <p className="text-center text-slate-300 text-xl mb-10 font-medium">"{lesson.activeAction?.text}"</p>
                  <div className="grid grid-cols-2 gap-4">
                      {lesson.activeAction?.options?.map(opt => (
                          <button key={opt} onClick={() => handleResponse(opt)} className="py-5 px-6 bg-slate-800 hover:bg-blue-600 border border-white/5 rounded-2xl text-xl font-black transition-all shadow-xl hover:scale-[1.03] uppercase tracking-wider">{opt}</button>
                      )) || (
                          <>
                            <button onClick={() => handleResponse('Yes')} className="py-5 px-6 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xl font-black transition-all shadow-xl uppercase tracking-wider">Yes, Clear!</button>
                            <button onClick={() => handleResponse('No')} className="py-5 px-6 bg-slate-800 hover:bg-rose-600 rounded-2xl text-xl font-black transition-all shadow-xl uppercase tracking-wider">Not Yet</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentLiveClassroom;