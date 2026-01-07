
import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';

interface VerificationResult {
    success: boolean;
    message: string;
    amount?: number;
    reference?: string;
    paidAt?: string;
    alreadyVerified?: boolean;
}

const PaymentSuccessPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<VerificationResult | null>(null);

    useEffect(() => {
        const verify = async () => {
            const params = new URLSearchParams(window.location.search);
            const reference = params.get('reference');

            if (!reference) {
                setError("Transaction reference missing from gateway redirect.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/payments/verify/${reference}`);
                const result = await response.json();

                if (result.success) {
                    setData(result);
                } else {
                    setError(result.message || "The payment verification failed.");
                }
            } catch (err) {
                console.error("Verification error:", err);
                setError("A secure connection to the verification server could not be established.");
            } finally {
                setLoading(false);
            }
        };

        verify();
    }, []);

    const handleReturn = () => {
        window.location.href = '/';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em] animate-pulse">Verifying Transaction</h2>
                <p className="text-slate-500 text-xs mt-4 font-mono">ESTABLISHING SECURE PROTOCOL WITH GATEWAY...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <Card className="max-w-xl w-full !p-10 text-center animate-fade-in-up border-white/5 bg-slate-900/40 backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none">
                    {error ? '⚠️' : '✅'}
                </div>

                {error ? (
                    <div className="space-y-6 relative z-10">
                        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-4xl mx-auto border border-red-500/20 shadow-2xl">
                            ❌
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Verification Failed</h2>
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-sm text-red-400 font-bold leading-relaxed">{error}</p>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed uppercase tracking-widest">
                            If you believe this is an error, please contact the Edutec finance department with your transaction details.
                        </p>
                        <Button onClick={handleReturn} variant="secondary" className="w-full py-4 font-black uppercase tracking-widest rounded-2xl">
                            Return to Portal
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8 relative z-10">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-bounce-short">
                            ✅
                        </div>
                        
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Payment Successful</h2>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em]">Transaction Authorized & Locked</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-left">
                            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount Paid</span>
                                <span className="text-xl font-black text-white font-mono">GHS {data?.amount?.toFixed(2)}</span>
                            </div>
                            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference</span>
                                <span className="text-xs font-bold text-blue-400 font-mono select-all">{data?.reference}</span>
                            </div>
                            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Confirmed
                                </span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleReturn} className="w-full py-5 font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-900/40 rounded-2xl text-sm">
                                🚀 Back to Dashboard
                            </Button>
                        </div>

                        <div className="flex items-center justify-center gap-6 pt-4 grayscale opacity-40">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Paystack_Logo.png" className="h-4" alt="Paystack" />
                             <div className="h-4 w-px bg-slate-700"></div>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Official Secure Receipt</span>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PaymentSuccessPage;
