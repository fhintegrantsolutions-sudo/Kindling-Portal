import { db } from './firebase';

async function checkHaley() {
  // Look for user by email
  const byEmail = await db.collection('users').where('email', '==', 'hdavidsh@gmail.com').get();
  console.log('By email hdavidsh@gmail.com:', byEmail.size, 'users');
  if (byEmail.size > 0) {
    const user = byEmail.docs[0].data();
    console.log('  username:', user.username);
    console.log('  id:', byEmail.docs[0].id);
  }
  
  // Look for user by username hdavidsh
  const byUsername = await db.collection('users').where('username', '==', 'hdavidsh').get();
  console.log('By username hdavidsh:', byUsername.size, 'users');
}

checkHaley().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
