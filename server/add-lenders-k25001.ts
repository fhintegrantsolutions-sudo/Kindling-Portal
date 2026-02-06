import { db } from "./firebase";

interface Lender {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const lenders: Lender[] = [
  { firstName: "Arash", lastName: "Motedaeiny", phone: "(408) 499-0468", email: "arashmotedaeiny@gmail.com", address: "46529 River Meadows Terrace", city: "Sterling", state: "VA", zipCode: "20165" },
  { firstName: "Craig", lastName: "Griffis", phone: "(928) 593-9470", email: "cegrif84@gmail.com", address: "205 Panorama Blvd", city: "Sedona", state: "AZ", zipCode: "86336" },
  { firstName: "Jessica", lastName: "Saunders", phone: "(331) 315-7959", email: "CreativityonTap2023@gmail.com", address: "210 w 17th Street", city: "Lombard", state: "IL", zipCode: "60148" },
  { firstName: "Dena", lastName: "Gould", phone: "(720) 353-7344", email: "denasmilez@msn.com", address: "9539 Dolton Way", city: "Littleton", state: "CO", zipCode: "80126" },
  { firstName: "Felipe", lastName: "Specialized Trust Company Custodian FBO Felipe Vazquez ROTH IRA", phone: "(850) 428-7440", email: "fandfsdira@yahoo.com", address: "1200 South Pine Island Road", city: "Plantation", state: "FL", zipCode: "32324" },
  { firstName: "Felipe", lastName: "Vazquez", phone: "(850) 428-7440", email: "shoboshi112@gmail.com", address: "PSC 2 Box 10333", city: "APO", state: "AE", zipCode: "9012" },
  { firstName: "Haley", lastName: "Davidshofer", phone: "(913) 669-2596", email: "hdavidsh@gmail.com", address: "9122 W 79th St", city: "Overland Park", state: "KS", zipCode: "66204" },
  { firstName: "Jacob", lastName: "Fairbairn", phone: "(817) 727-0008", email: "jacobfairbairn@sbcglobal.net", address: "5308 McQuade St", city: "Haltom City", state: "TX", zipCode: "76117" },
  { firstName: "Jeffrey", lastName: "Diestler", phone: "(832) 378-5525", email: "jeff.diestler@gmail.com", address: "37111 Edgewater Dr", city: "Pinehurst", state: "TX", zipCode: "77362" },
  { firstName: "Joshua", lastName: "Harmsworth", phone: "(360) 774-1181", email: "joshharmsworth@gmail.com", address: "75-5851 Kuakini Hwy #497", city: "Kailua Kona", state: "HI", zipCode: "96740" },
  { firstName: "Karen", lastName: "Davidshofer", phone: "(712) 542-9394", email: "kdavidshofer@gmail.com", address: "1058 200th St", city: "New Market", state: "IA", zipCode: "51646" },
  { firstName: "Kathy", lastName: "Harmsworth", phone: "(360) 301-3937", email: "kjhtownsend@gmail.com", address: "2302 24th St", city: "Anacortes", state: "WA", zipCode: "98221" },
  { firstName: "Kristoffer", lastName: "Mola", phone: "(719) 351-3313", email: "kmola05@gmail.com", address: "9343 Wolf Pack Terrace", city: "Colorado Springs", state: "CO", zipCode: "80920" },
  { firstName: "Larry", lastName: "Goswick", phone: "(903) 930-8987", email: "goswickla@gmail.com", address: "220 Private Road 1230", city: "Waskom", state: "TX", zipCode: "75692" },
  { firstName: "Leanne", lastName: "Wolfinger", phone: "(918) 949-1024", email: "leewolf63@yahoo.com", address: "4420 W Madison St", city: "Broken Arrow", state: "OK", zipCode: "74012" },
  { firstName: "Linda", lastName: "Fairbairn", phone: "(817) 800-8437", email: "lindagw@sbcglobal.net", address: "10333 Wild Goose Dr", city: "Fort Worth", state: "TX", zipCode: "76131" },
  { firstName: "Michele", lastName: "Cook", phone: "(614) 570-4963", email: "michele@bodyacheescape.com", address: "153 Prince rd. SW", city: "Pataskala", state: "OH", zipCode: "43062" },
  { firstName: "Boyd", lastName: "Morris", phone: "(719) 290-6700", email: "boydwmorris@me.com", address: "5370 Jarman St", city: "Colorado Springs", state: "CO", zipCode: "80906" },
  { firstName: "Christina", lastName: "Merrill", phone: "(402) 981-3392", email: "antoinette0367@gmail.com", address: "2317 Georgetown Place", city: "Bellevue", state: "NE", zipCode: "68123" },
  { firstName: "Niraj", lastName: "Someshwar", phone: "(860) 335-5529", email: "npsomeshwar@yahoo.com", address: "8040 Tiberon Pkwy", city: "Cumming", state: "GA", zipCode: "30028" },
  { firstName: "Paul", lastName: "Fugere", phone: "(978) 604-5649", email: "paul.fugere@me.com", address: "7108 Rolling Forest Ave", city: "West Springfield", state: "VA", zipCode: "22152" },
  { firstName: "Keniti", lastName: "Pinkett", phone: "(240) 997-6829", email: "kpinkett@verizon.net", address: "8005 Maxfield Ct", city: "Clinton", state: "MD", zipCode: "20735" },
  { firstName: "Steve", lastName: "Harmon", phone: "(480) 241-9515", email: "steven.ronald.harmon@gmail.com", address: "512 N 420 W", city: "Mapleton", state: "UT", zipCode: "84664" },
  { firstName: "Tanya", lastName: "Toko", phone: "(818) 554-6609", email: "tanyatoko1@gmail.com", address: "14301 Lorne Street", city: "Van Nuys", state: "CA", zipCode: "91402" },
  { firstName: "Tim", lastName: "Franklin", phone: "(619) 788-8053", email: "tim.franklin001@gmail.com", address: "1380 E Washington Ave #33W", city: "El Cajon", state: "CA", zipCode: "92019" },
  { firstName: "Travis", lastName: "Fairbairn", phone: "(817) 726-5694", email: "travf@me.com", address: "512 Wilder Ln", city: "Fort Worth", state: "TX", zipCode: "76131" },
  { firstName: "Wei Jie", lastName: "Chin", phone: "(424) 279-2826", email: "wjcrental@gmail.com", address: "29818 Cherry Vine Road", city: "Katy", state: "TX", zipCode: "77494" },
];

async function addLendersK25001() {
  console.log("Adding lenders for K25001...\n");

  // Find K25001 note
  const notesSnapshot = await db.collection("notes").where("noteId", "==", "K25001").get();
  if (notesSnapshot.empty) {
    console.error("Note K25001 not found!");
    return;
  }
  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  const noteData = noteDoc.data();
  console.log(`Found K25001 note with ID: ${noteId}`);
  
  // Handle contract date - could be Timestamp or string
  let contractDateStr: string;
  if (noteData.contractDate && typeof noteData.contractDate.toDate === 'function') {
    contractDateStr = noteData.contractDate.toDate().toISOString();
  } else if (typeof noteData.contractDate === 'string') {
    contractDateStr = noteData.contractDate;
  } else {
    contractDateStr = new Date().toISOString();
  }
  console.log(`Contract Date: ${contractDateStr}\n`);

  let created = 0;
  let updated = 0;
  let participationsCreated = 0;

  for (const lender of lenders) {
    const fullName = `${lender.firstName} ${lender.lastName}`;
    console.log(`Processing: ${fullName}`);

    // Check if user exists by email
    const existingUserSnapshot = await db.collection("users").where("email", "==", lender.email).get();
    
    let userId: string;
    
    if (existingUserSnapshot.empty) {
      // Create new user
      const newUserRef = await db.collection("users").add({
        name: fullName,
        email: lender.email,
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zipCode: lender.zipCode,
        role: "lender",
        createdAt: new Date().toISOString(),
      });
      userId = newUserRef.id;
      console.log(`  ✓ Created user: ${userId}`);
      created++;
    } else {
      // Update existing user
      userId = existingUserSnapshot.docs[0].id;
      await db.collection("users").doc(userId).update({
        phone: lender.phone,
        address: lender.address,
        city: lender.city,
        state: lender.state,
        zipCode: lender.zipCode,
      });
      console.log(`  ✓ Updated user: ${userId}`);
      updated++;
    }

    // Check if participation exists
    const participationSnapshot = await db.collection("participations")
      .where("userId", "==", userId)
      .where("noteId", "==", noteId)
      .get();

    if (participationSnapshot.empty) {
      // Create participation with placeholder amount (to be updated later)
      const purchaseDate = contractDateStr.split('T')[0];
      await db.collection("participations").add({
        userId,
        noteId,
        investedAmount: "0.00", // Placeholder - update with actual amounts
        purchaseDate: contractDateStr,
        status: "Active",
        fundingStatus: {
          received: true,
          deposited: true,
          cleared: true,
          fundingType: "check",
          investmentAmount: "0.00",
          receivedDate: purchaseDate,
          depositedDate: purchaseDate,
          clearedDate: purchaseDate,
        },
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✓ Created K25001 participation`);
      participationsCreated++;
    } else {
      console.log(`  ○ K25001 participation already exists`);
    }
    console.log("");
  }

  console.log("========================================");
  console.log(`Users created: ${created}`);
  console.log(`Users updated: ${updated}`);
  console.log(`Participations created: ${participationsCreated}`);
  console.log("========================================");
  console.log("\nNOTE: Investment amounts are set to $0.00 as placeholders.");
  console.log("Please provide investment amounts to update them.");
}

addLendersK25001()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
