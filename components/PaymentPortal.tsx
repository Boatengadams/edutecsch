
import React, { useState } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import { useAuthentication } from '../hooks/useAuth';

const PaymentPortal: React.FC = () => {
    const { user, schoolSettings } = useAuthentication();
    const { showToast } = useToast();
    
    const [email, setEmail] = useState(user?.email || '');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState('School Fees Payment');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePayNow = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Client-side Validation
        const numericAmount = parseFloat(amount);
        if (!email || !email.includes('@')) {
            setError("Please enter a valid academic email address.");
            return;
        }
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError("Please enter a valid payment amount.");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 2. Initialize payment through secure backend
            // Note: We never call Paystack directly from the frontend
            const response = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    amount: numericAmount,
                    userId: user?.uid || 'anonymous',
                    metadata: {
                        paymentType: 'general_fees',
                        description: description
                    }
                })
            });

            const result = await response.json();

            if (result.success && result.authorization_url) {
                showToast("Securing connection to payment gateway...", "info");
                // 3. Redirect to the authorization URL provided by Paystack via our backend
                window.location.href = result.authorization_url;
            } else {
                throw new Error(result.message || "Failed to initialize payment vault.");
            }
        } catch (err: any) {
            console.error("Payment Error:", err);
            setError(err.message || "A secure connection could not be established. Please try again.");
            showToast("Transaction Interrupted", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
            <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 border border-blue-500/20 shadow-2xl">
                    💳
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Secure <span className="text-blue-500">Payment</span> Portal</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em]">Official Financial Gateway for {schoolSettings?.schoolName || 'EDUTEC'}</p>
            </div>

            <Card className="!p-8 bg-slate-900/80 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none">🔐</div>
                
                <form onSubmit={handlePayNow} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payer Identification (Email)</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@edutec.edu"
                            required
                            className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Amount (GHS)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₵</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full p-4 pl-8 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all font-mono font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Purpose of Payment</label>
                            <select 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all text-sm font-bold"
                            >
                                <option value="School Fees Payment">School Fees</option>
                                <option value="PTA Levies">PTA Levies</option>
                                <option value="Exams Fee">Examination Fees</option>
                                <option value="Lab & Materials">Lab & Materials</option>
                                <option value="Other">Other Contribution</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-shake">
                            <span className="text-xl">⚠️</span>
                            <p className="text-xs text-red-400 font-bold uppercase tracking-tight leading-relaxed">{error}</p>
                        </div>
                    )}

                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full py-5 font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/50 rounded-2xl text-sm"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <Spinner />
                                    <span>Verifying...</span>
                                </div>
                            ) : (
                                '🚀 Initialize Secure Payment'
                            )}
                        </Button>
                    </div>

                    <div className="flex items-center justify-center gap-6 pt-4 grayscale opacity-40">
                         <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Paystack_Logo.png" className="h-4" alt="Paystack" />
                         <div className="h-4 w-px bg-slate-700"></div>
                         <div className="flex items-center gap-1.5">
                             <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1.944A11.947 11.947 0 012.183 5c-1.008 0-1.974.152-2.883.433a.75.75 0 00-.498.859 12.052 12.052 0 0011.667 11.667.75.75 0 00.859-.498A11.954 11.954 0 0010 1.944z" clipRule="evenodd" /></svg>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">256-bit SSL Security</span>
                         </div>
                    </div>
                </form>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 flex items-start gap-4">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Instant Confirmation</h4>
                        <p className="text-slate-500 text-[10px] leading-relaxed uppercase tracking-tighter">Payments are verified in real-time. Your digital receipt will be issued immediately upon success.</p>
                    </div>
                </div>
                <div className="p-6 bg-purple-500/5 rounded-[2rem] border border-purple-500/10 flex items-start gap-4">
                    <span className="text-2xl">🏦</span>
                    <div>
                        <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Bank-Grade Privacy</h4>
                        <p className="text-slate-500 text-[10px] leading-relaxed uppercase tracking-tighter">Your financial data is encrypted and never stored on Edutec servers. All transactions are handled by licensed providers.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPortal;
