import React, { useState } from 'react';

interface PieChartProps {
    data: { label: string; value: number; color: string }[];
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0);

    let cumulative = 0;
    const segments = data.map(item => {
        const percentage = (item.value / total) * 100;
        const start = cumulative;
        cumulative += percentage;
        return { ...item, percentage, start };
    });

    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                    {segments.map((segment, index) => (
                        <circle
                            key={segment.label}
                            r={radius}
                            cx="100"
                            cy="100"
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth="32"
                            strokeDasharray={`${(segment.percentage / 100) * circumference} ${circumference}`}
                            strokeDashoffset={-(segment.start / 100) * circumference}
                            className="transition-all duration-300 animate-pie-draw"
                            style={{
                                transform: hoveredSegment === segment.label ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: 'center',
                                animationDelay: `${index * 100}ms`
                            }}
                            onMouseEnter={() => setHoveredSegment(segment.label)}
                            onMouseLeave={() => setHoveredSegment(null)}
                        />
                    ))}
                </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold">{total}</span>
                    <span className="text-xs text-gray-400">Total</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                {data.map(item => (
                    <div 
                        key={item.label} 
                        className="flex items-center gap-2"
                        onMouseEnter={() => setHoveredSegment(item.label)}
                        onMouseLeave={() => setHoveredSegment(null)}
                    >
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-300">{item.label}:</span>
                        <span className="font-semibold">{item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)</span>
                    </div>
                ))}
            </div>
             <style>{`
                @keyframes pie-draw {
                    from { stroke-dashoffset: ${circumference}; }
                }
                .animate-pie-draw {
                    animation: pie-draw 1s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default PieChart;
