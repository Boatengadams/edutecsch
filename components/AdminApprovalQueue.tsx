
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { UserProfile, UserRole } from '../types';
import { useApproveUser } from '../hooks/useApproveUser';
import { useRejectUser } from '../hooks/useRejectUser';
import Button from './common/Button';
import Spinner from './common/Spinner';

const OMNI_USER_EMAIL = "bagsgraphics4g@gmail.com";

interface AdminApprovalQueueProps {
  allUsers: UserProfile[];
}

export const AdminApprovalQueue: React.FC<AdminApprovalQueueProps> = ({ allUsers }) => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, UserRole>>({});

  const [approveUsers, { loading: approving }] = useApproveUser();
  const [rejectUsers, { loading: rejecting }] = useRejectUser();
  
  const isActioning = approving || rejecting;

  useEffect(() => {
    const q = db.collection('users').where('status', '==', 'pending');
    const unsubscribe = q.onSnapshot((snapshot) => {
      const users = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.email !== OMNI_USER_EMAIL);
      setPendingUsers(users);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  const handleSelect = (uid: string) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUids(pendingUsers.map(u => u.uid));
    } else {
      setSelectedUids([]);
    }
  };

  const handleBulkApprove = async () => {
    const usersToApprove = selectedUids.map(uid => {
        const originalUser = pendingUsers.find(u => u.uid === uid);
        const newRole = roleOverrides[uid];
        return {
            uid,
            role: newRole && newRole !== originalUser?.role ? newRole : undefined
        };
    });
    await approveUsers(usersToApprove);
    setSelectedUids([]);
  };

  if (loading) return <div className="flex justify-center p-4"><Spinner /></div>;
  if (pendingUsers.length === 0) return <p className="text-gray-400 p-4">No pending user approvals.</p>;

  return (
    <div className="overflow-x-auto">
      {selectedUids.length > 0 && (
        <div className="p-2 bg-slate-900/50 flex items-center gap-4 mb-4 rounded-lg border border-slate-700">
          <span className="text-sm font-semibold">{selectedUids.length} selected</span>
          <Button size="sm" onClick={handleBulkApprove} disabled={isActioning}>Approve</Button>
        </div>
      )}
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-4 py-2 text-left w-10">
              <input type="checkbox" checked={selectedUids.length === pendingUsers.length} onChange={handleSelectAll} />
            </th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Role</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map(user => (
            <tr key={user.uid} className="hover:bg-slate-700/30">
              <td className="p-4"><input type="checkbox" checked={selectedUids.includes(user.uid)} onChange={() => handleSelect(user.uid)} /></td>
              <td className="p-4">{user.name}</td>
              <td className="p-4 uppercase text-xs font-bold text-slate-400">{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
