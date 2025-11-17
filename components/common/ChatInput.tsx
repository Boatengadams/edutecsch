import React, { useState, useRef } from 'react';
import Button from './Button';
import CameraModal from './CameraModal';

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

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSendMessage({ text, image: imageToSend.file, audio: audioBlob });
        setText('');
        setImageToSend({ file: null, preview: null });
        setAudioBlob(null);
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const preview = await fileToDataUrl(file);
            setImageToSend({ file, preview });
        }
    };

    const handleCameraCapture = (dataUrl: string) => {
        const file = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`);
        setImageToSend({ file, preview: dataUrl });
        setShowCamera(false);
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
        } catch (err) {
            console.error("Error accessing microphone:", err);
            // You could add a toast notification here
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            // Clear any previous recording
            setAudioBlob(null);
            startRecording();
        }
    };
    
    const canSend = !isSending && (text.trim() || imageToSend.file || audioBlob);

    return (
        <>
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-700 flex flex-col gap-2 flex-shrink-0">
                {(imageToSend.preview || audioBlob) && (
                    <div className="p-2 bg-slate-800 rounded-lg">
                        {imageToSend.preview && (
                             <div className="relative w-24 h-24 p-1">
                                <img src={imageToSend.preview} alt="Preview" className="w-full h-full object-cover rounded-md" />
                                <button type="button" onClick={() => setImageToSend({ file: null, preview: null })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
                            </div>
                        )}
                        {audioBlob && (
                             <div className="relative flex items-center gap-2 p-2">
                                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full max-w-xs h-10" />
                                <button type="button" onClick={() => setAudioBlob(null)} className="text-red-400 p-1 rounded-full hover:bg-slate-700">&times;</button>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex gap-2 items-center">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button type="button" title="Take Photo" onClick={() => setShowCamera(true)} className="p-2 rounded-full text-gray-300 hover:bg-slate-700">📷</button>
                    <button type="button" title="Upload Image" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-300 hover:bg-slate-700">📎</button>
                    <button type="button" title={isRecording ? "Stop Recording" : "Record Audio"} onClick={handleMicClick} className={`p-2 rounded-full text-gray-300 hover:bg-slate-700 ${isRecording ? 'bg-red-500 text-white animate-pulse' : ''}`}>🎙️</button>
                    
                    <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." className="flex-grow p-2 bg-slate-800 rounded-md border border-slate-600"/>
                    <Button type="submit" disabled={!canSend}>{isSending ? '...' : 'Send'}</Button>
                </div>
            </form>
            {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
        </>
    );
};

export default ChatInput;
