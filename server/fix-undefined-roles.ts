/**
 * Script to assign "lender" role to all users with undefined role
 * Run with: npx tsx server/fix-undefined-roles.ts
 */
import { db } from "./firebase";

async function fixUndefinedRoles() {
  console.log("Starting role assignment for users with undefined role...\n");

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Total users: ${usersSnapshot.size}`);

    // Find users with undefined role
    const usersToUpdate: any[] = [];

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (!user.role || user.role === undefined) {
        usersToUpdate.push({
          id: doc.id,
          name: user.name || user.username || 'Unknown',
          email: user.email
        });
      }
    });

    console.log(`Found ${usersToUpdate.length} users with undefined role\n`);

    if (usersToUpdate.length === 0) {
      console.log("No users need role assignment. All done!");
      return;
    }

    console.log("Users to update:");
    usersToUpdate.forEach(u => {
      console.log(`  - ${u.name} (${u.email})`);
    });

    // Update all users in a batch
    console.log("\nUpdating roles...");
    const batch = db.batch();

    usersToUpdate.forEach(user => {
      const userRef = db.collection('users').doc(user.id);
      batch.update(userRef, { role: 'lender' });
    });

    await batch.commit();

    console.log(`\n✓ Successfully updated ${usersToUpdate.length} users to role: "lender"`);

  } catch (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
}

// Run the fix
fixUndefinedRoles()
  .then(() => {
    console.log("\nRole assignment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
