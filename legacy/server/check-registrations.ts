import { storage } from "./storage";

async function checkRegistrations() {
  try {
    console.log("Fetching all note registrations...\n");

    const registrations = await storage.getAllNoteRegistrations();

    if (registrations.length === 0) {
      console.log("❌ No note registrations found in database");
      process.exit(0);
      return;
    }

    console.log(`✅ Found ${registrations.length} note registration(s):\n`);

    registrations.forEach((reg) => {
      console.log(`Registration ID: ${reg.id}`);
      console.log(`  User ID: ${reg.userId}`);
      console.log(`  Note ID: ${reg.noteId}`);
      console.log(`  Email: ${reg.email}`);
      console.log(`  Created: ${reg.createdAt}`);
      console.log("");
    });

    // Check for hdavidsh user
    const hdavidshUserId = "aRNXqXD1GlEQaJoLX8aK";
    const hdavidshRegs = registrations.filter(reg => reg.userId === hdavidshUserId);

    console.log(`\nRegistrations for hdavidsh (${hdavidshUserId}): ${hdavidshRegs.length}`);
    hdavidshRegs.forEach(reg => {
      console.log(`  - Note ID: ${reg.noteId}`);
    });

    // Check what the opportunity note IDs are
    console.log("\n\nExpected Note IDs from opportunities:");
    console.log("  - K26001: VIUIn5jqPpZCHf8qCGyD");
    console.log("  - K26002: Cdtebhx18iHpu3y0G6kp");

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkRegistrations();
