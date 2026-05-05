import { db } from './firebase';

async function fixPaymentStartDates() {
  // Fix K24002 - should be December 25, 2024
  const k24002Snapshot = await db.collection('notes').where('noteId', '==', 'K24002').get();
  if (!k24002Snapshot.empty) {
    await db.collection('notes').doc(k24002Snapshot.docs[0].id).update({
      paymentStartDate: new Date(2024, 11, 25).toISOString()
    });
    console.log('✓ K24002 paymentStartDate updated to December 25, 2024');
  }
  
  // Fix K25001 - should be March 25, 2025
  const k25001Snapshot = await db.collection('notes').where('noteId', '==', 'K25001').get();
  if (!k25001Snapshot.empty) {
    await db.collection('notes').doc(k25001Snapshot.docs[0].id).update({
      paymentStartDate: new Date(2025, 2, 25).toISOString()
    });
    console.log('✓ K25001 paymentStartDate updated to March 25, 2025');
  }
  
  console.log('Done!');
}

fixPaymentStartDates()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
