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
  // Free Trial
  '10234738121900': { planType: 'trial' },
  '1024776223800': { planType: 'trial' },
  // Per Month
  '10912183743201': { planType: 'monthly' },
  '10214183743201': { planType: 'monthly' },
  '1024776223801': { planType: 'monthly' },
  // Per Term
  '10247724738102': { planType: 'termly' },
  '10553117624002': { planType: 'termly' },
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
                // FIX: Changed exists() to the exists property for Firebase v8 compat.
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
                // FIX: Changed exists() to the exists property for Firebase v8 compat.
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

    const title = isFirstActivation ? "Activate Your 7-Day Free Trial" : "Subscription Expired";
    const subtitle = isFirstActivation
        ? "Click the button below to automatically activate your 7-day free trial."
        : "Your subscription has expired. Please enter a new activation token to continue using the service.";

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <Card className="max-w-lg w-full">
                <h2 className="text-2xl font-bold text-center mb-2">{title}</h2>
                <p className="text-gray-400 text-center mb-6">{subtitle}</p>
                <div className="space-y-6">
                    {isFirstActivation ? (
                        <div className="space-y-4 text-center">
                            <Button onClick={handleTrialActivation} disabled={loading} className="w-full">
                                {loading ? 'Activating...' : 'Start 7-Day Free Trial'}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleManualActivate} className="space-y-4">
                            <div>
                                <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-1">Activation Token</label>
                                <input
                                    id="token"
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Enter your one-time token"
                                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm"
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? <Spinner /> : 'Activate System'}
                            </Button>
                        </form>
                    )}
                    {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}
                </div>
            </Card>
        </div>
    );
};

export default SystemActivation;
