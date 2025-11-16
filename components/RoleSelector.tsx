import React, { useState } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { UserRole, GES_CLASSES, GES_SUBJECTS } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { useSelfRegister } from '../hooks/useSelfRegister';

const RoleSelector: React.FC = () => {
  const { user } = useAuthentication();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  
  const [studentClass, setStudentClass] = useState<string>(GES_CLASSES[0]);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [childEmails, setChildEmails] = useState('');

  const [registerProfile, { loading, error }] = useSelfRegister();

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRole || !name.trim()) return;

    await registerProfile(user, {
        name,
        role: selectedRole,
        studentClass: selectedRole === 'student' ? studentClass : undefined,
        teacherClasses: selectedRole === 'teacher' ? teacherClasses : undefined,
        teacherSubjects: selectedRole === 'teacher' ? teacherSubjects : undefined,
        childEmails: selectedRole === 'parent' ? childEmails : undefined,
    });
  };
  
  const handleTeacherClassChange = (className: string) => {
    setTeacherClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const handleTeacherSubjectChange = (subjectName: string) => {
    setTeacherSubjects(prev => 
      prev.includes(subjectName) 
        ? prev.filter(s => s !== subjectName)
        : [...prev, subjectName]
    );
  };
  
  const handleSelectAllClasses = () => setTeacherClasses([...GES_CLASSES]);
  const handleDeselectAllClasses = () => setTeacherClasses([]);
  const handleSelectAllSubjects = () => setTeacherSubjects([...GES_SUBJECTS]);
  const handleDeselectAllSubjects = () => setTeacherSubjects([]);

  const roleOptions: { key: UserRole, label: string, icon: React.ReactNode }[] = [
    { key: 'student', label: 'Student', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg> },
    { key: 'teacher', label: 'Teacher', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.47a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a14.95 14.95 0 0 0-5.84-2.56m0 0a14.95 14.95 0 0 1-5.84 2.56m5.84-2.56V4.72a2.25 2.25 0 0 1 2.25-2.25h1.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-9-6.375a14.95 14.95 0 0 0-5.84 2.56m5.84-2.56V4.72a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25v7.5" /></svg> },
    { key: 'parent', label: 'Parent', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962a3.75 3.75 0 1 0-7.5 0 3.75 3.75 0 0 0 7.5 0ZM10.5 14.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg> },
    { key: 'admin', label: 'Admin', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
  ];

  const renderRoleSpecificFields = () => {
    if (!selectedRole) return null;

    let fields = null;
    switch (selectedRole) {
        case 'student':
            fields = (
                <div>
                    <label htmlFor="studentClass" className="block text-sm font-medium text-gray-300">Select Your Class</label>
                    <select id="studentClass" value={studentClass} onChange={e => setStudentClass(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-200">
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            );
            break;
        case 'teacher':
            fields = (
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-300">
                                Select Classes You Teach ({teacherClasses.length})
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleSelectAllClasses} className="text-xs text-blue-400 hover:underline focus:outline-none">All</button>
                                <button type="button" onClick={handleDeselectAllClasses} className="text-xs text-blue-400 hover:underline focus:outline-none">None</button>
                            </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-700 rounded-md border border-slate-600">
                            {GES_CLASSES.map(c => (
                                <label key={c} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-600 transition-colors cursor-pointer">
                                    <input type="checkbox" checked={teacherClasses.includes(c)} onChange={() => handleTeacherClassChange(c)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-800" />
                                    <span className="text-gray-200 text-sm">{c}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-300">
                                Select Subjects You Teach ({teacherSubjects.length})
                            </label>
                             <div className="flex gap-2">
                                <button type="button" onClick={handleSelectAllSubjects} className="text-xs text-blue-400 hover:underline focus:outline-none">All</button>
                                <button type="button" onClick={handleDeselectAllSubjects} className="text-xs text-blue-400 hover:underline focus:outline-none">None</button>
                            </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-700 rounded-md border border-slate-600">
                            {GES_SUBJECTS.map(s => (
                                <label key={s} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-600 transition-colors cursor-pointer">
                                    <input type="checkbox" checked={teacherSubjects.includes(s)} onChange={() => handleTeacherSubjectChange(s)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-800" />
                                    <span className="text-gray-200 text-sm">{s}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            );
            break;
        case 'parent':
            fields = (
                <div>
                    <label htmlFor="childEmails" className="block text-sm font-medium text-gray-300">Your Child's School Email(s)</label>
                    <p className="text-xs text-gray-400 mb-1">Enter email(s) to link accounts. For multiple children, separate emails with a comma.</p>
                    <input id="childEmails" type="email" value={childEmails} onChange={(e) => setChildEmails(e.target.value)} required placeholder="student.name@email.com, other.child@email.com"
                        className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
            );
            break;
        default:
             return <p className="text-center text-sm text-gray-400 animate-fade-in-up">Admin accounts require manual approval. Click "Submit" to proceed.</p>;
    }

    return <div className="mt-6 animate-fade-in-up">{fields}</div>;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="max-w-2xl w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-100 mb-2">Complete Your Registration</h2>
        <p className="text-gray-400 text-center mb-8">Tell us who you are to get started.</p>
        <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>

            <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">Select Your Role</label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {roleOptions.map(option => (
                        <button
                            type="button"
                            key={option.key}
                            onClick={() => setSelectedRole(option.key)}
                            className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${selectedRole === option.key ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-900/20' : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'}`}>
                            {option.icon}
                            <span className="font-semibold text-sm">{option.label}</span>
                        </button>
                     ))}
                 </div>
            </div>

            {renderRoleSpecificFields()}

            {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}

            <div className="pt-4">
                <Button type="submit" disabled={loading || !selectedRole || !name.trim()} className="w-full !py-3">
                    {loading ? 'Submitting...' : 'Submit for Approval'}
                </Button>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default RoleSelector;