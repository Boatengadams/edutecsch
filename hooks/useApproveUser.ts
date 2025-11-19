import { useState } from 'react';
import { db } from '../services/firebase';
import { UserRole } from '../types';

export const useApproveUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveUser = async (users: { uid: string; role?: UserRole }[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    if (users.length === 0) {
      setLoading(false);
      return true;
    }

    try {
      const batch = db.batch();
      users.forEach(({ uid, role }) => {
        const userRef = db.collection('users').doc(uid);
        const updateData: any = { status: 'approved' };
        if (role) {
            updateData.role = role;
        }
        batch.update(userRef, updateData);
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