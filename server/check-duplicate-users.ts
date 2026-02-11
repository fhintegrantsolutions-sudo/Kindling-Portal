// Script to find duplicate users with case-insensitive email addresses
// Usage: npx tsx server/check-duplicate-users.ts

import { db } from './firebase';

async function checkDuplicates() {
  const usersSnap = await db.collection('users').get();
  const emailMap: Record<string, any[]> = {};

  // Group users by lowercase email
  usersSnap.forEach(doc => {
    const user = { id: doc.id, ...doc.data() };
    if (user.email) {
      const lower = user.email.toLowerCase();
      if (!emailMap[lower]) emailMap[lower] = [];
      emailMap[lower].push(user);
    }
  });

  // Find duplicates
  const duplicates = Object.entries(emailMap).filter(([email, users]) => users.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate users found!');
  } else {
    console.log(`⚠️  Found ${duplicates.length} duplicate email(s):\n`);
    for (const [email, users] of duplicates) {
      console.log(`Email: ${email}`);
      for (const u of users) {
        console.log(`  - ${u.id}: ${u.name} (${u.email})`);
      }
      console.log();
    }
  }
}

checkDuplicates().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
