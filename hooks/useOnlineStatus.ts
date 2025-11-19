
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
