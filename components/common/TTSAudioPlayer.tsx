import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import Spinner from './Spinner';

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

const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8.25 3.75a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75Z" /><path d="M4.5 5.25a.75.75 0 0 0 0 1.5v6.5a.75.75 0 0 0 0 1.5.75.75 0 0 0 0-1.5V6.75a.75.75 0 0 0 0-1.5Z" /><path d="M12 5.25a.75.75 0 0 0 0 1.5v6.5a.75.75 0 0 0 0 1.5.75.75 0 0 0 0-1.5V6.75a.75.75 0 0 0 0-1.5Z" /></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5 3.75A1.25 1.25 0 0 0 3.75 5v10A1.25 1.25 0 0 0 5 16.25h10A1.25 1.25 0 0 0 16.25 15V5A1.25 1.25 0 0 0 15 3.75H5Z" /></svg>;

interface TTSAudioPlayerProps {
  textToSpeak: string;
}

const TTSAudioPlayer: React.FC<TTSAudioPlayerProps> = ({ textToSpeak }) => {
  const [isLoading, setIsLoading] = useState(false);
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
    // FIX: Cast window to any for SpeechSynthesis
    if ((window as any).speechSynthesis && (window as any).speechSynthesis.speaking) {
        (window as any).speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleToggleAudio = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!textToSpeak || !textToSpeak.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio data received from API.");
      }

      // FIX: Cast window to any for webkitAudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioCtx = audioContextRef.current;
      
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioCtx,
        24000,
        1,
      );

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
      };
      
      source.start();
      audioSourceRef.current = source;
      setIsPlaying(true);

    } catch (err: any) {
      console.warn("TTS Error, falling back to browser synthesis:", err.message);
      // Fallback to browser's native SpeechSynthesis
      // FIX: Cast window and globals to any for SpeechSynthesis
      if ('speechSynthesis' in window) {
          const utterance = new (window as any).SpeechSynthesisUtterance(textToSpeak);
          utterance.onstart = () => setIsPlaying(true);
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = (e: any) => {
              console.error("Browser TTS Error:", e);
              setError('Could not play audio'); 
              setIsPlaying(false);
          };
          (window as any).speechSynthesis.speak(utterance);
      } else {
          console.error("Audio playback not supported.");
          setError('Not supported');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);
  
  const buttonContent = () => {
      if (isLoading) {
          return <Spinner />;
      }
      if (isPlaying) {
          return <StopIcon />;
      }
      return <PlayIcon />;
  };

  return (
    <div className="flex items-center gap-2">
        <button
          onClick={handleToggleAudio}
          disabled={isLoading || !textToSpeak || !textToSpeak.trim()}
          className="p-1.5 rounded-full bg-slate-600 text-gray-200 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          title={isPlaying ? 'Stop' : 'Read aloud'}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {buttonContent()}
          </div>
        </button>
        {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
};

export default TTSAudioPlayer;
