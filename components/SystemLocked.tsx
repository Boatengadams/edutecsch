import React from 'react';
import Card from './common/Card';
import { firebaseAuth } from '../services/firebase';
import Button from './common/Button';
import { useAuthentication } from '../hooks/useAuth';

const SystemLocked: React.FC = () => {
  const { schoolSettings } = useAuthentication();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-5"></div>
      
      <Card className="text-center max-w-lg w-full relative z-10 !bg-slate-900 !border-red-900/50 shadow-2xl shadow-red-900/20">
        <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border-2 border-slate-700 shadow-[0_0_20px_rgba(220,38,38,0.2)] overflow-hidden">
                {schoolSettings?.schoolLogoUrl ? (
                    <img src={schoolSettings.schoolLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                )}
            </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-2 text-red-500 tracking-tight">System Access Locked</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">{schoolSettings?.schoolName || 'Edutec Portal'}</p>
        <div className="h-1 w-16 bg-red-900/50 mx-auto mb-6 rounded-full"></div>
        
        <p className="text-slate-300 mb-8 leading-relaxed">
          The subscription for this school instance has expired or is currently inactive. 
          <br/>
          Please contact your school administrator or IT department to reactivate the license key.
        </p>
        
        <Button onClick={() => firebaseAuth.signOut()} variant="secondary" className="w-full border-red-900/30 hover:bg-red-950/30 hover:text-red-400">
          Terminate Session
        </Button>
        
        <p className="mt-6 text-[10px] text-slate-600 font-mono">ERROR_CODE: SUB_INACTIVE_x04</p>
      </Card>
    </div>
  );
};

export default SystemLocked;