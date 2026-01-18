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

    const isFirstActivation = !subscriptionStatus || !subscriptionStatus.trialEndsAt;

    const activateWithToken = async (tokenToUse: string) => {
        if (!userProfile || userProfile.role !== 'admin') {
            setError("You are not authorized to perform this action.");
            setLoading(false);
            return;
        }

        const tokenDetails = ACTIVATION_CODES[tokenToUse];
        if (!tokenDetails) {
            setError("The provided activation token is not valid.");
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
                    throw new Error("This activation token has already been used.");
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
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An unknown error occurred during activation.');
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
                throw new Error("No available free trial tokens. Please contact support.");
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
            setError("Please enter an activation token.");
            return;
        }
        setLoading(true);
        setError('');
        await activateWithToken(token);
    };

    const title = isFirstActivation ? "Activate Your 7-Day Free Trial" : "Subscription Required";
    const subtitle = isFirstActivation
        ? "Click the button below to automatically activate your 7-day free trial."
        : "Your subscription has expired or is inactive. Please enter a valid termly activation token to continue using the service.";

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950 pointer-events-none"></div>
            
            <Card className="max-w-lg w-full !bg-slate-900/80 !backdrop-blur-xl border-white/5 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 border border-blue-500/20 shadow-xl">
                        💳
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{title}</h2>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">{subtitle}</p>
                </div>

                <div className="space-y-6">
                    {isFirstActivation ? (
                        <div className="space-y-4 text-center">
                            <Button onClick={handleTrialActivation} disabled={loading} className="w-full !py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-900/30">
                                {loading ? 'Initializing...' : '🚀 Start 7-Day Free Trial'}
                            </Button>
                            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Full access to all modules included</p>
                        </div>
                    ) : (
                        <form onSubmit={handleManualActivate} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="token" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Activation Token</label>
                                <input
                                    id="token"
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Enter encrypted token code"
                                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500/30 transition-all font-mono text-center tracking-widest"
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full !py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-900/30">
                                {loading ? <Spinner /> : 'Activate System Registry'}
                            </Button>
                        </form>
                    )}
                    
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">⚠️ {error}</p>
                        </div>
                    )}
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-4 grayscale opacity-30">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Official Edutec Secure License</span>
                </div>
            </Card>
        </div>
    );
};

export default SystemActivation;