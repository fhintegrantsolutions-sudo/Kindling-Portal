import "dotenv/config";
import { db } from "./firebase";
import { COLLECTIONS } from "../shared/schema";

async function deleteAllNotes() {
  console.log("🗑️  Deleting all notes from Firestore...");

  try {
    const snapshot = await db.collection(COLLECTIONS.NOTES).get();
    
    if (snapshot.empty) {
      console.log("No notes to delete.");
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Successfully deleted ${snapshot.size} notes`);
  } catch (error) {
    console.error("❌ Error deleting notes:", error);
    throw error;
  }
}

deleteAllNotes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
