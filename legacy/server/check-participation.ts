import { storage } from "./storage";

async function checkParticipation() {
  try {
    const participationId = "aZOSWHkrIbgRaPEtQxpM"; // K26001

    console.log(`\nChecking participation ${participationId}...\n`);

    const participation = await storage.getParticipation(participationId);

    if (!participation) {
      console.log("❌ Participation not found");
      return;
    }

    console.log("✅ Participation found:");
    console.log(`  ID: ${participation.id}`);
    console.log(`  Note ID: ${participation.noteId}`);
    console.log(`  Note: ${participation.note.noteId}`);
    console.log(`  Invested Amount: ${participation.investedAmount}`);
    console.log(`  Type: ${typeof participation.investedAmount}`);
    console.log(`  User ID: ${participation.userId}`);
    console.log(`  Status: ${participation.status}`);
    console.log(`  Created At: ${participation.createdAt}`);

    // Now try updating it
    console.log("\n\nTesting update to $7500...\n");
    const updated = await storage.updateParticipation(participationId, {
      investedAmount: "7500",
    });

    if (!updated) {
      console.log("❌ Update failed - no participation returned");
      return;
    }

    console.log("✅ Update returned:");
    console.log(`  Invested Amount: ${updated.investedAmount}`);
    console.log(`  Type: ${typeof updated.investedAmount}`);

    // Fetch again to verify
    console.log("\n\nFetching again to verify...\n");
    const refetched = await storage.getParticipation(participationId);
    console.log("✅ Refetched participation:");
    console.log(`  Invested Amount: ${refetched?.investedAmount}`);
    console.log(`  Type: ${typeof refetched?.investedAmount}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkParticipation();
