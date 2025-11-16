import React from 'react';
import Card from './common/Card';
import { firebaseAuth } from '../services/firebase';
import Button from './common/Button';

const SystemLocked: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="text-center max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-4 text-red-400">System Locked</h2>
        <p className="text-gray-400 mb-6">
          Your school's subscription has expired or is inactive. 
          Please contact your school administrator to reactivate the system.
        </p>
        <Button onClick={() => firebaseAuth.signOut()} variant="secondary">
          Sign Out
        </Button>
      </Card>
    </div>
  );
};

export default SystemLocked;
