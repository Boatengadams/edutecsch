import React, { useState, useEffect, useRef } from 'react';

const FOCUS_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

interface FocusTimerProps {
  onSessionComplete?: () => void;
}

const FocusTimer: React.FC<FocusTimerProps> = ({ onSessionComplete }) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeRemaining, setTimeRemaining] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Audio for notification - a gentle sound
    audioRef.current = new Audio('https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-16/16:21:28.989Z/notification.mp3'); 
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  useEffect(() => {
    if (timeRemaining < 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      audioRef.current?.play();
      if (mode === 'focus') {
        onSessionComplete?.();
        setMode('break');
        setTimeRemaining(BREAK_TIME);
      } else {
        setMode('focus');
        setTimeRemaining(FOCUS_TIME);
      }
      setIsActive(false);
    }
  }, [timeRemaining, mode, onSessionComplete]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setMode('focus');
    setTimeRemaining(FOCUS_TIME);
  };
  
  const totalTime = mode === 'focus' ? FOCUS_TIME : BREAK_TIME;
  const progress = (timeRemaining / totalTime) * 100;
  
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="text-center p-6 rounded-lg flex flex-col items-center justify-center gap-6">
      <h3 className="text-2xl font-bold text-gray-200">{mode === 'focus' ? 'Focus Session' : 'Time for a Break!'}</h3>
      <div className="relative w-52 h-52">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="15" fill="none" />
          <circle
            cx="100" cy="100" r={radius}
            stroke={mode === 'focus' ? '#3b82f6' : '#10b981'}
            strokeWidth="15" fill="none"
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-mono text-white">
                {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
                {(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
        </div>
      </div>
      <div className="flex gap-4">
        <button onClick={toggleTimer} className="px-6 py-2 bg-slate-700 rounded-md text-lg hover:bg-slate-600 transition-colors">
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={resetTimer} className="px-6 py-2 bg-slate-800 rounded-md text-lg hover:bg-slate-700 transition-colors">
          Reset
        </button>
      </div>
    </div>
  );
};

export default FocusTimer;