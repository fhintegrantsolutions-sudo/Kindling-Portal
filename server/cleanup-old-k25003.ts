// Cleanup script to remove incorrectly imported K25003 participations
// Usage: npx tsx server/cleanup-old-k25003.ts

import { db } from './firebase';

async function cleanup() {
  // Find all participations with noteId = "K25003" (string, not the document ID)
  const incorrectParticipations = await db.collection('participations')
    .where('noteId', '==', 'K25003')
    .get();

  console.log(`Found ${incorrectParticipations.size} incorrect participations to delete`);

  for (const doc of incorrectParticipations.docs) {
    await doc.ref.delete();
    console.log(`Deleted participation ${doc.id}`);
  }

  console.log('Cleanup complete!');
}

cleanup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
