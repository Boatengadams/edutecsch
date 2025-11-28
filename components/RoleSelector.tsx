

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

    const success = await registerProfile(user, {
        name,
        role: selectedRole,
        studentClass: selectedRole === 'student' ? studentClass : undefined,
        teacherClasses: selectedRole === 'teacher' ? teacherClasses : undefined,
        teacherSubjects: selectedRole === 'teacher' ? teacherSubjects : undefined,
        childEmails: selectedRole === 'parent' ? childEmails : undefined,
    });

    if (success) {
        // Reload page to re-initialize auth listeners and fetch the new profile cleanly
        // This is crucial to fix the "Missing permissions" error that occurs if the old listener is dead
        window.location.reload();
    }
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

  const roleOptions: { key: UserRole, label: string, description: string, icon: string }[] = [
    { key: 'student', label: 'Student', description: 'Access learning materials, assignments, and live classes.', icon: '👨‍🎓' },
    { key: 'teacher', label: 'Teacher', description: 'Manage classes, create content, and track progress.', icon: '👩‍🏫' },
    { key: 'parent', label: 'Parent', description: 'Monitor your child\'s performance and attendance.', icon: '👨‍👩‍👧' },
    { key: 'admin', label: 'Admin', description: 'Manage school settings, users, and system configuration.', icon: '🛠️' },
  ];

  const renderRoleSpecificFields = () => {
    if (!selectedRole) return null;

    let fields = null;
    switch (selectedRole) {
        case 'student':
            fields = (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <label htmlFor="studentClass" className="block text-sm font-bold text-gray-300 mb-2">Select Your Class</label>
                    <select id="studentClass" value={studentClass} onChange={e => setStudentClass(e.target.value)}
                        className="block w-full pl-3 pr-10 py-3 text-base bg-slate-900 border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg text-gray-200">
                        {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            );
            break;
        case 'teacher':
            fields = (
                <div className="space-y-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-300">
                                Select Classes You Teach ({teacherClasses.length})
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleSelectAllClasses} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Select All</button>
                                <span className="text-slate-600">|</span>
                                <button type="button" onClick={handleDeselectAllClasses} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Clear</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-900 rounded-lg border border-slate-600 custom-scrollbar">
                            {GES_CLASSES.map(c => (
                                <label key={c} className={`flex items-center space-x-2 p-2 rounded-md transition-colors cursor-pointer ${teacherClasses.includes(c) ? 'bg-blue-900/30 border border-blue-500/30' : 'hover:bg-slate-800'}`}>
                                    <input type="checkbox" checked={teacherClasses.includes(c)} onChange={() => handleTeacherClassChange(c)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-500 rounded bg-slate-800" />
                                    <span className="text-gray-200 text-sm">{c}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-300">
                                Select Subjects You Teach ({teacherSubjects.length})
                            </label>
                             <div className="flex gap-2">
                                <button type="button" onClick={handleSelectAllSubjects} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Select All</button>
                                <span className="text-slate-600">|</span>
                                <button type="button" onClick={handleDeselectAllSubjects} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Clear</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-900 rounded-lg border border-slate-600 custom-scrollbar">
                            {GES_SUBJECTS.map(s => (
                                <label key={s} className={`flex items-center space-x-2 p-2 rounded-md transition-colors cursor-pointer ${teacherSubjects.includes(s) ? 'bg-blue-900/30 border border-blue-500/30' : 'hover:bg-slate-800'}`}>
                                    <input type="checkbox" checked={teacherSubjects.includes(s)} onChange={() => handleTeacherSubjectChange(s)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-500 rounded bg-slate-800" />
                                    <span className="text-gray-200 text-sm truncate" title={s}>{s}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            );
            break;
        case 'parent':
            fields = (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <label htmlFor="childEmails" className="block text-sm font-bold text-gray-300">Child's School Email(s)</label>
                    <p className="text-xs text-gray-400 mb-2 mt-1">Enter the email address your child uses for school. Separate multiple emails with a comma.</p>
                    <input id="childEmails" type="email" value={childEmails} onChange={(e) => setChildEmails(e.target.value)} required placeholder="student@school.com"
                        className="block w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg shadow-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
            );
            break;
        default:
             return <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl text-center"><p className="text-sm text-yellow-200 animate-pulse">Admin accounts require manual approval. Click "Submit" to proceed.</p></div>;
    }

    return <div className="mt-8 animate-fade-in-up">{fields}</div>;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <Card className="max-w-4xl w-full !bg-slate-900/60 !backdrop-blur-2xl !border-slate-700/50 shadow-2xl">
        <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3">Complete Your Profile</h2>
            <p className="text-lg text-slate-400">Tell us who you are to personalize your experience.</p>
        </div>
        
        <form onSubmit={handleFinalSubmit} className="space-y-8">
            <div className="max-w-md mx-auto">
                <label htmlFor="name" className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Full Name</label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="block w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl shadow-inner text-gray-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
            </div>

            <div>
                 <label className="block text-center text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Select Your Role</label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     {roleOptions.map(option => (
                        <button
                            type="button"
                            key={option.key}
                            onClick={() => setSelectedRole(option.key)}
                            className={`group relative flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${selectedRole === option.key 
                                ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-500/20 scale-105 z-10' 
                                : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500'}`}
                        >
                            <div className="text-4xl mb-3 transition-transform group-hover:scale-110">{option.icon}</div>
                            <span className={`font-bold text-lg mb-2 ${selectedRole === option.key ? 'text-white' : 'text-slate-300'}`}>{option.label}</span>
                            <p className={`text-xs text-center leading-relaxed ${selectedRole === option.key ? 'text-blue-100' : 'text-slate-500'}`}>{option.description}</p>
                            
                            {selectedRole === option.key && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                            )}
                        </button>
                     ))}
                 </div>
            </div>

            {renderRoleSpecificFields()}

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="pt-4 max-w-md mx-auto">
                <Button type="submit" disabled={loading || !selectedRole || !name.trim()} className="w-full !py-4 text-lg font-bold shadow-xl rounded-xl">
                    {loading ? 'Setting up your account...' : 'Submit & Continue'}
                </Button>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default RoleSelector;
