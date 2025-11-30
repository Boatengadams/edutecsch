
import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from '../services/firebase';
import type { LiveLesson, LiveLessonResponse, UserProfile, LiveAction } from '../types';
import Spinner from './common/Spinner';
import SirEduAvatar from './common/SirEduAvatar';
import Button from './common/Button';
import Card from './common/Card';
import { useLiveLessonAudio } from '../hooks/useLiveLessonAudio';
import { useToast } from './common/Toast';

interface StudentLiveClassroomProps {
  lessonId: string;
  userProfile: UserProfile;
  onClose: () => void;
}

const StudentLiveClassroom: React.FC<StudentLiveClassroomProps> = ({ lessonId, userProfile, onClose }) => {
  const { showToast } = useToast();
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [hasRespondedToAction, setHasRespondedToAction] = useState(false);
  const [confusionMode, setConfusionMode] = useState(false);
  const [parsedConfusionItems, setParsedConfusionItems] = useState<string[]>([]);
  const [isRaisingHand, setIsRaisingHand] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false); // Track if user has interacted
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Lesson
  useEffect(() => {
    const unsubscribe = db.collection('liveLessons').doc(lessonId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as LiveLesson;
        setLesson({ id: doc.id, ...data });
        if (data.status === 'ended') {
            alert("The lesson has ended.");
            onClose();
        }
      } else {
        onClose();
      }
    });
    return () => unsubscribe();
  }, [lessonId, onClose]);

  // Render Whiteboard Data
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !lesson) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle resizing
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (lesson.drawingData) {
          lesson.drawingData.forEach(stroke => {
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
      }
  }, [lesson?.drawingData, lesson?.currentStepIndex]);

  // Reset response state when action changes
  useEffect(() => {
      setHasRespondedToAction(false);
      setConfusionMode(false);
  }, [lesson?.activeAction?.id]);

  // Audio Hook - Handles TTS for slides and active actions
  // Now passes lesson.currentAudioUrl which is auto-updated by teacher
  const { isPlaying, playAudio } = useLiveLessonAudio(
      lesson?.currentBoardContent, 
      null, 
      lesson?.currentAudioUrl, // Pass the pre-generated audio URL if available
      lesson?.activeAction
  );
  
  const handleEnableAudio = () => {
      setAudioEnabled(true);
      // Trigger a silent play or the current audio to unlock the context
      if (lesson?.activeAction?.text) {
          // Logic handled inside hook, but interaction unblocks future plays
      }
  };

  const handleResponse = async (answer: string, confusionPoint?: string) => {
      handleEnableAudio(); // Interaction enables audio
      if (!lesson || !lesson.activeAction) return;
      
      const responseData: Omit<LiveLessonResponse, 'id'> = {
          lessonId: lesson.id,
          studentId: userProfile.uid,
          studentName: userProfile.name,
          actionId: lesson.activeAction.id,
          answer: answer,
          timestamp: firebase.firestore.Timestamp.now()
      };

      if (confusionPoint) {
          responseData.confusionPoint = confusionPoint;
      }

      await db.collection('liveLessons').doc(lessonId).collection('responses').add(responseData);
      setHasRespondedToAction(true);
      setConfusionMode(false);

      // Award Points if it was a Quiz Question (Poll linked to slide question)
      // Check if the slide has a question and if the answer matches
      if (lesson.currentQuestion && lesson.currentQuestion.correctAnswer) {
          if (answer === lesson.currentQuestion.correctAnswer) {
              const currentXP = userProfile.xp || 0;
              const newXP = currentXP + 20;
              await db.collection('users').doc(userProfile.uid).update({ xp: newXP });
              showToast("Correct! +20 XP", 'success');
          }
      } else {
          // Participation Points
          const currentXP = userProfile.xp || 0;
          await db.collection('users').doc(userProfile.uid).update({ xp: currentXP + 5 });
      }
  };

  const handleNoClick = () => {
      // Parse current board content to find potential confusion points
      if (lesson?.currentBoardContent) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(lesson.currentBoardContent, 'text/html');
          // Extract text from li, p, h1-h6
          const elements = doc.querySelectorAll('li, p, h1, h2, h3');
          const items = Array.from(elements).map(el => el.textContent?.trim()).filter(t => t && t.length > 5); // Filter short junk
          
          if (items.length > 0) {
              setParsedConfusionItems(items as string[]);
              setConfusionMode(true);
          } else {
              // If no clear text structure, just submit generic "No"
              handleResponse('No');
          }
      } else {
          handleResponse('No');
      }
  };
  
  const toggleRaiseHand = async () => {
      handleEnableAudio(); // Interaction enables audio
      const newStatus = !isRaisingHand;
      setIsRaisingHand(newStatus);
      // In a real app, we'd update a 'raisedHands' array in the lesson doc
      // Assuming lesson.raisedHands is available in types now
      try {
          if (newStatus) {
              await db.collection('liveLessons').doc(lessonId).update({
                  raisedHands: firebase.firestore.FieldValue.arrayUnion(userProfile.uid)
              });
          } else {
              await db.collection('liveLessons').doc(lessonId).update({
                  raisedHands: firebase.firestore.FieldValue.arrayRemove(userProfile.uid)
              });
          }
      } catch (err) {
          console.error("Failed to toggle raise hand", err);
      }
  };

  if (!lesson) return <div className="flex justify-center items-center h-screen bg-slate-900"><Spinner /></div>;

  // Determine if this student is the target of a direct question
  const isDirectTarget = lesson.activeAction?.type === 'direct_question' && lesson.activeAction.targetStudentId === userProfile.uid;
  const isBroadcast = lesson.activeAction && !lesson.activeAction.targetStudentId && lesson.activeAction.type === 'poll';
  const showOverlay = (isBroadcast || isDirectTarget) && !hasRespondedToAction;
  const isExplanation = lesson.activeAction?.type === 'explanation';

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col overflow-hidden font-sans">
      {/* Immersive Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
              <div className="bg-red-600/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-lg border border-red-500/50">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Live Class</span>
              </div>
              {!audioEnabled && (
                  <button onClick={handleEnableAudio} className="bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-lg animate-bounce cursor-pointer pointer-events-auto">
                      <span className="text-xs font-bold text-white">Tap to Enable Audio 🔊</span>
                  </button>
              )}
          </div>
          <button onClick={onClose} className="pointer-events-auto bg-slate-900/50 hover:bg-slate-800 backdrop-blur-md text-white p-2 rounded-full border border-slate-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
      </header>

      {/* Main Stage - Fullscreen Content */}
      <div className="flex-grow flex items-center justify-center p-4 md:p-8 bg-gradient-to-b from-slate-900 to-slate-950 relative">
           {/* Teacher Avatar Floating */}
           <div className="absolute bottom-20 left-4 z-10 pointer-events-none transition-transform duration-300">
               <SirEduAvatar isSpeaking={isPlaying} />
           </div>

           {/* Content Board */}
           <div className="w-full max-w-6xl aspect-video bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden relative flex flex-col justify-center items-center transition-all duration-500">
                <div className="absolute inset-0 overflow-y-auto p-8 md:p-16 flex flex-col justify-center items-center z-0">
                    <div className="prose-styles prose-2xl text-center w-full" dangerouslySetInnerHTML={{ __html: lesson.currentBoardContent }} />
                </div>
                {/* Student View Canvas - Read Only */}
                <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none w-full h-full" />
           </div>
      </div>
      
      {/* Bottom Interaction Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center items-center gap-4 z-30 bg-gradient-to-t from-slate-900 to-transparent pb-8">
          <div className="flex gap-2 bg-slate-800/80 backdrop-blur-md p-2 rounded-full border border-slate-700 shadow-xl">
              <button 
                onClick={toggleRaiseHand}
                className={`p-3 rounded-full transition-all ${isRaisingHand ? 'bg-yellow-500 text-black scale-110' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                title="Raise Hand"
              >
                  ✋
              </button>
              <div className="w-px bg-slate-600 mx-1"></div>
              <button onClick={handleEnableAudio} className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-110 transition-all" title="Like">👍</button>
              <button onClick={handleEnableAudio} className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-110 transition-all" title="Clap">👏</button>
              <button onClick={handleEnableAudio} className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-110 transition-all" title="Love">❤️</button>
          </div>
      </div>

      {/* INTERACTION OVERLAYS */}
      
      {/* 1. Explanation Card (Teacher explaining something) */}
      {isExplanation && (
          <div className="absolute top-24 right-4 max-w-sm w-full bg-slate-800/90 backdrop-blur-md border-l-4 border-blue-500 p-4 rounded-lg shadow-2xl animate-fade-in-right z-30">
              <h4 className="text-blue-300 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                  <span className="text-lg">💡</span> Teacher Note
              </h4>
              <p className="text-white text-lg leading-relaxed">{lesson.activeAction?.text}</p>
              <div className="mt-2 flex justify-end">
                  {/* Visual cue that audio is playing for explanation */}
                  {isPlaying && <div className="flex gap-1 h-3 items-end"><div className="w-1 bg-blue-400 h-full animate-pulse"></div><div className="w-1 bg-blue-400 h-2/3 animate-pulse delay-75"></div><div className="w-1 bg-blue-400 h-full animate-pulse delay-150"></div></div>}
              </div>
          </div>
      )}

      {/* 2. Active Action Overlay (Poll/Question) */}
      {showOverlay && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-40 flex items-end pb-24 sm:items-center sm:pb-0 justify-center">
              <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-up relative overflow-hidden">
                  {/* Glowing Border Effect */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  
                  <h3 className="text-center text-2xl font-bold text-white mb-2">
                      {isDirectTarget ? `📢 ${userProfile.name}, question for you!` : "Quick Check"}
                  </h3>
                  <p className="text-center text-slate-300 text-lg mb-8 font-medium leading-relaxed">
                      {lesson.activeAction?.text}
                  </p>

                  {confusionMode ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          <p className="text-sm text-center text-gray-400 mb-2">Tap the part you find confusing:</p>
                          {parsedConfusionItems.map((item, idx) => (
                              <button 
                                key={idx}
                                onClick={() => handleResponse('No', item)}
                                className="w-full text-left p-3 bg-slate-700/50 hover:bg-red-900/30 border border-slate-600 hover:border-red-500 rounded-lg text-sm transition-all text-slate-200"
                              >
                                  {item}
                              </button>
                          ))}
                          <button onClick={() => handleResponse('No', 'General Confusion')} className="w-full p-2 text-center text-slate-400 text-xs hover:text-white mt-2 underline decoration-slate-600">I'm confused about everything</button>
                      </div>
                  ) : (
                      <div className="grid grid-cols-2 gap-4">
                          {lesson.activeAction?.options ? (
                              lesson.activeAction.options.map(opt => (
                                  <Button key={opt} onClick={() => opt === 'No' ? handleNoClick() : handleResponse(opt)} variant={opt === 'No' ? 'secondary' : 'primary'} className="py-4 text-lg shadow-lg">
                                      {opt}
                                  </Button>
                              ))
                          ) : (
                              // Default Yes/No if no options provided
                              <>
                                <Button onClick={() => handleResponse('Yes')} className="bg-green-600 hover:bg-green-500 py-4 text-lg shadow-lg shadow-green-900/20">Yes, I get it 👍</Button>
                                <Button onClick={handleNoClick} variant="secondary" className="py-4 text-lg shadow-lg">No, I'm lost 👎</Button>
                              </>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 3. Celebration Overlay */}
      {lesson.activeAction?.type === 'celebration' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
              <div className="text-6xl animate-bounce drop-shadow-lg">🎉</div>
              {/* Simple CSS confetti effect could be added here */}
          </div>
      )}

    </div>
  );
};

export default StudentLiveClassroom;
