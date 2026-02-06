import { db } from "./firebase";

async function updateHaleyPayment() {
  const userId = "aRNXqXD1GlEQaJoLX8aK"; // Haley Davidshofer

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
    console.log("No K25001 participation found for Haley");
    return;
  }

  const participationDoc = participations.docs[0];
  await db.collection("participations").doc(participationDoc.id).update({
    paymentAmount: "108.27",
    "fundingStatus.paymentAmount": "108.27",
  });
  console.log("✓ Updated Haley Davidshofer K25001 participation with payment amount: $108.27");
}

updateHaleyPayment()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
