import {onCall, HttpsError} from "firebase-functions/v2/onCall";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Paystack Configuration
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY; // Managed in Firebase Console Secrets
const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";
const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify/";

// --- VALIDATION HELPERS ---
const isValidString = (str: any, minLen = 1) => typeof str === 'string' && str.trim().length >= minLen;
const isValidArray = (arr: any) => Array.isArray(arr) && arr.length > 0;

/**
 * Calculates current due based on enrollment
 */
const calculateEnrollmentAmount = async () => {
    const studentsSnap = await db.collection("users").where("role", "==", "student").get();
    let total = 0;
    
    studentsSnap.docs.forEach(doc => {
        const data = doc.data();
        const className = (data.class || "").toLowerCase();
        if (className.includes('jhs')) total += 55;
        else if (className.includes('basic 4') || className.includes('basic 5') || className.includes('basic 6')) total += 40;
        else if (className.includes('basic 1') || className.includes('basic 2') || className.includes('basic 3')) total += 25;
        else total += 20; // Default / Nursery
    });
    
    return total;
};

/**
 * Initialize Payment
 */
export const initializeSubscriptionPayment = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const { planType, email } = request.data;
  if (!planType || !email) throw new HttpsError("invalid-argument", "Missing details.");

  try {
    let amountGHS = await calculateEnrollmentAmount();
    if (planType === "termly") amountGHS = amountGHS; // One term base
    else if (planType === "yearly") amountGHS = amountGHS * 3; // 3 terms
    
    // Paystack expects amount in sub-units (pesewas/kobo)
    const amountInKobo = Math.round(amountGHS * 100);

    const response = await fetch(PAYSTACK_INIT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            amount: amountInKobo,
            metadata: {
                userId: request.auth.uid,
                planType: planType
            },
            callback_url: request.data.frontendUrl + "/#admin?tab=calculator"
        })
    });

    const data: any = await response.json();
    if (!data.status) throw new Error(data.message || "Paystack Init Failed");

    return { 
        success: true, 
        authorization_url: data.data.authorization_url, 
        reference: data.data.reference 
    };

  } catch (error: any) {
    logger.error("Payment Init Error", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Verify Payment
 */
export const verifySubscriptionPayment = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");
  
  const { reference } = request.data;
  if (!reference) throw new HttpsError("invalid-argument", "Ref required.");

  try {
    const response = await fetch(PAYSTACK_VERIFY_URL + reference, {
        method: 'GET',
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });

    const data: any = await response.json();
    
    if (data.status && data.data.status === "success") {
        const planType = data.data.metadata.planType;
        const now = new Date();
        const expiry = new Date();
        
        if (planType === "monthly") expiry.setMonth(expiry.getMonth() + 1);
        else if (planType === "termly") expiry.setMonth(expiry.getMonth() + 4);
        else if (planType === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);

        const subData = {
            isActive: true,
            planType: planType,
            subscriptionEndsAt: admin.firestore.Timestamp.fromDate(expiry),
            lastPaymentReference: reference,
            lastPaymentDate: admin.firestore.Timestamp.fromDate(now)
        };

        await db.collection("schoolConfig").doc("subscription").set(subData, { merge: true });
        
        return { success: true, message: "Subscription activated." };
    }

    return { success: false, message: "Verification failed or payment pending." };

  } catch (error: any) {
    logger.error("Verification error", error);
    throw new HttpsError("internal", "System error during verification.");
  }
});

// ... Existing functions remain below ...
export const promoteToSuperAdmin = onCall({region: "us-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

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

  const {classIds, message, senderId, senderName} = request.data;
  if (!isValidArray(classIds) || !isValidString(message) || !isValidString(senderId) || !isValidString(senderName)) {
    throw new HttpsError("invalid-argument", "Invalid parameters.");
  }

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
      message: message.substring(0, 500), 
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
            
            const sub = await docRef.collection("groupMessages").get();
            const batch = db.batch();
            sub.docs.forEach(d => batch.delete(d.ref));
            batch.delete(docRef);
            await batch.commit();
            return {success: true};
        }
        
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