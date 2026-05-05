/**
 * One-time migration script to update referral codes that contain 0 (zero) or O (letter)
 * Run with: npx tsx server/migrate-referral-codes.ts
 */

import { referralStorage } from "./referral-storage";

// Map of old characters to new replacements
// O -> P (next letter after O)
// 0 -> 1 (next number after 0)
function sanitizeCode(code: string): string {
  return code
    .replace(/O/g, 'P')  // Replace O with P
    .replace(/0/g, '1'); // Replace 0 with 1
}

async function migrateReferralCodes() {
  console.log("Starting referral code migration...");

  try {
    // Get all existing referral codes
    const allCodes = await referralStorage.getReferralCodes();
    console.log(`Found ${allCodes.length} total referral codes`);

    // Filter codes that contain O or 0
    const codesToUpdate = allCodes.filter(rc =>
      rc.code.includes('O') || rc.code.includes('0')
    );

    console.log(`Found ${codesToUpdate.length} codes that need updating`);

    if (codesToUpdate.length === 0) {
      console.log("No codes need updating. Migration complete.");
      return;
    }

    // Update each code
    for (const referralCode of codesToUpdate) {
      const oldCode = referralCode.code;
      const newCode = sanitizeCode(oldCode);

      // Check if the new code already exists
      const existing = await referralStorage.getReferralCodeByCode(newCode);

      if (existing && existing.id !== referralCode.id) {
        // If new code exists, generate a unique one
        const uniqueCode = await referralStorage.generateUniqueCode(newCode);
        console.log(`  Updating: ${oldCode} -> ${uniqueCode} (conflict resolved)`);
        await referralStorage.updateReferralCode(referralCode.id, {
          code: uniqueCode,
        });
      } else {
        console.log(`  Updating: ${oldCode} -> ${newCode}`);
        await referralStorage.updateReferralCode(referralCode.id, {
          code: newCode,
        });
      }
    }

    console.log("\nMigration complete!");
    console.log(`Updated ${codesToUpdate.length} referral codes.`);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateReferralCodes()
  .then(() => {
    console.log("\nExiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
