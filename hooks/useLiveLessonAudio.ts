import { useState, useEffect, useRef } from 'react';
import { LiveLesson } from '../types';

interface HighlightRange {
    start: number;
    end: number;
}

export const useLiveLessonAudio = (lesson: LiveLesson | null, currentStepIndex: number) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(null);
  const [error, setError] = useState('');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopPlayback = () => {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setHighlightRange(null);
  };

  useEffect(() => {
    // Stop any previously running speech from another step.
    stopPlayback();

    if (!lesson) {
      return;
    }

    const htmlContent = lesson.lessonPlan[currentStepIndex]?.boardContent;
    if (!htmlContent) {
      return;
    }

    const plainText = new DOMParser().parseFromString(htmlContent, 'text/html').body.textContent || '';
    if (!plainText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(plainText);
    utteranceRef.current = utterance; // Store the new utterance in the ref immediately.

    utterance.onstart = () => setIsPlaying(true);

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setHighlightRange({ start: event.charIndex, end: event.charIndex + event.charLength });
      }
    };
    
    utterance.onend = () => {
      // Ensure we only update state if this is the currently active utterance
      if (utteranceRef.current === utterance) {
        setIsPlaying(false);
        setHighlightRange(null);
      }
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        // Expected errors when we interrupt speech. We can safely ignore them.
        return;
      }
      console.error('SpeechSynthesis Error:', event.error);
      setError(`Audio Error: ${event.error}`);
      if (utteranceRef.current === utterance) {
        setIsPlaying(false);
        setHighlightRange(null);
      }
    };
    
    // Encapsulate speaking logic to handle asynchronous voice loading and race conditions.
    const speak = () => {
      // Don't proceed if this utterance is no longer the current one.
      if (utteranceRef.current !== utterance) return;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        // Defensive cancel + timeout to handle race conditions where `cancel()` is slow.
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        setTimeout(() => {
            // Check again that we are still supposed to speak this utterance after the delay.
            if (utteranceRef.current === utterance) {
                window.speechSynthesis.speak(utterance);
            }
        }, 50);
      }
    };
    
    // The voices might not be loaded initially. We listen for the 'voiceschanged' event.
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true });
    } else {
        speak();
    }
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', speak);
      stopPlayback();
    };
  }, [lesson, currentStepIndex]);

  return { isPlaying, highlightRange, error };
};
