// Script to add missing purchaseDate to K25003 participations
// Usage: npx tsx server/fix-k25003-purchase-dates.ts

import { db } from './firebase';

async function fixPurchaseDates() {
  console.log('Adding purchase dates to K25003 participations...\n');

  // Find K25003 note
  const notesSnapshot = await db.collection('notes').where('noteId', '==', 'K25003').get();
  if (notesSnapshot.empty) {
    console.error('Note K25003 not found!');
    return;
  }

  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  const noteData = noteDoc.data();

  // Use the contract date as the purchase date (August 15, 2025)
  const purchaseDate = noteData.contractDate || '2025-08-15T00:00:00.000Z';

  console.log(`Using purchase date: ${purchaseDate}\n`);

  // Get all K25003 participations
  const participationsSnapshot = await db.collection('participations')
    .where('noteId', '==', noteId)
    .get();

  console.log(`Found ${participationsSnapshot.size} participations to update\n`);

  let updateCount = 0;

  for (const partDoc of participationsSnapshot.docs) {
    const participation = partDoc.data();

    // Only update if purchaseDate is missing
    if (!participation.purchaseDate) {
      await db.collection('participations').doc(partDoc.id).update({
        purchaseDate: purchaseDate
      });

      // Get user name for logging
      const userDoc = await db.collection('users').doc(participation.userId).get();
      const userName = userDoc.data()?.name || 'Unknown';

      console.log(`✓ Updated: ${userName}`);
      updateCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Updated ${updateCount} participations`);
  console.log(`========================================`);
}

fixPurchaseDates()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
