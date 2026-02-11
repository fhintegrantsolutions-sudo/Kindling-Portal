/**
 * Add Lenders to K24002 Script
 * - Creates new users if they don't exist
 * - Updates existing users' profiles
 * - Creates participations in K24002
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

interface LenderData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  investedAmount: string;
}

// Lenders for K24002 - need to specify invested amounts
const lenders: LenderData[] = [
  {
    firstName: "John",
    lastName: "Lin",
    phone: "(510) 402-6426",
    email: "cornerstonesandfootprintsllc@gmail.com",
    address: "1467 C st",
    city: "Hayward",
    state: "CA",
    zipCode: "94541",
    investedAmount: "10000.00" // Placeholder - update as needed
  },
  {
    firstName: "David",
    lastName: "Befort",
    phone: "(612) 479-4998",
    email: "dave@maxperformancefinancial.com",
    address: "4737 County Rd 101, Unit 140",
    city: "Minnetonka",
    state: "MN",
    zipCode: "55345",
    investedAmount: "10000.00"
  },
  {
    firstName: "Gerson",
    lastName: "Cruz",
    phone: "(952) 465-7359",
    email: "gersonrcl@gmail.com",
    address: "3158 Forrest Plum Ct",
    city: "Zephyrhills",
    state: "FL",
    zipCode: "33540",
    investedAmount: "10000.00"
  },
  {
    firstName: "Haley",
    lastName: "Davidshofer",
    phone: "(913) 669-2596",
    email: "hdavidsh@gmail.com",
    address: "9122 W 79th St",
    city: "Overland Park",
    state: "KS",
    zipCode: "66204",
    investedAmount: "10000.00"
  },
  {
    firstName: "Travis",
    lastName: "Fairbairn",
    phone: "(817) 726-5694",
    email: "travf@me.com",
    address: "512 Wilder Ln",
    city: "Fort Worth",
    state: "TX",
    zipCode: "76131",
    investedAmount: "10000.00"
  },
  {
    firstName: "Jeffrey",
    lastName: "Diestler",
    phone: "(832) 378-5525",
    email: "jeff.diestler@gmail.com",
    address: "37111 Edgewater Dr",
    city: "Pinehurst",
    state: "TX",
    zipCode: "77362",
    investedAmount: "10000.00"
  },
  {
    firstName: "Karen",
    lastName: "Davidshofer",
    phone: "(712) 542-9394",
    email: "kdavidshofer@gmail.com",
    address: "1058 200th St",
    city: "New Market",
    state: "IA",
    zipCode: "51646",
    investedAmount: "10000.00"
  },
  {
    firstName: "Edson",
    lastName: "Cruz",
    phone: "(952) 688-7397",
    email: "cruzinvestors@gmail.com",
    address: "34265 Verbena St",
    city: "Wesley Chapel",
    state: "FL",
    zipCode: "33545",
    investedAmount: "10000.00"
  },
  {
    firstName: "Leanne",
    lastName: "Wolfinger",
    phone: "(918) 949-1024",
    email: "leewolf63@yahoo.com",
    address: "4430 W Madison St",
    city: "Broken Arrow",
    state: "OK",
    zipCode: "74012",
    investedAmount: "10000.00"
  },
  {
    firstName: "Matthew",
    lastName: "Warner",
    phone: "(202) 549-2680",
    email: "mattrwarner@yahoo.com",
    address: "2137 La Cache Dr",
    city: "Lake Charles",
    state: "LA",
    zipCode: "70601",
    investedAmount: "10000.00"
  },
  {
    firstName: "Christina",
    lastName: "Merrill",
    phone: "(402) 981-3392",
    email: "christina@mccmrei.com",
    address: "505 Cornhusker Road, Suite 105, Box 357",
    city: "Bellevue",
    state: "NE",
    zipCode: "68005",
    investedAmount: "10000.00"
  },
  {
    firstName: "Richard",
    lastName: "Henderson",
    phone: "(806) 778-5057",
    email: "rahmd@yahoo.com",
    address: "5705 77th",
    city: "Lubbock",
    state: "TX",
    zipCode: "79424",
    investedAmount: "10000.00"
  },
  {
    firstName: "Shaleen",
    lastName: "Patel",
    phone: "(609) 332-2121",
    email: "shaleen.patel89@gmail.com",
    address: "22062 Chelsy Paige Sq",
    city: "Ashburn",
    state: "VA",
    zipCode: "20148",
    investedAmount: "10000.00"
  },
  {
    firstName: "Trista",
    lastName: "Yerkich",
    phone: "(936) 443-8664",
    email: "tristajyerkich@gmail.com",
    address: "974 Mikaela Dr.",
    city: "Allen",
    state: "TX",
    zipCode: "75074",
    investedAmount: "10000.00"
  }
];

async function addLendersToK24002() {
  console.log("Adding lenders to K24002...\n");

  // Find K24002 note
  const notesSnapshot = await db.collection('notes')
    .where('noteId', '==', 'K24002')
    .get();

  if (notesSnapshot.empty) {
    console.error("❌ Note K24002 not found!");
    return;
  }

  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  console.log(`Found K24002 with ID: ${noteId}\n`);

  for (const lender of lenders) {
    const fullName = `${lender.firstName} ${lender.lastName}`;
    const emailLower = lender.email.toLowerCase();

    // Find user by email (case-insensitive)
    let userSnapshot = await db.collection('users')
      .where('email', '==', emailLower)
      .get();

    // Try with original case if not found
    if (userSnapshot.empty) {
      userSnapshot = await db.collection('users')
        .where('email', '==', lender.email)
        .get();
    }

    let userId: string;

    if (userSnapshot.empty) {
      // Create new user
      const newUserRef = db.collection('users').doc();
      await newUserRef.set({
        name: fullName,
        email: emailLower,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state.toUpperCase(),
        zipCode: lender.zipCode,
        role: 'lender',
        createdAt: new Date().toISOString(),
      });
      userId = newUserRef.id;
      console.log(`✓ Created user: ${fullName} (${lender.email})`);
    } else {
      // Update existing user
      const userDoc = userSnapshot.docs[0];
      userId = userDoc.id;
      await userDoc.ref.update({
        name: fullName,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state.toUpperCase(),
        zipCode: lender.zipCode,
      });
      console.log(`✓ Updated user: ${fullName} (${lender.email})`);
    }

    // Check if participation already exists
    const existingParticipation = await db.collection('participations')
      .where('userId', '==', userId)
      .where('noteId', '==', noteId)
      .get();

    if (!existingParticipation.empty) {
      console.log(`  → Already has participation in K24002`);
      continue;
    }

    // Create participation
    const participationRef = db.collection('participations').doc();
    await participationRef.set({
      userId: userId,
      noteId: noteId,
      investedAmount: lender.investedAmount,
      status: 'Active',
      fundingStatus: {
        received: true,
        deposited: true,
        cleared: true,
        fundingType: 'check',
        investmentAmount: lender.investedAmount,
        receivedDate: '2024-11-29',
        depositedDate: '2024-11-29',
        clearedDate: '2024-11-29',
      },
      createdAt: new Date().toISOString(),
    });
    console.log(`  → Created participation in K24002: $${lender.investedAmount}`);
  }

  console.log("\n========== Done ==========");
}

addLendersToK24002()
  .then(() => {
    console.log("All lenders processed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
