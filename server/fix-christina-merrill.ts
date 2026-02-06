import { db } from "./firebase";

async function updateChristina() {
  const userId = "kD02f0gm5Y5TVy5o8mxF"; // Christina Merrill with antoinette0367@gmail.com

  // Update user profile
  await db.collection("users").doc(userId).update({
    entityType: "Trust",
    businessName: "Niagara Falls Family Trust",
    loanAgreementTitle: "Niagara Falls Family Trust",
  });
  console.log("✓ Updated user profile for Christina Merrill (antoinette0367@gmail.com)");

  // Find K25001 note
  const notesSnapshot = await db.collection("notes").where("noteId", "==", "K25001").get();
  const noteId = notesSnapshot.docs[0].id;

  // Find and update participation
  const participations = await db
    .collection("participations")
    .where("userId", "==", userId)
    .where("noteId", "==", noteId)
    .get();

  if (participations.empty) {
    console.log("⚠ No K25001 participation found");
  } else {
    const participationDoc = participations.docs[0];
    await db.collection("participations").doc(participationDoc.id).update({
      investedAmount: "5000.00",
      amount: 5000,
      "fundingStatus.investmentAmount": "5000.00",
    });
    console.log("✓ Updated K25001 participation: $5,000");
  }
}

updateChristina()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
