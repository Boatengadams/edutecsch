import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { UserProfile, UserRole } from '../types';
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
  const [roleOverrides, setRoleOverrides] = useState<Record<string, UserRole>>({});

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
    const usersToApprove = selectedUids.map(uid => {
        const originalUser = pendingUsers.find(u => u.uid === uid);
        const newRole = roleOverrides[uid];
        // Only send role if it has been changed
        return {
            uid,
            role: newRole && newRole !== originalUser?.role ? newRole : undefined
        };
    });

    await approveUsers(usersToApprove);
    setSelectedUids([]);
    setRoleOverrides({});
  };

  const handleBulkReject = async () => {
    if (window.confirm(`Are you sure you want to permanently delete these ${selectedUids.length} user registrations?`)) {
      const usersToReject = pendingUsers.filter(user => selectedUids.includes(user.uid)).map(user => ({ uid: user.uid, role: user.role }));
      await rejectUsers(usersToReject);
      setSelectedUids([]);
      setRoleOverrides({});
    }
  };
  
  const isAllSelected = useMemo(() => pendingUsers.length > 0 && selectedUids.length === pendingUsers.length, [pendingUsers, selectedUids]);

  if (loading) return <div className="flex justify-center p-4"><Spinner /></div>;
  if (pendingUsers.length === 0) return <p className="text-gray-400 p-4">No pending user approvals.</p>;

  return (
    <div className="overflow-x-auto">
      {selectedUids.length > 0 && (
        <div className="p-2 bg-slate-900/50 flex items-center gap-4 mb-4 rounded-lg border border-slate-700">
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
            <th className="px-4 py-2 text-left w-10">
              <input 
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700"
              />
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name / Email</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Role</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {pendingUsers.map((user) => (
            <tr key={user.uid} className={`hover:bg-slate-800/50 transition-colors ${selectedUids.includes(user.uid) ? 'bg-slate-800/80' : ''}`}>
              <td className="px-4 py-3">
                <input 
                  type="checkbox"
                  checked={selectedUids.includes(user.uid)}
                  onChange={() => handleSelect(user.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700 cursor-pointer"
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-200">{user.name}</div>
                <div className="text-xs text-gray-400 font-mono">{user.email}</div>
              </td>
              <td className="px-4 py-3">
                  <select
                    value={roleOverrides[user.uid] || user.role}
                    onChange={(e) => setRoleOverrides(prev => ({ ...prev, [user.uid]: e.target.value as UserRole }))}
                    className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Admin</option>
                  </select>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {user.role === 'student' && `Class: ${user.class}`}
                {user.role === 'teacher' && (user.classesTaught?.length ? `Classes: ${user.classesTaught.join(', ')}` : 'No classes assigned')}
                {user.role === 'parent' && `Child: ${user.childUids?.map(uid => userMap.get(uid) || 'Unknown').join(', ') || 'None'}`}
                {roleOverrides[user.uid] && roleOverrides[user.uid] !== user.role && (
                    <span className="block text-yellow-500 mt-1 font-medium">
                        Changing role to {roleOverrides[user.uid]}
                    </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};