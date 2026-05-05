/**
 * Delete Karen Davidshofer (San Francisco) registrations
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  './kindling-portal-firebase-adminsdk-fbsvc-72b51e1944.json';

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Registration IDs to delete
const REGISTRATION_IDS = [
  "1IPgSJcSXUuCQeZtfjXt",
  "VCBy3z6uQEQQsi39M3Z0"
];

async function deleteRegistrations() {
  console.log("Deleting Karen Davidshofer (San Francisco) registrations...\n");

  for (const regId of REGISTRATION_IDS) {
    console.log(`Deleting registration: ${regId}`);
    await db.collection('noteRegistrations').doc(regId).delete();
    console.log(`  Deleted!`);
  }

  console.log("\n========== Deletion Complete ==========");
}

deleteRegistrations()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deletion failed:", error);
    process.exit(1);
  });
