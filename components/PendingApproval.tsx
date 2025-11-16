import React from 'react';
import { firebaseAuth } from '../services/firebase';
import Button from './common/Button';
import Card from './common/Card';

const PendingApproval: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Card className="text-center max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-100">Account Pending Approval</h2>
        <p className="text-gray-400 mb-6">
          Thank you for signing up! Your account is currently awaiting approval from an administrator.
          You will be able to access the classroom once your account is approved.
        </p>
        {/* FIX: Use v8 compat signOut method. */}
        <Button onClick={() => firebaseAuth.signOut()} variant="secondary">
          Sign Out
        </Button>
      </Card>
    </div>
  );
};

export default PendingApproval;