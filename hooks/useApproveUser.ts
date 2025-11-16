import { useState } from 'react';
import { db } from '../services/firebase';

export const useApproveUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveUser = async (uids: string[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    if (uids.length === 0) {
      setLoading(false);
      return true;
    }

    try {
      const batch = db.batch();
      uids.forEach(uid => {
        const userRef = db.collection('users').doc(uid);
        batch.update(userRef, { status: 'approved' });
      });
      await batch.commit();
      return true;
    } catch (e: any) {
      setError(e.message);
      console.error("Error approving users:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [approveUser, { loading, error }] as const;
};