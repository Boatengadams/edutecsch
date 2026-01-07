import { useEffect, useRef } from 'react';
import { rtdb, db, firebase } from '../services/firebase';
import { UserProfile } from '../types';

export const usePresence = (userProfile: UserProfile | null) => {
  const hasLoggedLogin = useRef(false);

  useEffect(() => {
    if (!userProfile) return;

    const userStatusDatabaseRef = rtdb.ref('/status/' + userProfile.uid);
    const connectedRef = rtdb.ref('.info/connected');
    
    const statusData = {
      name: userProfile.name,
      role: userProfile.role,
      class: userProfile.class || userProfile.classTeacherOf || 'N/A',
      last_changed: firebase.database.ServerValue.TIMESTAMP,
    };

    const onDisconnect = connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === false) return;

      userStatusDatabaseRef.onDisconnect().set({ ...statusData, state: 'offline' }).then(() => {
        userStatusDatabaseRef.set({ ...statusData, state: 'online' });
        
        if (!hasLoggedLogin.current) {
            db.collection('userActivity').add({
                userId: userProfile.uid,
                userName: userProfile.name,
                userRole: userProfile.role,
                action: 'login',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            hasLoggedLogin.current = true;
        }
      });
    });

    return () => { connectedRef.off('value', onDisconnect); };
  }, [userProfile]);
};