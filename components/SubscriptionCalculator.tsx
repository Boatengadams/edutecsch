
import React, { useMemo, useState } from 'react';
import { UserProfile, GES_CLASSES } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useAuthentication } from '../hooks/useAuth';
import { useToast } from './common/Toast';

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
    return { rate: 55, tier: 'Other/Unclassified' }; 
};

const SubscriptionCalculator: React.FC<SubscriptionCalculatorProps> = ({ allUsers }) => {
    const { user } = useAuthentication();
    const { showToast } = useToast();
    const [isInitializing, setIsInitializing] = useState(false);
    const [paymentPlan, setPaymentPlan] = useState<'termly' | 'yearly'>('termly');
    
    const data = useMemo(() => {
        const students = allUsers.filter(u => u.role === 'student');
        const classCounts: Record<string, number> = {};
        
        students.forEach(student => {
            const className = student.class || 'Unassigned';
            classCounts[className] = (classCounts[className] || 0) + 1;
        });

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
                yearlyTotal: count * (rate * 3) 
            };
        });

        const totalStudents = students.length;
        const grandTotalTermly = rows.reduce((sum, row) => sum + row.termlyTotal, 0);
        const grandTotalYearly = rows.reduce((sum, row) => sum + row.yearlyTotal, 0);

        return { rows, totalStudents, grandTotalTermly, grandTotalYearly };
    }, [allUsers]);

    const handlePayNow = async () => {
        if (!user?.email || !user?.uid) return;
        setIsInitializing(true);
        try {
            const amount = paymentPlan === 'termly' ? data.grandTotalTermly : data.grandTotalYearly;

            // Using standard fetch to call our new Express backend
            const response = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    amount: amount, // Pass as Naira (backend converts to kobo)
                    userId: user.uid
                })
            });

            const result = await response.json();

            if (result.success && result.authorization_url) {
                showToast("Redirecting to Paystack Secure Gateway...", "info");
                window.location.href = result.authorization_url;
            } else {
                throw new Error(result.message || "Initialization failed");
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Could not connect to the payment server.", "error");
        } finally {
            setIsInitializing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col lg:flex-row gap-6">
                <Card className="flex-grow !p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">💰</span> Subscription Calculator
                            </h3>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Live Enrollment Billing</p>
                        </div>
                        <div className="flex bg-slate-800 p-1 rounded-lg">
                            <button onClick={() => setPaymentPlan('termly')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${paymentPlan === 'termly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Termly</button>
                            <button onClick={() => setPaymentPlan('yearly')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${paymentPlan === 'yearly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Yearly</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/80">
                                <tr>
                                    <th className="px-6 py-4">Class</th>
                                    <th className="px-6 py-4 text-center">Enrolled</th>
                                    <th className="px-6 py-4 text-right">Rate</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.rows.map((row) => (
                                    <tr key={row.className} className="hover:bg-white/[0.02]">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white">{row.className}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">{row.tier}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-200">{row.count}</td>
                                        <td className="px-6 py-4 text-right text-slate-400 font-mono">{row.rate.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-blue-300 font-bold">
                                            {formatCurrency(paymentPlan === 'termly' ? row.termlyTotal : row.yearlyTotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="lg:w-96 !bg-blue-600/10 border-blue-500/30 flex flex-col justify-between h-auto">
                    <div>
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6">Payment Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Selected Plan:</span>
                                <span className="text-white font-bold capitalize">{paymentPlan}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Total Students:</span>
                                <span className="text-white font-bold">{data.totalStudents}</span>
                            </div>
                            <div className="pt-4 border-t border-blue-500/20">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Grand Total Due</p>
                                <p className="text-4xl font-black text-white tracking-tighter">
                                    {formatCurrency(paymentPlan === 'termly' ? data.grandTotalTermly : data.grandTotalYearly)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <Button 
                            onClick={handlePayNow} 
                            disabled={isInitializing || data.totalStudents === 0} 
                            className="w-full py-4 font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40"
                        >
                            {isInitializing ? <Spinner /> : '🚀 Pay with Paystack'}
                        </Button>
                        <div className="flex items-center justify-center gap-2 grayscale opacity-40">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Paystack_Logo.png" className="h-4" alt="Paystack Secured" />
                             <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Secured Gateway</span>
                        </div>
                    </div>
                </Card>
            </div>
            
            <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 flex items-start gap-4">
                <span className="text-xl">ℹ️</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Subscription rates are automatically calculated based on your current active enrollment. JHS Students: GHS 55/term, Upper Primary: GHS 40/term, Lower Primary: GHS 25/term, KG & Below: GHS 20/term.
                </p>
            </div>
        </div>
    );
};

export default SubscriptionCalculator;
