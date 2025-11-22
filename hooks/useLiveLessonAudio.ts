
import { useState, useEffect, useRef } from 'react';
import { LiveLesson, UserProfile, LiveAction } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';

// Helper functions for audio decoding
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

export const useLiveLessonAudio = (
    htmlContent: string | undefined, 
    teacherProfile: UserProfile | null,
    currentAudioUrl?: string | null, // Updated type
    activeAction?: LiveAction | null
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const lastPlayedSlideContent = useRef<string | null>(null);
  const lastPlayedActionId = useRef<string | null>(null);
  const lastPlayedAudioUrl = useRef<string | null>(null);

  const stopPlayback = () => {
    // Stop Web Audio API source
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch(e) { /* ignore if already stopped */ }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    // Stop HTML Audio element
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0; // Reset
    }
    // Stop browser fallback playback
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    const handleAudio = async () => {
        // PRIORITY 1: Active Action (Poll, Explanation, Direct Question)
        // If there is an active action we haven't played yet, play it immediately
        if (activeAction && activeAction.id !== lastPlayedActionId.current) {
            stopPlayback();
            lastPlayedActionId.current = activeAction.id;
            
            // Don't play audio for 'poll' type actions if they are just "Yes/No" generic checks, 
            // but DO play if it's an explanation or direct question.
            if (activeAction.text) {
                await playDynamicTTS(activeAction.text);
            }
            return; 
        }

        // PRIORITY 2: Pre-generated Audio URL for Slide (SMOOTH PLAYBACK)
        if (!activeAction && currentAudioUrl && currentAudioUrl !== lastPlayedAudioUrl.current) {
             stopPlayback();
             lastPlayedAudioUrl.current = currentAudioUrl;
             lastPlayedSlideContent.current = htmlContent || ''; // Mark content as "handled" by this URL
             playUrlAudio(currentAudioUrl);
             return;
        }

        // PRIORITY 3: Dynamic TTS for Slide Content (Fallback)
        // Only if no audio URL and content changed
        if (!activeAction && htmlContent && !currentAudioUrl && htmlContent !== lastPlayedSlideContent.current) {
            stopPlayback();
            lastPlayedSlideContent.current = htmlContent;
            lastPlayedAudioUrl.current = null;
            const plainText = stripHtml(htmlContent || '');
            if (plainText.trim()) {
                await playDynamicTTS(plainText);
            }
        }
    };

    handleAudio();

    return () => {
        // Clean up on unmount
    };
  }, [htmlContent, teacherProfile, currentAudioUrl, activeAction]);
  
  const playUrlAudio = (url: string) => {
      // Use HTML5 Audio for smoother streaming/buffering of pre-generated files
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = (e) => {
          console.error("Audio URL playback failed", e);
          setIsPlaying(false);
          // Fallback to TTS if file fails
          const plainText = stripHtml(htmlContent || '');
          if (plainText.trim()) playDynamicTTS(plainText);
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
          playPromise.catch(e => {
              console.warn("Autoplay prevented by browser policy:", e);
              setIsPlaying(false);
              setError("Tap 'Enable Audio' to join.");
          });
      }
  };

  const playDynamicTTS = async (text: string) => {
        setIsPlaying(true); 
        setError('');
        
        const playWithBrowserTTS = (txt: string) => {
            console.warn("Falling back to browser's native TTS.");
            if ('speechSynthesis' in window) {
                stopPlayback();
                const utterance = new SpeechSynthesisUtterance(txt);
                utterance.onstart = () => setIsPlaying(true);
                utterance.onend = () => setIsPlaying(false);
                window.speechSynthesis.speak(utterance);
            } else {
                setIsPlaying(false);
            }
        };

        try {
            // Use 'Kore' as default if profile isn't ready, or use teacher's preference
            const preferredVoice = teacherProfile?.preferredVoice || 'Kore';
            // Check if it's a custom voice ID (simple UUID check) or a prebuilt name
            const isCustomVoice = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(preferredVoice);
            const voiceToUse = isCustomVoice ? 'Kore' : preferredVoice;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceToUse },
                        },
                    },
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received from API.");

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioCtx = audioContextRef.current;
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            
            source.onended = () => {
                setIsPlaying(false);
                audioSourceRef.current = null;
            };
            
            source.start();
            audioSourceRef.current = source;
        } catch (err: any) {
            console.error("TTS Error, falling back:", err);
            playWithBrowserTTS(text);
        }
    };
  
   useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Expose manual play for "Join Audio" buttons
  const playAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }
      // If we have a pending URL or text that was blocked, retry it
      if (lastPlayedAudioUrl.current) {
          playUrlAudio(lastPlayedAudioUrl.current);
      } else if (lastPlayedSlideContent.current) {
          playDynamicTTS(stripHtml(lastPlayedSlideContent.current));
      }
  };

  return { isPlaying, error, playAudio };
};
