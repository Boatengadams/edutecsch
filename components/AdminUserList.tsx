import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole, GES_CLASSES } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import UserEditModal from './UserEditModal';
import { db } from '../services/firebase';
import { useToast } from './common/Toast';
import { useAuthentication } from '../hooks/useAuth';

interface AdminUserListProps {
    allUsers: UserProfile[];
    onNavigateToBilling?: () => void;
}

const AdminUserList: React.FC<AdminUserListProps> = ({ allUsers, onNavigateToBilling }) => {
    const { showToast } = useToast();
    const { subscriptionStatus } = useAuthentication();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
    const [filterClass, setFilterClass] = useState('all');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            const matchesClass = filterClass === 'all' || u.class === filterClass || u.classTeacherOf === filterClass;
            return matchesSearch && matchesRole && matchesClass;
        });
    }, [allUsers, searchTerm, filterRole, filterClass]);

    const handleSaveUser = async (uid: string, data: Partial<UserProfile>) => {
        try {
            await db.collection('users').doc(uid).update(data);
            showToast("User updated successfully", "success");
        } catch (err) {
            showToast("Failed to update user", "error");
            throw err;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Subscription Quick-Action Banner */}
            <Card className={`!p-4 border-l-4 ${subscriptionStatus?.isActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${subscriptionStatus?.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {subscriptionStatus?.isActive ? '🛡️' : '⚠️'}
                        </div>
                        <div>
                            <h3 className="font-black text-white uppercase text-sm tracking-widest">
                                System Status: {subscriptionStatus?.isActive ? 'Licensed & Secure' : 'License Required'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {subscriptionStatus?.isActive 
                                    ? `Plan: ${subscriptionStatus.planType?.toUpperCase()} • Expires ${subscriptionStatus.subscriptionEndsAt?.toDate().toLocaleDateString()}` 
                                    : 'Access restricted for staff and parents until subscription is initialized.'}
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant={subscriptionStatus?.isActive ? "secondary" : "primary"} 
                        size="sm" 
                        onClick={onNavigateToBilling}
                        className="font-black uppercase text-[10px] tracking-[0.2em] px-6"
                    >
                        {subscriptionStatus?.isActive ? 'Renew Subscription' : '🚀 Pay Now & Activate'}
                    </Button>
                </div>
            </Card>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">User Management</h2>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <input 
                        type="search" 
                        placeholder="Search name or email..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-grow md:w-64 p-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm outline-none focus:border-blue-500 transition-all"
                    />
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)} className="p-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm text-slate-300 outline-none">
                        <option value="all">All Roles</option>
                        <option value="student">Students</option>
                        <option value="teacher">Teachers</option>
                        <option value="parent">Parents</option>
                        <option value="admin">Admins</option>
                    </select>
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="p-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm text-slate-300 outline-none">
                        <option value="all">All Classes</option>
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-[10px] text-slate-500 uppercase tracking-[0.2em] bg-slate-900/80 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5 font-black">User Profile</th>
                                <th className="px-6 py-5 font-black">Role</th>
                                <th className="px-6 py-5 font-black">Details</th>
                                <th className="px-6 py-5 font-black text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map(u => (
                                <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-white">{(u.name || '?').charAt(0)}</div>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200">{u.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{u.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : u.role === 'teacher' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>{u.role}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                        {u.role === 'student' ? u.class : u.role === 'teacher' ? `Taught: ${u.classesTaught?.length || 0} classes` : '--'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setEditingUser(u)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 transition-all">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {editingUser && (
                <UserEditModal 
                    isOpen={!!editingUser} 
                    onClose={() => setEditingUser(null)} 
                    user={editingUser} 
                    onSave={handleSaveUser} 
                    allUsers={allUsers} 
                    subjectsByClass={null} 
                />
            )}
        </div>
    );
};

export default AdminUserList;