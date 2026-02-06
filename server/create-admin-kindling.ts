/**
 * Create Admin User (admin@kindling.com) Script
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
  console.log("Creating admin user: admin@kindling.com...\n");

  // Check if user already exists by username
  const existingByUsername = await db.collection('users')
    .where('username', '==', 'admin')
    .get();

  if (!existingByUsername.empty) {
    const existingUser = existingByUsername.docs[0];
    console.log(`User with username 'admin' already exists: ${existingUser.id}`);
    // Update to admin role
    await existingUser.ref.update({ role: 'admin', email: 'admin@kindling.com' });
    console.log(`Updated role to admin and email to admin@kindling.com`);
  } else {
    // Check by email
    const existingByEmail = await db.collection('users')
      .where('email', '==', 'admin@kindling.com')
      .get();

    if (!existingByEmail.empty) {
      const existingUser = existingByEmail.docs[0];
      console.log(`User with email 'admin@kindling.com' already exists: ${existingUser.id}`);
      await existingUser.ref.update({ role: 'admin', username: 'admin' });
      console.log(`Updated role to admin and username to 'admin'`);
    } else {
      // Create new admin user
      const newUserRef = db.collection('users').doc();
      await newUserRef.set({
        username: 'admin',
        password: 'admin123',
        name: 'Admin User',
        email: 'admin@kindling.com',
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      console.log(`Created admin user: ${newUserRef.id}`);
    }
  }

  console.log("\n========== Done ==========");
}

createAdminUser()
  .then(() => {
    console.log("Admin user created/updated!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
