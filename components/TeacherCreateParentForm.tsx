import React, { useState, useEffect } from 'react';
import { useCreateParentByTeacher } from '../hooks/useCreateParentByTeacher';
import { UserProfile } from '../types';
import Button from './common/Button';

interface TeacherCreateParentFormProps {
    allStudents: UserProfile[];
    setToast: (toast: { message: string; type: "success" | "error"; } | null) => void;
}

export const TeacherCreateParentForm: React.FC<TeacherCreateParentFormProps> = ({ allStudents, setToast }) => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [createParent, { loading, error, successData }] = useCreateParentByTeacher();
  const [name, setName] = useState('');
  const [childUid, setChildUid] = useState('');

  useEffect(() => {
    if (successData) {
        setToast({
            message: `Parent account for ${successData.name} created with email ${successData.email} and password: ${successData.password}. Pending admin approval.`,
            type: 'success'
        });
    }
  }, [successData, setToast]);

  useEffect(() => {
    const approvedStudents = allStudents.filter(student => student.status === 'approved');
    
    setStudents(approvedStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    
    if (approvedStudents.length > 0) {
      setChildUid(approvedStudents[0].uid);
    }
  }, [allStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childUid) return;
    const child = students.find(s => s.uid === childUid);
    const wasSuccess = await createParent({ name, childUid, childClassId: child?.class || '' });
    if (wasSuccess) {
      setName('');
    }
  };

  if (!students.length) return <p className="text-sm text-gray-400">No approved students found in your assigned classes to link a parent to.</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-lg">Create New Parent Account</h4>
      <div>
        <label htmlFor="p-name" className="text-sm">Parent's Full Name</label>
        <input id="p-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded" />
      </div>
      <div>
        <label htmlFor="p-child" className="text-sm">Link to Child</label>
        <select id="p-child" value={childUid} onChange={e => setChildUid(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded">
          {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.class})</option>)}
        </select>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating Account...' : 'Create Parent'}
      </Button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
};

export default TeacherCreateParentForm;
