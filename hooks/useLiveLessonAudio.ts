import { useState, useEffect, useRef } from 'react';
import { LiveLesson, UserProfile } from '../types';
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

export const useLiveLessonAudio = (lesson: LiveLesson | null, currentStepIndex: number, teacherProfile: UserProfile | null) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPlayback = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    stopPlayback();

    if (!lesson || !teacherProfile) {
      return;
    }

    const htmlContent = lesson.lessonPlan[currentStepIndex]?.boardContent;
    if (!htmlContent) return;

    const plainText = stripHtml(htmlContent);
    if (!plainText.trim()) return;
    
    const playAudio = async () => {
        setIsPlaying(true); // Optimistically set to true
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: plainText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: teacherProfile.preferredVoice || 'Kore' },
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
            // isPlaying is already true
        } catch (err: any) {
            console.error("TTS Error:", err);
            setError(`Audio Error: ${err.message}`);
            setIsPlaying(false);
        }
    };
    
    playAudio();

    return () => {
      stopPlayback();
    };
  }, [lesson, currentStepIndex, teacherProfile]);
  
   useEffect(() => {
    // Cleanup audio context on component unmount
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { isPlaying, error };
};