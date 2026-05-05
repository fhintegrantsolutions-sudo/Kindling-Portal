// Script to import K25004 lenders into Firestore
// Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npx tsx server/import-k25004-lenders.ts

import { db } from './firebase';

const lenders = [
  { firstName: 'Patrick', lastName: 'Moehrle', phone: '(301) 219-6449', email: 'moehrle.patrick@gmail.com', address: '8401 Maryland Drive STE A', city: 'Richmond', state: 'VA', zip: '23294', investedAmount: 2500, entityType: 'Business', entityName: 'A Vandelay Co LLC' },
  { firstName: 'Alison', lastName: 'Betsinger', phone: '(808) 321-2876', email: 'alibetsinger@gmail.com', address: '1061 E Tucker Ln', city: 'Heber City', state: 'UT', zip: '84032', investedAmount: 10000, entityType: 'Personal', entityName: 'Alison Betsinger' },
  { firstName: 'Anna', lastName: 'Paduani Valencia', phone: '(561) 932-8701', email: 'GJVAV7@GMAIL.COM', address: '11321 67th Place North', city: 'West Palm Beach', state: 'Florida', zip: '33412', investedAmount: 5000, entityType: 'Personal', entityName: 'Anna Paduani Valencia' },
  { firstName: 'Austin', lastName: 'Philo', phone: '(480) 689-6586', email: 'austinphilo@gmail.com', address: '2822 23rd St W', city: 'Williston', state: 'ND', zip: '58801', investedAmount: 24000, entityType: 'Personal', entityName: 'Austin Philo' },
  { firstName: 'Gary', lastName: 'Sundin', phone: '(612) 396-8848', email: 'gary.sundin@comcast.net', address: '4700 Dunberry Lane', city: 'Edina', state: 'MN', zip: '55435', investedAmount: 29000, entityType: 'Trust', entityName: 'Big Sunny Trust' },
  { firstName: 'Brent', lastName: 'Rosecrans', phone: '(970) 833-1325', email: 'brentrosecrans@gmail.com', address: '215 6th St #53', city: 'Windsor', state: 'CO', zip: '80550', investedAmount: 10000, entityType: 'Personal', entityName: 'Brent Rosecrans' },
  { firstName: 'Chet', lastName: 'Hahn', phone: '(402) 650-2416', email: 'chet.hahn@gmail.com', address: '10234 Statfield Drive', city: 'Collierville', state: 'TN', zip: '38017', investedAmount: 11000, entityType: 'Personal', entityName: 'Chet P. Hahn' },
  { firstName: 'Daniel', lastName: 'Mewha', phone: '(860) 235-8723', email: 'dmewha64@gmail.com', address: '21 Carter Rd', city: 'Groton', state: 'CT', zip: '6340', investedAmount: 7000, entityType: 'Personal', entityName: 'Daniel Mewha' },
  { firstName: 'Dean', lastName: 'Millard', phone: '(720) 209-3108', email: 'deanmillard@juno.com', address: '2350 Paonia St.', city: 'Loveland', state: 'CO', zip: '80538', investedAmount: 5000, entityType: 'Personal', entityName: 'Dean A. Millard' },
  { firstName: 'Diane', lastName: 'Griffin', phone: '(256) 427-1006', email: 'dkeller56@yahoo.com', address: '117 Parkview dr', city: 'Meridianville', state: 'AL', zip: '35759', investedAmount: 2500, entityType: 'Personal', entityName: 'Diane Griffin' },
  { firstName: 'Erik', lastName: 'Westerberg', phone: '(832) 675-1255', email: 'ewesterberg01@gmail.com', address: '18722 Gulf Shadow Dr', city: 'Cypress', state: 'Texas', zip: '77429', investedAmount: 5000, entityType: 'Personal', entityName: 'Erik P. Westerberg' },
  { firstName: 'Evarson', lastName: 'Azevedo', phone: '(952) 393-5081', email: 'evarsonazevedo@hotmail.com', address: '10110 Sycamore st NW', city: 'Coon Rapids', state: 'Minnesota', zip: '55433', investedAmount: 5025, entityType: 'Personal', entityName: 'Evarson Azevedo' },
  { firstName: 'Gary', lastName: 'Sundin', phone: '(612) 396-8848', email: 'gary.sundin@comcast.net', address: '4700 Dunberry Lane', city: 'Edina', state: 'MN', zip: '55435', investedAmount: 6000, entityType: 'Personal', entityName: 'Gary R. Sundin' },
  { firstName: 'Erik', lastName: 'Westerberg', phone: '(832) 675-1255', email: 'ewesterberg@pcimmg.com', address: '18722 Gulf Shadow Dr.', city: 'Cypress', state: 'Texas', zip: '77429', investedAmount: 12500, entityType: 'Business', entityName: 'GCSA Group LLC' },
  { firstName: 'Austin', lastName: 'Johnson', phone: '(715) 409-9727', email: 'austin@generationalgrowthco.com', address: '3510 E Hampton Ave Unit 120', city: 'Mesa', state: 'AZ', zip: '85204', investedAmount: 2500, entityType: 'Business', entityName: 'Generational Growth Strategies' },
  { firstName: 'Haley', lastName: 'Davidshofer', phone: '(913) 669-2596', email: 'hdavidsh@gmail.com', address: '9122 W 79th St', city: 'Overland Park', state: 'KS', zip: '66204', investedAmount: 5000, entityType: 'Personal', entityName: 'Haley Davidshofer' },
  { firstName: 'Jacob', lastName: 'Fairbairn', phone: '(817) 727-0008', email: 'jacobfairbairn@sbcglobal.net', address: '5308 McQuade Street', city: 'Haltom City', state: 'Texas', zip: '76117', investedAmount: 7500, entityType: 'Personal', entityName: 'Jacob Fairbairn' },
  { firstName: 'Jean', lastName: 'Goetze', phone: '(941) 313-6099', email: 'jeangoetze@mac.com', address: '5400 Trails Bend Court', city: 'Sarasota', state: 'FL', zip: '34238', investedAmount: 50000, entityType: 'Personal', entityName: 'Jean E. Goetze' },
  { firstName: 'Jeffrey', lastName: 'Farquhar', phone: '(612) 598-2158', email: 'jfarq@protonmail.com', address: '60197 E. Paddock Ct.', city: 'Tucson', state: 'AZ', zip: '85739', investedAmount: 2500, entityType: 'Personal', entityName: 'Jeffrey Farquhar' },
  { firstName: 'Jeremiah', lastName: 'Dennis', phone: '(501) 786-1292', email: 'jeremiahd@redeemeraz.org', address: '1304 S 105th Place, Apt 2016', city: 'Mesa', state: 'AZ', zip: '85209', investedAmount: 5000, entityType: 'Personal', entityName: 'Jeremiah Morgan Dennis' },
  { firstName: 'John', lastName: 'Fuccillo', phone: '(978) 495-1687', email: 'johnfuccillo@yahoo.com', address: '27283 Vantage Ave', city: 'Eagle River', state: 'AK', zip: '99577', investedAmount: 2500, entityType: 'Personal', entityName: 'John Fuccillo' },
  { firstName: 'Jonathon', lastName: 'Nkosi', phone: '(719) 722-4260', email: 'jonathon@cloudbyday.com', address: '2431 Clarkson Drive', city: 'Colorado Springs', state: 'CO', zip: '80909', investedAmount: 2500, entityType: 'Personal', entityName: 'Jonathon Nkosi' },
  { firstName: 'Karen', lastName: 'Davidshofer', phone: '(712) 542-9394', email: 'kdavidshofer@gmail.com', address: '1058 200th St', city: 'New Market', state: 'Ia', zip: '51646', investedAmount: 20000, entityType: 'Personal', entityName: 'Karen Anne Davidshofer' },
  { firstName: 'Kathy', lastName: 'Harmsworth', phone: '(360) 301-3937', email: 'kjhtownsend@gmail.com', address: '2302 24th St', city: 'Anacortes', state: 'WA', zip: '98221', investedAmount: 5000, entityType: 'Personal', entityName: 'Kathy Harmsworth' },
  { firstName: 'Kevin', lastName: 'Boyd', phone: '(903) 434-6080', email: 'Kboyd1183@gmail.com', address: '555 Co Rd 3105', city: 'Clarksville', state: 'Texas', zip: '75426', investedAmount: 2500, entityType: 'Personal', entityName: 'Kevin Boyd' },
  { firstName: 'Matt', lastName: 'Bonanno', phone: '(717) 215-7742', email: 'Maverixk@hotmail.com', address: '3325 Jonagold Drive', city: 'Harrisburg', state: 'PA', zip: '17110', investedAmount: 10000, entityType: 'Personal', entityName: 'Matthew Samuel Bonanno' },
  { firstName: 'Christina', lastName: 'Conover-Merrill', phone: '(402) 981-3392', email: 'christina@mccmrei.com', address: '2317 Georgetown Place', city: 'Bellevue', state: 'Nebraska', zip: '68123', investedAmount: 2500, entityType: 'Business', entityName: 'MCCM REI, LLC' },
  { firstName: 'Riley', lastName: 'Davis', phone: '(770) 402-7739', email: 'onemorrisoncastle@gmail.com', address: '712 Spears Ave', city: 'Chattanooga', state: 'TN', zip: '37405', investedAmount: 2500, entityType: 'Business', entityName: 'Morrison Castle, LLC' },
  { firstName: 'Kurtis', lastName: 'Solberg', phone: '(360) 929-6626', email: 'kurtis.solberg@yahoo.com', address: 'PO Box 2015', city: 'Mt. Vernon', state: 'WA', zip: '98273', investedAmount: 25000, entityType: 'Business', entityName: 'MVS Marine LLC' },
  { firstName: 'Marvin', lastName: 'Ramirez', phone: '(616) 330-9136', email: 'cmo.mtn@gmail.com', address: '1232 28th St SW', city: 'Wyoming', state: 'MI', zip: '49509', investedAmount: 5000, entityType: 'Business', entityName: 'One World Holdings' },
  { firstName: 'Pamelyn Suzanne', lastName: 'Gregory', phone: '(304) 268-4670', email: 'suzanne@kingphysicaltherapy.com', address: '113 Morgan Street', city: 'Winchester', state: 'VA', zip: '22601', investedAmount: 10000, entityType: 'Personal', entityName: 'Pamelyn Suzanne Gregory' },
  { firstName: 'Paula', lastName: 'Sollenberger', phone: '(719) 641-2855', email: 'Psollen@comcast.net', address: '795 Grey Eagle Circle N', city: 'CSprings', state: 'CO', zip: '80919', investedAmount: 10000, entityType: 'Personal', entityName: 'Paula J Sollenberger' },
  { firstName: 'Peter', lastName: 'Teachout', phone: '(952) 451-5064', email: 'buildingadifference@gmail.com', address: '4544 Country Glen Circle', city: 'Grovetown', state: 'GA', zip: '30813', investedAmount: 3200, entityType: 'Personal', entityName: 'Peter Teachout' },
  { firstName: 'Rick', lastName: 'Costa', phone: '(719) 290-5067', email: 'Rjcosta4@gmail.com', address: '16251 Cala Rojo Dr', city: 'Colorado Springs', state: 'Colorado', zip: '80926', investedAmount: 2500, entityType: 'Personal', entityName: 'Rick Costa' },
  { firstName: 'Riley', lastName: 'Davis', phone: '(770) 402-7739', email: 'rileyr8080@gmail.com', address: '712 Spears Ave', city: 'Chattanooga', state: 'TN', zip: '37405', investedAmount: 10000, entityType: 'Personal', entityName: 'Riley Davis' },
  { firstName: 'Ryan', lastName: 'Kee', phone: '(208) 301-4329', email: 'ryan.kee@pm.me', address: '3527 W Excell Ln', city: 'Spokane', state: 'WA', zip: '99208', investedAmount: 168500, entityType: 'Personal', entityName: 'RYAN SNEDDEN KEE' },
  { firstName: 'Stephen', lastName: 'Kramer', phone: '(608) 304-0179', email: 'stephenkramer1@icloud.com', address: '11 Tumbleweed CT', city: 'Elizabethtown', state: 'KY', zip: '42701', investedAmount: 5000, entityType: 'Personal', entityName: 'Stephen Kramer' },
  { firstName: 'Stephen', lastName: 'Pellerin', phone: '(617) 694-7078', email: 'stephen_pellerin@comcast.net', address: '26 Webster Ave', city: 'Pelham', state: 'NH', zip: '3076', investedAmount: 10000, entityType: 'Personal', entityName: 'Stephen Pellerin' },
  { firstName: 'Stephen', lastName: 'Grantier', phone: '(316) 213-1942', email: 'stephen.grantier@alumni.usc.edu', address: '10334 S Ashley Meadows Cir', city: 'Sandy', state: 'UT', zip: '84092', investedAmount: 30000, entityType: 'Personal', entityName: 'Stephen Ray Grantier' },
  { firstName: 'Stephen', lastName: 'Schmidt', phone: '(913) 680-7837', email: 'scbaschmidt@gmail.com', address: '600 Doe Haven Road', city: 'Ekron', state: 'KY', zip: '40117', investedAmount: 2500, entityType: 'Personal', entityName: 'Stephen Thomas Schmidt' },
  { firstName: 'Steven', lastName: 'Benton', phone: '(636) 345-3596', email: 'sbenton83@gmail.com', address: '3510 East Hampton Ave Unit 120', city: 'Mesa', state: 'AZ', zip: '85204', investedAmount: 2500, entityType: 'Personal', entityName: 'Steven Benton' },
  { firstName: 'Susan', lastName: 'Wheelan', phone: '(719) 368-1638', email: 'susan.wheelan@gmail.com', address: '7975 Orchard Path Rd', city: 'Colorado Springs', state: 'CO', zip: '80919', investedAmount: 8433.10, entityType: 'Personal', entityName: 'Susan Wheelan' },
  { firstName: 'Denver', lastName: 'Collins', phone: '(580) 301-1417', email: 'denvercollins@pm.me', address: '5740 N Carefree Circle Suite 120-194', city: 'Colorado Springs', state: 'CO', zip: '80917', investedAmount: 6000, entityType: 'Business', entityName: 'Twelve Percent LLC' },
];

