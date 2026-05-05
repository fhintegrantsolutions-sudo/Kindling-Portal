import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Check if running in Firebase environment or with service account
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use service account JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use service account file path
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    // For development: use emulator or throw error
    console.warn(
      "⚠️  No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS"
    );
    // Initialize without credentials for emulator mode
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
    });
  }
}

export const db = getFirestore();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

export { admin };
