// Script to mark all K25003 and K25004 participations as Fully Funded
// Usage: npx tsx server/mark-k25003-k25004-funded.ts

import { db } from './firebase';

async function markAsFullyFunded() {
  console.log("Marking K25003 and K25004 participations as fully funded...\n");

  const noteIds = ['K25003', 'K25004'];
  let totalUpdated = 0;

  for (const noteId of noteIds) {
    console.log(`\nProcessing ${noteId}...`);
    
    // Find the note
    const notesSnapshot = await db.collection("notes").where("noteId", "==", noteId).get();
    if (notesSnapshot.empty) {
      console.error(`Note ${noteId} not found!`);
      continue;
    }
    
    const noteDocId = notesSnapshot.docs[0].id;
    const noteData = notesSnapshot.docs[0].data();
    console.log(`Found ${noteId} note with ID: ${noteDocId}`);

    // Get all participations for this note
    const participationsSnapshot = await db.collection("participations")
      .where("noteId", "==", noteDocId)
      .get();
    
    console.log(`Found ${participationsSnapshot.size} participations for ${noteId}\n`);

    // Update each participation
    for (const participationDoc of participationsSnapshot.docs) {
      const participation = participationDoc.data();
      const participationId = participationDoc.id;
      
      // Get user info
      let userName = "Unknown";
      if (participation.userId) {
        const userDoc = await db.collection("users").doc(participation.userId).get();
        userName = userDoc.data()?.name || "Unknown";
      }

      const investedAmount = participation.investedAmount || participation.fundingStatus?.investmentAmount || "0";

      // Current date for funding dates
      const today = new Date().toISOString().split('T')[0];

      // Update funding status to fully funded
      const updatedFundingStatus = {
        received: true,
        deposited: true,
        cleared: true,
        fundingType: participation.fundingStatus?.fundingType || "wire",
        investmentAmount: participation.fundingStatus?.investmentAmount || investedAmount,
        checkNumber: participation.fundingStatus?.checkNumber || "",
        wireReferenceNumber: participation.fundingStatus?.wireReferenceNumber || "",
        checkImageUrl: participation.fundingStatus?.checkImageUrl || "",
        receivedDate: participation.fundingStatus?.receivedDate || today,
        depositedDate: participation.fundingStatus?.depositedDate || today,
        clearedDate: participation.fundingStatus?.clearedDate || today,
        notes: participation.fundingStatus?.notes || "Marked as fully funded",
      };

      await db.collection("participations").doc(participationId).update({
        fundingStatus: updatedFundingStatus,
        updatedAt: new Date()
      });

      console.log(`  ✓ Updated: ${userName} - $${parseFloat(investedAmount).toLocaleString()}`);
      totalUpdated++;
    }
  }

  console.log("\n========================================");
  console.log(`Total participations updated: ${totalUpdated}`);
  console.log("========================================");
}

markAsFullyFunded()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
