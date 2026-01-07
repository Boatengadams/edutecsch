import { useState } from 'react';
import { db, storage, firebase } from '../services/firebase';
import { UserRole } from '../types';

interface UserToDelete {
    uid: string;
    role: UserRole;
}

const deleteSubcollection = async (collectionRef: firebase.firestore.CollectionReference) => {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
};

export const useRejectUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rejectUsers = async (usersToReject: UserToDelete[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    if (usersToReject.length === 0) {
      setLoading(false);
      return true;
    }

    try {
      for (const user of usersToReject) {
        const { uid, role } = user;
        const batch = db.batch();

        if (role === "teacher") {
            // Cleanup assignments
            const assignmentsQuery = db.collection("assignments").where("teacherId", "==", uid);
            const assignmentsSnapshot = await assignmentsQuery.get();
            for (const doc of assignmentsSnapshot.docs) {
                // Delete submissions for this assignment
                const submissionsQuery = db.collection("submissions").where("assignmentId", "==", doc.id);
                const submissionsSnapshot = await submissionsQuery.get();
                submissionsSnapshot.forEach((subDoc) => subDoc.ref.delete());
                batch.delete(doc.ref);
            }

            // Cleanup content and groups
            const genContentQuery = db.collection("generatedContent").where("teacherId", "==", uid);
            const genContentSnapshot = await genContentQuery.get();
            genContentSnapshot.forEach((doc) => batch.delete(doc.ref));

            const groupsQuery = db.collection("groups").where("teacherId", "==", uid);
            const groupsSnapshot = await groupsQuery.get();
            for (const groupDoc of groupsSnapshot.docs) {
                await deleteSubcollection(groupDoc.ref.collection("groupMessages"));
                batch.delete(groupDoc.ref);
            }
            
        } else if (role === "student") {
            const submissionsQuery = db.collection("submissions").where("studentId", "==", uid);
            const submissionsSnapshot = await submissionsQuery.get();
            submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

            const electionApps = db.collection("electionApplications").where("studentId", "==", uid);
            const appSnap = await electionApps.get();
            appSnap.forEach(doc => batch.delete(doc.ref));
        }
        
        await batch.commit();
        await db.collection("users").doc(uid).delete();
      }
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [rejectUsers, { loading, error }] as const;
};