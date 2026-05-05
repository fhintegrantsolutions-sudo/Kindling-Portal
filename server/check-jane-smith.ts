/**
 * Check Jane Smith's status in the database
 */
import { db } from "./firebase";

async function checkJaneSmith() {
  console.log("Checking Jane Smith's status...\n");

  // Check access requests
  const accessRequestsSnapshot = await db.collection('access_requests')
    .where('firstName', '==', 'Jane')
    .where('lastName', '==', 'Smith')
    .get();

  console.log('=== ACCESS REQUESTS ===');
  if (accessRequestsSnapshot.empty) {
    console.log('No access request found for Jane Smith\n');
  } else {
    accessRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('Found access request:');
      console.log('  ID:', doc.id);
      console.log('  Email:', data.email);
      console.log('  Phone:', data.phone);
      console.log('  Status:', data.status);
      console.log('  Created:', data.createdAt?.toDate?.());
      console.log('');
    });
  }

  // Try to find email from access request
  let email = 'jane.smith@example.com';
  if (!accessRequestsSnapshot.empty) {
    email = accessRequestsSnapshot.docs[0].data().email;
  }

  // Check users
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email)
    .get();

  console.log('=== USERS ===');
  if (usersSnapshot.empty) {
    console.log(`No user account found for ${email}\n`);
  } else {
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('Found user account:');
      console.log('  ID:', doc.id);
      console.log('  Name:', data.name);
      console.log('  Email:', data.email);
      console.log('  Username:', data.username);
      console.log('  Role:', data.role);
      console.log('  Created:', data.createdAt?.toDate?.());
      console.log('');
    });
  }

  // Check setup tokens
  const tokensSnapshot = await db.collection('setup_tokens')
    .where('email', '==', email)
    .get();

  console.log('=== SETUP TOKENS ===');
  if (tokensSnapshot.empty) {
    console.log(`No setup token found for ${email}\n`);
  } else {
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('Found setup token:');
      console.log('  ID:', doc.id);
      console.log('  Token:', data.token);
      console.log('  Used:', data.used);
      console.log('  Expires:', data.expiresAt?.toDate?.());
      console.log('  Created:', data.createdAt?.toDate?.());
      console.log('');
    });
  }

  // Summary
  console.log('=== SUMMARY ===');
  const hasAccessRequest = !accessRequestsSnapshot.empty;
  const hasUser = !usersSnapshot.empty;
  const hasToken = !tokensSnapshot.empty;

  if (hasAccessRequest) {
    const status = accessRequestsSnapshot.docs[0].data().status;
    console.log(`✓ Jane Smith has an access request (status: ${status})`);
  } else {
    console.log('✗ Jane Smith does not have an access request');
  }

  if (hasToken) {
    const used = tokensSnapshot.docs[0].data().used;
    console.log(`✓ Setup token exists (used: ${used})`);
  } else {
    console.log('✗ No setup token generated');
  }

  if (hasUser) {
    console.log('✓ Jane Smith has a user account in the database');
  } else {
    console.log('✗ Jane Smith does NOT have a user account yet');
  }
}

checkJaneSmith()
  .then(() => {
    console.log("\nCheck complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
