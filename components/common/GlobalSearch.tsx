
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { useAuthentication } from '../../hooks/useAuth';
import type { UserProfile, Assignment, AssignmentType } from '../../types';
import Card from './Card';
import Spinner from './Spinner';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const STEALTH_EMAILS = ["bagsgraphics4g@gmail.com", "boatengadams4g@gmail.com"];

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
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
            const queryLower = debouncedQuery.toLowerCase();
            const searchPromises: Promise<SearchResult[]>[] = [];

            if (userProfile.role === 'admin' || userProfile.role === 'teacher') {
                const studentQuery = db.collection('users').where('role', '==', 'student');
                searchPromises.push(studentQuery.get().then(snap => 
                    snap.docs
                        .map(doc => doc.data() as UserProfile)
                        .filter(u => (u.name || '').toLowerCase().includes(queryLower) && !STEALTH_EMAILS.includes(u.email || ""))
                        .map((user): SearchResult => ({ type: 'student', ...user }))
                ));
            }

            let assignmentQuery = db.collection('assignments');
            searchPromises.push(assignmentQuery.get().then(snap => snap.docs
                .map(doc => ({ ...doc.data(), id: doc.id } as Assignment))
                .filter(a => (a.title || '').toLowerCase().includes(queryLower))
                .map((a): SearchResult => {
                    const { type: assignmentType, ...rest } = a;
                    return { type: 'assignment', ...rest, assignmentType };
                })
            ));

            try {
                const allResults = await Promise.all(searchPromises);
                setResults(allResults.flat() as SearchResult[]);
            } catch (err: any) {
                setError("Search failed.");
            } finally {
                setLoading(false);
            }
        };
        performSearch();
    }, [debouncedQuery, userProfile]);

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-20 p-4 z-50" onClick={onClose}>
            <Card className="w-full max-w-2xl !p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="relative border-b border-slate-700/50">
                    <input type="search" value={searchTerm} onChange={e => setQuery(e.target.value)} placeholder="Search..." autoFocus className="w-full py-4 pl-12 pr-4 bg-transparent text-lg text-slate-200 outline-none" />
                </div>
                <div className="h-96 overflow-y-auto">
                    {loading ? <div className="p-10 flex justify-center"><Spinner /></div> : (
                        <ul className="divide-y divide-slate-700/30">
                            {results.map((item, i) => (
                                <li key={i} className="p-4 hover:bg-slate-700/50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                                    <p className="font-medium">{item.type === 'assignment' ? item.title : item.name}</p>
                                    <p className="text-xs text-slate-500 capitalize">{item.type}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default GlobalSearch;
