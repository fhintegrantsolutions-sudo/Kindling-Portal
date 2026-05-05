/**
 * Automated Note Status Updater
 *
 * Automatically updates note statuses based on funding window and payment dates:
 * - Status lifecycle:
 *   1. "Funding" → "Active" (when funding window closes)
 *
 * - Client Status lifecycle:
 *   1. "Funding in Progress" → "Processing" (when funding closes, before first payment)
 *   2. "Processing" → "Active" (when first payment date arrives)
 *
 * Run this script regularly (daily or weekly) to keep statuses current
 */
import { db } from "./firebase";

async function updateNoteStatuses(dryRun: boolean = false) {
  console.log("🔄 Automated Note Status Updater");
  console.log("=================================\n");

  if (dryRun) {
    console.log("📋 DRY RUN MODE - No changes will be made\n");
  }

  const today = new Date();
  console.log(`📅 Today: ${today.toISOString().split('T')[0]}\n`);

  // Get all notes that might need status updates
  const notesSnapshot = await db.collection("notes").get();

  let updatedCount = 0;
  let skippedCount = 0;

  for (const noteDoc of notesSnapshot.docs) {
    const note = noteDoc.data();
    const noteId = noteDoc.id;

    // Process notes in "Funding" status OR notes with "Processing" clientStatus
    const needsCheck = note.status === "Funding" || note.clientStatus === "Processing";
    if (!needsCheck) {
      continue;
    }

    if (!note.fundingEndDate) {
      console.log(`⚠️  ${note.noteId}: No funding end date - skipping`);
      skippedCount++;
      continue;
    }

    const fundingEndDate = note.fundingEndDate.toDate ? note.fundingEndDate.toDate() : new Date(note.fundingEndDate);
    const paymentStartDate = note.paymentStartDate?.toDate ? note.paymentStartDate.toDate() : (note.paymentStartDate ? new Date(note.paymentStartDate) : null);
    const fundingWindowClosed = fundingEndDate < today;
    const paymentsStarted = paymentStartDate && paymentStartDate <= today;

    console.log(`📝 ${note.noteId}`);
    console.log(`   Status: ${note.status}`);
    console.log(`   Client Status: ${note.clientStatus}`);
    console.log(`   Funding End: ${fundingEndDate.toISOString().split('T')[0]}`);
    if (paymentStartDate) {
      console.log(`   Payment Start: ${paymentStartDate.toISOString().split('T')[0]}`);
    }
    console.log(`   Funding Closed: ${fundingWindowClosed}`);
    console.log(`   Payments Started: ${paymentsStarted}`);

    const updates: any = {};

    // Update main status: Funding → Active (when funding closes)
    if (fundingWindowClosed && note.status === "Funding") {
      updates.status = "Active";
    }

    // Update client status based on lifecycle stage
    if (note.clientStatus === "Funding in Progress" && fundingWindowClosed) {
      if (paymentsStarted) {
        // If payments already started, go directly to Active
        updates.clientStatus = "Active";
      } else {
        // Funding closed but payments haven't started yet → Processing
        updates.clientStatus = "Processing";
      }
    } else if (note.clientStatus === "Processing" && paymentsStarted) {
      // Payments started, move from Processing to Active
      updates.clientStatus = "Active";
    }

    if (Object.keys(updates).length > 0) {
      console.log(`   ➡️  Updating to: status="${updates.status || note.status}", clientStatus="${updates.clientStatus || note.clientStatus}"`);

      if (!dryRun) {
        await db.collection("notes").doc(noteId).update(updates);
      }

      updatedCount++;
    } else {
      console.log(`   ✓ Already has correct status`);
      skippedCount++;
    }

    console.log();
  }

  console.log("=================================");
  console.log(`📊 Summary:`);
  console.log(`   Notes ${dryRun ? 'would be updated' : 'updated'}: ${updatedCount}`);
  console.log(`   Notes skipped: ${skippedCount}`);
  if (dryRun) {
    console.log(`\n   Run with --execute to actually update the statuses`);
  }
  console.log("=================================");
}

// Check for command line args
const isDryRun = !process.argv.includes('--execute');

updateNoteStatuses(isDryRun)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
