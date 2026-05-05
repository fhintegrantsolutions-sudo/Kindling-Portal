import { db } from "./firebase";

interface LenderUpdate {
  firstName: string;
  lastName: string;
  entityType: string;
  businessName: string;
  loanTitle: string;
  amount: number;
}

const lenderUpdates: LenderUpdate[] = [
  { firstName: "Arash", lastName: "Motedaeiny", entityType: "Personal", businessName: "", loanTitle: "arash motedaeiny", amount: 5000 },
  { firstName: "Craig", lastName: "Griffis", entityType: "Personal", businessName: "", loanTitle: "Craig E Griffis", amount: 20000 },
  { firstName: "Jessica", lastName: "Saunders", entityType: "Business", businessName: "Creativity on Tap, LLC", loanTitle: "Creativity on Tap, LLC", amount: 5000 },
  { firstName: "Dena", lastName: "Gould", entityType: "Personal", businessName: "", loanTitle: "Dena Gould", amount: 10000 },
  { firstName: "Felipe", lastName: "Specialized Trust Company Custodian FBO Felipe Vazquez ROTH IRA", entityType: "Trust", businessName: "F and F SDIRA LLC", loanTitle: "F and F SDIRA LLC", amount: 40000 },
  { firstName: "Felipe", lastName: "Vazquez", entityType: "Personal", businessName: "", loanTitle: "Felipe Vazquez", amount: 10000 },
  { firstName: "Haley", lastName: "Davidshofer", entityType: "Personal", businessName: "", loanTitle: "Haley Davidshofer", amount: 5000 },
  { firstName: "Jacob", lastName: "Fairbairn", entityType: "Personal", businessName: "", loanTitle: "Jacob Fairbairn", amount: 10000 },
  { firstName: "Jeffrey", lastName: "Diestler", entityType: "Personal", businessName: "", loanTitle: "Jeffrey Diestler", amount: 40000 },
  { firstName: "Joshua", lastName: "Harmsworth", entityType: "Personal", businessName: "", loanTitle: "Josh Harmsworth", amount: 135000 },
  { firstName: "Karen", lastName: "Davidshofer", entityType: "Personal", businessName: "", loanTitle: "Karen Davidshofer", amount: 20000 },
  { firstName: "Kathy", lastName: "Harmsworth", entityType: "Personal", businessName: "", loanTitle: "Kathy J Harmsworth", amount: 65000 },
  { firstName: "Kristoffer", lastName: "Mola", entityType: "Personal", businessName: "", loanTitle: "Kristoffer A. Mola", amount: 5000 },
  { firstName: "Larry", lastName: "Goswick", entityType: "Personal", businessName: "", loanTitle: "Larry Goswick", amount: 100000 },
  { firstName: "Leanne", lastName: "Wolfinger", entityType: "Personal", businessName: "", loanTitle: "Leanne Wolfinger", amount: 10000 },
  { firstName: "Linda", lastName: "Fairbairn", entityType: "Personal", businessName: "", loanTitle: "Linda Fairbairn", amount: 10000 },
  { firstName: "Michele", lastName: "Cook", entityType: "Personal", businessName: "", loanTitle: "Michele Cook", amount: 5000 },
  { firstName: "Boyd", lastName: "Morris", entityType: "Business", businessName: "Morris Management Group Inc", loanTitle: "MMG Inc", amount: 10000 },
  { firstName: "Christina", lastName: "Merrill", entityType: "Trust", businessName: "Niagara Falls Family Trust", loanTitle: "Niagara Falls Family Trust", amount: 5000 },
  { firstName: "Niraj", lastName: "Someshwar", entityType: "Personal", businessName: "", loanTitle: "Niraj Someshwar", amount: 5000 },
  { firstName: "Paul", lastName: "Fugere", entityType: "Personal", businessName: "", loanTitle: "Paul Fugere", amount: 25000 },
  { firstName: "Keniti", lastName: "Pinkett", entityType: "Business", businessName: "Schollages, LLC", loanTitle: "Schollages, LLC", amount: 5000 },
  { firstName: "Steve", lastName: "Harmon", entityType: "Personal", businessName: "", loanTitle: "Steven Harmon", amount: 5000 },
  { firstName: "Tanya", lastName: "Toko", entityType: "Other", businessName: "Tanya Toko EQRP 401K", loanTitle: "Entity", amount: 5000 },
  { firstName: "Tim", lastName: "Franklin", entityType: "Personal", businessName: "", loanTitle: "Timothy Darnell Franklin", amount: 15000 },
  { firstName: "Travis", lastName: "Fairbairn", entityType: "Personal", businessName: "", loanTitle: "Travis Fairbairn", amount: 20000 },
  { firstName: "Wei Jie", lastName: "Chin", entityType: "Personal", businessName: "", loanTitle: "Wei Jie Chin", amount: 5000 },
];

async function updateK25001Lenders() {
  console.log("Updating K25001 lender amounts...\n");

  // Find K25001 note
  const notesSnapshot = await db.collection("notes").where("noteId", "==", "K25001").get();
  if (notesSnapshot.empty) {
    console.error("Note K25001 not found!");
    return;
  }
  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  console.log(`Found K25001 note with ID: ${noteId}\n`);

  let totalUpdated = 0;
  let totalAmount = 0;

  for (const lender of lenderUpdates) {
    const fullName = `${lender.firstName} ${lender.lastName}`;
    console.log(`Processing: ${fullName}`);

    // Find user by name
    const usersSnapshot = await db.collection("users").where("name", "==", fullName).get();
    
    if (usersSnapshot.empty) {
      console.log(`  ⚠ User not found: ${fullName}`);
      continue;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Update user profile with entity info
    const userUpdates: any = {};
    if (lender.entityType) {
      userUpdates.entityType = lender.entityType;
    }
    if (lender.businessName) {
      userUpdates.businessName = lender.businessName;
    }
    if (lender.loanTitle) {
      userUpdates.loanAgreementTitle = lender.loanTitle;
    }

    if (Object.keys(userUpdates).length > 0) {
      await db.collection("users").doc(userId).update(userUpdates);
      console.log(`  ✓ Updated user profile: entityType=${lender.entityType}, businessName=${lender.businessName || "(none)"}`);
    }

    // Find and update participation
    const participationsSnapshot = await db.collection("participations")
      .where("userId", "==", userId)
      .where("noteId", "==", noteId)
      .get();

    if (participationsSnapshot.empty) {
      console.log(`  ⚠ No K25001 participation found for ${fullName}`);
      continue;
    }

    // Update participation
    const participationDoc = participationsSnapshot.docs[0];
    await db.collection("participations").doc(participationDoc.id).update({
      investedAmount: lender.amount.toFixed(2),
      amount: lender.amount,
      "fundingStatus.investmentAmount": lender.amount.toFixed(2),
    });
    console.log(`  ✓ Updated participation: $${lender.amount.toLocaleString()}`);

    totalUpdated++;
    totalAmount += lender.amount;
    console.log("");
  }

  console.log("========================================");
  console.log(`Total lenders updated: ${totalUpdated}`);
  console.log(`Total investment amount: $${totalAmount.toLocaleString()}`);
  console.log("========================================");
}

updateK25001Lenders()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
