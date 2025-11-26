
import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';
import CameraModal from './CameraModal';
import { GoogleGenAI } from '@google/genai';

// Helper to convert dataURL to File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

// Helper to get a preview URL from a File object
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface ChatInputProps {
  onSendMessage: (message: { text: string; image: File | null; audio: Blob | null; }) => Promise<void>;
  isSending: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isSending }) => {
    const [text, setText] = useState('');
    const [imageToSend, setImageToSend] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null });
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Mobile Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingTimerRef = useRef<number | null>(null);

    // AI Fix State
    const [isFixing, setIsFixing] = useState(false);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [text]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!canSend) return;
        
        await onSendMessage({ text, image: imageToSend.file, audio: audioBlob });
        setText('');
        setImageToSend({ file: null, preview: null });
        setAudioBlob(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const preview = await fileToDataUrl(file);
            setImageToSend({ file, preview });
            setIsMenuOpen(false);
        }
    };

    const handleCameraCapture = (dataUrl: string) => {
        const file = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`);
        setImageToSend({ file, preview: dataUrl });
        setShowCamera(false);
        setIsMenuOpen(false);
    };

    const handleAiFix = async () => {
        if (!text.trim() || isFixing) return;
        setIsFixing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Correct the grammar and spelling of the following text. Maintain the original meaning and tone. Return ONLY the corrected text.\n\nText: "${text}"`,
            });
            if (response.text) {
                setText(response.text.trim());
            }
            setIsMenuOpen(false);
        } catch (err) {
            console.error("Auto-fix failed:", err);
        } finally {
            setIsFixing(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsMenuOpen(false);
            
            setRecordingDuration(0);
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };
    
    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            setAudioBlob(null);
            startRecording();
        }
    };
    
    const canSend = !isSending && !isFixing && (text.trim() || imageToSend.file || audioBlob);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const ActionButtons = ({ mobile = false }) => (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            <button type="button" title="Take Photo" onClick={() => setShowCamera(true)} className={`p-2.5 rounded-full text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors ${mobile ? 'bg-slate-800 w-full text-left flex items-center gap-2' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                {mobile && <span>Camera</span>}
            </button>
            
            <button type="button" title="Upload Image" onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-full text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors ${mobile ? 'bg-slate-800 w-full text-left flex items-center gap-2' : ''}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                 {mobile && <span>Gallery</span>}
            </button>
            
            <button type="button" title={isRecording ? "Stop Recording" : "Record Audio"} onClick={handleMicClick} className={`p-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'} ${mobile ? 'bg-slate-800 w-full text-left flex items-center gap-2' : ''}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                 {mobile && <span>Record Audio</span>}
            </button>
            
            <button type="button" title="Auto-Fix Grammar & Spelling" onClick={handleAiFix} disabled={!text.trim() || isFixing} className={`p-2.5 rounded-full transition-colors ${isFixing ? 'animate-pulse text-yellow-400' : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'} ${mobile ? 'bg-slate-800 w-full text-left flex items-center gap-2' : ''}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3A1.501 1.501 0 0 0 9 4.5h6A1.5 1.5 0 0 0 13.5 3h-3Zm-2.693.178A3 3 0 0 1 10.5 1.5h3a3 3 0 0 1 2.694 1.678c.497.042.992.092 1.486.15 1.495.173 2.57 1.46 2.57 2.929V19.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3V6.257c0-1.47 1.075-2.756 2.57-2.93.493-.058.989-.108 1.487-.15Z" clipRule="evenodd" /><path d="M13.5 9a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm-6.75 0a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 0-1.5H6.75Zm0 3.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm3.75 0a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 0-1.5h-3.75Z" /></svg>
                 {mobile && <span>AI Grammar Fix</span>}
            </button>
        </>
    );

    return (
        <>
            <div className="p-2 sm:p-3 border-t border-slate-700/50 flex flex-col gap-3 flex-shrink-0 bg-slate-900/30 backdrop-blur-md relative">
                {(imageToSend.preview || audioBlob) && (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex gap-2 overflow-x-auto">
                        {imageToSend.preview && (
                             <div className="relative w-24 h-24 p-1 flex-shrink-0">
                                <img src={imageToSend.preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                <button type="button" onClick={() => setImageToSend({ file: null, preview: null })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">&times;</button>
                            </div>
                        )}
                        {audioBlob && (
                             <div className="relative flex items-center gap-3 p-2 bg-slate-700 rounded-lg pr-8 flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" /></svg>
                                </div>
                                <audio controls src={URL.createObjectURL(audioBlob)} className="h-8" />
                                <button type="button" onClick={() => setAudioBlob(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors">&times;</button>
                            </div>
                        )}
                    </div>
                )}
                
                {isRecording ? (
                    <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-2xl w-full animate-pulse">
                       <div className="w-3 h-3 bg-red-500 rounded-full animate-ping ml-2"></div>
                       <span className="text-red-400 font-mono text-sm flex-grow">Recording... {formatTime(recordingDuration)}</span>
                       <button type="button" onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>
                       </button>
                   </div>
                ) : (
                    <div className="flex gap-2 items-end relative">
                        {/* Mobile Menu Button */}
                        <div className="sm:hidden relative">
                            <button 
                                type="button"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-transform duration-200 ${isMenuOpen ? 'rotate-45 bg-slate-700' : ''}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                            </button>
                            
                            {/* Mobile Popup Menu */}
                            {isMenuOpen && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-2 z-50 animate-fade-in-up">
                                    <ActionButtons mobile={true} />
                                </div>
                            )}
                        </div>

                        {/* Desktop Toolbar */}
                        <div className="hidden sm:flex gap-1 pb-1">
                            <ActionButtons />
                        </div>
                        
                        <textarea 
                            ref={textareaRef}
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder="Type a message..." 
                            rows={1}
                            className="flex-grow px-4 py-3 bg-slate-800/50 rounded-2xl border border-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none text-slate-200 placeholder-slate-500 scrollbar-hide"
                            style={{ minHeight: '46px', maxHeight: '150px' }}
                        />
                        
                        <Button onClick={() => handleSendMessage()} disabled={!canSend} className={`rounded-xl px-4 h-[46px] transition-all flex items-center justify-center ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isSending ? <span className="animate-spin">⟳</span> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transform rotate-90"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                        </Button>
                    </div>
                )}
            </div>
            {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
        </>
    );
};

export default ChatInput;
