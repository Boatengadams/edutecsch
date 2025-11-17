import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Button from './Button';

interface CameraModalProps {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture }) => {
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

export default CameraModal;
