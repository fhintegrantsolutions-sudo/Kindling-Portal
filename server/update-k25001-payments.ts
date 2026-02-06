import { db } from "./firebase";

// K25001 first payment was March 25, 2025
// Current date is February 6, 2026
// Payments are on the 25th of each month

interface PaymentRecord {
  participationId: string;
  paymentDate: string;
  principalAmount: string;
  interestAmount: string;
  totalAmount: string;
  status: string;
  paymentNumber: number;
}

function calculateAmortizationSchedule(principal: number, annualRate: number, termMonths: number) {
  const monthlyRate = annualRate / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  const monthlyPayment = principal * (numerator / denominator);
  
  const schedule: { payment: number; principal: number; interest: number; balance: number }[] = [];
  let balance = principal;
  
  for (let i = 1; i <= termMonths; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    
    schedule.push({
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance)
    });
  }
  
  return schedule;
}

async function updateK25001Payments() {
  console.log("Updating K25001 payment history...\n");

  // Find K25001 note
  const notesSnapshot = await db.collection("notes").where("noteId", "==", "K25001").get();
  if (notesSnapshot.empty) {
    console.error("Note K25001 not found!");
    return;
  }
  const noteDoc = notesSnapshot.docs[0];
  const noteId = noteDoc.id;
  console.log(`Found K25001 note with ID: ${noteId}\n`);

  // Get all participations for K25001
  const participationsSnapshot = await db.collection("participations").where("noteId", "==", noteId).get();
  console.log(`Found ${participationsSnapshot.size} participations\n`);

  // First payment date: March 25, 2025
  // Current date: February 6, 2026
  // Payments made: March 2025 through January 2026 = 11 payments
  const paymentDates = [
    "2025-03-25",
    "2025-04-25",
    "2025-05-25",
    "2025-06-25",
    "2025-07-25",
    "2025-08-25",
    "2025-09-25",
    "2025-10-25",
    "2025-11-25",
    "2025-12-25",
    "2026-01-25"
  ];

  let totalPaymentsCreated = 0;

  for (const participationDoc of participationsSnapshot.docs) {
    const participation = participationDoc.data();
    const participationId = participationDoc.id;
    const investedAmount = parseFloat(participation.investedAmount || participation.fundingStatus?.investmentAmount || "0");
    
    if (investedAmount <= 0) {
      console.log(`Skipping participation ${participationId} - no investment amount`);
      continue;
    }

    // Get user info
    const userDoc = await db.collection("users").doc(participation.userId).get();
    const userName = userDoc.data()?.name || "Unknown";
    
    console.log(`Processing: ${userName} - $${investedAmount.toLocaleString()}`);

    // Calculate amortization schedule for this investor
    const annualRate = 10.75 / 100;
    const termMonths = 60;
    const schedule = calculateAmortizationSchedule(investedAmount, annualRate, termMonths);

    // Delete existing payments for this participation
    const existingPayments = await db.collection("payments").where("participationId", "==", participationId).get();
    for (const paymentDoc of existingPayments.docs) {
      await db.collection("payments").doc(paymentDoc.id).delete();
    }

    // Create payment records
    for (let i = 0; i < paymentDates.length; i++) {
      const paymentDate = paymentDates[i];
      const scheduleEntry = schedule[i];
      
      const paymentRecord = {
        participationId: participationId,
        paymentDate: `${paymentDate}T00:00:00.000Z`,
        principalAmount: scheduleEntry.principal.toFixed(2),
        interestAmount: scheduleEntry.interest.toFixed(2),
        totalAmount: scheduleEntry.payment.toFixed(2),
        status: "Completed",
        paymentNumber: i + 1,
        createdAt: new Date().toISOString()
      };
      
      await db.collection("payments").add(paymentRecord);
      totalPaymentsCreated++;
    }

    // Update participation with payment amount
    const monthlyPayment = schedule[0].payment;
    await db.collection("participations").doc(participationId).update({
      paymentAmount: monthlyPayment.toFixed(2),
      "fundingStatus.paymentAmount": monthlyPayment.toFixed(2)
    });
    
    console.log(`  ✓ Created ${paymentDates.length} payments, monthly payment: $${monthlyPayment.toFixed(2)}`);
  }

  console.log("\n========================================");
  console.log(`Total payments created: ${totalPaymentsCreated}`);
  console.log("========================================");
}

updateK25001Payments()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
