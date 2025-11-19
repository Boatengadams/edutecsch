import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { useAuthentication } from '../../hooks/useAuth';
import type { UserProfile, Assignment, AssignmentType } from '../../types';
import Card from './Card';
import Spinner from './Spinner';
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

            const searchPromises: Promise<SearchResult[]>[] = [];
            const queryLower = debouncedQuery.toLowerCase();

            if (userProfile.role === 'admin' || userProfile.role === 'teacher') {
                let studentSearchPromise: Promise<SearchResult[]>;

                if (userProfile.role === 'admin') {
                    const studentQuery = db.collection('users').where('role', '==', 'student');
                    studentSearchPromise = studentQuery.get().then(snap => 
                        snap.docs
                            .map(doc => doc.data() as UserProfile)
                            .filter(user => (user.name || '').toLowerCase().includes(queryLower))
                            .map((user): SearchResult => ({ type: 'student', ...user }))
                    );
                } else { 
                    const teacherClasses = [...new Set([
                        ...(userProfile.classesTaught || []),
                        ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : [])
                    ])];

                    if (teacherClasses.length === 0) {
                        studentSearchPromise = Promise.resolve([]);
                    } else {
                        const classChunks: string[][] = [];
                        for (let i = 0; i < teacherClasses.length; i += 10) {
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
                                .map((user): SearchResult => ({ type: 'student', ...user }));
                        });
                    }
                }
                searchPromises.push(studentSearchPromise);
            }

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
        return <div className="text-slate-500">{icon}</div>
    };
    
    const DetailsPanel = ({ item }: { item: SearchResult }) => {
        switch(item.type) {
            case 'student': return (
                <div className="space-y-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xl">
                        {item.name.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-slate-200">{item.name}</h4>
                        <p className="text-slate-400 text-sm">{item.email}</p>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <p className="text-sm"><span className="text-slate-500">Class:</span> <span className="font-semibold text-slate-300">{item.class}</span></p>
                        <p className="text-sm"><span className="text-slate-500">Status:</span> <span className="font-semibold text-slate-300">{item.status}</span></p>
                    </div>
                </div>
            );
            case 'assignment': return (
                <div className="space-y-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M9 2a1 1 0 0 0-1 1v1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V3a1 1 0 0 0-1-1H9Z" /></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-slate-200">{item.title}</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{item.assignmentType}</p>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm space-y-2">
                         <p className="text-slate-300">{item.description}</p>
                         <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-xs text-slate-400">
                             <span>Class: {item.classId}</span>
                             <span>Due: {item.dueDate || 'N/A'}</span>
                         </div>
                    </div>
                </div>
            );
            default: return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-20 p-4 z-50" onClick={onClose}>
            <Card className="w-full max-w-2xl !p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="relative border-b border-slate-700/50">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                     </div>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search for students, assignments..."
                        autoFocus
                        className="w-full py-4 pl-12 pr-4 bg-transparent text-lg text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 h-96">
                    <div className="overflow-y-auto border-r border-slate-700/50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                                <Spinner/>
                                <p className="text-sm">Searching...</p>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full text-red-400 p-4 text-center">{error}</div>
                        ) : results.length === 0 && debouncedQuery ? (
                            <div className="flex items-center justify-center h-full text-slate-500">No results found.</div>
                        ) : (
                            <ul className="divide-y divide-slate-700/30">
                                {results.map((item, index) => (
                                    <li key={`${item.type}-${'id' in item ? item.id : item.uid}-${index}`}>
                                        <button 
                                            onClick={() => setSelectedItem(item)} 
                                            className={`w-full text-left p-4 flex items-center gap-3 hover:bg-slate-700/50 transition-colors ${selectedItem === item ? 'bg-blue-600/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                                        >
                                            <ResultIcon type={item.type} />
                                            <div>
                                                <p className="font-medium text-slate-200">{item.type === 'assignment' ? item.title : item.name}</p>
                                                <p className="text-xs text-slate-500 capitalize">{item.type}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                         {!debouncedQuery && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                                <p className="text-4xl opacity-20">⌘</p>
                                <p className="text-sm">Start typing to search...</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-slate-900/30 p-6 overflow-y-auto">
                        {selectedItem ? (
                            <DetailsPanel item={selectedItem} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                                <p className="text-sm">Select an item to see details.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-slate-800/50 border-t border-slate-700/50 p-2 px-4 text-xs text-slate-500 flex justify-between">
                    <span><strong>Enter</strong> to select</span>
                    <span><strong>Esc</strong> to close</span>
                </div>
            </Card>
        </div>
    );
};

export default GlobalSearch;