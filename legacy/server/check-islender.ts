/**
 * Script to check isLender field in users collection
 */
import { db } from "./firebase";

async function checkIsLender() {
  console.log("Checking isLender field in users collection...\n");

  try {
    const usersSnapshot = await db.collection('users').get();

    const withIsLender: any[] = [];
    const withoutIsLender: any[] = [];

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      const userData = {
        id: doc.id,
        name: user.name || user.username,
        email: user.email,
        role: user.role,
        isLender: user.isLender
      };

      if (user.isLender !== undefined) {
        withIsLender.push(userData);
      } else {
        withoutIsLender.push(userData);
      }
    });

    console.log(`=== USERS WITH isLender FIELD ===`);
    console.log(`Count: ${withIsLender.length}\n`);

    if (withIsLender.length > 0) {
      console.log('Sample users:');
      withIsLender.slice(0, 10).forEach(u => {
        console.log(`  - ${u.name} (${u.email})`);
        console.log(`    role: ${u.role}, isLender: ${u.isLender}`);
      });

      if (withIsLender.length > 10) {
        console.log(`  ... and ${withIsLender.length - 10} more`);
      }
    }

    console.log(`\n\n=== USERS WITHOUT isLender FIELD ===`);
    console.log(`Count: ${withoutIsLender.length}\n`);

    if (withoutIsLender.length > 0) {
      console.log('Sample users:');
      withoutIsLender.slice(0, 10).forEach(u => {
        console.log(`  - ${u.name} (${u.email})`);
        console.log(`    role: ${u.role}`);
      });

      if (withoutIsLender.length > 10) {
        console.log(`  ... and ${withoutIsLender.length - 10} more`);
      }
    }

    // Check for mismatches between role and isLender
    console.log(`\n\n=== CHECKING FOR MISMATCHES ===\n`);
    const mismatches = withIsLender.filter(u => {
      const shouldBeTrue = u.role === 'lender';
      return u.isLender !== shouldBeTrue;
    });

    if (mismatches.length > 0) {
      console.log(`Found ${mismatches.length} users where isLender doesn't match role:`);
      mismatches.forEach(u => {
        console.log(`  - ${u.name}: role="${u.role}", isLender=${u.isLender}`);
      });
    } else {
      console.log('No mismatches found. isLender field matches role field where present.');
    }

  } catch (error) {
    console.error("Check failed:", error);
    process.exit(1);
  }
}

checkIsLender()
  .then(() => {
    console.log("\n\nCheck complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
