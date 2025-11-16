import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCreateUser } from '../hooks/useCreateUser';
import { UserProfile } from '../types';
import Button from './common/Button';

interface AdminCreateParentFormProps {
    allStudents: UserProfile[];
}

const AdminCreateParentForm: React.FC<AdminCreateParentFormProps> = ({ allStudents }) => {
  const [createParent, { loading, error, successData }] = useCreateUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [childUids, setChildUids] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childUids.length === 0) {
        alert("Please select at least one child to link.");
        return;
    }
    const wasSuccess = await createParent({ name, email, role: 'parent', childUids });
    if (wasSuccess) {
      setName('');
      setEmail('');
      setChildUids([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedAndFilteredStudents = useMemo(() => {
    const filtered = allStudents.filter(student =>
        student && typeof student === 'object' && student.uid && student.name &&
        typeof student.name === 'string' &&
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, student) => {
        const className = student.class || 'Unassigned';
        if (!acc[className]) {
            acc[className] = [];
        }
        acc[className].push(student);
        return acc;
    }, {} as Record<string, UserProfile[]>);
  }, [allStudents, searchTerm]);
  
  const handleChildSelection = (uid: string) => {
      setChildUids(prev => 
        prev.includes(uid) 
            ? prev.filter(id => id !== uid) 
            : [...prev, uid]
      );
  };
  
  const selectedChildrenNames = useMemo(() => {
      if (childUids.length === 0) return "Select child/children";
      if (childUids.length === 1) return allStudents.find(s => s?.uid === childUids[0])?.name || "1 child selected";
      return `${childUids.length} children selected`;
  }, [childUids, allStudents]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-lg">Create Parent Account</h4>
      <div>
        <label htmlFor="p-name" className="text-sm">Parent's Full Name</label>
        <input id="p-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded" />
      </div>
      <div>
        <label htmlFor="p-email" className="text-sm">Parent's Email</label>
        <input id="p-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 mt-1 bg-slate-700 rounded" />
      </div>
      <div className="relative" ref={dropdownRef}>
        <label className="text-sm">Link to Child/Children</label>
        <button type="button" onClick={() => setIsDropdownOpen(prev => !prev)} className="w-full p-2 mt-1 bg-slate-700 rounded text-left flex justify-between items-center">
            <span className="truncate">{selectedChildrenNames}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </button>
        {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 flex flex-col">
                <div className="p-2 border-b border-slate-600">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search for student..."
                        className="w-full p-1.5 bg-slate-700 rounded-md text-sm"
                    />
                </div>
                <div className="overflow-y-auto">
                    {allStudents.length > 0 ? (
                        Object.keys(groupedAndFilteredStudents).sort().map(className => (
                            <div key={className}>
                                <h5 className="font-bold text-xs text-gray-400 p-2 bg-slate-900/50 sticky top-0">{className}</h5>
                                {groupedAndFilteredStudents[className].map(student => (
                                    <label key={student.uid} className="flex items-center gap-2 p-2 hover:bg-slate-700 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={childUids.includes(student.uid)}
                                            onChange={() => handleChildSelection(student.uid)}
                                            className="h-4 w-4 rounded bg-slate-700 border-slate-500"
                                        />
                                        <span>{student.name}</span>
                                    </label>
                                ))}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center p-4">No approved students available to link</p>
                    )}
                </div>
            </div>
        )}
      </div>
      <Button type="submit" disabled={loading || allStudents.length === 0} className="w-full">
        {loading ? 'Creating Account...' : 'Create Parent & Link'}
      </Button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {successData && !error && (
        <div className="text-green-400 text-sm p-3 bg-green-900/50 rounded-md">
            <p>Account created for {successData.uid}.</p>
            <p>Temporary Password: <strong>{successData.password}</strong></p>
            <p className="text-xs mt-1">Account is pending admin approval.</p>
        </div>
      )}
    </form>
  );
};

export default AdminCreateParentForm;