/**
 * Delete Karen Davidshofer (San Francisco, CA) Script
 * Removes the user, registrations, and participations
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

// Karen Davidshofer (San Francisco, CA) data
const USER_ID = "GFGR6vi92PYXEeDu3cx9";

async function deleteKarenSF() {
  console.log("Starting deletion of Karen Davidshofer (San Francisco, CA)...\n");

  // 1. Delete participations for this user
  console.log("1. Finding and deleting participations...");
  const participations = await db.collection('participations')
    .where('userId', '==', USER_ID)
    .get();
  
  for (const doc of participations.docs) {
    console.log(`   Deleting participation: ${doc.id}`);
    await doc.ref.delete();
  }
  console.log(`   Deleted ${participations.size} participation(s)`);

  // 2. Delete registrations for this user
  console.log("\n2. Finding and deleting registrations...");
  const registrations = await db.collection('noteRegistrations')
    .where('userId', '==', USER_ID)
    .get();
  
  for (const doc of registrations.docs) {
    console.log(`   Deleting registration: ${doc.id}`);
    await doc.ref.delete();
  }
  console.log(`   Deleted ${registrations.size} registration(s)`);

  // 3. Delete user
  console.log("\n3. Deleting user...");
  const userDoc = await db.collection('users').doc(USER_ID).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    console.log(`   Found user: ${userData?.name} (${userData?.email}) - ${userData?.city}, ${userData?.state}`);
    await db.collection('users').doc(USER_ID).delete();
    console.log(`   Deleted user: ${USER_ID}`);
  } else {
    console.log(`   User ${USER_ID} not found`);
  }

  console.log("\n========== Deletion Complete ==========");
}

deleteKarenSF()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deletion failed:", error);
    process.exit(1);
  });
