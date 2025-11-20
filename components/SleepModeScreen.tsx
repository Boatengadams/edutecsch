import React from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { firebaseAuth } from '../services/firebase';

interface SleepModeScreenProps {
  wakeTime: string;
}

const SleepModeScreen: React.FC<SleepModeScreenProps> = ({ wakeTime }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Starry background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-[30%] left-[80%] w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-[60%] left-[40%] w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-[15%] left-[60%] w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute w-32 h-32 bg-blue-900/20 rounded-full blur-3xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <Card className="text-center max-w-md w-full relative z-10 border-blue-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-blue-950 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-[0_0_20px_rgba(30,58,138,0.5)]">
                <span className="text-5xl">😴</span>
            </div>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-blue-300">Sleep Mode Active</h2>
        <p className="text-gray-400 mb-6 leading-relaxed">
          It's time to rest and recharge! The student portal is currently closed for the night to ensure you get enough sleep.
          <br/><br/>
          The portal will wake up at <span className="text-white font-bold">{wakeTime}</span>.
        </p>
        <Button onClick={() => firebaseAuth.signOut()} variant="secondary" className="w-full">
          Sign Out
        </Button>
      </Card>
    </div>
  );
};

export default SleepModeScreen;