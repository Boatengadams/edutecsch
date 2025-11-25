
import { useState, useEffect, useRef } from 'react';
import { rtdb, firebase } from '../services/firebase';

export const useOnlineStatus = (uids: string[]) => {
  const [statusMap, setStatusMap] = useState<Record<string, 'online' | 'offline'>>({});
  
  // Use a ref to keep track of the previous UIDs string to prevent unnecessary re-subscriptions
  const prevUidsStringRef = useRef<string>('');

  useEffect(() => {
    // Sort UIDs to ensure consistent string representation regardless of order
    const sortedUids = [...uids].sort();
    const currentUidsString = JSON.stringify(sortedUids);

    if (currentUidsString === prevUidsStringRef.current) {
        return;
    }
    
    prevUidsStringRef.current = currentUidsString;

    if (uids.length === 0) {
        setStatusMap({});
        return;
    }

    const listeners: { ref: firebase.database.Reference, listener: (a: firebase.database.DataSnapshot, b?: string | null) => any }[] = [];

    uids.forEach(uid => {
        if (!uid) return;
        const ref = rtdb.ref(`/status/${uid}/state`);
        
        const listener = ref.on('value', (snapshot) => {
            const state = snapshot.val() || 'offline';
            setStatusMap(prev => ({
                ...prev,
                [uid]: state
            }));
        });
        
        listeners.push({ ref, listener });
    });

    return () => {
        listeners.forEach(({ ref, listener }) => {
            ref.off('value', listener);
        });
    };
  }, [JSON.stringify(uids.sort())]); // Use stringified UIDs for dependency

  return statusMap;
};

// New hook for Admins to see everyone
export interface OnlineUser {
    uid: string;
    state: 'online' | 'offline';
    last_changed: number;
    name?: string;
    role?: string;
    class?: string;
}

export const useAllOnlineUsers = () => {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        const ref = rtdb.ref('/status');
        
        // Order by state to easily find 'online' users, though we filter client side for flexibility
        const listener = ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                setOnlineUsers([]);
                return;
            }

            const users: OnlineUser[] = Object.keys(data).map(key => ({
                uid: key,
                ...data[key]
            }));

            // Sort by last_changed descending (most recent activity first)
            users.sort((a, b) => b.last_changed - a.last_changed);

            setOnlineUsers(users);
        });

        return () => {
            ref.off('value', listener);
        };
    }, []);

    return onlineUsers;
};
