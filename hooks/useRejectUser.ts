import { useState } from 'react';
import { db, storage, firebase } from '../services/firebase';
import { UserRole, UserProfile, Collaborator } from '../types';

interface UserToDelete {
    uid: string;
    role: UserRole;
}

// Helper to delete all documents in a subcollection.
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
      // NOTE: This client-side deletion is a complex process. It cannot remove the user from
      // Firebase Authentication and may fail to clean up all associated data if permissions are
      // insufficient or if the connection is lost. A Cloud Function is the recommended, more robust
      // way to handle user deletion and data cleanup.
      for (const user of usersToReject) {
        const { uid, role } = user;
        const batch = db.batch();

        if (role === "teacher") {
            // Assignments & their related data
            const assignmentsQuery = db.collection("assignments").where("teacherId", "==", uid);
            const assignmentsSnapshot = await assignmentsQuery.get();
            for (const doc of assignmentsSnapshot.docs) {
                // Delete submissions for each assignment
                const submissionsQuery = db.collection("submissions").where("assignmentId", "==", doc.id);
                const submissionsSnapshot = await submissionsQuery.get();
                submissionsSnapshot.forEach((subDoc) => batch.delete(subDoc.ref));

                // Delete assignment attachment from storage
                const assignmentData = doc.data();
                if (assignmentData.attachmentURL) {
                    try {
                        await storage.refFromURL(assignmentData.attachmentURL).delete();
                    } catch (e) {
                        console.warn(`Could not delete assignment attachment for ${doc.id}: `, e);
                    }
                }
                batch.delete(doc.ref);
            }

            // Generated Content (where they are owner)
            const genContentQuery = db.collection("generatedContent").where("teacherId", "==", uid);
            const genContentSnapshot = await genContentQuery.get();
            genContentSnapshot.forEach((doc) => batch.delete(doc.ref));

            // Generated Content (where they are collaborator)
            const collabContentQuery = db.collection("generatedContent").where("collaboratorUids", "array-contains", uid);
            const collabContentSnapshot = await collabContentQuery.get();
            for (const doc of collabContentSnapshot.docs) {
                const contentData = doc.data();
                const updatedCollaborators = (contentData.collaborators || []).filter(
                    (c: Collaborator) => c.uid !== uid
                );
                batch.update(doc.ref, {
                    collaboratorUids: firebase.firestore.FieldValue.arrayRemove(uid),
                    collaborators: updatedCollaborators,
                });
            }

            // Video Content
            const videoContentCollection = db.collection("videoContent").doc(uid).collection("videos");
            const videoSnapshot = await videoContentCollection.get();
            for (const videoDoc of videoSnapshot.docs) {
                const videoData = videoDoc.data();
                if (videoData.storagePath) {
                    try {
                        await storage.ref(videoData.storagePath).delete();
                    } catch (e) {
                        console.warn(`Could not delete video file ${videoData.storagePath}: `, e);
                    }
                }
                batch.delete(videoDoc.ref);
            }
            
            // Teaching Materials
            const materialsQuery = db.collection("teachingMaterials").where("uploaderId", "==", uid);
            const materialsSnapshot = await materialsQuery.get();
            materialsSnapshot.forEach((doc) => batch.delete(doc.ref));

            // Groups (and their messages)
            const groupsQuery = db.collection("groups").where("teacherId", "==", uid);
            const groupsSnapshot = await groupsQuery.get();
            for (const groupDoc of groupsSnapshot.docs) {
                await deleteSubcollection(groupDoc.ref.collection("groupMessages"));
                batch.delete(groupDoc.ref);
            }

            // Live Lessons (and their responses)
            const liveLessonsQuery = db.collection("liveLessons").where("teacherId", "==", uid);
            const liveLessonsSnapshot = await liveLessonsQuery.get();
            for (const lessonDoc of liveLessonsSnapshot.docs) {
                await deleteSubcollection(lessonDoc.ref.collection("responses"));
                batch.delete(lessonDoc.ref);
            }

            // Attendance Records
            const attendanceQuery = db.collection("attendance").where("teacherId", "==", uid);
            const attendanceSnapshot = await attendanceQuery.get();
            attendanceSnapshot.forEach((doc) => batch.delete(doc.ref));
            
            // NOTE: Cleaning up Terminal Reports and Timetables is too complex for a client-side operation
            // as it requires reading and updating many documents with nested data. This may leave stale data.
        } else if (role === "student") {
            const submissionsQuery = db.collection("submissions").where("studentId", "==", uid);
            const submissionsSnapshot = await submissionsQuery.get();
            submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

            const summariesQuery = db.collection("reportSummaries").where("studentId", "==", uid);
            const summariesSnapshot = await summariesQuery.get();
            summariesSnapshot.forEach(doc => batch.delete(doc.ref));

            const parentsQuery = db.collection("users").where("childUids", "array-contains", uid);
            const parentsSnapshot = await parentsQuery.get();
            parentsSnapshot.forEach(doc => {
                batch.update(doc.ref, { childUids: firebase.firestore.FieldValue.arrayRemove(uid) });
            });
        } else if (role === "parent") {
            const userDocSnap = await db.collection("users").doc(uid).get();
            const childUids = userDocSnap.data()?.childUids || [];
            if (childUids.length > 0) {
                for (const childId of childUids) {
                    const childRef = db.collection("users").doc(childId);
                    batch.update(childRef, { parentUids: firebase.firestore.FieldValue.arrayRemove(uid) });
                }
            }
        }
        const userRef = db.collection("users").doc(uid);
        batch.delete(userRef);
        await batch.commit();
      }
      return true;
    } catch (e: any) {
      setError(e.message);
      console.error("Error deleting user data:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return [rejectUsers, { loading, error }] as const;
};
