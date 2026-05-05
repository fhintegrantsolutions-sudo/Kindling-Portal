// Script to import K25003 lenders into Firestore
// Usage: npx tsx server/import-k25003-lenders.ts

import { db } from './firebase';

const lenders = [
  { firstName: 'Patrick', lastName: 'Moehrle', phone: '(301) 219-6449', email: 'moehrle.patrick@gmail.com', address: '8401 Maryland Drive STE A', city: 'Richmond', state: 'VA', zip: '23294', investedAmount: 2500 },
  { firstName: 'Alison', lastName: 'Betsinger', phone: '(808) 321-2876', email: 'alibetsinger@gmail.com', address: 'alibetsinger@gmail.com', city: 'Heber City', state: 'UT', zip: '84032', investedAmount: 10000 },
  { firstName: 'Amber', lastName: 'Purvis', phone: '(817) 980-8810', email: 'amber.cloud527@gmail.com', address: '14927 Clovercrest Dr SE', city: 'Huntsville', state: 'AL', zip: '35803', investedAmount: 25000 },
  { firstName: 'Andrew', lastName: 'Tenenbaum', phone: '(520) 904-5602', email: 'Andytenenbaum@gmail.com', address: '6935 Bucks Rd', city: 'Cumming', state: 'GA', zip: '30040', investedAmount: 25000 },
  { firstName: 'Bayaraa', lastName: 'Byambajav', phone: '(903) 747-7099', email: 'bagi@ywamtyler.org', address: '15361 McMillan Dr', city: 'Lindale', state: 'Texas', zip: '75771', investedAmount: 17151 },
  { firstName: 'Brent', lastName: 'Rosecrans', phone: '(970) 581-7140', email: 'brentrosecrans@gmail.com', address: '8005 Louden Circle Court', city: 'Windsor', state: 'CO', zip: '80528', investedAmount: 10000 },
  { firstName: 'Brian', lastName: 'Vanderlugt', phone: '(616) 293-8172', email: 'vlugt18@gmail.com', address: '4504 Serry Dr', city: 'Caledonia', state: 'MI', zip: '49316', investedAmount: 2500 },
  { firstName: 'Craig', lastName: 'Griffis', phone: '(928) 593-9470', email: 'cegrif84@gmail.com', address: '205 Panorama Blvd', city: 'Sedona', state: 'AZ', zip: '86336', investedAmount: 20000 },
  { firstName: 'David', lastName: 'Befort', phone: '(612) 479-4998', email: 'Dave@maxperformancefinancial.com', address: '4614 Sunset Lane', city: 'Minnetrista', state: 'MN', zip: '55331', investedAmount: 10000 },
  { firstName: 'Dena', lastName: 'Gould', phone: '(720) 353-7344', email: 'Denasmilez@msn.com', address: '9539 Dolton Way', city: 'Highlands Ranch', state: 'CO', zip: '80126', investedAmount: 5000 },
  { firstName: 'Elana', lastName: 'Roberts', phone: '(415) 710-1377', email: '4elanaroberts@gmail.com', address: '9802 Barnett Valley Road', city: 'Sebastopol', state: 'CA', zip: '95472', investedAmount: 10000 },
  { firstName: 'Ethan Stone', lastName: 'Lee', phone: '(909) 815-4540', email: 'ethanstonee.lee@gmail.com', address: 'P.O. 2645', city: 'Running Springs', state: 'CA', zip: '92382', investedAmount: 2500 },
  { firstName: 'Specialized Trust Company Custodian', lastName: 'FBO Felipe Vazquez ROTH IRA', phone: '(850) 428-7440', email: 'Fandfsdira@yahoo.com', address: '1200 south Pine Island Road', city: 'Plantation', state: 'FL', zip: '33324', investedAmount: 4000 },
  { firstName: 'Felipe', lastName: 'Vazquez', phone: '(850) 428-7440', email: 'fandfsnowball@yahoo.com', address: '1200 south pine island road', city: 'plantation', state: 'fl', zip: '33324', investedAmount: 5000 },
  { firstName: 'Faron', lastName: 'McCleary', phone: '(763) 228-9956', email: 'fjmccleary@gmail.com', address: '705 6th St NE', city: 'Perham', state: 'Mn', zip: '56573', investedAmount: 5000 },
  { firstName: 'Haley', lastName: 'Davidshofer', phone: '(913) 669-2596', email: 'Hdavidsh@gmail.com', address: '9122 W 79th St', city: 'Overland Park', state: 'KS', zip: '66204', investedAmount: 10750 },
  { firstName: 'Jack', lastName: 'Jahnke', phone: '(612) 419-8363', email: 'jackjahnke28@gmail.com', address: '3775 Turtle Road', city: 'Minnetrista', state: 'MN', zip: '55375', investedAmount: 5000 },
  { firstName: 'Jake', lastName: 'Cadwell', phone: '(262) 269-0657', email: 'jkcadwellfarm@gmail.com', address: 'S52W24336 Glendale Rd', city: 'Waukesha', state: 'WI', zip: '53189', investedAmount: 10000 },
  { firstName: 'Jeff', lastName: 'Stephens', phone: '(415) 246-3208', email: 'Stephens.e.jeff@gmail.com', address: '9819 Harrier Way', city: 'Elk Grove', state: 'CA', zip: '95757', investedAmount: 2500 },
  { firstName: 'Jessica', lastName: 'Saunders', phone: '(331) 315-7959', email: 'jrslegacyproject@gmail.com', address: '1219 Maple Grove Lane', city: 'Rockville', state: 'MD', zip: '20850', investedAmount: 10700 },
  { firstName: 'John', lastName: 'Fuccillo', phone: '(978) 495-1687', email: 'johnfuccillo@yahoo.com', address: '27283 Vantage Ave', city: 'Eagle River', state: 'AK', zip: '99577', investedAmount: 2500 },
  { firstName: 'JoLea', lastName: 'Conn', phone: '(832) 549-3499', email: 'Joleaconn@gmail.com', address: '211 Haven Brook Ln', city: 'Richmond', state: 'TX', zip: '77406', investedAmount: 10000 },
  { firstName: 'Karen', lastName: 'Davidshofer', phone: '(712) 542-9394', email: 'kdavidshofer@gmail.com', address: '1058 200th St', city: 'New Market', state: 'Ia', zip: '51646', investedAmount: 10000 },
  { firstName: 'Kathryn', lastName: 'Taylor', phone: '(307) 413-1916', email: 'kattaylor86@yahoo.com', address: '37 Sunshine Dr', city: 'Big Piney', state: 'Wyoming', zip: '83113', investedAmount: 10000 },
  { firstName: 'Kathy', lastName: 'Harmsworth', phone: '(360) 301-3937', email: 'Kjhtownsend@gmail.com', address: '2302 24th St', city: 'Anacortes', state: 'WA', zip: '98221', investedAmount: 5000 },
  { firstName: 'Kelly', lastName: 'Wheelan', phone: '(719) 357-6277', email: 'derek730261@gmail.com', address: '735 Polaris Drive', city: 'colorado Springs', state: 'co', zip: '80906', investedAmount: 11000 },
  { firstName: 'Kyle', lastName: 'Wiegand', phone: '(843) 530-4123', email: 'Kyle.wiegand@gmail.com', address: '743 E 41st street', city: 'Savannah', state: 'Georgia', zip: '31401', investedAmount: 2500 },
  { firstName: 'Linda', lastName: 'Fairbairn', phone: '(817) 800-8437', email: 'lindagw@sbcglobal.net', address: '10333 Wild Goose Dr', city: 'Fort Worth', state: 'TX', zip: '76131', investedAmount: 10000 },
  { firstName: 'Luke', lastName: 'Halstead', phone: '(763) 688-1668', email: 'Lhalstead2000@gmail.com', address: '7050 Magda Drive Apt 301', city: 'Maple Grove', state: 'MN', zip: '55369', investedAmount: 3000 },
  { firstName: 'Matthew', lastName: 'Bonanno', phone: '(717) 215-7742', email: 'mbonanno@hrg-inc.com', address: '3325 Jonagold Drive', city: 'Harrisburg', state: 'PA', zip: '17110', investedAmount: 10000 },
  { firstName: 'Matthew', lastName: 'Johnson', phone: '(574) 370-3889', email: 'matthew.johnson.p@gmail.com', address: '3407 La Coste Ln', city: 'Columbus', state: 'OH', zip: '43228', investedAmount: 25000 },
  { firstName: 'Michael', lastName: 'Dennis', phone: '(501) 258-2644', email: 'Mjdennis03@yahoo.com', address: '5100 Candlewick Lane', city: 'North Little Rock', state: 'Arkansas', zip: '72116', investedAmount: 12500 },
  { firstName: 'Paul', lastName: 'Fugere', phone: '(978) 604-5649', email: 'paul.fugere@me.com', address: '1007 Huntington Place', city: 'Maryville', state: 'TN', zip: '37803', investedAmount: 25000 },
  { firstName: 'Peter', lastName: 'Teachout', phone: '(952) 451-5064', email: 'mountainstreams51@gmail.com', address: '4544 Country Glen Circle', city: 'Grovetown', state: 'GA', zip: '30813', investedAmount: 7500 },
  { firstName: 'Rebecca', lastName: 'Tandy', phone: '(859) 230-3310', email: 'btandyclan@gmail.com', address: '4033 Weber Way', city: 'Lexington', state: 'KY', zip: '40514', investedAmount: 25000 },
  { firstName: 'Richard', lastName: 'Henderson', phone: '(806) 778-5057', email: 'Rahmd@yahoo.com', address: '5705 77th', city: 'Lubbock', state: 'Tx', zip: '79424', investedAmount: 5000 },
  { firstName: 'Rick', lastName: 'Costa', phone: '(719) 290-5067', email: 'rjcosta4@gmail.com', address: '16251 Cala Rojo', city: 'Colorado Springs', state: 'CO', zip: '80926', investedAmount: 2500 },
  { firstName: 'RYAN', lastName: 'KEE', phone: '(208) 301-4329', email: 'ryan.kee@pm.me', address: '3527 W Excell Ln', city: 'Spokane', state: 'WA', zip: '99208', investedAmount: 101500 },
  { firstName: 'Scott', lastName: 'Bode', phone: '(817) 925-2494', email: 'Scooterb7070@gmail.com', address: '174 East Street', city: 'Potosi', state: 'Wi', zip: '53820', investedAmount: 22500 },
  { firstName: 'Shirley', lastName: 'Greufe', phone: '(515) 450-2227', email: 'mark.greufe@gmail.com', address: '6724 mirror Lake Ave', city: 'Tampa', state: 'Florida', zip: '33634', investedAmount: 2500 },
  { firstName: 'Stephen', lastName: 'Schmidt', phone: '(913) 680-7837', email: 'scbaschmidt@gmail.com', address: '600 Doe Haven Road', city: 'Ekron', state: 'KY', zip: '40117', investedAmount: 3000 },
  { firstName: 'Stormy', lastName: 'Plumb', phone: '(712) 303-0608', email: 'Stormyplumb4@gmail.com', address: '423 w Nodaway st', city: 'Clarinda', state: 'Ia', zip: '51632', investedAmount: 2500 },
  { firstName: 'Jesse', lastName: 'Jahn', phone: '(757) 848-6414', email: 'jessesjahn@icloud.com', address: '2222 stock creek rd', city: 'Knoxville', state: 'TN', zip: '37920', investedAmount: 50000 },
  { firstName: 'Tadd', lastName: 'Morris', phone: '(559) 630-1175', email: 'Taddmorris1964@icloud.com', address: 'P.O. Box 303', city: 'Coalinga', state: 'Ca', zip: '93210', investedAmount: 30000 },
  { firstName: 'Thomas', lastName: 'Lay', phone: '(623) 330-9910', email: 'Tdlay12@yahoo.com', address: '24619 n 144th dr', city: 'Surprise', state: 'AZ', zip: '85387', investedAmount: 10000 },
  { firstName: 'Travis', lastName: 'Fairbairn', phone: '(817) 726-5694', email: 'travf@me.com', address: '512 Wilder Ln', city: 'Fort Worth', state: 'TX', zip: '76131', investedAmount: 5000 },
  { firstName: 'Tyler', lastName: 'Smith', phone: '(908) 894-3626', email: 'smitty1118@gmail.com', address: '76 Dew Drop Rd', city: 'York', state: 'PA', zip: '17403', investedAmount: 10000 },
  { firstName: 'Zachary', lastName: 'Kuntz', phone: '(785) 656-1493', email: 'zakuntz514@gmail.com', address: '1220 Dogwood Circle', city: 'Leesville', state: 'LA', zip: '71446', investedAmount: 15000 },
];

