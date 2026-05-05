/**
 * Quick script to verify role assignments
 */
import { db } from "./firebase";

async function verifyRoles() {
  const usersSnapshot = await db.collection('users').get();
  const roleCount: Record<string, number> = {};

  usersSnapshot.forEach(doc => {
    const role = doc.data().role || 'undefined';
    roleCount[role] = (roleCount[role] || 0) + 1;
  });

  console.log('\n=== Role Distribution ===\n');
  Object.entries(roleCount).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
    console.log(`  ${role}: ${count} users`);
  });
  console.log(`\nTotal: ${usersSnapshot.size} users\n`);

  process.exit(0);
}

verifyRoles();
