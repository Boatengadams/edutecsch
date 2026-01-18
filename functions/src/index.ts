import {onCall, HttpsError} from "firebase-functions/v2/onCall";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// --- ZERO-TRUST VALIDATION HELPERS ---

/**
 * Verifies that the request is authenticated and the user has the required role in Firestore.
 * This prevents token-spoofing attacks.
 */
const verifyAccess = async (auth: any, requiredRoles: string[]) => {
    if (!auth || !auth.uid) {
        throw new HttpsError("unauthenticated", "Request lacks valid authentication credentials.");
    }
    
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
        throw new HttpsError("permission-denied", "User profile not found in secure registry.");
    }
    
    const userData = userDoc.data();
    const role = userData?.role || "guest";
    const isApproved = userData?.status === "approved" || role === "admin";
    
    if (!isApproved) {
        throw new HttpsError("permission-denied", "Account pending administrative approval.");
    }

    if (!requiredRoles.includes(role)) {
        throw new HttpsError("permission-denied", `Unauthorized: ${role} lacks required privilege elevation.`);
    }

    return userData;
};

const isValidString = (str: any, minLen = 1) => typeof str === 'string' && str.trim().length >= minLen;
const isValidArray = (arr: any) => Array.isArray(arr) && arr.length > 0;

/**
 * Initialize Payment with strict role check
 */
export const initializeSubscriptionPayment = onCall({region: "us-west1"}, async (request) => {
  await verifyAccess(request.auth, ["admin"]);

  const { planType, email } = request.data;
  if (!planType || !email) throw new HttpsError("invalid-argument", "Malformed payment payload.");

  try {
    // Pricing calculation logic (Calculated server-side to prevent tampering)
    const studentsSnap = await db.collection("users").where("role", "==", "student").get();
    let totalGHS = 0;
    studentsSnap.docs.forEach(doc => {
        const className = (doc.data().class || "").toLowerCase();
        if (className.includes('jhs')) totalGHS += 55;
        else if (className.includes('basic')) totalGHS += 40;
        else totalGHS += 20;
    });

    if (planType === "yearly") totalGHS *= 3;
    
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            amount: Math.round(totalGHS * 100),
            metadata: { userId: request.auth?.uid, planType }
        })
    });

    const data: any = await response.json();
    return { success: true, authorization_url: data.data.authorization_url, reference: data.data.reference };

  } catch (error: any) {
    logger.error("Zero-Trust Payment Fault", error);
    throw new HttpsError("internal", "Secure payment gateway unreachable.");
  }
});

/**
 * Broadcast with strict verification
 */
export const sendBroadcastNotification = onCall({region: "us-west1"}, async (request) => {
    const caller = await verifyAccess(request.auth, ["admin", "teacher"]);
    
    const { title, message, targetAudience, targetRoles } = request.data;
    if (!isValidString(title) || !isValidString(message)) {
         throw new HttpsError("invalid-argument", "Invalid broadcast content.");
    }

    try {
        let usersQuery = db.collection('users').where('status', '==', 'approved');
        if (targetAudience === 'role' && Array.isArray(targetRoles)) {
            usersQuery = usersQuery.where('role', 'in', targetRoles);
        }

        const usersSnapshot = await usersQuery.get();
        const batch = db.batch();

        usersSnapshot.docs.forEach((doc) => {
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                userId: doc.id,
                message: `${title}: ${message}`.substring(0, 500),
                senderId: request.auth!.uid,
                senderName: caller.name || 'System',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: []
            });
        });

        await batch.commit();
        return { success: true, count: usersSnapshot.size };
    } catch (error: any) {
        logger.error("Secure Broadcast Fault", error);
        throw new HttpsError("internal", "Broadcast chain failed.");
    }
});

/**
 * Resource deletion with ownership verification
 */
export const deleteResource = onCall({region: "us-west1"}, async (request) => {
    const caller = await verifyAccess(request.auth, ["admin", "teacher"]);
    const { resourceType, resourceId } = request.data;

    try {
        const docRef = db.collection(resourceType).doc(resourceId);
        const doc = await docRef.get();
        
        if (!doc.exists) return { success: true };
        
        // Zero-Trust ownership check
        if (caller.role !== 'admin' && doc.data()?.teacherId !== request.auth!.uid) {
            throw new HttpsError("permission-denied", "Resource ownership required for deletion.");
        }

        await docRef.delete();
        return { success: true };
    } catch (e: any) {
        throw new HttpsError("internal", e.message);
    }
});