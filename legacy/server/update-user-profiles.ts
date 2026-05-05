/**
 * Update User Profiles Script
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  './kindling-portal-firebase-adminsdk-fbsvc-72b51e1944.json';

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

interface UserProfile {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const userProfiles: UserProfile[] = [
  {
    firstName: "Alejandra",
    lastName: "Perez",
    phone: "(956) 236-6432",
    email: "alecita.rivera@gmail.com",
    address: "3002 O'Henry Dr",
    city: "Laredo",
    state: "TX",
    zipCode: "78041"
  },
  {
    firstName: "John",
    lastName: "Lin",
    phone: "(510) 402-6426",
    email: "cornerstonelegacywealth@gmail.com",
    address: "1467 C St",
    city: "Hayward",
    state: "CA",
    zipCode: "94541"
  },
  {
    firstName: "Jeffrey",
    lastName: "Diestler",
    phone: "(832) 378-5525",
    email: "jeff.diestler@gmail.com",
    address: "37111 Edgewater Dr",
    city: "Pinehurst",
    state: "TX",
    zipCode: "77362"
  },
  {
    firstName: "Edson",
    lastName: "Cruz",
    phone: "(952) 688-7397",
    email: "cruzinvestors@gmail.com",
    address: "34265 Verbena St",
    city: "Wesley Chapel",
    state: "FL",
    zipCode: "33545"
  },
  {
    firstName: "Leanne",
    lastName: "Wolfinger",
    phone: "(918) 949-1024",
    email: "leewolf63@yahoo.com",
    address: "920 S Juniper Pl",
    city: "Broken Arrow",
    state: "OK",
    zipCode: "74012"
  },
  {
    firstName: "Matthew",
    lastName: "Warner",
    phone: "(202) 549-2680",
    email: "mattrwarner@yahoo.com",
    address: "2137 La Cache Drive",
    city: "Lake Charles",
    state: "LA",
    zipCode: "70601"
  },
  {
    firstName: "Shaleen",
    lastName: "Patel",
    phone: "(609) 332-2121",
    email: "shaleen.patel89@gmail.com",
    address: "22062 Chelsy Paige Sq",
    city: "Ashburn",
    state: "VA",
    zipCode: "20148"
  },
  {
    firstName: "Travis",
    lastName: "Fairbairn",
    phone: "(817) 726-5694",
    email: "travf@me.com",
    address: "512 Wilder Ln",
    city: "Fort Worth",
    state: "TX",
    zipCode: "76131"
  },
  {
    firstName: "Trista",
    lastName: "Yerkich",
    phone: "(936) 443-8664",
    email: "tristajyerkich@gmail.com",
    address: "974 Mikaela Dr",
    city: "Allen",
    state: "TX",
    zipCode: "75013"
  }
];

async function updateUserProfiles() {
  console.log("Updating user profiles...\n");

  for (const profile of userProfiles) {
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', profile.email)
      .get();

    if (snapshot.empty) {
      console.log(`❌ User not found: ${profile.email}`);
      continue;
    }

    const userDoc = snapshot.docs[0];
    const fullName = `${profile.firstName} ${profile.lastName}`;

    await userDoc.ref.update({
      name: fullName,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode
    });

    console.log(`✓ Updated: ${fullName} (${profile.email})`);
  }

  console.log("\n========== Done ==========");
}

updateUserProfiles()
  .then(() => {
    console.log("User profiles updated!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
