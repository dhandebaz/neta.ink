import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      console.warn("Firebase Admin credentials missing. Auth APIs will degrade gracefully.");
    }
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

export const auth = admin.apps.length ? admin.auth() : null;
