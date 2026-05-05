/**
 * Script to audit users collection for missing/inconsistent fields
 * Run with: npx tsx server/audit-users.ts
 */
import { db } from "./firebase";

async function auditUsers() {
  console.log("Starting users collection audit...\n");

  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Total users: ${usersSnapshot.size}\n`);

    // Track field presence across all users
    const fieldStats: Record<string, { present: number; missing: number; examples: string[] }> = {};
    const usersByMissingFields: Record<string, any[]> = {};

    // Common expected fields
    const expectedFields = [
      'username', 'password', 'name', 'email', 'phone', 'address',
      'city', 'state', 'zipCode', 'role', 'createdAt'
    ];

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;
      const userName = user.name || user.username || 'Unknown';

      // Check each expected field
      const missingFields: string[] = [];

      expectedFields.forEach(field => {
        if (!fieldStats[field]) {
          fieldStats[field] = { present: 0, missing: 0, examples: [] };
        }

        if (user[field] === undefined || user[field] === null || user[field] === '') {
          fieldStats[field].missing++;
          missingFields.push(field);
        } else {
          fieldStats[field].present++;
          if (fieldStats[field].examples.length < 3) {
            fieldStats[field].examples.push(String(user[field]).substring(0, 50));
          }
        }
      });

      // Group users by missing fields
      if (missingFields.length > 0) {
        const key = missingFields.sort().join(', ');
        if (!usersByMissingFields[key]) {
          usersByMissingFields[key] = [];
        }
        usersByMissingFields[key].push({
          id: userId,
          name: userName,
          email: user.email,
          role: user.role
        });
      }
    });

    // Print field statistics
    console.log("=== FIELD STATISTICS ===\n");
    expectedFields.forEach(field => {
      const stats = fieldStats[field];
      const percentage = ((stats.present / usersSnapshot.size) * 100).toFixed(1);
      console.log(`${field}:`);
      console.log(`  Present: ${stats.present} (${percentage}%)`);
      console.log(`  Missing: ${stats.missing}`);
      if (stats.examples.length > 0) {
        console.log(`  Examples: ${stats.examples.join(', ')}`);
      }
      console.log();
    });

    // Print users grouped by missing fields
    console.log("\n=== USERS WITH MISSING FIELDS ===\n");

    const sortedGroups = Object.entries(usersByMissingFields).sort((a, b) => b[1].length - a[1].length);

    sortedGroups.forEach(([missingFields, users]) => {
      console.log(`\nMissing: ${missingFields}`);
      console.log(`Count: ${users.length} users`);
      console.log('Users:');
      users.forEach(u => {
        console.log(`  - ${u.name} (${u.email || 'no email'}) [role: ${u.role || 'undefined'}]`);
      });
    });

    // Find users with undefined role specifically
    console.log("\n\n=== USERS WITH UNDEFINED ROLE ===\n");
    const noRoleUsers: any[] = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (!user.role || user.role === undefined) {
        noRoleUsers.push({
          id: doc.id,
          name: user.name || user.username,
          email: user.email,
          username: user.username
        });
      }
    });
    console.log(`Found ${noRoleUsers.length} users without a role:`);
    noRoleUsers.forEach(u => {
      console.log(`  - ${u.name} (${u.email || u.username})`);
    });

  } catch (error) {
    console.error("Audit failed:", error);
    process.exit(1);
  }
}

// Run the audit
auditUsers()
  .then(() => {
    console.log("\n\nAudit complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
