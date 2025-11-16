import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { useAuthentication } from '../../hooks/useAuth';
// FIX: Import AssignmentType to use in the new SearchResult type.
import type { UserProfile, Assignment, AssignmentType } from '../../types';
import Card from './Card';
import Spinner from './Spinner';
// FIX: Import firebase and firestore compat to bring firestore types into scope.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

// FIX: Redefined SearchResult to handle the name collision with the 'type' property in the Assignment interface.
// The 'type' property from Assignment is renamed to 'assignmentType'.
type SearchResult = 
    | ({ type: 'student' } & UserProfile)
    | ({ type: 'assignment' } & Omit<Assignment, 'type'> & { assignmentType?: AssignmentType });

const GlobalSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { userProfile } = useAuthentication();
    const [searchTerm, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);

    const debouncedQuery = useDebounce(searchTerm, 300);

    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedQuery.trim() || !userProfile) {
                setResults([]);
                return;
            }

            setLoading(true);
            setError('');
            setSelectedItem(null);

            // FIX: Explicitly typed the array to hold promises resolving to SearchResult[].
            const searchPromises: Promise<SearchResult[]>[] = [];
            const queryLower = debouncedQuery.toLowerCase();

            // Search for Users (Students)
            if (userProfile.role === 'admin' || userProfile.role === 'teacher') {
                // FIX: Explicitly typed the promise to ensure compatibility with the searchPromises array.
                let studentSearchPromise: Promise<SearchResult[]>;

                if (userProfile.role === 'admin') {
                    const studentQuery = db.collection('users').where('role', '==', 'student');
                    studentSearchPromise = studentQuery.get().then(snap => 
                        snap.docs
                            .map(doc => doc.data() as UserProfile)
                            .filter(user => (user.name || '').toLowerCase().includes(queryLower))
                            // FIX: Added explicit return type to map to ensure the resulting array is of type SearchResult[].
                            .map((user): SearchResult => ({ type: 'student', ...user }))
                    );
                } else { // Teacher
                    const teacherClasses = [...new Set([
                        ...(userProfile.classesTaught || []),
                        ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : [])
                    ])];

                    if (teacherClasses.length === 0) {
                        studentSearchPromise = Promise.resolve([]);
                    } else {
                        const classChunks: string[][] = [];
                        for (let i = 0; i < teacherClasses.length; i += 10) { // Firestore `in` query limit is 10
                            classChunks.push(teacherClasses.slice(i, i + 10));
                        }

                        const studentQueries = classChunks.map(chunk =>
                            db.collection('users')
                                .where('role', '==', 'student')
                                .where('class', 'in', chunk)
                                .get()
                        );

                        studentSearchPromise = Promise.all(studentQueries).then(allSnapshots => {
                            const studentMap = new Map<string, UserProfile>();
                            allSnapshots.forEach(snapshot => {
                                snapshot.forEach(doc => {
                                    const student = doc.data() as UserProfile;
                                    studentMap.set(student.uid, student);
                                });
                            });
                            return Array.from(studentMap.values())
                                .filter(user => (user.name || '').toLowerCase().includes(queryLower))
                                // FIX: Added explicit return type to map to ensure the resulting array is of type SearchResult[].
                                .map((user): SearchResult => ({ type: 'student', ...user }));
                        });
                    }
                }
                searchPromises.push(studentSearchPromise);
            }

            // Search for Assignments
            let assignmentQuery = db.collection('assignments');
            if(userProfile.role === 'student' && userProfile.class) {
                assignmentQuery = assignmentQuery.where('classId', '==', userProfile.class) as firebase.firestore.CollectionReference;
            } else if (userProfile.role === 'teacher' && userProfile.uid) {
                assignmentQuery = assignmentQuery.where('teacherId', '==', userProfile.uid) as firebase.firestore.CollectionReference;
            }
            searchPromises.push(
                assignmentQuery.get().then(snap => snap.docs
                    .map(doc => ({ ...doc.data(), id: doc.id } as Assignment))
                    .filter(a => (a.title || '').toLowerCase().includes(queryLower))
                    // FIX: Destructured 'type' into 'assignmentType' and added an explicit return type to create a valid SearchResult object.
                    .map((a): SearchResult => {
                        const { type: assignmentType, ...rest } = a;
                        return { type: 'assignment', ...rest, assignmentType };
                    })
                )
            );


            try {
                const allResults = await Promise.all(searchPromises);
                const flattenedResults = allResults.flat();
                setResults(flattenedResults as SearchResult[]);
            } catch (err: any) {
                console.error("Search error:", err);
                setError("Failed to perform search.");
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery, userProfile]);

    const ResultIcon = ({ type }: { type: SearchResult['type'] }) => {
        let icon;
        switch(type) {
            case 'student': icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.095a1.23 1.23 0 0 0 .41-1.412A9.99 9.99 0 0 0 10 12.001c-2.31 0-4.438.784-6.131 2.095Z" /></svg>; break;
            case 'assignment': icon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 0 0-1 1v1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V3a1 1 0 0 0-1-1H9Z" /><path d="M11.5 5.5a1 1 0 1 0-2 0v1a1 1 0 1 0 2 0v-1Z" /></svg>; break;
        }
        return <div className="text-gray-400">{icon}</div>
    };
    
    const DetailsPanel = ({ item }: { item: SearchResult }) => {
        switch(item.type) {
            case 'student': return (
                <div>
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <p><strong>Email:</strong> {item.email}</p>
                    <p><strong>Class:</strong> {item.class}</p>
                </div>
            );
            case 'assignment': return (
                <div>
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <p>{item.description}</p>
                    <p className="text-sm mt-2"><strong>For Class:</strong> {item.classId}</p>
                    <p className="text-sm"><strong>Due:</strong> {item.dueDate}</p>
                </div>
            );
            default: return null;
        }
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start pt-20 p-4 z-50" onClick={onClose}>
            <Card className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search for students, assignments, materials..."
                        autoFocus
                        className="w-full p-3 pl-10 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                     <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                     </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 h-96">
                    <div className="overflow-y-auto pr-2">
                        {loading ? <div className="flex justify-center pt-8"><Spinner/></div> :
                         error ? <p className="text-red-400">{error}</p> :
                         results.length === 0 && debouncedQuery ? <p className="text-gray-400 text-center pt-8">No results found.</p> :
                         results.map((item, index) => (
                            <button key={`${item.type}-${'id' in item ? item.id : item.uid}-${index}`} onClick={() => setSelectedItem(item)} className="w-full text-left p-3 flex items-center gap-3 rounded-md hover:bg-slate-700">
                                <ResultIcon type={item.type} />
                                <div>
                                    {/* FIX: Used the 'type' discriminator for type-safe access to 'title' or 'name'. */}
                                    <p className="font-semibold text-gray-200">{item.type === 'assignment' ? item.title : item.name}</p>
                                    <p className="text-xs text-gray-400 capitalize">{item.type}</p>
                                </div>
                            </button>
                         ))
                        }
                    </div>
                    <div className="bg-slate-900/50 rounded-md p-4 overflow-y-auto">
                        {selectedItem ? <DetailsPanel item={selectedItem} /> : <p className="text-gray-500 text-center pt-8">Select an item to see details.</p>}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default GlobalSearch;
