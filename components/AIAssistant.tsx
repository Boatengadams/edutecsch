import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { Chat } from '@google/genai';
import html2canvas from 'html2canvas';

import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';

// FIX: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These types are not included in standard DOM typings.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognition {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface WebSearchResult {
  uri: string;
  title: string;
}

interface GroundingChunk {
  web?: WebSearchResult;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  snapshot?: string | null;
  searchResults?: GroundingChunk[];
}

interface AIAssistantProps {
  systemInstruction: string;
  suggestedPrompts?: string[];
  isEmbedded?: boolean;
}

// Helper functions for audio decoding for TTS
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
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}


// Camera Modal Component
const CameraModal: React.FC<{ onClose: () => void; onCapture: (dataUrl: string) => void; }> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState('');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

    useEffect(() => {
        const checkForMultipleCameras = async () => {
            if (navigator.mediaDevices?.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoInputs = devices.filter(device => device.kind === 'videoinput');
                    setHasMultipleCameras(videoInputs.length > 1);
                } catch (err) {
                    console.error("Error enumerating devices:", err);
                }
            }
        };
        checkForMultipleCameras();
    }, []);

    useEffect(() => {
        // Stop any existing stream before starting a new one when switching cameras
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        const startCamera = async () => {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } else {
                    setCameraError("Camera not supported on this device.");
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setCameraError("Could not access the camera. Please check permissions or try a different camera.");
            }
        };

        startCamera();

        // Cleanup function to stop the stream when the component unmounts
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    const handleCapture = () => {
        const video = videoRef.current;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                // If using the front camera, we flip the canvas horizontally before drawing
                // to get a non-mirrored final image.
                if (facingMode === 'user') {
                    context.translate(canvas.width, 0);
                    context.scale(-1, 1);
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
            }
        }
    };
    
    const handleUsePhoto = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };

    const handleSwitchCamera = () => {
        setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-[60]">
            <Card className="w-full max-w-lg">
                 <h3 className="text-lg font-bold mb-4">Take a Picture</h3>
                 {cameraError ? (
                    <p className="text-red-400">{cameraError}</p>
                 ) : (
                    <div className="space-y-4">
                        <div className="bg-black rounded-md overflow-hidden aspect-video relative">
                            {capturedImage ? (
                                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                            ) : (
                                <>
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        className="w-full h-full object-contain"
                                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
                                    ></video>
                                    {hasMultipleCameras && (
                                        <button 
                                            onClick={handleSwitchCamera} 
                                            type="button"
                                            className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-colors"
                                            title="Switch Camera"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0 0-3.181-3.183a8.25 8.25 0 0 1 11.667 0l3.181 3.183" />
                                            </svg>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                         <div className="flex justify-center gap-4">
                            {capturedImage ? (
                                <>
                                    <Button onClick={() => setCapturedImage(null)}>Retake</Button>
                                    <Button onClick={handleUsePhoto}>Use Photo</Button>
                                </>
                            ) : (
                                <Button onClick={handleCapture}>Capture</Button>
                            )}
                        </div>
                    </div>
                 )}
                 <Button variant="secondary" onClick={onClose} className="w-full mt-4">Cancel</Button>
            </Card>
        </div>
    );
};


const AIAssistant: React.FC<AIAssistantProps> = ({ systemInstruction, suggestedPrompts = [], isEmbedded = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm Edu. How can I help you today? I can summarize the content on your current page if you'd like!" }
  ]);
  const [input, setInput] = useState('');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // -- Audio Playback State --
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [audioState, setAudioState] = useState<{ status: 'idle' | 'loading' | 'playing' | 'paused' | 'error', text: string | null }>({ status: 'idle', text: null });
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackOffsetRef = useRef(0);
  const playbackStartTimeRef = useRef(0);
  const clickTimeoutRef = useRef<number | null>(null);
  // -- End Audio Playback State --


  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const hasInitialized = useRef(false);

  // Initialize or re-initialize the chat session when system instruction changes
  useEffect(() => {
    try {
      if (!process.env.API_KEY) {
          throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          tools: [{googleSearch: {}}],
        },
      });
      chatRef.current = newChat;

      // When embedded, the instruction can change frequently. We don't want to reset the chat history each time.
      // But if it's the floating assistant, a context change (new page) should reset it.
      if (hasInitialized.current && !isEmbedded) {
         setMessages([
            { role: 'model', text: "Hello! I'm Edu. How can I help you today?" }
         ]);
      }
      hasInitialized.current = true;

    } catch (e: any) {
      console.error("Failed to initialize AI Assistant:", e);
      setError("Could not initialize the AI Assistant. Please check your configuration.");
    }
  }, [systemInstruction, isEmbedded]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        const recognition: SpeechRecognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setInput(transcript);
        };

        recognition.onend = () => {
            setIsListening(false);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error", event.error);
            let errorMessage = `Speech recognition error: ${event.error}.`;
            if (event.error === 'not-allowed') {
                errorMessage = "Microphone access was denied. Please allow microphone access in your browser's site settings to use voice input.";
            } else if (event.error === 'no-speech') {
                errorMessage = "No speech was detected. Please try again.";
            }
            setError(errorMessage);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    } else {
        console.warn("Speech Recognition not supported in this browser.");
    }
  }, []);
  
    // Audio Player Cleanup
    useEffect(() => {
        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current.disconnect();
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen || isEmbedded) {
        scrollToBottom();
    }
  }, [messages, isLoading, isOpen, isEmbedded]);
  
  const handleTakeSnapshot = async () => {
    const assistantCard = document.querySelector('.assistant-card-wrapper');
    if (assistantCard) (assistantCard as HTMLElement).style.visibility = 'hidden';
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        ignoreElements: (element) => element.classList.contains('assistant-card-wrapper'),
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setSnapshot(dataUrl);
    } catch (e) {
      console.error("Error taking snapshot:", e);
      setError("Could not take a snapshot of the page.");
    } finally {
      if (assistantCard) (assistantCard as HTMLElement).style.visibility = 'visible';
    }
  };


    // -- Audio Playback Functions --
    const stopAudio = (resetState = false) => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        if (resetState) {
            setAudioState({ status: 'idle', text: null });
            audioBufferRef.current = null;
            playbackOffsetRef.current = 0;
        }
    };

    const startPlayback = (offset = 0) => {
        if (!audioBufferRef.current) return;

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = audioContextRef.current;
        stopAudio();

        const source = audioCtx.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioCtx.destination);

        source.onended = () => {
            if (audioSourceRef.current === source) {
                stopAudio(true);
            }
        };
        
        const validOffset = Math.max(0, Math.min(offset, audioBufferRef.current.duration));
        source.start(0, validOffset);

        audioSourceRef.current = source;
        playbackStartTimeRef.current = audioCtx.currentTime - validOffset;
        playbackOffsetRef.current = validOffset;
        setAudioState(prev => ({ ...prev!, status: 'playing' }));
    };

    const playAudio = async (text: string) => {
        stopAudio(true);
        setAudioState({ status: 'loading', text });
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received.");

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
            audioBufferRef.current = audioBuffer;
            startPlayback(0);
        } catch (err) {
            console.error("TTS failed:", err);
            setAudioState({ status: 'error', text });
        }
    };
    // -- End Audio Playback Functions --

  const sendMessage = async (messageText: string, messageSnapshot: string | null) => {
    if ((!messageText.trim() && !messageSnapshot) || isLoading) return;

    const userMessage: Message = { role: 'user', text: messageText, snapshot: messageSnapshot };
    setMessages(prev => [...prev, userMessage, { role: 'model', text: '▋' }]);
    
    setInput('');
    setSnapshot(null);
    setIsLoading(true);
    setError('');

    try {
      if (!chatRef.current) throw new Error("Chat session not initialized.");
      
      let promptParts: (string | { inlineData: { mimeType: string, data: string } })[];
      if (messageSnapshot) {
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: messageSnapshot.split(',')[1] } };
        promptParts = [messageText, imagePart];
      } else {
        promptParts = [messageText];
      }

      const responseStream = await chatRef.current.sendMessageStream({ message: promptParts });

      let fullText = '';
      let finalResponse: any = null;

      for await (const chunk of responseStream) {
        fullText += chunk.text;
        finalResponse = chunk; // Keep track of the last chunk
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = fullText + '▋';
            return newMessages;
        });
      }
      
      const finalModelMessage: Message = { 
        role: 'model', 
        text: fullText, 
        searchResults: finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks 
      };

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = finalModelMessage;
        return newMessages;
      });

      if (isConversationMode) {
        playAudio(fullText);
      }
    } catch (e: any) {
      console.error("Error sending message to Gemini:", e);
      const errorMessage: Message = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = errorMessage;
          return newMessages;
      });
      setError("Failed to get a response from the AI.");
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(msg => ({ ...msg, text: msg.text.replace(/▋$/, '') })));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, snapshot);
  };
  
  const handleSuggestionClick = (prompt: string) => {
      setInput(prompt);
      sendMessage(prompt, null);
  };

  const handleToggleListening = () => {
    if (isLoading) return;
    if (!recognitionRef.current) {
        setError("Voice recognition is not supported by your browser.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
        setIsListening(true);
        setInput('');
        setError('');
    }
  };

    const handlePlayPause = () => {
        if (!audioBufferRef.current) return;
        if (audioState.status === 'playing') {
            stopAudio();
            const elapsed = audioContextRef.current!.currentTime - playbackStartTimeRef.current;
            playbackOffsetRef.current = elapsed;
            setAudioState(prev => ({ ...prev!, status: 'paused' }));
        } else if (audioState.status === 'paused') {
            startPlayback(playbackOffsetRef.current);
        }
    };

    const handleSpeakerClick = () => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            stopAudio(true); // Double-click to stop
        } else {
            clickTimeoutRef.current = window.setTimeout(() => {
                if (audioState.status === 'playing' || audioState.status === 'paused') {
                    handlePlayPause();
                } else {
                    setIsConversationMode(prev => !prev);
                }
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    const handleSeek = (amount: number) => {
        if (!audioBufferRef.current) return;
        let currentPosition = 0;
        if (audioState.status === 'playing' && audioContextRef.current) {
            currentPosition = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        } else if (audioState.status === 'paused') {
            currentPosition = playbackOffsetRef.current;
        } else {
            return;
        }
        startPlayback(currentPosition + amount);
    };


    const renderSpeakerIcon = () => {
        const iconProps = { className: "w-5 h-5" };
        switch (audioState.status) {
            case 'loading':
                return <Spinner />;
            case 'playing':
                return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-6-13.5v13.5" /></svg>;
            case 'paused':
                return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l7.54 4.347c1.25.722 1.25 2.565 0 3.286l-7.54 4.347c-1.25.722-2.779-.217-2.779-1.643V5.653Z" /></svg>;
            case 'idle':
            case 'error':
            default:
                return isConversationMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6.375a4.5 4.5 0 0 1 7.5 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
                );
        }
    };
    
    const renderChatInterface = () => (
      <>
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">AI Assistant</h3>
                <div className="flex items-center gap-1" title="Click to toggle conversation mode. Double click to stop playback.">
                    <button type="button" onClick={handleSpeakerClick} className={`p-1.5 rounded-full transition-colors ${isConversationMode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                        {renderSpeakerIcon()}
                    </button>
                </div>
            </div>
            {!isEmbedded && <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">&times;</button>}
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">E</div>}
                    <div className={`p-3 rounded-lg max-w-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                        {msg.role === 'model' ? (
                            <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^- (.*)/gm, '• $1').replace(/\n/g, '<br />') }} />
                        ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}
                        {msg.snapshot && msg.role === 'user' && <img src={msg.snapshot} alt="Page snapshot" className="mt-2 rounded-md max-w-xs" />}
                        {msg.searchResults && msg.role === 'model' && (
                            <div className="mt-2 text-xs">
                                <p className="font-bold">Sources:</p>
                                {msg.searchResults.map((result, i) => result.web && (
                                    <a key={i} href={result.web.uri} target="_blank" rel="noopener noreferrer" className="block text-blue-300 hover:underline truncate">{result.web.title}</a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        <footer className="flex-shrink-0 p-4 border-t border-slate-700">
            {snapshot && (
                <div className="relative mb-2 w-24">
                    <img src={snapshot} alt="Page snapshot" className="rounded-md" />
                    <button onClick={() => setSnapshot(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                </div>
            )}
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            {suggestedPrompts && suggestedPrompts.length > 0 && messages.length <= 1 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                    {suggestedPrompts.slice(0, 3).map(p => (
                        <button key={p} onClick={() => handleSuggestionClick(p)} className="px-2 py-1 text-xs bg-slate-700 rounded-full hover:bg-slate-600">{p}</button>
                    ))}
                </div>
            )}
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                <button type="button" onClick={() => setShowCamera(true)} className="p-2 rounded-full hover:bg-slate-700" title="Attach picture">📷</button>
                <button type="button" onClick={handleTakeSnapshot} className="p-2 rounded-full hover:bg-slate-700" title="Attach snapshot of page">🖼️</button>
                <button type="button" onClick={handleToggleListening} className={`p-2 rounded-full hover:bg-slate-700 ${isListening ? 'text-red-500 animate-pulse' : ''}`} title="Use microphone">🎙️</button>

                <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." className="flex-grow p-2 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                <Button type="submit" disabled={isLoading} size="md">Send</Button>
            </form>
        </footer>
      </>
    );

    if (isEmbedded) {
        return (
            <div className="w-full h-full flex flex-col">
                {renderChatInterface()}
                {showCamera && <CameraModal onClose={() => setShowCamera(false)} onCapture={(dataUrl) => { setSnapshot(dataUrl); setShowCamera(false); }} />}
            </div>
        );
    }

    return (
    <>
      <div className="fixed bottom-6 right-6 z-40 assistant-card-wrapper">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500"
            aria-label="Open AI Assistant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
          </button>
        ) : (
          <Card className="w-[440px] h-[600px] flex flex-col animate-fade-in-up">
            {renderChatInterface()}
          </Card>
        )}
      </div>
      {showCamera && <CameraModal onClose={() => setShowCamera(false)} onCapture={(dataUrl) => { setSnapshot(dataUrl); setShowCamera(false); }} />}
    </>
  );
};

export default AIAssistant;
