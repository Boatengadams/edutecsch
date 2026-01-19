import React, { useState } from 'react';
import { db, firebase } from '../services/firebase';
import type { SubscriptionStatus } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useAuthentication } from '../hooks/useAuth';

interface SystemActivationProps {
    subscriptionStatus: SubscriptionStatus | null;
}

const ACTIVATION_CODES: { [key: string]: { planType: 'trial' | 'monthly' | 'termly' | 'yearly' } } = {
  // Free Trial (7 Days)
  '3fRzY7kM9pLq2vWxA': { planType: 'trial' },
  'B6nK4mJv9tS1Qp8rZ': { planType: 'trial' },
  // Per Term (4 Months)
  'Xw2y9zLp4rV1M3k7Q': { planType: 'termly' },
  '7vDqR9nB2kLw5mP3X': { planType: 'termly' },
  '1pZ89vMx4qWkL2r6N': { planType: 'termly' },
  'Gf3tK9nM2xR4Wp7vL': { planType: 'termly' },
  'Yw4z1pL89vRqM3k2B': { planType: 'termly' },
  '5nQp7rZ1K9vL4mW3X': { planType: 'termly' },
  '8bVx2kM9P1rQ7zL4n': { planType: 'termly' },
  'R3kW9vP1M4zL7qN2t': { planType: 'termly' },
  'Jp9r4mZ1V3kW8vL2Q': { planType: 'termly' },
  '2vLq9pM4R7kZ1wX8N': { planType: 'termly' },
};

const SystemActivation: React.FC<SystemActivationProps> = ({ subscriptionStatus }) => {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { userProfile } = useAuthentication();

    const isTrialAvailable = !subscriptionStatus || !subscriptionStatus.trialEndsAt;

    const activateWithToken = async (tokenToUse: string) => {
        if (!userProfile || userProfile.role !== 'admin') {
            setError("Access Denied: Administrative authority required.");
            setLoading(false);
            return;
        }

        const tokenDetails = ACTIVATION_CODES[tokenToUse];
        if (!tokenDetails) {
            setError("Invalid Token: The provided registry key is not recognized.");
            setLoading(false);
            return;
        }

        const { planType } = tokenDetails;
        const subscriptionRef = db.collection("schoolConfig").doc("subscription");
        const tokenRef = db.collection("activationTokens").doc(tokenToUse);

        try {
            await db.runTransaction(async (transaction) => {
                const tokenDoc = await transaction.get(tokenRef);
                if (tokenDoc.exists && tokenDoc.data()?.isUsed === true) {
                    throw new Error("Expired Token: This license key has already been consumed.");
                }

                const now = new Date();
                const newSubData: Partial<SubscriptionStatus> = { isActive: true, planType };
                const Timestamp = firebase.firestore.Timestamp;

                if (planType === 'trial') {
                    const trialEndDate = new Date(now.getTime());
                    trialEndDate.setDate(trialEndDate.getDate() + 7);
                    newSubData.trialEndsAt = Timestamp.fromDate(trialEndDate);
                } else {
                    const subEndDate = new Date(now.getTime());
                    if (planType === "monthly") subEndDate.setMonth(subEndDate.getMonth() + 1);
                    else if (planType === "termly") subEndDate.setMonth(subEndDate.getMonth() + 4);
                    else if (planType === "yearly") subEndDate.setFullYear(subEndDate.getFullYear() + 1);
                    newSubData.subscriptionEndsAt = Timestamp.fromDate(subEndDate);
                }
                
                transaction.set(tokenRef, { isUsed: true, usedAt: Timestamp.fromDate(now), usedBy: userProfile.uid }, { merge: true });
                transaction.set(subscriptionRef, newSubData, { merge: true });
            });
            setError('');
            setToken('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Transmission Error: Activation protocol failed.');
            setLoading(false); 
        }
    };

    const handleTrialActivation = async () => {
        setLoading(true);
        setError('');

        const trialCodes = Object.keys(ACTIVATION_CODES).filter(
            (code) => ACTIVATION_CODES[code].planType === 'trial'
        );

        let availableToken: string | null = null;
        try {
            for (const code of trialCodes) {
                const tokenRef = db.collection("activationTokens").doc(code);
                const tokenDoc = await db.runTransaction(async t => t.get(tokenRef));
                if (!tokenDoc.exists || tokenDoc.data()?.isUsed === false) {
                    availableToken = code;
                    break;
                }
            }

            if (!availableToken) {
                throw new Error("Inventory Depleted: No free trial tokens currently available.");
            }
            await activateWithToken(availableToken);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };
    
    const handleManualActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) {
            setError("System Input Required: Please enter an activation token.");
            return;
        }
        setLoading(true);
        setError('');
        await activateWithToken(token.trim());
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950 pointer-events-none"></div>
            
            <Card className="max-w-lg w-full !bg-slate-900/80 !backdrop-blur-xl border-white/5 shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-6 border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                        🔐
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">System <span className="text-blue-500">Activation</span></h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mt-3">Executive License Terminal</p>
                </div>

                <div className="space-y-8">
                    <form onSubmit={handleManualActivate} className="space-y-6">
                        <div className="space-y-3">
                            <label htmlFor="token" className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Registry License Key</label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/5 blur-xl group-focus-within:bg-blue-500/10 transition-all rounded-2xl"></div>
                                <input
                                    id="token"
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                                    className="relative w-full p-5 bg-slate-950/80 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all font-mono text-center tracking-[0.2em] placeholder:tracking-normal placeholder:text-slate-700"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full !py-5 font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 rounded-2xl text-sm">
                            {loading ? <Spinner /> : '🚀 Activate Registry'}
                        </Button>
                    </form>
                    
                    {isTrialAvailable && (
                        <div className="pt-6 border-t border-white/5 text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-4">First-time deployment?</p>
                            <button 
                                onClick={handleTrialActivation} 
                                disabled={loading}
                                className="text-blue-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all underline underline-offset-8 decoration-2 decoration-blue-500/30 hover:decoration-blue-500 disabled:opacity-30"
                            >
                                Start 7-Day Free Trial Access
                            </button>
                        </div>
                    )}
                    
                    {error && (
                        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center animate-shake">
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                <span className="mr-2">⚠️</span> {error}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4 grayscale opacity-30">
                     <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">Official Edutec Secure License // {new Date().getFullYear()}</span>
                </div>
            </Card>
        </div>
    );
};

export default SystemActivation;