/**
 * Script to check user_roles collection
 */
import { db } from "./firebase";

async function checkUserRoles() {
  try {
    // Check if user_roles collection exists
    const userRolesSnapshot = await db.collection('user_roles').get();
    console.log('user_roles collection has', userRolesSnapshot.size, 'documents\n');

    if (userRolesSnapshot.size > 0) {
      console.log('Documents in user_roles:');
      userRolesSnapshot.forEach(doc => {
        console.log('\n--- Document ID:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }

    // Also check users collection to see role field
    const usersSnapshot = await db.collection('users').get();
    console.log('\n\n=== All users and their roles ===');
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nUser: ${data.name || data.username}`);
      console.log(`  Role: ${data.role}`);
      console.log(`  ID: ${doc.id}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkUserRoles();