// Firestore document ID for K25003 note
const NOTE_ID = 'MRJTeqrQaFo7ULxrfhvn';

async function importLenders() {
  for (const lender of lenders) {
    // Normalize email to lowercase for case-insensitive matching
    const normalizedEmail = lender.email.toLowerCase();

    // Check for existing user by email (case-insensitive)
    const existingUserSnap = await db.collection('users').where('email', '==', normalizedEmail).get();
    let userId: string;
    if (!existingUserSnap.empty) {
      userId = existingUserSnap.docs[0].id;
      // Optionally update user info if needed
      await db.collection('users').doc(userId).update({
        name: lender.firstName + ' ' + lender.lastName,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zip: lender.zip,
        updatedAt: new Date(),
        isLender: true,
      });
    } else {
      const userRef = await db.collection('users').add({
        name: lender.firstName + ' ' + lender.lastName,
        email: normalizedEmail,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zip: lender.zip,
        createdAt: new Date(),
        updatedAt: new Date(),
        isLender: true,
      });
      userId = userRef.id;
    }
    // Check for existing participation for this user and note
    const existingPartSnap = await db.collection('participations')
      .where('userId', '==', userId)
      .where('noteId', '==', NOTE_ID)
      .get();
    if (existingPartSnap.empty) {
      await db.collection('participations').add({
        userId,
        noteId: NOTE_ID,
        investedAmount: lender.investedAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Imported ${lender.firstName} ${lender.lastName} ($${lender.investedAmount})`);
    } else {
      console.log(`Skipped participation for ${lender.firstName} ${lender.lastName} (already exists)`);
    }
  }
  console.log('All lenders imported for K25003.');
}

importLenders().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
