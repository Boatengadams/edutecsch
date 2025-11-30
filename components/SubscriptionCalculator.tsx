
import React, { useMemo } from 'react';
import { UserProfile, GES_CLASSES } from '../types';
import Card from './common/Card';

interface SubscriptionCalculatorProps {
    allUsers: UserProfile[];
}

const getPricingInfo = (className: string): { rate: number; tier: string } => {
    const c = className.toLowerCase().trim();
    if (c.includes('jhs')) return { rate: 55, tier: 'JHS' };
    if (c.includes('basic 4') || c.includes('basic 5') || c.includes('basic 6')) return { rate: 40, tier: 'Upper Primary' };
    if (c.includes('basic 1') || c.includes('basic 2') || c.includes('basic 3')) return { rate: 25, tier: 'Lower Primary' };
    if (c.includes('kg') || c.includes('kindergarten')) return { rate: 20, tier: 'KG' };
    if (c.includes('nursery') || c.includes('creche')) return { rate: 20, tier: 'Nursery/Creche' };
    return { rate: 55, tier: 'Other/Unclassified' }; // Default fallback
};

const SubscriptionCalculator: React.FC<SubscriptionCalculatorProps> = ({ allUsers }) => {
    
    const data = useMemo(() => {
        const students = allUsers.filter(u => u.role === 'student');
        
        // Initialize counts for known classes to ensure specific order
        const classCounts: Record<string, number> = {};
        
        students.forEach(student => {
            const className = student.class || 'Unassigned';
            classCounts[className] = (classCounts[className] || 0) + 1;
        });

        // Sort classes: Custom logic to put GES classes in order, others at the end
        const sortedClasses = Object.keys(classCounts).sort((a, b) => {
            const indexA = GES_CLASSES.indexOf(a);
            const indexB = GES_CLASSES.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        const rows = sortedClasses.map(className => {
            const count = classCounts[className];
            const { rate, tier } = getPricingInfo(className);
            return {
                className,
                tier,
                count,
                rate,
                termlyTotal: count * rate,
                yearlyTotal: count * (rate * 3) // Assuming 3 terms per year
            };
        });

        const totalStudents = students.length;
        const grandTotalTermly = rows.reduce((sum, row) => sum + row.termlyTotal, 0);
        const grandTotalYearly = rows.reduce((sum, row) => sum + row.yearlyTotal, 0);

        return { rows, totalStudents, grandTotalTermly, grandTotalYearly };
    }, [allUsers]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);
    };

    return (
        <Card className="mt-6 border-t-4 border-t-blue-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">💰</span> Subscription Calculator
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Based on active student enrollment & tiered pricing</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-center min-w-[140px]">
                        <p className="text-xs text-gray-400 uppercase font-bold">Total Termly</p>
                        <p className="font-mono text-xl text-blue-300 font-black">{formatCurrency(data.grandTotalTermly)}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-center min-w-[140px]">
                        <p className="text-xs text-gray-400 uppercase font-bold">Total Yearly</p>
                        <p className="font-mono text-xl text-green-300 font-black">{formatCurrency(data.grandTotalYearly)}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-800">
                        <tr>
                            <th className="px-6 py-3">Tier</th>
                            <th className="px-6 py-3">Class Name</th>
                            <th className="px-6 py-3 text-center">Students</th>
                            <th className="px-6 py-3 text-right">Rate (GHS)</th>
                            <th className="px-6 py-3 text-right bg-blue-900/20">Term Total</th>
                            <th className="px-6 py-3 text-right bg-green-900/20">Year Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/30">
                        {data.rows.map((row) => (
                            <tr key={row.className} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-3">
                                    <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-1 rounded">{row.tier}</span>
                                </td>
                                <td className="px-6 py-3 font-medium text-white">{row.className}</td>
                                <td className="px-6 py-3 text-center">{row.count}</td>
                                <td className="px-6 py-3 text-right font-mono text-slate-300">{row.rate.toFixed(2)}</td>
                                <td className="px-6 py-3 text-right font-mono text-blue-200 font-bold">{formatCurrency(row.termlyTotal)}</td>
                                <td className="px-6 py-3 text-right font-mono text-green-200">{formatCurrency(row.yearlyTotal)}</td>
                            </tr>
                        ))}
                        
                        {/* Summary Row */}
                        <tr className="bg-slate-800 font-bold text-white border-t-2 border-slate-600">
                            <td colSpan={2} className="px-6 py-4 uppercase tracking-wider text-right">Grand Total</td>
                            <td className="px-6 py-4 text-center text-lg">{data.totalStudents}</td>
                            <td className="px-6 py-4 text-right opacity-50">-</td>
                            <td className="px-6 py-4 text-right text-lg text-blue-400 bg-blue-900/30 border-l border-slate-600">
                                {formatCurrency(data.grandTotalTermly)}
                            </td>
                            <td className="px-6 py-4 text-right text-lg text-green-400 bg-green-900/30 border-l border-slate-600">
                                {formatCurrency(data.grandTotalYearly)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col gap-3">
                <h4 className="font-bold text-slate-300 text-sm uppercase flex items-center gap-2">
                    <span className="text-yellow-500">ℹ️</span> Pricing Breakdown (Per Student/Term)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs text-slate-400">
                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/50">
                        <span className="block text-white font-bold text-sm mb-1">JHS</span>
                        GHS 55
                    </div>
                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/50">
                        <span className="block text-white font-bold text-sm mb-1">Upper Primary</span>
                        GHS 40
                    </div>
                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/50">
                        <span className="block text-white font-bold text-sm mb-1">Lower Primary</span>
                        GHS 25
                    </div>
                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/50">
                        <span className="block text-white font-bold text-sm mb-1">KG</span>
                        GHS 20
                    </div>
                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/50">
                        <span className="block text-white font-bold text-sm mb-1">Nursery/Creche</span>
                        GHS 20
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default SubscriptionCalculator;