async function importLenders() {
  console.log('Finding K25004 note...\n');

  // Find K25004 note
  const notesSnapshot = await db.collection('notes').where('noteId', '==', 'K25004').get();
  if (notesSnapshot.empty) {
    console.error('Note K25004 not found!');
    process.exit(1);
  }

  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  console.log(`Found K25004 note with Firestore ID: ${noteId}\n`);
  console.log('Starting import...\n');

  let newUsers = 0;
  let updatedUsers = 0;
  let newParticipations = 0;
  let skippedParticipations = 0;

  for (const lender of lenders) {
    // Normalize email to lowercase for case-insensitive matching
    const normalizedEmail = lender.email.toLowerCase();

    // Check for existing user by email (case-insensitive)
    const existingUserSnap = await db.collection('users').where('email', '==', normalizedEmail).get();
    let userId: string;

    if (!existingUserSnap.empty) {
      userId = existingUserSnap.docs[0].id;
      // Update user info
      await db.collection('users').doc(userId).update({
        name: `${lender.firstName} ${lender.lastName}`,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zipCode: lender.zip,
        updatedAt: new Date().toISOString(),
        isLender: true,
      });
      updatedUsers++;
    } else {
      const userRef = await db.collection('users').add({
        name: `${lender.firstName} ${lender.lastName}`,
        email: normalizedEmail,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zipCode: lender.zip,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLender: true,
      });
      userId = userRef.id;
      newUsers++;
    }

    // Check for existing participation for this user and note
    // For users with multiple participations, we check by invested amount to avoid duplicates
    const existingPartSnap = await db.collection('participations')
      .where('userId', '==', userId)
      .where('noteId', '==', noteId)
      .get();

    // Check if this specific amount already exists
    const amountExists = existingPartSnap.docs.some(doc => {
      const data = doc.data();
      return parseFloat(data.investedAmount) === lender.investedAmount;
    });

    if (!amountExists) {
      await db.collection('participations').add({
        userId,
        noteId: noteId,
        investedAmount: lender.investedAmount.toString(),
        entityType: lender.entityType,
        entityName: lender.entityName,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`✓ ${lender.firstName} ${lender.lastName} - $${lender.investedAmount.toLocaleString()} (${lender.entityType}: ${lender.entityName})`);
      newParticipations++;
    } else {
      console.log(`⊘ Skipped ${lender.firstName} ${lender.lastName} - $${lender.investedAmount.toLocaleString()} (already exists)`);
      skippedParticipations++;
    }
  }

  console.log('\n========================================');
  console.log('Import Summary:');
  console.log(`New users created: ${newUsers}`);
  console.log(`Existing users updated: ${updatedUsers}`);
  console.log(`New participations created: ${newParticipations}`);
  console.log(`Participations skipped (already exist): ${skippedParticipations}`);
  console.log(`Total investment amount: $${lenders.reduce((sum, l) => sum + l.investedAmount, 0).toLocaleString()}`);
  console.log('========================================');
}

importLenders()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
