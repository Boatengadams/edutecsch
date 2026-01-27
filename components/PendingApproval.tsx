import React from 'react';
import { firebaseAuth } from '../services/firebase';
import Button from './common/Button';
import Card from './common/Card';
import { useAuthentication } from '../hooks/useAuth';

const PendingApproval: React.FC = () => {
  const { schoolSettings } = useAuthentication();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-y-auto">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
      
      <Card className="text-center max-w-lg w-full relative z-10 !bg-slate-900/80 !backdrop-blur-xl !border-slate-700 shadow-2xl">
        <div className="mb-8 flex justify-center relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
            <div className="relative w-28 h-28 bg-white rounded-3xl flex items-center justify-center border-4 border-slate-700 shadow-lg overflow-hidden">
                {schoolSettings?.schoolLogoUrl ? (
                    <img src={schoolSettings.schoolLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                    <span className="text-5xl animate-pulse">⏳</span>
                )}
            </div>
        </div>
        
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Account Pending Approval</h2>
        <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">{schoolSettings?.schoolName || 'Official Portal'}</p>
        
        <div className="space-y-4 mb-8 text-left sm:text-center">
            <p className="text-slate-300 leading-relaxed">
              Thank you for registering! Your account has been created and is currently in the <strong className="text-blue-400 font-black uppercase text-xs">admin review queue</strong>.
            </p>
            <p className="text-sm text-slate-500 bg-slate-950/50 p-4 rounded-2xl border border-white/5 leading-relaxed italic">
              Verification usually completes within 24 hours. You will gain full access to the campus resources once an administrator certifies your credentials.
            </p>
        </div>

        <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full !py-4 font-black uppercase tracking-widest text-xs">
              Check Protocol Status
            </Button>
            <Button onClick={() => firebaseAuth.signOut()} variant="ghost" className="w-full text-slate-400 hover:text-white text-[10px] font-black uppercase">
              Sign Out
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingApproval;