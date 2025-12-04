
import React, { useEffect, useState } from 'react';

// A stylized avatar for the physics pro
const CHAR_SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="90" fill="#f1f5f9" stroke="#475569" stroke-width="4"/>
  
  <!-- Hair -->
  <path d="M60 70 Q 100 30 140 70 Q 160 60 170 90 L 160 100" stroke="#1e293b" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M60 70 Q 40 90 30 110" stroke="#1e293b" stroke-width="12" fill="none" stroke-linecap="round"/>

  <!-- Glasses -->
  <g transform="translate(0, 5)">
    <circle cx="70" cy="95" r="18" fill="#ffffff" stroke="#000" stroke-width="3"/>
    <circle cx="130" cy="95" r="18" fill="#ffffff" stroke="#000" stroke-width="3"/>
    <line x1="88" y1="95" x2="112" y2="95" stroke="#000" stroke-width="3"/>
    <line x1="52" y1="95" x2="35" y2="90" stroke="#000" stroke-width="3"/>
    <line x1="148" y1="95" x2="165" y2="90" stroke="#000" stroke-width="3"/>
  </g>

  <!-- Eyes -->
  <circle cx="70" cy="100" r="4" fill="#000">
    <animate attributeName="cy" values="100;100;102;100" dur="3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="130" cy="100" r="4" fill="#000">
    <animate attributeName="cy" values="100;100;102;100" dur="3s" repeatCount="indefinite"/>
  </circle>
  
  <!-- Mouth -->
  <path d="M85 140 Q 100 150 115 140" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- Coat -->
  <path d="M40 190 Q 100 210 160 190 L 160 160 Q 100 140 40 160 Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M100 160 L 100 200" stroke="#cbd5e1" stroke-width="2"/>
  
  <!-- Tie -->
  <path d="M100 160 L 95 175 L 100 190 L 105 175 Z" fill="#ef4444"/>
</svg>
`;

interface LabCharacterProps {
    emotion: 'idle' | 'thinking' | 'success' | 'warning';
    message: string;
    position?: { x: number; y: number } | null; // If null, docked bottom left
    onAction?: () => void;
}

const LabCharacter: React.FC<LabCharacterProps> = ({ emotion, message, position, onAction }) => {
    const [visibleMessage, setVisibleMessage] = useState(message);
    const [animationClass, setAnimationClass] = useState('');

    useEffect(() => {
        setAnimationClass('animate-bounce');
        setVisibleMessage(message);
        const timer = setTimeout(() => setAnimationClass(''), 1000);
        return () => clearTimeout(timer);
    }, [message, emotion]);

    const getEmoji = () => {
        switch(emotion) {
            case 'success': return '✨';
            case 'warning': return '⚠️';
            case 'thinking': return '🤔';
            default: return '';
        }
    };

    const style: React.CSSProperties = position 
        ? { position: 'absolute', left: position.x, top: position.y, zIndex: 50, transform: 'translate(-50%, -100%)', transition: 'all 0.5s ease-out' }
        : { position: 'absolute', bottom: '20px', left: '20px', zIndex: 50 };

    return (
        <div style={style} className="flex flex-col items-center pointer-events-none transition-all duration-500">
             {/* Speech Bubble */}
             <div className={`bg-white text-slate-900 p-4 rounded-2xl rounded-bl-none shadow-2xl mb-4 max-w-[250px] text-sm font-medium border-2 border-slate-200 relative ${animationClass}`}>
                 {visibleMessage}
                 {/* Arrow */}
                 <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-b-2 border-r-2 border-slate-200 transform rotate-45"></div>
             </div>
             
             {/* Character */}
             <div 
                className="w-24 h-24 relative cursor-pointer pointer-events-auto hover:scale-105 transition-transform filter drop-shadow-lg"
                onClick={onAction}
             >
                 {emotion !== 'idle' && (
                     <div className="absolute -top-2 -right-2 text-3xl animate-bounce z-10">{getEmoji()}</div>
                 )}
                 <div dangerouslySetInnerHTML={{ __html: CHAR_SVG }} />
                 <div className="absolute bottom-0 w-full bg-slate-800 text-white text-[9px] text-center rounded-full py-0.5 font-bold uppercase tracking-wider border border-slate-600">
                     Dr. Adams
                 </div>
             </div>
        </div>
    );
};

export default LabCharacter;
