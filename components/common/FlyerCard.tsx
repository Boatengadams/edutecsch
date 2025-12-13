
import React from 'react';

export interface FlyerData {
  style: 'Modern' | 'Classic' | 'Bold' | 'Playful' | 'Urgent';
  headline: string;
  subheadline: string;
  details: string[];
  date: string;
  location: string;
  emoji: string;
  footer: string;
  generatedImageUrl?: string; // Support for AI generated images
}

interface FlyerCardProps {
  data: FlyerData | string; // Can handle legacy string content, new JSON, or raw text
  onClick?: () => void;
  className?: string;
  imageUrl?: string; // Direct override
}

const FlyerCard: React.FC<FlyerCardProps> = ({ data, onClick, className = '', imageUrl }) => {
  // Safe parsing for backward compatibility
  let content: FlyerData;
  let isLegacy = false;

  if (typeof data === 'string') {
    try {
      content = JSON.parse(data);
      // Basic validation to ensure it's our structure
      if (!content.headline && !content.generatedImageUrl) throw new Error("Not structured flyer");
    } catch (e) {
      isLegacy = true;
      content = {
          style: 'Classic',
          headline: 'Notice',
          subheadline: '',
          details: [data],
          date: '',
          location: '',
          emoji: '📢',
          footer: ''
      };
    }
  } else {
    content = data;
  }
  
  // Prioritize passed prop, then internal data
  const displayImage = imageUrl || content.generatedImageUrl;

  // If it's a purely image-based flyer (AI Generated)
  if (displayImage) {
      return (
          <div onClick={onClick} className={`relative overflow-hidden rounded-xl shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-slate-900 border border-slate-700 group ${className}`}>
              <img src={displayImage} alt="Flyer" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
          </div>
      );
  }

  const baseStyles = "relative overflow-hidden rounded-xl shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col";
  
  const themeStyles: Record<string, string> = {
      Modern: "bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700",
      Classic: "bg-[#fdfbf7] text-slate-900 border-t-4 border-blue-900 font-serif",
      Bold: "bg-blue-600 text-white border-none",
      Playful: "bg-gradient-to-tr from-yellow-400 to-orange-500 text-slate-900",
      Urgent: "bg-red-600 text-white border-2 border-red-400"
  };

  const currentTheme = themeStyles[content.style] || themeStyles.Modern;

  if (isLegacy) {
      // Simple render for old text notices
      return (
          <div onClick={onClick} className={`p-5 bg-slate-800 border-l-4 border-blue-500 rounded-r-xl shadow-md cursor-pointer hover:bg-slate-750 transition-colors ${className}`}>
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">📢 Notice</h4>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{content.details[0]}</p>
          </div>
      );
  }

  return (
    <div onClick={onClick} className={`${baseStyles} ${currentTheme} ${className} min-h-[220px]`}>
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl font-black select-none pointer-events-none transform translate-x-4 -translate-y-4">
            {content.emoji}
        </div>
        
        {content.style === 'Playful' && (
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/confetti.png')] opacity-20"></div>
        )}
        {content.style === 'Classic' && (
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50"></div>
        )}

        <div className="relative z-10 p-6 flex flex-col h-full">
            {/* Header */}
            <div className="mb-4">
                <div className="flex justify-between items-start">
                    <span className="text-4xl shadow-sm filter drop-shadow-lg">{content.emoji}</span>
                    {content.date && (
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${content.style === 'Classic' || content.style === 'Playful' ? 'bg-black/10 text-black' : 'bg-white/20 text-white'}`}>
                            {content.date}
                        </span>
                    )}
                </div>
                <h3 className={`text-2xl font-black mt-2 leading-tight ${content.style === 'Classic' ? 'font-serif tracking-tight' : 'font-sans tracking-tight'}`}>
                    {content.headline}
                </h3>
                {content.subheadline && (
                    <p className={`text-sm font-medium mt-1 ${content.style === 'Classic' || content.style === 'Playful' ? 'text-slate-700' : 'text-blue-100'}`}>
                        {content.subheadline}
                    </p>
                )}
            </div>

            {/* Details Body */}
            <div className={`flex-grow space-y-2 text-sm ${content.style === 'Classic' || content.style === 'Playful' ? 'text-slate-800' : 'text-slate-100'}`}>
                {content.details.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{point}</span>
                    </div>
                ))}
            </div>

            {/* Footer / Location */}
            {(content.location || content.footer) && (
                <div className={`mt-6 pt-3 border-t flex justify-between items-end text-xs font-bold uppercase tracking-wider ${content.style === 'Classic' || content.style === 'Playful' ? 'border-black/10 text-slate-600' : 'border-white/20 text-white/80'}`}>
                    <span>📍 {content.location}</span>
                    <span>{content.footer}</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default FlyerCard;
