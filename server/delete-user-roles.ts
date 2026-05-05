/**
 * Script to delete all documents in the user_roles collection
 * Run with: npx tsx server/delete-user-roles.ts
 */
import { db } from "./firebase";

async function deleteUserRoles() {
  console.log("Starting user_roles collection cleanup...\n");

  try {
    // Get all documents in user_roles collection
    const userRolesSnapshot = await db.collection('user_roles').get();
    console.log(`Found ${userRolesSnapshot.size} documents to delete`);

    if (userRolesSnapshot.size === 0) {
      console.log("No documents to delete. Collection is already empty.");
      return;
    }

    // Delete each document
    const batch = db.batch();
    let count = 0;

    userRolesSnapshot.forEach(doc => {
      console.log(`  Deleting document: ${doc.id}`);
      batch.delete(doc.ref);
      count++;
    });

    // Commit the batch delete
    await batch.commit();

    console.log(`\n✓ Successfully deleted ${count} documents from user_roles collection`);
    console.log("The user_roles collection is now empty.");

  } catch (error) {
    console.error("Deletion failed:", error);
    process.exit(1);
  }
}

// Run the deletion
deleteUserRoles()
  .then(() => {
    console.log("\nExiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
