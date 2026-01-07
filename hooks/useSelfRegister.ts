import { useState } from 'react';
import { db, firebase, firebaseAuth } from '../services/firebase';
import { UserProfile, UserRole } from '../types';
import type firebase_app from 'firebase/compat/app';

type SelfRegisterData = {
  name: string;
  role: UserRole;
  studentClass?: string;
  teacherClasses?: string[];
  teacherSubjects?: string[];
  childEmails?: string;
};

export const useSelfRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerProfile = async (user: firebase_app.User, data: SelfRegisterData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const baseProfileData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email,
        name: data.name.trim(),
        role: data.role,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
        xp: 0,
        level: 1,
        badges: [],
        portfolioItems: [],
        attendanceRate: 0,
        completionRate: 0
      };

      let finalProfileData: any = { ...baseProfileData };

      if (data.role === 'student') {
        finalProfileData.class = data.studentClass;
      } else if (data.role === 'teacher') {
        finalProfileData.classesTaught = data.teacherClasses;
        finalProfileData.subjectsTaught = data.teacherSubjects;
      } else if (data.role === 'parent') {
        const emails = (data.childEmails || '').split(',').map(e => e.trim()).filter(Boolean);
        if (emails.length === 0) throw new Error("Please provide at least one child's email.");

        const childUids: string[] = [];
        for (const email of emails) {
          const q = db.collection('users').where('email', '==', email).where('role', '==', 'student');
          const qSnapshot = await q.get();
          if (qSnapshot.empty) throw new Error(`No student found with email: ${email}`);
          childUids.push(qSnapshot.docs[0].id);
        }
        finalProfileData.childUids = childUids;
      }
      
      // Atomic profile creation
      await db.collection('users').doc(user.uid).set(finalProfileData, { merge: true });

      // ASDP CRITICAL: Force immediate token refresh
      // This forces Firebase to fetch a new ID token which contains the newly created 
      // Firestore data context used by the security rules, solving "Permission Denied" 
      // errors immediately after registration.
      if (firebaseAuth.currentUser) {
          await firebaseAuth.currentUser.getIdToken(true);
      }

      return true;
    } catch (e: any) {
      setError(e.message);
      console.error("ASDP Registration Fault:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [registerProfile, { loading, error }] as const;
};