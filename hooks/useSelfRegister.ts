import { useState } from 'react';
// FIX: Import firebase for FieldValue
import { db, firebase } from '../services/firebase';
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

  // FIX: Use firebase.User type from compat library.
  const registerProfile = async (user: firebase_app.User, data: SelfRegisterData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const baseProfileData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email,
        name: data.name.trim(),
        role: data.role,
        status: 'pending', // All self-registrations are pending
        // FIX: Cast serverTimestamp to Timestamp to match the UserProfile type.
        createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
      };

      let finalProfileData: any = { ...baseProfileData };

      if (data.role === 'student') {
        finalProfileData = { ...finalProfileData, class: data.studentClass, xp: 0, level: 1, badges: [], portfolioItems: [] };
      } else if (data.role === 'teacher') {
        finalProfileData.classesTaught = data.teacherClasses;
        finalProfileData.subjectsTaught = data.teacherSubjects;
      } else if (data.role === 'parent') {
        const emails = (data.childEmails || '').split(',').map(e => e.trim()).filter(Boolean);
        if (emails.length === 0) throw new Error("Please provide at least one child's email.");

        const childUids: string[] = [];
        for (const email of emails) {
          // FIX: Use v8 compat query syntax
          const q = db.collection('users').where('email', '==', email).where('role', '==', 'student');
          const qSnapshot = await q.get();
          if (qSnapshot.empty) throw new Error(`No student found with email: ${email}`);
          childUids.push(qSnapshot.docs[0].id);
        }
        finalProfileData.childUids = childUids;
      }
      
      // FIX: Use v8 compat setDoc syntax
      await db.collection('users').doc(user.uid).set(finalProfileData, { merge: true });
      return true;
    } catch (e: any) {
      setError(e.message);
      console.error("Error in self-registration profile creation:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [registerProfile, { loading, error }] as const;
};
