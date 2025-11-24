
import React from 'react';
import { firebaseAuth } from '../services/firebase';
import Button from './common/Button';
import Card from './common/Card';

const PendingApproval: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
      
      <Card className="text-center max-w-lg w-full relative z-10 !bg-slate-900/80 !backdrop-blur-xl !border-slate-700 shadow-2xl">
        <div className="mb-8 flex justify-center relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
            <div className="relative w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-lg">
                <span className="text-5xl animate-pulse">⏳</span>
            </div>
        </div>
        
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Account Pending Approval</h2>
        
        <div className="space-y-4 mb-8">
            <p className="text-slate-300 leading-relaxed">
              Thank you for registering! Your account has been created and is currently in the <strong className="text-blue-400">admin review queue</strong>.
            </p>
            <p className="text-sm text-slate-500 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              This process typically takes less than 24 hours. You will gain full access to the platform once an administrator verifies your details.
            </p>
        </div>

        <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full">
              Check Status
            </Button>
            <Button onClick={() => firebaseAuth.signOut()} variant="ghost" className="w-full text-slate-400 hover:text-white">
              Sign Out
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingApproval;
