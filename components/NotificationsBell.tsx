
import React, { useState, useEffect, useRef } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, firebase } from '../services/firebase';
import type { Notification, UserProfile } from '../types';
import Spinner from './common/Spinner';

const NotificationsBell: React.FC = () => {
    const { user, userProfile } = useAuthentication();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        // PERMISSION GUARD: Only listen if user is signed in.
        // We allow reading notifications even for pending users so they get approval alerts.
        // But we wait for the user object to avoid 'undefined' UID errors in the query.
        if (!user?.uid) {
            setLoading(false);
            setNotifications([]);
            return;
        }

        setLoading(true);
        
        const q = db.collection('notifications')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(30);

        const unsubscribe = q.onSnapshot((snapshot) => {
            const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(fetchedNotifications);
            setLoading(false);
        }, err => {
            // Log only real errors, suppress expected initial permission denied during login state transition
            if (err.code !== 'permission-denied') {
                console.error("Notifications restricted:", err.message);
            } else {
                console.warn("Notifications permission pending auth stabilization...");
            }
            setNotifications([]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    const markAsRead = (id: string) => {
        if (!user) return;
        const notifRef = db.collection('notifications').doc(id);
        notifRef.update({
            readBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
    };

    if (userProfile?.role === 'admin') return null;
    
    const unreadCount = notifications.filter(n => !n.readBy.includes(user?.uid || '')).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-gray-300 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors"
                aria-label="Toggle notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-slate-800 bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
                    <div className="p-3 border-b border-slate-700">
                        <h3 className="font-semibold text-gray-100">Notifications</h3>
                    </div>
                    {loading ? (
                        <div className="p-4 flex justify-center"><Spinner /></div>
                    ) : (
                        <ul className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(n => {
                                    const isRead = n.readBy.includes(user?.uid || '');
                                    return (
                                        <li key={n.id} className={`border-b border-slate-700 ${!isRead ? 'bg-sky-900/40' : ''}`}>
                                            <div className="p-3 text-sm">
                                                <p className="text-gray-300">{n.message}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-gray-400">{n.createdAt.toDate().toLocaleString()}</p>
                                                    {!isRead && (
                                                        <button onClick={() => markAsRead(n.id)} className="text-xs text-blue-400 hover:underline">Mark read</button>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="p-4 text-center text-sm text-gray-400">No notifications yet.</li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsBell;
