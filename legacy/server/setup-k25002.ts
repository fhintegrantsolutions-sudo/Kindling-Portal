import { db } from './firebase';

// K25002 Note Details (from CSV):
// Principal: $1,158,666.00
// Rate: 9.50%
// Term: 60 months
// Contract Date: May 15, 2025
// First Payment Date: June 25, 2025
// Maturity Date: June 25, 2030
// Funding Window: April 15, 2025 - May 9, 2025

const K25002_LENDERS = [
  { name: "Adam Bobbs", firstName: "Adam", lastName: "Bobbs", email: "adam.bobbs@gmail.com", phone: "(337) 412-7151", address: "5534 Lewis St. Unit 102", city: "Arvada", state: "CO", zip: "80002", amount: 5000, paymentAmount: 105.01 },
  { name: "Andrew Tenenbaum", firstName: "Andrew", lastName: "Tenenbaum", email: "andytenenbaum@gmail.com", phone: "(520) 904-5602", address: "6935 Bucks Rd", city: "Cumming", state: "GA", zip: "30040", amount: 25000, paymentAmount: 525.05 },
  { name: "Anthony Janco", firstName: "Anthony", lastName: "Janco", email: "elwood80@hotmail.com", phone: "(412) 979-5395", address: "230 Lookout Ave", city: "Charleroi", state: "PA", zip: "15022", amount: 5000, paymentAmount: 105.01 },
  { name: "Bayaraa Byambajav", firstName: "Bayaraa", lastName: "Byambajav", email: "bagi@ywamtyler.org", phone: "(903) 747-7099", address: "P. O. Box 3000", city: "Garden Valley", state: "TX", zip: "75771", amount: 2500, paymentAmount: 52.50 },
  { name: "Braden Sapp", firstName: "Braden", lastName: "Sapp", email: "mr.bradensapp@gmail.com", phone: "(720) 334-1069", address: "474 Black Feather Loop apt 413", city: "Castle Rock", state: "CO", zip: "80104", amount: 2500, paymentAmount: 52.50 },
  { name: "Brent White", firstName: "Brent", lastName: "White", email: "bwhite@whiteeng.com", phone: "(413) 281-8180", address: "8 Charisma Drive", city: "Pittsfield", state: "MA", zip: "01201-5841", amount: 20000, paymentAmount: 420.04 },
  { name: "Benjamin & Hannah Kadron", firstName: "Benjamin", lastName: "Kadron", email: "bjkadron@gmail.com", phone: "(865) 745-9808", address: "232 Stephens Rd", city: "Oliver Springs", state: "TN", zip: "37840", amount: 90000, paymentAmount: 1890.17, loanAgreementTitle: "Bromsdale LLC" },
  { name: "Caleb Johnson", firstName: "Caleb", lastName: "Johnson", email: "cejohnson05@gmail.com", phone: "(573) 280-6064", address: "3938 Campground Lane", city: "Osage Beach", state: "MO", zip: "65065", amount: 55000, paymentAmount: 1155.10 },
  { name: "Carlos Collazo", firstName: "Carlos", lastName: "Collazo", email: "collazo2@gmail.com", phone: "(631) 237-8661", address: "380 17 st.", city: "Brooklyn", state: "NY", zip: "11215", amount: 2500, paymentAmount: 52.50 },
  { name: "Christopher Chelales", firstName: "Christopher", lastName: "Chelales", email: "chelales@gmail.com", phone: "(703) 989-3167", address: "9046 Kennebec Pass Trail", city: "Colorado Springs", state: "CO", zip: "80924", amount: 10000, paymentAmount: 210.02, loanAgreementTitle: "CDC Living Trust dated 2 April 2019" },
  { name: "Colleen Milstein", firstName: "Colleen", lastName: "Milstein", email: "colleenmilstein@loominternational.org", phone: "(503) 806-3773", address: "14504 NE Fremont Ct", city: "Portland", state: "OR", zip: "97230", amount: 20000, paymentAmount: 420.04 },
  { name: "Daniel Mewha", firstName: "Daniel", lastName: "Mewha", email: "dmewha64@gmail.com", phone: "(860) 235-8723", address: "21 Carter Rd", city: "Groton", state: "CT", zip: "06340", amount: 10000, paymentAmount: 210.02 },
  { name: "Dean Millard", firstName: "Dean", lastName: "Millard", email: "deanmillard@juno.com", phone: "(720) 209-3108", address: "2350 Paonia St.", city: "Loveland", state: "CO", zip: "70538", amount: 5000, paymentAmount: 105.01 },
  { name: "Diane Griffin", firstName: "Diane", lastName: "Griffin", email: "dkeller56@yahoo.com", phone: "(256) 427-1006", address: "117 Parkview dr", city: "Meridianville", state: "AL", zip: "35759", amount: 2500, paymentAmount: 52.50 },
  { name: "Elana Roberts", firstName: "Elana", lastName: "Roberts", email: "4elanaroberts@gmail.com", phone: "(415) 710-1377", address: "9802 Barnett Valley Road", city: "Sebastopol", state: "CA", zip: "95472", amount: 10000, paymentAmount: 210.02 },
  { name: "Erik Westerberg", firstName: "Erik", lastName: "Westerberg", email: "ewesterberg@pcimmg.com", phone: "(832) 675-1255", address: "18722 Gulf Shadow Dr.", city: "Cypress", state: "TX", zip: "77429", amount: 20000, paymentAmount: 420.04 },
  { name: "Felipe Vazquez SDIRA", firstName: "Felipe", lastName: "Vazquez", email: "fandfsdira@yahoo.com", phone: "(850) 428-7440", address: "NRAI Services, INC.", city: "Plantation", state: "FL", zip: "33324", amount: 32000, paymentAmount: 672.06, loanAgreementTitle: "F and F SDIRA LLC" },
  { name: "Felipe Vazquez", firstName: "Felipe", lastName: "Vazquez", email: "shoboshi112@gmail.com", phone: "(850) 428-7440", address: "PSC 2 Box 10333", city: "APO", state: "AE", zip: "09012", amount: 10000, paymentAmount: 210.02 },
  { name: "Gary Sundin", firstName: "Gary", lastName: "Sundin", email: "gary.sundin@comcast.net", phone: "(612) 396-8848", address: "4700 Dunberry Lane", city: "Edina", state: "MN", zip: "55435", amount: 20000, paymentAmount: 420.04 },
  { name: "Haley Davidshofer", firstName: "Haley", lastName: "Davidshofer", email: "hdavidsh@gmail.com", phone: "(913) 669-2596", address: "9122 W 79th St", city: "Overland Park", state: "KS", zip: "66204", amount: 5000, paymentAmount: 105.01 },
  { name: "Jacob Fairbairn", firstName: "Jacob", lastName: "Fairbairn", email: "jacobfairbairn@sbcglobal.net", phone: "(817) 727-0008", address: "5308 McQuade Street", city: "Haltom City", state: "TX", zip: "76117", amount: 15000, paymentAmount: 315.03 },
  { name: "James Kumfer", firstName: "James", lastName: "Kumfer", email: "jdkhoops@gmail.com", phone: "(719) 510-2396", address: "1247 South Golden Lake Rd", city: "Angola", state: "IN", zip: "46703", amount: 20000, paymentAmount: 420.04 },
  { name: "Janette Agatep", firstName: "Janette", lastName: "Agatep", email: "janetteagatep@gmail.com", phone: "(352) 262-3867", address: "177 Skywood Trail", city: "Ponte Vedra", state: "FL", zip: "32081", amount: 5000, paymentAmount: 105.01 },
  { name: "Jessica Saunders", firstName: "Jessica", lastName: "Saunders", email: "jrslegacyproject@gmail.com", phone: "(331) 315-7959", address: "1219 Maple Grove Lane", city: "Rockville", state: "MD", zip: "20850", amount: 5000, paymentAmount: 105.01 },
  { name: "Jonathan Roncancio", firstName: "Jonathan", lastName: "Roncancio", email: "jonathanroncon@gmail.com", phone: "(903) 423-1786", address: "1508 Wood Springs Road", city: "Lindale", state: "TX", zip: "75771", amount: 5000, paymentAmount: 105.01 },
  { name: "Jordan Nipp", firstName: "Jordan", lastName: "Nipp", email: "nipper121212@yahoo.com", phone: "(806) 676-4871", address: "257 Sugartree Cir", city: "Lipan", state: "TX", zip: "76462", amount: 10000, paymentAmount: 210.02 },
  { name: "Kaitlin Wheelan", firstName: "Kaitlin", lastName: "Wheelan", email: "kwheelan@comcast.net", phone: "(719) 323-0919", address: "7975 orchard path rd", city: "Colorado Springs", state: "CO", zip: "80919", amount: 5000, paymentAmount: 105.01 },
  { name: "Karen Davidshofer", firstName: "Karen", lastName: "Davidshofer", email: "kdavidshofer@gmail.com", phone: "(712) 542-9394", address: "1058 200th St", city: "New Market", state: "IA", zip: "51646", amount: 20000, paymentAmount: 420.04 },
  { name: "Kathy Harmsworth", firstName: "Kathy", lastName: "Harmsworth", email: "kjhtownsend@gmail.com", phone: "(360) 301-3937", address: "2302 24th St", city: "Anacortes", state: "WA", zip: "98221", amount: 10000, paymentAmount: 210.02 },
  { name: "Kevin King", firstName: "Kevin", lastName: "King", email: "kbking67@gmail.com", phone: "(615) 585-2639", address: "102 Springfield Dr.", city: "Smyrna", state: "TN", zip: "37167", amount: 20000, paymentAmount: 420.04 },
  { name: "Kyle Wheelan", firstName: "Kyle", lastName: "Wheelan", email: "kyle.wheelan@gmail.com", phone: "(719) 357-6277", address: "7975 ORCHARD PATH RD", city: "COLORADO SPRINGS", state: "CO", zip: "80919", amount: 15000, paymentAmount: 315.03 },
  { name: "Linda Fairbairn", firstName: "Linda", lastName: "Fairbairn", email: "lindagw@sbcglobal.net", phone: "(817) 800-8437", address: "10333 Wild Goose Dr", city: "Fort Worth", state: "TX", zip: "76131", amount: 10000, paymentAmount: 210.02 },
  { name: "Michael Dooley", firstName: "Michael", lastName: "Dooley", email: "mkdooley3@gmail.com", phone: "(937) 725-8211", address: "404 Todds Ridge Road", city: "Wilmington", state: "OH", zip: "45177", amount: 10000, paymentAmount: 210.02 },
  { name: "Mitch Broussard", firstName: "Mitch", lastName: "Broussard", email: "mnbrou@cox.net", phone: "(337) 962-4780", address: "509 Sabbath Rd.", city: "Youngsville", state: "LA", zip: "70592", amount: 10000, paymentAmount: 210.02 },
  { name: "Nicolas Frade", firstName: "Nicolas", lastName: "Frade", email: "nickfrade@gmail.com", phone: "(984) 789-1852", address: "101 Norwalk St", city: "Holly Springs", state: "NC", zip: "27540", amount: 50000, paymentAmount: 1050.09 },
  { name: "Niraj Someshwar", firstName: "Niraj", lastName: "Someshwar", email: "npsomeshwar@yahoo.com", phone: "(860) 335-5529", address: "8040 Tiberon Pkwy", city: "Cumming", state: "GA", zip: "30028", amount: 5000, paymentAmount: 105.01 },
  { name: "Porter Capital Investments", firstName: "Erik", lastName: "Westerberg", email: "ewesterberg@pcimmg.com", phone: "(832) 675-1255", address: "18722 Gulf Shadow Dr.", city: "Cypress", state: "TX", zip: "77429", amount: 80000, paymentAmount: 1680.15, loanAgreementTitle: "Porter Capital Investments MMG" },
  { name: "Raymond Warren", firstName: "Raymond", lastName: "Warren", email: "ray1777@msn.com", phone: "(719) 330-5009", address: "9115 Jasper Falls Pl.", city: "Colorado Springs", state: "CO", zip: "80924", amount: 50000, paymentAmount: 1050.09 },
  { name: "Rick Costa", firstName: "Rick", lastName: "Costa", email: "rjcosta4@gmail.com", phone: "(719) 290-5067", address: "29357 Mitchel Prairie Lane", city: "Wamego", state: "KS", zip: "66547", amount: 2500, paymentAmount: 52.50 },
  { name: "Robin Braun", firstName: "Robin", lastName: "Braun", email: "integratedlifestrategies@gmail.com", phone: "(386) 212-5221", address: "3571 far west blvd 3880", city: "Austin", state: "TX", zip: "78731", amount: 50000, paymentAmount: 1050.09 },
  { name: "Ryan Kee", firstName: "Ryan", lastName: "Kee", email: "ryan.kee@pm.me", phone: "(208) 301-4329", address: "3527 W Excell Ln", city: "Spokane", state: "WA", zip: "99208", amount: 330000, paymentAmount: 6930.61 },
  { name: "Samuel Roncancio", firstName: "Samuel", lastName: "Roncancio", email: "samuel_roncancio@3rdgenven.com", phone: "(972) 408-8270", address: "1508 Wood Springs Rd", city: "Lindale", state: "TX", zip: "75771", amount: 3750, paymentAmount: 78.76 },
  { name: "Shayla Hilton", firstName: "Shayla", lastName: "Hilton", email: "shayla.hilton@gmail.com", phone: "(719) 339-7359", address: "4258 Cahuenga Blvd Apt 202", city: "Toluca Lake", state: "CA", zip: "91602", amount: 5000, paymentAmount: 105.01 },
  { name: "Shelley Milstein", firstName: "Shelley", lastName: "Milstein", email: "milstein6@gmail.com", phone: "(503) 806-3773", address: "14504 NE Fremont Ct", city: "Portland", state: "OR", zip: "97230", amount: 40000, paymentAmount: 840.07 },
  { name: "Stormy Plumb", firstName: "Stormy", lastName: "Plumb", email: "stormyplumb4@gmail.com", phone: "(712) 303-0608", address: "423 W Nodaway St", city: "Clarinda", state: "IA", zip: "51632", amount: 2500, paymentAmount: 52.50 },
  { name: "Susan Wheelan", firstName: "Susan", lastName: "Wheelan", email: "kylew719@comcast.net", phone: "(719) 357-6277", address: "7975 orchard path rd", city: "Colorado Springs", state: "CO", zip: "80919", amount: 7916, paymentAmount: 166.25 },
  { name: "Tanya Toko", firstName: "Tanya", lastName: "Toko", email: "tanyatoko1@gmail.com", phone: "(818) 554-6609", address: "14301 Lorne St", city: "Panorama City", state: "CA", zip: "91402", amount: 10000, paymentAmount: 210.02, loanAgreementTitle: "Tanya Toko EQRP 401K" },
  { name: "Wen Duhon", firstName: "Wen", lastName: "Duhon", email: "caowenf@gmail.com", phone: "(201) 402-8221", address: "2121 Palmer Park Blvd", city: "Colorado Springs", state: "CO", zip: "80909", amount: 10000, paymentAmount: 210.02 },
];

