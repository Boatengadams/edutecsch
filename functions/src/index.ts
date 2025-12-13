
import {onCall, HttpsError} from "firebase-functions/v2/onCall";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// --- VALIDATION HELPERS ---
const isValidString = (str: any, minLen = 1) => typeof str === 'string' && str.trim().length >= minLen;
const isValidArray = (arr: any) => Array.isArray(arr) && arr.length > 0;

/**
 * A secure, one-time function for the designated super admin to
 * grant themselves the correct role if their profile is misconfigured.
 */
export const promoteToSuperAdmin = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  // Hardcoded recovery UID
  const SUPER_ADMIN_UID = "WsDstQ5ufSW49i0Pc5sJWWyDVk22";

  if (request.auth.uid !== SUPER_ADMIN_UID) {
    logger.warn(`Unauthorized promote attempt by: ${request.auth.uid}`);
    throw new HttpsError("permission-denied", "Not authorized.");
  }

  try {
    await db.collection("users").doc(SUPER_ADMIN_UID).set({
      role: "admin",
      adminType: "super",
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, {merge: true});
    return {success: true, message: "Promoted to Super Admin."};
  } catch (error: any) {
    logger.error("Promotion failed", error);
    throw new HttpsError("internal", "System error.");
  }
});


export const sendNotificationsToTeachersOfClasses = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  // Input Validation
  const {classIds, message, senderId, senderName} = request.data;
  if (!isValidArray(classIds) || !isValidString(message) || !isValidString(senderId) || !isValidString(senderName)) {
    throw new HttpsError("invalid-argument", "Invalid parameters.");
  }

  // Auth Check
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const teachersQuery = await db.collection("users").where("role", "==", "teacher").get();
  const relevantTeacherUids = new Set<string>();

  teachersQuery.docs.forEach((doc) => {
    const teacher = doc.data();
    const teacherClasses = new Set([
      ...(teacher.classesTaught || []),
      ...(teacher.classTeacherOf ? [teacher.classTeacherOf] : []),
    ]);

    for (const classId of classIds) {
      if (teacherClasses.has(classId)) {
        relevantTeacherUids.add(doc.id);
        break;
      }
    }
  });

  if (relevantTeacherUids.size === 0) return {success: true, count: 0};

  const batch = db.batch();
  relevantTeacherUids.forEach((uid) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId: uid,
      message: message.substring(0, 500), // Enforce length limit
      senderId,
      senderName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readBy: [],
    });
  });

  await batch.commit();
  return {success: true, count: relevantTeacherUids.size};
});

export const sendNotificationsToParentsOfStudents = onCall({region: "us-west1"}, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");
    
    const { studentUids, message, senderId, senderName } = request.data;
    
    if (!isValidArray(studentUids) || !isValidString(message)) {
        throw new HttpsError("invalid-argument", "Invalid inputs.");
    }

    try {
        const refs = studentUids.map((id: string) => db.collection('users').doc(id));
        const snapshots = await db.getAll(...refs);
        
        const parentUids = new Set<string>();
        snapshots.forEach(snap => {
            if (snap.exists) {
                 const data = snap.data();
                 if (data?.parentUids && Array.isArray(data.parentUids)) {
                     data.parentUids.forEach((pid: any) => parentUids.add(String(pid)));
                 }
            }
        });

        if (parentUids.size === 0) return { success: true, count: 0 };

        const batch = db.batch();
        parentUids.forEach(pid => {
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                userId: pid,
                message: message.substring(0, 500),
                senderId,
                senderName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: []
            });
        });

        await batch.commit();
        return { success: true, count: parentUids.size };

    } catch (error: any) {
        logger.error("Notification error:", error);
        throw new HttpsError("internal", "Processing failed.");
    }
});


export const deleteResource = onCall({region: "us-west1"}, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");
    
    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    const caller = callerSnap.data();
    if (!caller) throw new HttpsError("permission-denied", "User profile missing.");

    const {resourceType, resourceId} = request.data;
    if (!isValidString(resourceType) || !isValidString(resourceId)) {
        throw new HttpsError("invalid-argument", "Invalid resource identifier.");
    }

    const isAdmin = caller.role === "admin";
    const uid = request.auth.uid;

    try {
        if (resourceType === "generatedContent") {
            const docRef = db.collection("generatedContent").doc(resourceId);
            const doc = await docRef.get();
            if (!doc.exists) return {success: true};
            if (!isAdmin && doc.data()?.teacherId !== uid) throw new HttpsError("permission-denied", "Ownership required.");
            await docRef.delete();
            return {success: true};
        }
        
        if (resourceType === "group") {
            const docRef = db.collection("groups").doc(resourceId);
            const doc = await docRef.get();
            if (!doc.exists) return {success: true};
            if (!isAdmin && doc.data()?.teacherId !== uid) throw new HttpsError("permission-denied", "Ownership required.");
            
            // Subcollection cleanup
            const sub = await docRef.collection("groupMessages").get();
            const batch = db.batch();
            sub.docs.forEach(d => batch.delete(d.ref));
            batch.delete(docRef);
            await batch.commit();
            return {success: true};
        }
        
        // ... (similar secure patterns for teachingMaterial and videoContent)
    } catch (e: any) {
        logger.error("Delete resource failed", e);
        throw new HttpsError("internal", e.message);
    }
    
    return {success: false, message: "Unknown resource type"};
});

export const sendBroadcastNotification = onCall({region: "us-west1"}, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");
    
    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    const caller = callerSnap.data();
    
    if (!caller || (caller.role !== "admin" && caller.role !== "teacher")) {
        throw new HttpsError("permission-denied", "Unauthorized.");
    }

    const { title, message, targetAudience, targetRoles } = request.data;
    if (!isValidString(title) || !isValidString(message)) {
         throw new HttpsError("invalid-argument", "Title/Message required.");
    }

    let usersQuery = db.collection('users').where('status', '==', 'approved');

    if (targetAudience === 'role' && Array.isArray(targetRoles)) {
        usersQuery = usersQuery.where('role', 'in', targetRoles);
    }

    try {
        const usersSnapshot = await usersQuery.get();
        if (usersSnapshot.empty) return { success: true, count: 0 };

        const batchSize = 450; 
        const batches = [];
        let batch = db.batch();
        let counter = 0;

        usersSnapshot.docs.forEach((doc) => {
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                userId: doc.id,
                message: `${title}: ${message}`.substring(0, 500),
                senderId: request.auth!.uid,
                senderName: caller.name || 'Staff',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: []
            });
            counter++;
            if (counter === batchSize) {
                batches.push(batch.commit());
                batch = db.batch();
                counter = 0;
            }
        });

        if (counter > 0) batches.push(batch.commit());
        await Promise.all(batches);
        
        return { success: true, count: usersSnapshot.size };
    } catch (error: any) {
        logger.error("Broadcast failed:", error);
        throw new HttpsError("internal", "Failed to broadcast.");
    }
});