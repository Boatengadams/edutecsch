import React from 'react';

export interface FlyerData {
  style: 'Modern' | 'Classic' | 'Bold' | 'Playful' | 'Urgent' | 'Brutalist' | 'Glass' | 'Elite';
  headline: string;
  subheadline: string;
  details: string[];
  date: string;
  location: string;
  emoji: string;
  footer: string;
  generatedImageUrl?: string;
}

interface FlyerCardProps {
  data: FlyerData | string;
  onClick?: () => void;
  className?: string;
  imageUrl?: string;
}

const FlyerCard: React.FC<FlyerCardProps> = ({ data, onClick, className = '', imageUrl }) => {
  let content: FlyerData;
  let isLegacy = false;

  if (typeof data === 'string') {
    try {
      content = JSON.parse(data);
      if (!content.headline && !content.generatedImageUrl) throw new Error("Not structured");
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
  
  const displayImage = imageUrl || content.generatedImageUrl;

  if (displayImage) {
      return (
          <div onClick={onClick} className={`relative overflow-hidden rounded-[2rem] shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer bg-slate-900 border-4 border-white/5 group ${className}`}>
              <img src={displayImage} alt="Event Flyer" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                  <p className="text-white font-black uppercase tracking-widest text-xs">View Full Announcement</p>
              </div>
          </div>
      );
  }

  const baseStyles = "relative overflow-hidden rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:scale-[1.03] cursor-pointer flex flex-col min-h-[320px]";
  
  const themeStyles: Record<string, string> = {
      Modern: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-white/10",
      Classic: "bg-[#fffcf5] text-slate-900 border-t-[12px] border-blue-900 font-serif",
      Bold: "bg-blue-600 text-white border-none shadow-[0_20px_50px_rgba(37,99,235,0.3)]",
      Playful: "bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 text-slate-950",
      Urgent: "bg-red-600 text-white border-4 border-red-400 animate-pulse",
      Brutalist: "bg-yellow-400 text-black border-[6px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] font-black",
      Glass: "bg-indigo-950/40 backdrop-blur-3xl text-white border border-white/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]",
      Elite: "bg-gradient-to-br from-black via-slate-900 to-[#022c22] text-white border-l-[10px] border-emerald-500"
  };

  const currentTheme = themeStyles[content.style] || themeStyles.Modern;

  return (
    <div onClick={onClick} className={`${baseStyles} ${currentTheme} ${className}`}>
        {/* Background Text Decor */}
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-[12rem] font-black select-none pointer-events-none transform translate-x-12 -translate-y-12">
            {content.emoji}
        </div>

        <div className="relative z-10 p-8 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-xl ${content.style === 'Brutalist' ? 'bg-white border-4 border-black' : 'bg-white/10 backdrop-blur-md'}`}>
                    {content.emoji}
                </div>
                {content.date && (
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${content.style === 'Brutalist' ? 'bg-black text-white' : 'bg-white/20 text-white'}`}>
                        {content.date}
                    </div>
                )}
            </div>

            <div className="space-y-2 mb-6">
                <h3 className={`text-4xl font-black leading-[0.9] tracking-tighter uppercase ${content.style === 'Classic' ? 'font-serif normal-case' : ''}`}>
                    {content.headline}
                </h3>
                {content.subheadline && (
                    <p className={`text-sm font-bold opacity-80 tracking-wide uppercase ${content.style === 'Brutalist' ? 'bg-black text-yellow-400 px-2 py-0.5 inline-block' : ''}`}>
                        {content.subheadline}
                    </p>
                )}
            </div>

            <div className="flex-grow space-y-3">
                {content.details.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${content.style === 'Brutalist' ? 'bg-black' : 'bg-current opacity-50'}`}></div>
                        <p className="text-sm font-medium leading-relaxed">{point}</p>
                    </div>
                ))}
            </div>

            <div className={`mt-8 pt-6 border-t flex justify-between items-end ${content.style === 'Brutalist' ? 'border-black' : 'border-white/10'}`}>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Location</p>
                    <p className="text-xs font-bold uppercase tracking-wider">📍 {content.location || 'Campus Wide'}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase opacity-40 tracking-tighter mb-1">Official Notice</p>
                    <p className="text-[10px] font-black uppercase tracking-widest">{content.footer || 'Edutec Schools'}</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FlyerCard;