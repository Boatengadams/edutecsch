import React, { useState } from 'react';
import { useCreateStudentByTeacher } from '../hooks/useCreateStudentByTeacher';
import Button from './common/Button';

interface TeacherCreateStudentFormProps {
    classId: string;
}

export const TeacherCreateStudentForm: React.FC<TeacherCreateStudentFormProps> = ({ classId }) => {
  const [createStudent, { loading, error, successData }] = useCreateStudentByTeacher();
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) return;
    const wasSuccess = await createStudent({ name, classId });
    if (wasSuccess) {
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-lg">Create New Student for {classId}</h4>
      <div>
        <label htmlFor="s-name" className="text-sm">Student's Full Name</label>
        <input id="s-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded" />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating Account...' : 'Create Student'}
      </Button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {successData && !error && <p className="text-green-400 text-sm">Account created. Email: <strong>{successData.email}</strong>, Password: <strong>{successData.password}</strong>. Account is pending admin approval.</p>}
    </form>
  );
};

export default TeacherCreateStudentForm;
