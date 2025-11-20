
import { useEffect, useRef } from 'react';
import { rtdb, db, firebase } from '../services/firebase';
import { UserProfile } from '../types';

export const usePresence = (userProfile: UserProfile | null) => {
  const hasLoggedLogin = useRef(false);

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
        
        // Log login to Firestore once per session mount
        if (!hasLoggedLogin.current) {
            db.collection('userActivity').add({
                userId: userProfile.uid,
                userName: userProfile.name || 'Unknown User',
                userRole: userProfile.role,
                userClass: userProfile.class || userProfile.classTeacherOf || 'N/A',
                action: 'login',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error("Error logging login:", err));
            hasLoggedLogin.current = true;
        }
      });
    });

    return () => {
        connectedRef.off('value', onDisconnect);
    };
  }, [userProfile]);
};
