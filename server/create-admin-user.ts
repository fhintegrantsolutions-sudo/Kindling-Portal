/**
 * Create Admin User Script
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

async function createAdminUser() {
  console.log("Creating admin user: fhintegrantsolutions...\n");

  // Check if user already exists
  const existingUsers = await db.collection('users')
    .where('username', '==', 'fhintegrantsolutions')
    .get();

  if (!existingUsers.empty) {
    const existingUser = existingUsers.docs[0];
    console.log(`User already exists: ${existingUser.id}`);
    // Update to admin role
    await existingUser.ref.update({ role: 'admin' });
    console.log(`Updated role to admin`);
  } else {
    // Create new admin user
    const newUserRef = db.collection('users').doc();
    await newUserRef.set({
      username: 'fhintegrantsolutions',
      password: 'admin123456', // Temporary password
      name: 'FH Integrant Solutions',
      email: 'admin@fhintegrantsolutions.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    console.log(`Created admin user: ${newUserRef.id}`);
  }

  console.log("\n========== Done ==========");
}

createAdminUser()
  .then(() => {
    console.log("Admin user created!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
