import React, { useState } from 'react';
import { useCreateUser } from '../hooks/useCreateUser';
import { GES_CLASSES, UserRole } from '../types';
import Button from './common/Button';
import Spinner from './common/Spinner';

const AdminCreateUserForm: React.FC = () => {
  const [createUser, { loading, error, successData }] = useCreateUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [classId, setClassId] = useState(GES_CLASSES[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userData = {
        name,
        email,
        role,
        classId: role === 'student' ? classId : undefined,
    };
    const wasSuccess = await createUser(userData);
    if (wasSuccess) {
      setName('');
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
          <div>
            <label htmlFor="user-role" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Administrative Role</label>
            <select id="user-role" value={role} onChange={e => setRole(e.target.value as UserRole)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-blue-400 outline-none focus:ring-2 ring-blue-500/30 uppercase tracking-widest">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="user-name" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Full Identity Name</label>
            <input id="user-name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. John Doe" className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500" />
          </div>

          <div>
            <label htmlFor="user-email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Registry Email {role !== 'teacher' && role !== 'admin' && '(Optional)'}</label>
            <input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required={role === 'teacher' || role === 'admin'} placeholder={role === 'student' ? "Auto-generated if left blank" : "name@school.edu"} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500" />
          </div>

          {role === 'student' && (
            <div className="animate-fade-in-up">
                <label htmlFor="user-class" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Assigned Class Registry</label>
                <select id="user-class" value={classId} onChange={e => setClassId(e.target.value)} required className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none">
                    {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
          )}
      </div>

      {error && <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">⚠️ {error}</div>}
      
      {successData && !error && (
        <div className="text-emerald-400 text-xs p-5 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl space-y-2 shadow-inner">
            <p className="font-black uppercase tracking-widest">Protocol Verified ✓</p>
            <div className="space-y-1 opacity-80">
                <p>Email: <span className="font-mono bg-slate-900 px-2 rounded">{successData.email}</span></p>
                <p>Secret Key: <span className="font-mono bg-slate-900 px-2 rounded">{successData.password}</span></p>
            </div>
            <p className="text-[9px] text-slate-500 italic mt-3">Account is awaiting administrative clearance.</p>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full py-5 font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 rounded-2xl text-xs">
        {loading ? <Spinner /> : 'Commit to Registry 🚀'}
      </Button>
    </form>
  );
};

export default AdminCreateUserForm;