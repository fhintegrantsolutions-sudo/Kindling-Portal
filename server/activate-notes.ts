// Script to activate all notes except K26001 and K26002
// Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npx tsx server/activate-notes.ts

import { db } from './firebase';

async function activateNotes() {
  console.log('Updating note statuses...\n');

  // Get all notes
  const notesSnapshot = await db.collection('notes').get();
  console.log(`Found ${notesSnapshot.size} total notes\n`);

  let activatedCount = 0;
  let skippedCount = 0;

  for (const noteDoc of notesSnapshot.docs) {
    const noteData = noteDoc.data();
    const noteId = noteData.noteId;

    // Skip K26001 and K26002
    if (noteId === 'K26001' || noteId === 'K26002') {
      console.log(`⊘ Skipped ${noteId} (excluded from activation)`);
      skippedCount++;
      continue;
    }

    // Update to Active status
    await db.collection('notes').doc(noteDoc.id).update({
      status: 'Active',
      updatedAt: new Date().toISOString(),
    });

    console.log(`✓ Activated ${noteId} (${noteData.title})`);
    activatedCount++;
  }

  console.log('\n========================================');
  console.log(`Notes activated: ${activatedCount}`);
  console.log(`Notes skipped: ${skippedCount}`);
  console.log('========================================');
}

activateNotes()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
