import { useState } from 'react';
// FIX: Import firebase for FieldValue
import { secondaryAuth, db, firebase } from '../services/firebase';
import type { ParsedUser, UserProfile, UserRole } from '../types';

type BatchResult = {
  name: string;
  email: string;
  success: boolean;
  error?: string;
  password?: string;
}

const generatePassword = (name: string): string => {
    const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, "");
    if (!firstName) return `password${Math.random().toString(36).substring(2, 8)}`;
    return `${firstName}${Math.random().toString(36).substring(2, 6)}`;
};

export const useBatchCreateUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchResult[] | null>(null);

  const batchCreateUsers = async (users: ParsedUser[], role: UserRole, classId?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setResults(null);

    const usersToCreate = users.filter(u => u.name && u.email);
    const creationResults: BatchResult[] = [];

    for (const user of usersToCreate) {
        const password = user.password || generatePassword(user.name);
        const email = user.email;

        if (!email) {
            creationResults.push({ name: user.name, email: user.email || 'N/A', success: false, error: 'Email could not be generated.' });
            continue;
        }

        try {
            // FIX: Changed to v8 compat syntax.
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
            const newUser = userCredential.user;
            if (!newUser) throw new Error("Auth creation failed.");
            
            // FIX: Changed to v8 compat syntax.
            await newUser.updateProfile({ displayName: user.name });

            const profileData: Partial<UserProfile> = {
                uid: newUser.uid,
                email: user.email,
                name: user.name,
                role,
                status: 'pending',
                // FIX: Cast serverTimestamp to Timestamp to match the UserProfile type.
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                xp: 0,
                level: 1,
                badges: [],
                portfolioItems: [],
            };
            if (role === "student" && classId) {
                profileData.class = classId;
            }

            // FIX: Use v8 compat setDoc syntax
            await db.collection('users').doc(newUser.uid).set(profileData);
            // FIX: Changed to v8 compat syntax.
            await secondaryAuth.signOut();
            creationResults.push({ name: user.name, email: user.email!, success: true, password });

        } catch (error: any) {
            let friendlyMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                friendlyMessage = 'An account with this email already exists.';
            }
            creationResults.push({ name: user.name, email: user.email!, success: false, error: friendlyMessage });
        }
    }
    
    setResults(creationResults);
    setLoading(false);
    return creationResults.some(r => r.success);
  };

  return [batchCreateUsers, { loading, error, results }] as const;
};
