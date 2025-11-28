
import React, { useMemo } from 'react';
import { UserProfile, GES_CLASSES } from '../types';
import Card from './common/Card';

interface SubscriptionCalculatorProps {
    allUsers: UserProfile[];
}

const COST_PER_TERM = 55;
const COST_PER_YEAR = 150;

const SubscriptionCalculator: React.FC<SubscriptionCalculatorProps> = ({ allUsers }) => {
    
    const data = useMemo(() => {
        const students = allUsers.filter(u => u.role === 'student');
        
        // Initialize counts for known classes to ensure specific order, but allow dynamic ones too
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
            return {
                className,
                count,
                termlyTotal: count * COST_PER_TERM,
                yearlyTotal: count * COST_PER_YEAR
            };
        });

        const totalStudents = students.length;
        const grandTotalTermly = totalStudents * COST_PER_TERM;
        const grandTotalYearly = totalStudents * COST_PER_YEAR;

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
                    <p className="text-sm text-gray-400 mt-1">Based on active student enrollment</p>
                </div>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-center">
                        <p className="text-xs text-gray-400 uppercase font-bold">Rate (Term)</p>
                        <p className="font-mono text-blue-300">{formatCurrency(COST_PER_TERM)}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-center">
                        <p className="text-xs text-gray-400 uppercase font-bold">Rate (Year)</p>
                        <p className="font-mono text-green-300">{formatCurrency(COST_PER_YEAR)}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-800">
                        <tr>
                            <th className="px-6 py-3">Class Name</th>
                            <th className="px-6 py-3 text-center">Student Count</th>
                            <th className="px-6 py-3 text-right bg-blue-900/20">Termly Cost (GHS)</th>
                            <th className="px-6 py-3 text-right bg-green-900/20">Yearly Cost (GHS)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/30">
                        {data.rows.map((row) => (
                            <tr key={row.className} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-3 font-medium text-white">{row.className}</td>
                                <td className="px-6 py-3 text-center">{row.count}</td>
                                <td className="px-6 py-3 text-right font-mono text-blue-200">{formatCurrency(row.termlyTotal)}</td>
                                <td className="px-6 py-3 text-right font-mono text-green-200">{formatCurrency(row.yearlyTotal)}</td>
                            </tr>
                        ))}
                        
                        {/* Summary Row */}
                        <tr className="bg-slate-800 font-bold text-white border-t-2 border-slate-600">
                            <td className="px-6 py-4 uppercase tracking-wider">Total</td>
                            <td className="px-6 py-4 text-center text-lg">{data.totalStudents}</td>
                            <td className="px-6 py-4 text-right text-lg text-blue-400 bg-blue-900/30">
                                {formatCurrency(data.grandTotalTermly)}
                            </td>
                            <td className="px-6 py-4 text-right text-lg text-green-400 bg-green-900/30">
                                {formatCurrency(data.grandTotalYearly)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-6 p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                    <h4 className="font-bold text-yellow-500 text-sm uppercase">Admin Note</h4>
                    <p className="text-sm text-slate-300 mt-1">
                        This calculation is based on the current number of registered students ({data.totalStudents}). 
                        Ensure all students are registered to get an accurate invoice projection. 
                        Prices are set at GHS {COST_PER_TERM}/term and GHS {COST_PER_YEAR}/year.
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default SubscriptionCalculator;
