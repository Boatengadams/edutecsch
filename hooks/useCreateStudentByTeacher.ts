import { useState } from 'react';
import { secondaryAuth, db, firebase } from '../services/firebase';
import { useAuthentication } from './useAuth';
import type { UserProfile } from '../types';

type StudentData = {
  name: string;
  classId: string;
};

type SuccessData = {
  email: string;
  password?: string;
}

const generateCredentials = (name: string, classId: string, schoolName: string): { email: string; password: string } => {
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length === 0) return { email: '', password: '' };

    const nameForEmail = (nameParts.length > 1 ? nameParts[1] : nameParts[0]).toLowerCase().replace(/[^a-z0-9]/g, "");

    const schoolIdentifier = (schoolName || 'UTOPIA').substring(0, 2).toLowerCase();

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

export const useCreateStudentByTeacher = () => {
  const { schoolSettings } = useAuthentication();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const createStudent = async (data: StudentData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccessData(null);

    const { email, password } = generateCredentials(data.name, data.classId, schoolSettings?.schoolName || '');

    if (!email || !password) {
        setError("Could not generate credentials. Please check the student's name and class.");
        setLoading(false);
        return false;
    }

    try {
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const newUser = userCredential.user;
      if (!newUser) throw new Error("Auth creation failed.");

      await newUser.updateProfile({ displayName: data.name });

      const profileData: Partial<UserProfile> = {
        uid: newUser.uid,
        email: email,
        name: data.name,
        role: 'student',
        class: data.classId,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
        xp: 0,
        level: 1,
        badges: [],
        portfolioItems: [],
      };
      
      const userDocRef = db.collection('users').doc(newUser.uid);
      await userDocRef.set(profileData);
      await secondaryAuth.signOut();

      setSuccessData({ email, password });
      return true;
    } catch (e: any) {
      let friendlyMessage = e.message;
      if (e.code === 'auth/email-already-in-use') {
        friendlyMessage = `An account with the generated email (${email}) already exists. The student may already be registered.`;
      } else if (e.code === 'auth/invalid-email') {
        friendlyMessage = `The generated email address (${email}) is not valid.`;
      }
      setError(friendlyMessage);
      console.error("Error creating student:", e);
      if (secondaryAuth.currentUser) {
          try { await secondaryAuth.currentUser.delete(); } catch (cleanErr) { console.error("Cleanup failed", cleanErr); }
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [createStudent, { loading, error, successData }] as const;
};
