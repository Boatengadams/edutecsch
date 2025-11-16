import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserRole, GES_CLASSES, SubjectsByClass } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { firebase } from '../services/firebase';

const ROLES: UserRole[] = ['student', 'teacher', 'parent', 'admin'];

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  user: UserProfile | null;
  allUsers: UserProfile[];
  subjectsByClass: SubjectsByClass | null;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, user, allUsers, subjectsByClass: masterSubjectsByClass }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Role-specific state
  const [studentClass, setStudentClass] = useState('');
  const [parentChildren, setParentChildren] = useState<string[]>([]);
  const [classTeacherOf, setClassTeacherOf] = useState<string>('');
  const [classesTaught, setClassesTaught] = useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, string[]>>({});
  const [isAlsoAdmin, setIsAlsoAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role);
      // Student fields
      setStudentClass(user.class || '');
      // Parent fields
      setParentChildren(user.childUids || []);
      // Teacher fields
      setClassTeacherOf(user.classTeacherOf || '');
      setClassesTaught(user.classesTaught || []);
      setSubjectsByClass(user.subjectsByClass || {});
      setIsAlsoAdmin(user.isAlsoAdmin || false);
      setError('');
    }
  }, [user]);

  const allStudents = useMemo(() => allUsers.filter(u => u?.uid && u.role === 'student' && u.name), [allUsers]);

  const assignedClasses = useMemo(() => {
    const allClasses = new Set(classesTaught);
    if (classTeacherOf) {
        allClasses.add(classTeacherOf);
    }
    return Array.from(allClasses).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classesTaught, classTeacherOf]);

  const handleClassesTaughtChange = (className: string) => {
    setClassesTaught(prev =>
        prev.includes(className)
            ? prev.filter(c => c !== className)
            : [...prev, className]
    );
  };
  
  const handleChildLinkChange = (childUid: string) => {
    setParentChildren(prev =>
        prev.includes(childUid)
            ? prev.filter(uid => uid !== childUid)
            : [...prev, childUid]
    );
  };

  const handleSubjectChange = (className: string, subjectName: string) => {
    setSubjectsByClass(prev => {
        const currentSubjects = prev[className] || [];
        const newSubjects = currentSubjects.includes(subjectName)
            ? currentSubjects.filter(s => s !== subjectName)
            : [...currentSubjects, subjectName];
        return {
            ...prev,
            [className]: newSubjects,
        };
    });
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updateData: Partial<UserProfile> = { name, role };
      
      if (role === 'teacher') {
        updateData.classTeacherOf = classTeacherOf ? classTeacherOf : (firebase.firestore.FieldValue.delete() as any);
        updateData.classesTaught = classesTaught;
        updateData.subjectsByClass = subjectsByClass;
        updateData.isAlsoAdmin = isAlsoAdmin;
        if (isAlsoAdmin) {
            updateData.adminType = 'co-admin';
        } else {
            updateData.adminType = firebase.firestore.FieldValue.delete() as any;
        }

      } else if (role === 'student') {
          updateData.class = studentClass;
      } else if (role === 'parent') {
          updateData.childUids = parentChildren;
      }

      await onSave(user.uid, updateData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderRoleSpecificFields = () => {
      switch(role) {
          case 'student':
              return (
                  <div>
                      <label htmlFor="edit-student-class" className="block text-sm font-medium text-gray-300">Class</label>
                      <select id="edit-student-class" value={studentClass} onChange={e => setStudentClass(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md">
                          {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
              );
          case 'parent':
              return (
                  <div>
                      <label className="block text-sm font-medium text-gray-300">Linked Children</label>
                      <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-600">
                          {allStudents.map(student => (
                              <label key={student.uid} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={parentChildren.includes(student.uid)} onChange={() => handleChildLinkChange(student.uid)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                                  <span className="text-gray-200 text-sm">{student.name} ({student.class})</span>
                              </label>
                          ))}
                      </div>
                  </div>
              );
          case 'teacher':
              return (
                <div className="space-y-4 border-t border-slate-600 pt-4">
                    <h4 className="text-md font-semibold text-gray-200">Teaching Assignments</h4>
                    <div>
                        <label htmlFor="edit-class-teacher" className="block text-sm font-medium text-gray-300">Class Teacher Of</label>
                        <select id="edit-class-teacher" value={classTeacherOf} onChange={(e) => setClassTeacherOf(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md">
                            <option value="">None</option>
                            {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Other Classes Taught</label>
                        <div className="mt-2 grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-600">
                            {GES_CLASSES.map(c => (
                                <label key={c} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={classesTaught.includes(c)} onChange={() => handleClassesTaughtChange(c)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                                    <span className="text-gray-200 text-sm">{c}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {assignedClasses.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Subjects Taught per Class</label>
                            <div className="mt-2 space-y-3 max-h-48 overflow-y-auto p-3 bg-slate-800 rounded-md border border-slate-600">
                                {assignedClasses.map(c => {
                                    const availableSubjects = masterSubjectsByClass?.[c] || [];
                                    return (
                                        <div key={c}>
                                            <h5 className="font-semibold text-sm text-gray-300 border-b border-slate-700 pb-1">{c}</h5>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pl-2">
                                                {availableSubjects.map(subject => (
                                                    <label key={`${c}-${subject}`} className="flex items-center space-x-2 cursor-pointer">
                                                        <input type="checkbox" checked={(subjectsByClass[c] || []).includes(subject)} onChange={() => handleSubjectChange(c, subject)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                                                        <span className="text-gray-300 text-xs">{subject}</span>
                                                    </label>
                                                ))}
                                                {availableSubjects.length === 0 && <p className="text-xs text-gray-500 col-span-2">No subjects enabled for this class by admin.</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                     <div className="pt-4 border-t border-slate-700">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isAlsoAdmin} 
                                onChange={e => setIsAlsoAdmin(e.target.checked)}
                                className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold">Grant Co-Admin Privileges</span>
                        </label>
                        <p className="text-xs text-gray-400 pl-6">This will allow the teacher to access the Admin Portal and switch between roles.</p>
                    </div>
                </div>
              );
          default:
              return null;
      }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
      <Card className="w-full max-w-lg h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <h3 className="text-xl font-bold mb-4 flex-shrink-0">Edit User: {user.name}</h3>
          <div className="flex-grow overflow-y-auto space-y-4 pr-2 border-y border-slate-700 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300">Full Name</label>
                    <input id="edit-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md" />
                </div>
                <div>
                    <label htmlFor="edit-role" className="block text-sm font-medium text-gray-300">Role</label>
                    <select id="edit-role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md capitalize">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>
            {renderRoleSpecificFields()}
          </div>
          <div className="flex-shrink-0 pt-4">
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UserEditModal;