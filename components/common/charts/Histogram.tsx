import React, { useMemo } from 'react';
import BarChart from './BarChart';

interface HistogramProps {
    data: number[];
    binCount?: number;
}

const Histogram: React.FC<HistogramProps> = ({ data, binCount = 10 }) => {
    const binnedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const max = 100; // Grades are 0-100
        const min = 0;
        const binSize = (max - min) / binCount;

        const bins = Array.from({ length: binCount }, (_, i) => {
            const binMin = min + i * binSize;
            const binMax = binMin + binSize;
            return {
                label: `${Math.floor(binMin)}-${Math.ceil(binMax)}`,
                value: 0
            };
        });

        for (const value of data) {
            const binIndex = Math.min(
                Math.floor((value - min) / binSize),
                binCount - 1
            );
            if (bins[binIndex]) {
                bins[binIndex].value++;
            }
        }
        return bins;

    }, [data, binCount]);


    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
    }

    return <BarChart data={binnedData} />;
};

export default Histogram;
