import React, { useMemo, useState } from 'react';

interface LineChartProps {
    data: { label: string; value: number }[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, label: string, value: number } | null>(null);

    const chartData = useMemo(() => {
        if (!data || data.length < 2) return null;

        const width = 500;
        const height = 200;
        const padding = 30;

        const maxValue = 100; // Grades are 0-100
        const minValue = 0;

        const xStep = (width - padding * 2) / (data.length - 1);
        const yRange = maxValue - minValue;
        
        const points = data.map((d, i) => {
            const x = padding + i * xStep;
            const y = height - padding - ((d.value - minValue) / yRange) * (height - padding * 2);
            return { x, y, label: d.label, value: d.value };
        });

        const path = points.map(p => `${p.x},${p.y}`).join(' ');
        const areaPath = `M${points[0].x},${height - padding} L${path} L${points[points.length - 1].x},${height - padding} Z`;


        return {
            width, height, padding, points, path, areaPath,
            yAxisLabels: [
                { y: height - padding, value: 0 },
                { y: height - padding - (25 / 100) * (height - padding * 2), value: 25 },
                { y: height - padding - (50 / 100) * (height - padding * 2), value: 50 },
                { y: height - padding - (75 / 100) * (height - padding * 2), value: 75 },
                { y: padding, value: 100 },
            ]
        };
    }, [data]);

    if (!chartData) {
        return <div className="flex items-center justify-center h-full text-gray-500">Not enough graded assignments to show a trend.</div>;
    }

    const { width, height, padding, points, path, areaPath, yAxisLabels } = chartData;

    return (
        <div className="w-full h-full relative" onMouseLeave={() => setTooltip(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-label="Line chart showing grade history">
                <defs>
                    <linearGradient id="line-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                     <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* Y-axis grid lines */}
                {yAxisLabels.map(label => (
                    <line
                        key={label.value}
                        x1={padding}
                        y1={label.y}
                        x2={width - padding}
                        y2={label.y}
                        stroke="rgba(71, 85, 105, 0.5)"
                        strokeWidth="0.5"
                    />
                ))}
                {/* Y-axis labels */}
                {yAxisLabels.map(label => (
                    <text
                        key={label.value}
                        x={padding - 8}
                        y={label.y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                    >
                        {label.value}
                    </text>
                ))}
                
                {/* Area under the line */}
                <path d={areaPath} fill="url(#line-chart-gradient)" />


                {/* Main line */}
                <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={path}
                    style={{
                        filter: 'url(#glow)',
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000,
                        animation: 'dash 1.5s ease-out forwards'
                    }}
                />

                {/* Data points and hover areas */}
                {points.map((point, i) => (
                    <g key={i}>
                         <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#3b82f6"
                            stroke="#0f172a"
                            strokeWidth="2"
                        />
                         <rect
                            x={point.x - 10}
                            y={0}
                            width="20"
                            height={height}
                            fill="transparent"
                            onMouseEnter={() => setTooltip(point)}
                        />
                    </g>
                ))}
            </svg>
            {tooltip && (
                <div 
                    className="absolute bg-slate-900 text-white text-xs rounded-md p-2 pointer-events-none transition-transform transform -translate-x-1/2 -translate-y-[120%]"
                    style={{ left: `${(tooltip.x / width) * 100}%`, top: `${(tooltip.y / height) * 100}%` }}
                >
                    <div className="font-bold truncate max-w-xs">{tooltip.label}</div>
                    <div>Score: {tooltip.value.toFixed(1)}%</div>
                </div>
            )}
             <style>{`
                @keyframes dash {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </div>
    );
};

export default LineChart;