
import { useState } from 'react';
import { db, storage, firebase } from '../services/firebase';
import { UserRole } from '../types';

interface UserToDelete {
    uid: string;
    role: UserRole;
}

// Helper to delete all documents in a subcollection client-side
const deleteSubcollection = async (collectionRef: firebase.firestore.CollectionReference) => {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
        return;
    }
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
        
        // We process deletions in batches or individually depending on complexity
        const batch = db.batch();

        // --- 1. Cleanup Related Data in Firestore (Client-Side) ---
        
        if (role === "teacher") {
            // 1. Assignments & Submissions
            const assignmentsQuery = db.collection("assignments").where("teacherId", "==", uid);
            const assignmentsSnapshot = await assignmentsQuery.get();
            for (const doc of assignmentsSnapshot.docs) {
                // Delete submissions for this assignment
                const submissionsQuery = db.collection("submissions").where("assignmentId", "==", doc.id);
                const submissionsSnapshot = await submissionsQuery.get();
                submissionsSnapshot.forEach((subDoc) => subDoc.ref.delete()); // Delete individually to be safe or batch if small

                // Delete assignment attachment
                const assignmentData = doc.data();
                if (assignmentData.attachmentURL) {
                    try {
                        await storage.refFromURL(assignmentData.attachmentURL).delete();
                    } catch (e) {
                        console.warn(`Could not delete assignment attachment: `, e);
                    }
                }
                batch.delete(doc.ref);
            }

            // 2. Generated Content & Video Content
            const genContentQuery = db.collection("generatedContent").where("teacherId", "==", uid);
            const genContentSnapshot = await genContentQuery.get();
            genContentSnapshot.forEach((doc) => batch.delete(doc.ref));

            // Video Content (requires subcollection traversal)
            const videoContentCollection = db.collection("videoContent").doc(uid).collection("videos");
            const videoSnapshot = await videoContentCollection.get();
            for (const videoDoc of videoSnapshot.docs) {
                const videoData = videoDoc.data();
                if (videoData.storagePath) {
                    try {
                        await storage.ref(videoData.storagePath).delete();
                    } catch (e) {
                        console.warn(`Could not delete video file: `, e);
                    }
                }
                batch.delete(videoDoc.ref);
            }
            
            // 3. Groups & Messages
            const groupsQuery = db.collection("groups").where("teacherId", "==", uid);
            const groupsSnapshot = await groupsQuery.get();
            for (const groupDoc of groupsSnapshot.docs) {
                await deleteSubcollection(groupDoc.ref.collection("groupMessages"));
                batch.delete(groupDoc.ref);
            }

            // 4. Live Lessons
            const liveLessonsQuery = db.collection("liveLessons").where("teacherId", "==", uid);
            const liveLessonsSnapshot = await liveLessonsQuery.get();
            for (const lessonDoc of liveLessonsSnapshot.docs) {
                // lessonDoc.ref.collection("images") - images are in storage mainly, doc refs in subcollection
                await deleteSubcollection(lessonDoc.ref.collection("images"));
                await deleteSubcollection(lessonDoc.ref.collection("responses"));
                batch.delete(lessonDoc.ref);
            }

            // 5. Attendance
            const attendanceQuery = db.collection("attendance").where("teacherId", "==", uid);
            const attendanceSnapshot = await attendanceQuery.get();
            attendanceSnapshot.forEach((doc) => batch.delete(doc.ref));
            
        } else if (role === "student") {
            // Submissions
            const submissionsQuery = db.collection("submissions").where("studentId", "==", uid);
            const submissionsSnapshot = await submissionsQuery.get();
            submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

            // Report Summaries
            const summariesQuery = db.collection("reportSummaries").where("studentId", "==", uid);
            const summariesSnapshot = await summariesQuery.get();
            summariesSnapshot.forEach(doc => batch.delete(doc.ref));

            // Remove from Parents
            const parentsQuery = db.collection("users").where("childUids", "array-contains", uid);
            const parentsSnapshot = await parentsQuery.get();
            parentsSnapshot.forEach(doc => {
                doc.ref.update({ childUids: firebase.firestore.FieldValue.arrayRemove(uid) });
            });
        } else if (role === "parent") {
            // Remove from Children
            const userDocSnap = await db.collection("users").doc(uid).get();
            const childUids = userDocSnap.data()?.childUids || [];
            if (childUids.length > 0) {
                for (const childId of childUids) {
                    const childRef = db.collection("users").doc(childId);
                    childRef.update({ parentUids: firebase.firestore.FieldValue.arrayRemove(uid) });
                }
            }
        }
        
        // Commit specific data cleanup
        await batch.commit();

        // --- 2. Direct Firestore Profile Deletion ---
        // This removes the user from the database immediately.
        // Note: The Firebase Auth account (login credentials) will still exist until deleted via Admin SDK or Console,
        // but without a Firestore profile, the user effectively has no access to the app.
        await db.collection("users").doc(uid).delete();
      }
      
      return true;
    } catch (e: any) {
      setError(e.message);
      console.error("Error deleting user data locally:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [rejectUsers, { loading, error }] as const;
};