function calculateAmortization(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

async function setupK25002() {
  console.log('Setting up K25002 note, users, participations, and payments...\n');
  
  const K25002_RATE = 9.5;
  const K25002_TERM = 60;
  const K25002_PRINCIPAL = 1158666;
  const CONTRACT_DATE = new Date(2025, 4, 15); // May 15, 2025
  const FIRST_PAYMENT_DATE = new Date(2025, 5, 25); // June 25, 2025
  const MATURITY_DATE = new Date(2030, 5, 25); // June 25, 2030
  const FUNDING_START = new Date(2025, 3, 15); // April 15, 2025
  const FUNDING_END = new Date(2025, 4, 9); // May 9, 2025
  
  // 1. Create K25002 note
  console.log('Creating K25002 note...');
  const noteRef = await db.collection('notes').add({
    noteId: 'K25002',
    title: 'K25002',
    borrower: 'Crossroads Business Consulting',
    principal: K25002_PRINCIPAL.toFixed(2),
    rate: K25002_RATE.toString(),
    termMonths: K25002_TERM,
    termYears: 5,
    projectType: 'Bridge Loan',
    interestType: 'Amortized',
    status: 'Active',
    clientStatus: 'Active',
    loanPaymentStatus: 'Current',
    contractDate: CONTRACT_DATE.toISOString(),
    paymentStartDate: FIRST_PAYMENT_DATE.toISOString(),
    firstPaymentDate: 'June 25th',
    maturityDate: MATURITY_DATE.toISOString(),
    fundingStartDate: FUNDING_START.toISOString(),
    fundingEndDate: FUNDING_END.toISOString(),
    fundingWindowEnd: 'May 9th',
    type: '',
    description: '',
    createdAt: new Date().toISOString()
  });
  console.log(`✓ Created K25002 note with ID: ${noteRef.id}`);
  
  const noteDocId = noteRef.id;
  let totalCreated = 0;
  let totalPayments = 0;
  
  // 2. Create users and participations
  for (const lender of K25002_LENDERS) {
    // Check if user already exists by email
    const existingUsers = await db.collection('users').where('email', '==', lender.email.toLowerCase()).get();
    
    let userId: string;
    
    if (!existingUsers.empty) {
      userId = existingUsers.docs[0].id;
      console.log(`  Found existing user: ${lender.name} (${userId})`);
    } else {
      // Create new user
      const userRef = await db.collection('users').add({
        name: `${lender.firstName} ${lender.lastName}`,
        email: lender.email.toLowerCase(),
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zipCode: lender.zip,
        role: 'lender',
        entityType: 'Personal',
        loanAgreementTitle: lender.loanAgreementTitle || `${lender.firstName} ${lender.lastName}`,
        createdAt: new Date().toISOString()
      });
      userId = userRef.id;
      console.log(`  Created user: ${lender.name} (${userId})`);
    }
    
    // Check if participation already exists
    const existingParticipation = await db.collection('participations')
      .where('userId', '==', userId)
      .where('noteId', '==', noteDocId)
      .get();
    
    if (!existingParticipation.empty) {
      console.log(`  Participation already exists for ${lender.name}, skipping...`);
      continue;
    }
    
    // Create participation
    const participationRef = await db.collection('participations').add({
      userId: userId,
      noteId: noteDocId,
      investedAmount: lender.amount.toFixed(2),
      amount: lender.amount,
      paymentAmount: lender.paymentAmount.toFixed(2),
      status: 'Active',
      fundingStatus: {
        received: true,
        deposited: true,
        cleared: true,
        fundingType: 'check',
        receivedDate: CONTRACT_DATE.toISOString().split('T')[0],
        depositedDate: CONTRACT_DATE.toISOString().split('T')[0],
        clearedDate: CONTRACT_DATE.toISOString().split('T')[0],
        investmentAmount: lender.amount.toFixed(2),
        paymentAmount: lender.paymentAmount.toFixed(2)
      },
      createdAt: new Date().toISOString()
    });
    
    totalCreated++;
    
    // 3. Create payment history (June 2025 - Jan 2026 = 8 payments)
    const monthlyPayment = lender.paymentAmount;
    const monthlyRate = K25002_RATE / 100 / 12;
    let balance = lender.amount;
    let paymentDate = new Date(FIRST_PAYMENT_DATE);
    const currentDate = new Date(2026, 1, 6); // Feb 6, 2026
    
    let paymentNumber = 1;
    while (paymentDate <= currentDate && paymentNumber <= K25002_TERM) {
      const interestAmount = balance * monthlyRate;
      const principalAmount = monthlyPayment - interestAmount;
      
      await db.collection('payments').add({
        participationId: participationRef.id,
        paymentDate: paymentDate.toISOString(),
        principalAmount: principalAmount.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        totalAmount: monthlyPayment.toFixed(2),
        status: 'Completed',
        paymentNumber: paymentNumber,
        createdAt: new Date().toISOString()
      });
      
      balance -= principalAmount;
      totalPayments++;
      paymentNumber++;
      paymentDate.setMonth(paymentDate.getMonth() + 1);
    }
    
    console.log(`  ✓ Created participation + ${paymentNumber - 1} payments for ${lender.name} ($${lender.amount.toLocaleString()})`);
  }
  
  console.log(`\n========================================`);
  console.log(`K25002 Setup Complete!`);
  console.log(`  - Note created: K25002`);
  console.log(`  - Participations created: ${totalCreated}`);
  console.log(`  - Total payments created: ${totalPayments}`);
  console.log(`========================================`);
}

setupK25002()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
