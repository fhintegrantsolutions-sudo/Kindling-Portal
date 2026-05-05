/**
 * Import K24001 Lenders Script
 * Creates users and participations for all K24001 lenders from the CSV file
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  './kindling-portal-firebase-adminsdk-fbsvc-72b51e1944.json';

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// K24001 Lenders data from CSV
const K24001_LENDERS = [
  { lenderName: "Alejandra Perez", firstName: "Alejandra", lastName: "Perez", email: "alecita.rivera@gmail.com", amount: "20000.00" },
  { lenderName: "Cornerstone Legacy Wealth LLC", firstName: "John", lastName: "Lin", email: "cornerstonelegacywealth@gmail.com", amount: "5000.00" },
  { lenderName: "Jeffrey Diestler", firstName: "Jeffrey", lastName: "Diestler", email: "jeff.diestler@gmail.com", amount: "20000.00" },
  { lenderName: "Katracho Spendthrift Trust", firstName: "Edson", lastName: "Cruz", email: "cruzinvestors@gmail.com", amount: "5000.00" },
  { lenderName: "Leanne Wolfinger", firstName: "Leanne", lastName: "Wolfinger", email: "leewolf63@yahoo.com", amount: "5000.00" },
  { lenderName: "Matthew Warner", firstName: "Matthew", lastName: "Warner", email: "mattrwarner@yahoo.com", amount: "15000.00" },
  { lenderName: "Shaleen Patel", firstName: "Shaleen", lastName: "Patel", email: "shaleen.patel89@gmail.com", amount: "5000.00" },
  { lenderName: "Travis Fairbairn", firstName: "Travis", lastName: "Fairbairn", email: "travf@me.com", amount: "20000.00" },
  { lenderName: "Trista Yerkich", firstName: "Trista", lastName: "Yerkich", email: "tristajyerkich@gmail.com", amount: "10000.00" },
];

// Note K24001 details
const K24001_NOTE_ID = "j27xg8lKLqceJTm1WwXt"; // Firestore document ID for K24001
const K24001_CONTRACT_DATE = "2024-08-15";

async function importK24001Lenders() {
  console.log("Starting K24001 lenders import...\n");

  // Verify the note exists
  const noteDoc = await db.collection('notes').doc(K24001_NOTE_ID).get();
  if (!noteDoc.exists) {
    console.error(`Note ${K24001_NOTE_ID} not found!`);
    return;
  }
  console.log(`Found note: ${noteDoc.data()?.noteId} - ${noteDoc.data()?.title}\n`);

  let usersCreated = 0;
  let usersExisting = 0;
  let participationsCreated = 0;
  let participationsExisting = 0;

  for (const lender of K24001_LENDERS) {
    console.log(`Processing: ${lender.lenderName} (${lender.email})...`);

    // Check if user already exists by email
    const existingUsers = await db.collection('users')
      .where('email', '==', lender.email.toLowerCase())
      .get();

    let userId: string;

    if (!existingUsers.empty) {
      userId = existingUsers.docs[0].id;
      console.log(`  User exists: ${userId}`);
      usersExisting++;
    } else {
      // Create new user
      const username = lender.email.split('@')[0];
      const newUserRef = db.collection('users').doc();
      await newUserRef.set({
        username,
        password: 'temp123456', // Temporary password
        name: lender.lenderName,
        email: lender.email.toLowerCase(),
        role: 'lender',
        createdAt: new Date().toISOString(),
      });
      userId = newUserRef.id;
      console.log(`  Created user: ${userId}`);
      usersCreated++;
    }

    // Check if participation already exists
    const existingParticipations = await db.collection('participations')
      .where('userId', '==', userId)
      .where('noteId', '==', K24001_NOTE_ID)
      .get();

    if (!existingParticipations.empty) {
      console.log(`  Participation exists for this user/note`);
      participationsExisting++;
    } else {
      // Create participation
      const newParticipationRef = db.collection('participations').doc();
      await newParticipationRef.set({
        userId,
        noteId: K24001_NOTE_ID,
        investedAmount: lender.amount,
        status: 'Active',
        fundingStatus: {
          received: true,
          deposited: true,
          cleared: true,
          fundingType: 'check',
          investmentAmount: lender.amount,
          receivedDate: K24001_CONTRACT_DATE,
          depositedDate: K24001_CONTRACT_DATE,
          clearedDate: K24001_CONTRACT_DATE,
        },
        createdAt: new Date().toISOString(),
      });
      console.log(`  Created participation: ${newParticipationRef.id}`);
      participationsCreated++;
    }
  }

  console.log("\n========== Import Summary ==========");
  console.log(`Users created: ${usersCreated}`);
  console.log(`Users already existed: ${usersExisting}`);
  console.log(`Participations created: ${participationsCreated}`);
  console.log(`Participations already existed: ${participationsExisting}`);
  console.log("=====================================\n");
}

importK24001Lenders()
  .then(() => {
    console.log("Import complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
