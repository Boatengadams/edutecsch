import React, { useState } from 'react';
import { useCreateUser } from '../hooks/useCreateUser';
import { GES_CLASSES, UserRole } from '../types';
import Button from './common/Button';

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-lg">Create Single User</h4>
      <div>
        <label htmlFor="user-name" className="text-sm">Full Name</label>
        <input id="user-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded" />
      </div>
      <div>
        <label htmlFor="user-email" className="text-sm">Email {role !== 'teacher' && '(will be auto-generated)'}</label>
        <input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required={role === 'teacher'} placeholder={role !== 'teacher' ? "Auto-generated based on name & class" : "teacher.name@example.com"} className="w-full p-2 mt-1 bg-slate-700 rounded" />
      </div>
       <div>
        <label htmlFor="user-role" className="text-sm">Role</label>
        <select id="user-role" value={role} onChange={e => setRole(e.target.value as UserRole)} required className="w-full p-2 mt-1 bg-slate-700 rounded capitalize">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
        </select>
      </div>
      {role === 'student' && (
        <div>
            <label htmlFor="user-class" className="text-sm">Class</label>
            <select id="user-class" value={classId} onChange={e => setClassId(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded">
                {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating Account...' : 'Create User'}
      </Button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {successData && !error && (
        <div className="text-green-400 text-sm p-3 bg-green-900/50 rounded-md">
            <p>Account created for {successData.uid}.</p>
            <p>Email: <strong>{successData.email}</strong></p>
            <p>Password: <strong>{successData.password}</strong></p>
            <p className="text-xs mt-1">Account is pending admin approval.</p>
        </div>
      )}
    </form>
  );
};

export default AdminCreateUserForm;
