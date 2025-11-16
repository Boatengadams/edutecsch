import React from 'react';

interface BarChartProps {
    data: { label: string; value: number }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
    }

    const maxValue = Math.max(...data.map(d => d.value), 0);

    return (
        <div className="w-full h-full flex flex-col p-4 text-xs text-gray-400">
            <div className="flex-grow flex gap-2 items-end">
                {data.map((item, index) => (
                    <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                        <div className="relative group w-full h-full flex items-end">
                            <div
                                className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-400 transition-colors duration-300 animate-bar-grow"
                                style={{
                                    height: `${(item.value / maxValue) * 100}%`,
                                    animationDelay: `${index * 50}ms`,
                                }}
                            >
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {item.value}
                                </div>
                            </div>
                        </div>
                        <div className="truncate w-full text-center" title={item.label}>{item.label}</div>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes bar-grow {
                    from { transform: scaleY(0); }
                    to { transform: scaleY(1); }
                }
                .animate-bar-grow {
                    transform-origin: bottom;
                    animation: bar-grow 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default BarChart;
