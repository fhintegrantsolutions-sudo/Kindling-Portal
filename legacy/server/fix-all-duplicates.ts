// Script to fix all duplicate users with case-sensitive email addresses
// Usage: npx tsx server/fix-all-duplicates.ts

import { db } from './firebase';

async function fixAllDuplicates() {
  console.log('Finding all duplicate users...\n');

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
    return;
  }

  console.log(`Found ${duplicates.length} duplicate email(s). Processing...\n`);

  for (const [email, users] of duplicates) {
    console.log(`Processing: ${email}`);

    // Get participation counts for each user
    const userStats = await Promise.all(
      users.map(async (user) => {
        const participations = await db.collection('participations')
          .where('userId', '==', user.id)
          .get();
        return {
          user,
          participationCount: participations.size,
          participations: participations.docs,
        };
      })
    );

    // Sort by participation count (desc), then prefer lowercase email
    userStats.sort((a, b) => {
      if (a.participationCount !== b.participationCount) {
        return b.participationCount - a.participationCount;
      }
      // Prefer lowercase email
      return a.user.email === email ? -1 : 1;
    });

    const keepUser = userStats[0];
    const deleteUsers = userStats.slice(1);

    console.log(`  ✓ Keeping: ${keepUser.user.id} (${keepUser.user.email}) - ${keepUser.participationCount} participations`);

    // Move participations from duplicate users to the main user
    for (const dup of deleteUsers) {
      console.log(`  → Merging: ${dup.user.id} (${dup.user.email}) - ${dup.participationCount} participations`);

      for (const partDoc of dup.participations) {
        await partDoc.ref.update({ userId: keepUser.user.id });
      }

      // Delete the duplicate user
      await db.collection('users').doc(dup.user.id).delete();
      console.log(`  ✓ Deleted: ${dup.user.id}`);
    }

    // Update the kept user's email to lowercase
    if (keepUser.user.email !== email) {
      await db.collection('users').doc(keepUser.user.id).update({ email });
      console.log(`  ✓ Normalized email to: ${email}`);
    }

    console.log();
  }

  console.log('✅ All duplicates merged successfully!');
}

fixAllDuplicates().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
