import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { UserProfile } from '../types';
import { useApproveUser } from '../hooks/useApproveUser';
import { useRejectUser } from '../hooks/useRejectUser';
import Button from './common/Button';
import Spinner from './common/Spinner';

interface AdminApprovalQueueProps {
  allUsers: UserProfile[];
}

export const AdminApprovalQueue: React.FC<AdminApprovalQueueProps> = ({ allUsers }) => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  const [approveUsers, { loading: approving }] = useApproveUser();
  const [rejectUsers, { loading: rejecting }] = useRejectUser();
  
  const isActioning = approving || rejecting;

  const userMap = useMemo(() => {
    return new Map(allUsers.map(user => [user.uid, user.name]));
  }, [allUsers]);

  useEffect(() => {
    const q = db.collection('users').where('status', '==', 'pending');
    const unsubscribe = q.onSnapshot((snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
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
    await approveUsers(selectedUids);
    setSelectedUids([]);
  };

  const handleBulkReject = async () => {
    if (window.confirm(`Are you sure you want to permanently delete these ${selectedUids.length} user registrations?`)) {
      const usersToReject = pendingUsers.filter(user => selectedUids.includes(user.uid)).map(user => ({ uid: user.uid, role: user.role }));
      await rejectUsers(usersToReject);
      setSelectedUids([]);
    }
  };
  
  const isAllSelected = useMemo(() => pendingUsers.length > 0 && selectedUids.length === pendingUsers.length, [pendingUsers, selectedUids]);

  if (loading) return <div className="flex justify-center p-4"><Spinner /></div>;
  if (pendingUsers.length === 0) return <p className="text-gray-400 p-4">No pending user approvals.</p>;

  return (
    <div className="overflow-x-auto">
      {selectedUids.length > 0 && (
        <div className="p-2 bg-slate-900/50 flex items-center gap-4">
          <span className="text-sm font-semibold">{selectedUids.length} selected</span>
          <Button size="sm" onClick={handleBulkApprove} disabled={isActioning}>
            {approving ? 'Approving...' : 'Approve Selected'}
          </Button>
          <Button size="sm" variant="danger" onClick={handleBulkReject} disabled={isActioning}>
            {rejecting ? 'Rejecting...' : 'Reject Selected'}
          </Button>
        </div>
      )}
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-4 py-2 text-left">
              <input 
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700"
              />
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium">Name / Email</th>
            <th className="px-4 py-2 text-left text-xs font-medium">Role</th>
            <th className="px-4 py-2 text-left text-xs font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {pendingUsers.map((user) => (
            <tr key={user.uid} className={`hover:bg-slate-800/50 ${selectedUids.includes(user.uid) ? 'bg-slate-800' : ''}`}>
              <td className="px-4 py-2">
                <input 
                  type="checkbox"
                  checked={selectedUids.includes(user.uid)}
                  onChange={() => handleSelect(user.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700"
                />
              </td>
              <td className="px-4 py-2">
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </td>
              <td className="px-4 py-2 capitalize text-sm">{user.role}</td>
              <td className="px-4 py-2 text-xs text-gray-400">
                {user.role === 'student' && `Class: ${user.class}`}
                {user.role === 'teacher' && `Classes: ${(user.classesTaught || []).join(', ')}`}
                {user.role === 'parent' && `Child: ${user.childUids?.map(uid => userMap.get(uid) || uid).join(', ')}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};