
import { useState } from 'react';
import { secondaryAuth, db, firebase } from '../services/firebase';
import type { UserRole, UserProfile } from '../types';
import { useAuthentication } from './useAuth';

type UserData = {
  name: string;
  email: string;
  role: UserRole;
  classId?: string;
  childUids?: string[];
};

type SuccessData = {
  uid: string;
  email: string;
  password?: string;
}

const generateCredentials = (name: string, classId: string, schoolName: string): { email: string; password: string } => {
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length === 0) return { email: '', password: '' };

    const nameForEmail = (nameParts.length > 1 ? nameParts[1] : nameParts[0]).toLowerCase().replace(/[^a-z0-9]/g, "");

    const schoolIdentifier = (schoolName || 'EDUTECSCH').substring(0, 2).toLowerCase();

    const getClassIdentifier = (cId: string): string => {
        if (!cId) return '';
        const lowerClassId = cId.toLowerCase().replace(/\s+/g, '');
        if (lowerClassId.startsWith('nursery')) return `n${lowerClassId.slice(-1)}`;
        if (lowerClassId.startsWith('kg')) return `kg${lowerClassId.slice(-1)}`;
        if (lowerClassId.startsWith('basic')) return `bs${lowerClassId.slice(-1)}`;
        if (lowerClassId.startsWith('jhs')) return `j${lowerClassId.slice(-1)}`;
        if (lowerClassId.startsWith('creche')) return 'cr';
        return ''; // Fallback
    };

    const classIdentifier = getClassIdentifier(classId);

    const emailName = `${nameForEmail}${schoolIdentifier}${classIdentifier}`;
    const email = `${emailName}@gmail.com`;
    const password = emailName;

    return { email, password };
};


export const useCreateUser = () => {
  const { schoolSettings } = useAuthentication();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const createUser = async (data: UserData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccessData(null);

    try {
        let email = data.email;
        let password = '';

        if (data.role === 'student' && data.classId) {
            const creds = generateCredentials(data.name, data.classId, schoolSettings?.schoolName || '');
            email = creds.email;
            password = creds.password;
        } else if (data.role === 'parent' && data.childUids && data.childUids.length > 0) {
            const childDoc = await db.collection('users').doc(data.childUids[0]).get();
            const childData = childDoc.data() as UserProfile;
            if (!childData || !childData.class) {
                throw new Error(`Could not find class for the first linked child to generate credentials.`);
            }
            const creds = generateCredentials(data.name, childData.class, schoolSettings?.schoolName || '');
            email = creds.email;
            password = creds.password;
        } else { // Teacher or other roles
            const nameParts = data.name.trim().split(/\s+/);
            const firstName = nameParts[0].toLowerCase().replace(/[^a-z]/g, "");
            if (!firstName) {
                throw new Error("A valid first name is required to generate a password.");
            }
            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
            const lastNameIdentifier = lastName.substring(0, 2).toLowerCase();
            password = `${firstName}${lastNameIdentifier}`;
        }

        if (!email || !password) {
            throw new Error("Could not generate credentials. Please check user details.");
        }

      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const newUser = userCredential.user;
      if (!newUser) {
        throw new Error("User creation failed in authentication step.");
      }

      await newUser.updateProfile({ displayName: data.name });

      const profileData: Partial<UserProfile> = {
        uid: newUser.uid,
        email: email,
        name: data.name,
        role: data.role,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
        xp: 0,
        level: 1,
        badges: [],
        portfolioItems: [],
      };
      if (data.role === 'student' && data.classId) profileData.class = data.classId;
      if (data.role === 'parent' && data.childUids) profileData.childUids = data.childUids;
      
      await db.collection('users').doc(newUser.uid).set(profileData);
      
      if (data.role === 'parent' && data.childUids && data.childUids.length > 0) {
        for (const childId of data.childUids) {
            await db.collection('users').doc(childId).update({
              parentUids: firebase.firestore.FieldValue.arrayUnion(newUser.uid),
            });
        }
      }
      
      await secondaryAuth.signOut();

      setSuccessData({ uid: newUser.uid, email, password });
      return true;
    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
          friendlyMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/invalid-email') {
          friendlyMessage = 'The email address is not valid.';
      }
      setError(friendlyMessage);
      console.error("Error creating user:", err);
      if (secondaryAuth.currentUser) {
          try { await secondaryAuth.currentUser.delete(); } catch (e) { console.error("Cleanup failed", e); }
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [createUser, { loading, error, successData }] as const;
};