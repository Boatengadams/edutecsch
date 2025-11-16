import {onCall, HttpsError} from "firebase-functions/v2/onCall";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();


/**
 * A secure, one-time function for the designated super admin to
 * grant themselves the correct role if their profile is misconfigured.
 */
export const promoteToSuperAdmin = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  // This function is hardcoded to a single super admin UID for recovery.
  const SUPER_ADMIN_UID = "WsDstQ5ufSW49i0Pc5sJWWyDVk22";

  if (request.auth.uid !== SUPER_ADMIN_UID) {
    logger.warn(`Unauthorized attempt to call promoteToSuperAdmin by UID: ${request.auth.uid}`);
    throw new HttpsError("permission-denied", "You are not authorized to perform this action.");
  }

  try {
    const userRef = db.collection("users").doc(SUPER_ADMIN_UID);
    await userRef.update({
      role: "admin",
      adminType: "super",
      status: "approved",
    });
    return {success: true, message: "Your account has been promoted to Super Admin."};
  } catch (error: any) {
    logger.error(`Error promoting super admin ${SUPER_ADMIN_UID}:`, error);
    throw new HttpsError("internal", "An error occurred while updating your profile.");
  }
});


export const sendNotificationsToTeachersOfClasses = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "You are not authorized to send notifications.");
  }

  const {classIds, message, senderId, senderName} = request.data;
  if (!Array.isArray(classIds) || classIds.length === 0 || !message || !senderId || !senderName) {
    throw new HttpsError("invalid-argument", "Missing required parameters.");
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

  if (relevantTeacherUids.size === 0) {
    return {success: true, message: "No teachers found for the selected classes."};
  }

  const batch = db.batch();
  relevantTeacherUids.forEach((uid) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId: uid,
      message,
      senderId,
      senderName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readBy: [],
    });
  });

  await batch.commit();
  return {success: true, message: `Notifications sent to ${relevantTeacherUids.size} teachers.`};
});


export const deleteResource = onCall({region: "us-west1"}, async (request) => {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    const caller = callerSnap.data();
    if (!caller) {
        throw new HttpsError("not-found", "Caller profile not found.");
    }

    const {resourceType, resourceId} = request.data;
    if (!resourceType || !resourceId) {
        throw new HttpsError("invalid-argument", "Resource type and ID are required.");
    }

    if (resourceType === "generatedContent") {
        const docRef = db.collection("generatedContent").doc(resourceId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return {success: true, message: "Resource already deleted."};
        }
        const resource = docSnap.data();
        if (caller.role !== "admin" && resource?.teacherId !== request.auth.uid) {
            throw new HttpsError("permission-denied", "You are not the owner of this resource.");
        }
        await docRef.delete();
        return {success: true, message: "Presentation deleted successfully."};
    }
    
    if (resourceType === "group") {
        const docRef = db.collection("groups").doc(resourceId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return {success: true, message: "Group already deleted."};
        }
        const resource = docSnap.data();
        if (caller.role !== "admin" && resource?.teacherId !== request.auth.uid) {
            throw new HttpsError("permission-denied", "You are not authorized to delete this group.");
        }
        // Delete subcollection
        const messagesCollection = docRef.collection("groupMessages");
        const messagesSnapshot = await messagesCollection.get();
        const batch = db.batch();
        messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        // Delete group document
        await docRef.delete();
        return {success: true, message: "Group and all its messages have been deleted."};
    }

    if (resourceType === "teachingMaterial") {
        const docRef = db.collection("teachingMaterials").doc(resourceId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
             return {success: true, message: "Resource already deleted."};
        }
        const resource = docSnap.data();
        if (caller.role !== "admin" && resource?.uploaderId !== request.auth.uid) {
            throw new HttpsError("permission-denied", "You are not authorized to delete this material.");
        }

        const storagePath = `teachingMaterials/${resourceId}/${resource?.originalFileName}`;
        try {
            await admin.storage().bucket().file(storagePath).delete();
        } catch (error: any) {
            logger.warn(`Could not delete storage file ${storagePath}:`, error.message);
        }

        await docRef.delete();
        return {success: true, message: "Teaching material deleted successfully."};
    }

    if (resourceType === "videoContent") {
        const {creatorId} = request.data;
        if (!creatorId) {
          throw new HttpsError("invalid-argument", "creatorId is required for video content.");
        }
        const docRef = db.collection("videoContent").doc(creatorId).collection("videos").doc(resourceId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return {success: true, message: "Resource already deleted."};
        }
        const resource = docSnap.data();
        if (caller.role !== "admin" && resource?.creatorId !== request.auth.uid) {
            throw new HttpsError("permission-denied", "You are not the creator of this video.");
        }

        const storagePath = resource?.storagePath;
        if (storagePath) {
            try {
                await admin.storage().bucket().file(storagePath).delete();
            } catch (error: any) {
                logger.warn(`Could not delete storage file ${storagePath}:`, error.message);
            }
        }

        await docRef.delete();
        return {success: true, message: "Video deleted successfully."};
    }

    throw new HttpsError("invalid-argument", "Unsupported resource type.");
});

function generateRandomToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const generateActivationTokens = onCall({region: "us-west1"}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    if (!callerSnap.exists || callerSnap.data()?.adminType !== "super") {
        throw new HttpsError("permission-denied", "Only the super admin can generate tokens.");
    }

    const {count, planType} = request.data;
    if (!count || !planType || !["monthly", "termly", "yearly"].includes(planType)) {
        throw new HttpsError("invalid-argument", "A valid count and planType are required.");
    }

    const batch = db.batch();
    const generatedTokens = [];

    for (let i = 0; i < count; i++) {
        const token = generateRandomToken();
        const tokenRef = db.collection("activationTokens").doc(token);
        batch.set(tokenRef, {
            isUsed: false,
            planType: planType,
        });
        generatedTokens.push(token);
    }

    await batch.commit();
    return {success: true, tokens: generatedTokens};
});