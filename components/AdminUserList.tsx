import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole, GES_CLASSES } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import UserEditModal from './UserEditModal';
import { db } from '../services/firebase';
import { useToast } from './common/Toast';
import { useAuthentication } from '../hooks/useAuth';
import SnapToRegister from './SnapToRegister';
import AdminCreateUserForm from './AdminCreateUserForm';
import AdminCreateParentForm from './AdminCreateParentForm';

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
    
    // Registration States
    const [showCreateModal, setShowCreateModal] = useState<'individual' | 'parent' | null>(null);
    const [showSnapModal, setShowSnapModal] = useState<UserRole | null>(null);

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
        <div className="space-y-8 animate-fade-in-up">
            {/* Header with Registration Hub */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">User <span className="text-blue-500">Registry</span></h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mt-2">Database Management & Onboarding</p>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <button 
                            onClick={() => setShowCreateModal('individual')}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-all"
                        >
                            + Manual Add
                        </button>
                        <div className="w-px h-4 bg-white/10 self-center"></div>
                        <button 
                            onClick={() => setShowCreateModal('parent')}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-white transition-all"
                        >
                            + Add Parent
                        </button>
                    </div>

                    <Button 
                        onClick={() => setShowSnapModal('student')}
                        className="!bg-blue-600/10 border border-blue-500/30 !text-blue-400 font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl shadow-xl hover:!bg-blue-600 hover:!text-white transition-all"
                    >
                        📸 Snap List
                    </Button>
                </div>
            </div>

            {/* Stats & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-2 !p-2 bg-slate-900/40 border-white/5 flex items-center">
                    <div className="relative w-full">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">🔍</span>
                        <input 
                            type="search" 
                            placeholder="Find name, ID or email..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-transparent text-sm text-white outline-none placeholder-slate-700"
                        />
                    </div>
                </Card>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)} className="p-3.5 bg-slate-900 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 outline-none focus:border-blue-500 transition-all">
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="parent">Parents</option>
                    <option value="admin">Admins</option>
                </select>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="p-3.5 bg-slate-900 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 outline-none focus:border-blue-500 transition-all">
                    <option value="all">All Classes</option>
                    {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <Card className="!p-0 overflow-hidden border-white/5 shadow-3xl rounded-[2rem]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-[10px] text-slate-500 uppercase tracking-[0.3em] bg-slate-800/80 border-b border-white/5">
                            <tr>
                                <th className="px-8 py-6 font-black">User Profile</th>
                                <th className="px-8 py-6 font-black">Role / Level</th>
                                <th className="px-8 py-6 font-black">Status</th>
                                <th className="px-8 py-6 font-black text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-32 text-center text-slate-600 italic">No records found matching criteria.</td>
                                </tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shadow-inner flex-shrink-0">
                                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-500">{(u.name || '?').charAt(0)}</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-white group-hover:text-blue-400 transition-colors uppercase truncate">{u.name}</p>
                                                <p className="text-[10px] text-slate-600 font-mono truncate">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className={`w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/5 ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : u.role === 'teacher' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                                                {u.role}
                                            </span>
                                            <p className="text-[10px] text-slate-600 font-bold uppercase">{u.role === 'student' ? u.class : u.role === 'teacher' ? `${u.classesTaught?.length || 0} classes` : '--'}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest ${u.status === 'approved' ? 'text-emerald-500' : u.status === 'pending' ? 'text-amber-500' : 'text-rose-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : u.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => setEditingUser(u)} 
                                            className="px-4 py-2 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-blue-600 transition-all border border-white/5 shadow-lg"
                                        >
                                            Modify
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modals */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-4 z-[100] animate-fade-in">
                    <Card className="w-full max-w-lg shadow-3xl !p-0 overflow-hidden border-white/10">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">
                                {showCreateModal === 'individual' ? 'New System Account' : 'Parent Registration'}
                            </h3>
                            <button onClick={() => setShowCreateModal(null)} className="text-slate-500 hover:text-white p-2">✕</button>
                        </div>
                        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {showCreateModal === 'individual' ? <AdminCreateUserForm /> : <AdminCreateParentForm allStudents={allUsers.filter(u => u.role === 'student')} />}
                        </div>
                    </Card>
                </div>
            )}

            {showSnapModal && (
                <SnapToRegister 
                    onClose={() => setShowSnapModal(null)} 
                    roleToRegister={showSnapModal} 
                />
            )}

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