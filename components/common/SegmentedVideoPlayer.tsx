import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';

interface SegmentedVideoPlayerProps {
    urls: string[];
    onClose: () => void;
}

const SegmentedVideoPlayer: React.FC<SegmentedVideoPlayerProps> = ({ urls, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPreloading, setIsPreloading] = useState(true);
    const [loadCount, setLoadCount] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Preload Logic: Simulates offline experience by waiting for all segments
    useEffect(() => {
        if (urls.length === 0) return;
        setLoadCount(0);
        setIsPreloading(true);
    }, [urls]);

    const handleCanPlay = () => {
        if (isPreloading) {
            const nextLoad = loadCount + 1;
            setLoadCount(nextLoad);
            if (nextLoad >= urls.length) {
                setIsPreloading(false);
                if (videoRef.current) videoRef.current.play().catch(console.warn);
            }
        }
    };

    const handleEnded = () => {
        if (currentIndex < urls.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Video protocol complete
        }
    };

    // Auto-advance logic
    useEffect(() => {
        if (!isPreloading && videoRef.current) {
            videoRef.current.play().catch(console.warn);
        }
    }, [currentIndex, isPreloading]);

    return (
        <div ref={containerRef} className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[200] font-sans">
            {isPreloading ? (
                <div className="text-center space-y-8">
                    <div className="relative w-40 h-40 mx-auto">
                        <div className="absolute inset-0 border-8 border-blue-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-8 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Initializing Reinforcement</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-3">Buffered: {Math.round((loadCount / urls.length) * 100)}% // Synchronizing Segments</p>
                    </div>
                    {/* Hidden preloading elements */}
                    <div className="hidden">
                        {urls.map((url, i) => (
                            <video key={i} src={url} onCanPlayThrough={handleCanPlay} preload="auto" />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="relative w-full h-full group">
                    <video 
                        ref={videoRef}
                        src={urls[currentIndex]} 
                        className="w-full h-full object-contain shadow-2xl"
                        onEnded={handleEnded}
                        playsInline
                        autoPlay
                    />

                    {/* Minimalist Overlay */}
                    <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4">
                            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Reinforcement Media</span>
                            <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Segment {currentIndex + 1} / 5</span>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white px-6 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            End Protocol
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_20px_blue]" 
                            style={{ width: `${((currentIndex + 1) / urls.length) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SegmentedVideoPlayer;