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
  { firstName: "John", lastName: "Lin", entityType: "Business", businessName: "Cornerstone Sandfootprints LLC", loanTitle: "Cornerstone Sandfootprints LLC", amount: 5000 },
  { firstName: "David", lastName: "Befort", entityType: "Personal", businessName: "", loanTitle: "David Befort", amount: 200000 },
  { firstName: "Gerson", lastName: "Cruz", entityType: "Personal", businessName: "", loanTitle: "Gerson Cruz", amount: 5000 },
  { firstName: "Haley", lastName: "Davidshofer", entityType: "Personal", businessName: "", loanTitle: "Haley Davidshofer", amount: 10000 },
  { firstName: "Travis", lastName: "Fairbairn", entityType: "Business", businessName: "Highline Land Holdings", loanTitle: "Highline Land Holdings", amount: 20000 },
  { firstName: "Jeffrey", lastName: "Diestler", entityType: "Personal", businessName: "", loanTitle: "Jeffrey Diestler", amount: 40000 },
  { firstName: "Karen", lastName: "Davidshofer", entityType: "Personal", businessName: "", loanTitle: "Karen Davidshofer", amount: 20000 },
  { firstName: "Edson", lastName: "Cruz", entityType: "Trust", businessName: "Katracho Spendthrift Trust", loanTitle: "Katracho Spendthrift Trust", amount: 5000 },
  { firstName: "Leanne", lastName: "Wolfinger", entityType: "Personal", businessName: "", loanTitle: "Leanne Wolfinger", amount: 10000 },
  { firstName: "Matthew", lastName: "Warner", entityType: "Personal", businessName: "", loanTitle: "Matthew Warner", amount: 6000 },
  { firstName: "Christina", lastName: "Merrill", entityType: "Trust", businessName: "Niagara Falls Family Trust", loanTitle: "Niagara Falls Family Trust", amount: 5000 },
  { firstName: "Richard", lastName: "Henderson", entityType: "Personal", businessName: "", loanTitle: "Richard Henderson", amount: 5000 },
  { firstName: "Shaleen", lastName: "Patel", entityType: "Personal", businessName: "", loanTitle: "", amount: 5000 },
  { firstName: "Trista", lastName: "Yerkich", entityType: "Personal", businessName: "", loanTitle: "Trista Yerkich", amount: 20000 },
];

async function updateK24002Lenders() {
  console.log("Starting K24002 lender updates...\n");

  // Find K24002 note
  const notesSnapshot = await db.collection("notes").where("noteId", "==", "K24002").get();
  if (notesSnapshot.empty) {
    console.error("Note K24002 not found!");
    return;
  }
  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  console.log(`Found K24002 note with ID: ${noteId}\n`);

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
      // Create participation if it doesn't exist
      await db.collection("participations").add({
        userId,
        noteId,
        amount: lender.amount,
        status: "active",
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✓ Created participation: $${lender.amount.toLocaleString()}`);
    } else {
      // Update existing participation
      const participationDoc = participationsSnapshot.docs[0];
      await db.collection("participations").doc(participationDoc.id).update({
        amount: lender.amount,
      });
      console.log(`  ✓ Updated participation: $${lender.amount.toLocaleString()}`);
    }

    totalUpdated++;
    totalAmount += lender.amount;
    console.log("");
  }

  console.log("========================================");
  console.log(`Total lenders updated: ${totalUpdated}`);
  console.log(`Total investment amount: $${totalAmount.toLocaleString()}`);
  console.log("========================================");
}

updateK24002Lenders()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
