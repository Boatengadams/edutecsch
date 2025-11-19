import { useEffect } from 'react';
import { rtdb, firebase } from '../services/firebase';
import { UserProfile } from '../types';

export const usePresence = (userProfile: UserProfile | null) => {
  useEffect(() => {
    if (!userProfile) return;

    const userStatusDatabaseRef = rtdb.ref('/status/' + userProfile.uid);

    const isOfflineForDatabase = {
      state: 'offline',
      last_changed: firebase.database.ServerValue.TIMESTAMP,
      name: userProfile.name,
      role: userProfile.role,
      class: userProfile.class || userProfile.classTeacherOf || 'N/A',
    };

    const isOnlineForDatabase = {
      state: 'online',
      last_changed: firebase.database.ServerValue.TIMESTAMP,
      name: userProfile.name,
      role: userProfile.role,
      class: userProfile.class || userProfile.classTeacherOf || 'N/A',
    };

    const connectedRef = rtdb.ref('.info/connected');
    
    const onDisconnect = connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
        userStatusDatabaseRef.set(isOnlineForDatabase);
      });
    });

    return () => {
        connectedRef.off('value', onDisconnect);
        // Optional: Set to offline explicitly on unmount if needed, 
        // though onDisconnect handles the tab close/crash scenarios better.
        userStatusDatabaseRef.set(isOfflineForDatabase);
    };
  }, [userProfile]);
};