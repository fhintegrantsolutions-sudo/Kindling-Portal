// Script to fix duplicate users with case-sensitive email addresses
// Usage: npx tsx server/fix-duplicate-users.ts

import { db } from './firebase';

async function fixDuplicates() {
  // The correct user (lowercase email with most participations)
  const correctUserId = 'aRNXqXD1GlEQaJoLX8aK'; // hdavidsh@gmail.com

  // The duplicate user (capital H)
  const duplicateUserId = '5WzipK2CCdxgGwDFa7Cl'; // Hdavidsh@gmail.com

  console.log('Fixing duplicate user accounts...');

  // Find all participations belonging to the duplicate user
  const duplicateParticipations = await db.collection('participations')
    .where('userId', '==', duplicateUserId)
    .get();

  console.log(`Found ${duplicateParticipations.size} participations to move`);

  // Move participations to the correct user
  for (const doc of duplicateParticipations.docs) {
    await doc.ref.update({ userId: correctUserId });
    console.log(`Moved participation ${doc.id} to correct user`);
  }

  // Delete the duplicate user
  await db.collection('users').doc(duplicateUserId).delete();
  console.log(`Deleted duplicate user ${duplicateUserId}`);

  console.log('Done! Duplicate users merged successfully.');
}

fixDuplicates().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
