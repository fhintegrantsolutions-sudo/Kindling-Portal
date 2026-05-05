/**
 * Script to remove isLender field from all users
 * Run with: npx tsx server/remove-islender.ts
 */
import { db } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";

async function removeIsLender() {
  console.log("Starting removal of isLender field from users...\n");

  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Total users: ${usersSnapshot.size}`);

    // Find users with isLender field
    const usersWithIsLender: any[] = [];

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.isLender !== undefined) {
        usersWithIsLender.push({
          id: doc.id,
          name: user.name || user.username,
          email: user.email,
          isLender: user.isLender
        });
      }
    });

    console.log(`Found ${usersWithIsLender.length} users with isLender field\n`);

    if (usersWithIsLender.length === 0) {
      console.log("No users have isLender field. Nothing to remove.");
      return;
    }

    console.log("Users to update:");
    usersWithIsLender.forEach(u => {
      console.log(`  - ${u.name} (${u.email}) - isLender: ${u.isLender}`);
    });

    // Remove isLender field in batches
    console.log("\nRemoving isLender field...");

    // Firestore batch limit is 500, so we'll process in chunks
    const batchSize = 500;
    for (let i = 0; i < usersWithIsLender.length; i += batchSize) {
      const batch = db.batch();
      const chunk = usersWithIsLender.slice(i, i + batchSize);

      chunk.forEach(user => {
        const userRef = db.collection('users').doc(user.id);
        batch.update(userRef, { isLender: FieldValue.delete() });
      });

      await batch.commit();
      console.log(`  Processed ${Math.min(i + batchSize, usersWithIsLender.length)} of ${usersWithIsLender.length}`);
    }

    console.log(`\n✓ Successfully removed isLender field from ${usersWithIsLender.length} users`);

  } catch (error) {
    console.error("Removal failed:", error);
    process.exit(1);
  }
}

// Run the removal
removeIsLender()
  .then(() => {
    console.log("\nCleanup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
