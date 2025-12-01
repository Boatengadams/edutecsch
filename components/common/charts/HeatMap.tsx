
import React, { useState } from 'react';

interface HeatMapProps {
    data: { date: string; value: number }[];
    title?: string;
}

const HeatMap: React.FC<HeatMapProps> = ({ data, title }) => {
    const [hoveredData, setHoveredData] = useState<{ date: string; value: number } | null>(null);

    // Generate color based on percentage (0-100)
    // Using green spectrum: from very light green to deep emerald
    const getColor = (value: number) => {
        if (value === 0) return '#1f2937'; // slate-800 for no attendance/data
        if (value < 50) return '#7f1d1d'; // red-900 for very low
        if (value < 70) return '#9a3412'; // orange-900
        if (value < 80) return '#064e3b'; // green-900 (dark)
        if (value < 90) return '#065f46'; // green-800
        if (value < 95) return '#059669'; // green-600
        return '#10b981'; // green-500 (bright)
    };

    return (
        <div className="w-full flex flex-col h-full bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            {title && <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{title}</h4>}
            
            <div className="flex-grow flex flex-wrap content-start gap-1">
                {data.map((item, index) => (
                    <div 
                        key={item.date}
                        className="relative group"
                        onMouseEnter={() => setHoveredData(item)}
                        onMouseLeave={() => setHoveredData(null)}
                    >
                        <div 
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-[2px] transition-all hover:scale-125 hover:z-10 hover:ring-1 hover:ring-white/50"
                            style={{ backgroundColor: getColor(item.value) }}
                        ></div>
                    </div>
                ))}
            </div>

            <div className="h-6 mt-2 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>{data[0]?.date ? new Date(data[0].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}</span>
                {hoveredData ? (
                    <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded animate-fade-in-short">
                        {new Date(hoveredData.date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}: {hoveredData.value.toFixed(1)}%
                    </span>
                ) : (
                    <span className="opacity-50">Hover to view</span>
                )}
                <span>{data[data.length-1]?.date ? new Date(data[data.length-1].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}</span>
            </div>
        </div>
    );
};

export default HeatMap;
