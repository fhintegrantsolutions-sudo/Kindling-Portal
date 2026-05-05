// Script to ensure all participations have a status field
// Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npx tsx server/fix-participation-statuses.ts

import { db } from './firebase';

async function fixParticipationStatuses() {
  console.log('Checking all participations for missing status...\n');

  const participationsSnapshot = await db.collection('participations').get();
  console.log(`Found ${participationsSnapshot.size} total participations\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;

  for (const partDoc of participationsSnapshot.docs) {
    const partData = partDoc.data();

    // Check if status is missing or undefined
    if (!partData.status) {
      // Get the note to determine appropriate status
      const noteDoc = await db.collection('notes').doc(partData.noteId).get();
      const noteData = noteDoc.data();

      // Set participation status to Active (default for existing participations)
      await db.collection('participations').doc(partDoc.id).update({
        status: 'Active',
        updatedAt: new Date().toISOString(),
      });

      console.log(`✓ Fixed participation ${partDoc.id} (Note: ${noteData?.noteId})`);
      fixedCount++;
    } else {
      alreadyOkCount++;
    }
  }

  console.log('\n========================================');
  console.log(`Participations fixed: ${fixedCount}`);
  console.log(`Participations already OK: ${alreadyOkCount}`);
  console.log('========================================');
}

fixParticipationStatuses()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
