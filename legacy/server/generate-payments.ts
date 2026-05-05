/**
 * Automated Payment Generation Script
 *
 * Generates payment records for all participations based on:
 * - Note's paymentStartDate (first payment)
 * - Note's maturityDate (last payment)
 * - Current date (only generates payments up to today + 1 month buffer)
 *
 * Run this script monthly or on-demand to keep payment records up to date.
 */
import { db } from "./firebase";

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

function calculateMonthsBetween(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  return yearDiff * 12 + monthDiff + 1; // +1 to include both start and end months
}

function generatePaymentDates(startDate: Date, endDate: Date, cutoffDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const dayOfMonth = current.getDate();

  while (current <= endDate && current <= cutoffDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(dayOfMonth).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

async function generateAllPayments(dryRun: boolean = false) {
  console.log("🔄 Automated Payment Generation");
  console.log("================================\n");

  if (dryRun) {
    console.log("📋 DRY RUN MODE - No changes will be made\n");
  }

  // Calculate cutoff date (today + 1 month buffer for upcoming payments)
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setMonth(cutoffDate.getMonth() + 1);

  console.log(`📅 Today: ${today.toISOString().split('T')[0]}`);
  console.log(`📅 Generating payments through: ${cutoffDate.toISOString().split('T')[0]}\n`);

  // Get all notes
  const notesSnapshot = await db.collection("notes").get();
  console.log(`Found ${notesSnapshot.size} notes\n`);

  let totalPaymentsCreated = 0;
  let totalPaymentsSkipped = 0;

  for (const noteDoc of notesSnapshot.docs) {
    const note = noteDoc.data();
    const noteId = noteDoc.id;

    if (!note.paymentStartDate || !note.maturityDate) {
      console.log(`⚠️  Skipping ${note.noteId} - missing payment dates`);
      continue;
    }

    const paymentStartDate = note.paymentStartDate.toDate ? note.paymentStartDate.toDate() : new Date(note.paymentStartDate);
    const maturityDate = note.maturityDate.toDate ? note.maturityDate.toDate() : new Date(note.maturityDate);
    const annualRate = parseFloat(note.rate) / 100;

    console.log(`\n📝 ${note.noteId} - ${note.title}`);
    console.log(`   First Payment: ${paymentStartDate.toISOString().split('T')[0]}`);
    console.log(`   Maturity: ${maturityDate.toISOString().split('T')[0]}`);
    console.log(`   Rate: ${note.rate}%`);

    // Calculate term in months
    const termMonths = calculateMonthsBetween(paymentStartDate, maturityDate);
    console.log(`   Term: ${termMonths} months`);

    // Get all participations for this note
    const participationsSnapshot = await db.collection("participations")
      .where("noteId", "==", noteId)
      .get();

    if (participationsSnapshot.empty) {
      console.log(`   ℹ️  No participations found`);
      continue;
    }

    console.log(`   Found ${participationsSnapshot.size} participations`);

    // Generate payment dates up to cutoff
    const paymentDates = generatePaymentDates(paymentStartDate, maturityDate, cutoffDate);
    console.log(`   Generating ${paymentDates.length} payments (up to ${paymentDates[paymentDates.length - 1]})`);

    for (const participationDoc of participationsSnapshot.docs) {
      const participation = participationDoc.data();
      const participationId = participationDoc.id;
      const investedAmount = parseFloat(participation.investedAmount || participation.fundingStatus?.investmentAmount || "0");

      if (investedAmount <= 0) {
        console.log(`   ⚠️  Skipping participation ${participationId} - no investment amount`);
        continue;
      }

      // Get user info for logging
      const userDoc = await db.collection("users").doc(participation.userId).get();
      const userName = userDoc.data()?.name || "Unknown";

      // Calculate amortization schedule
      const schedule = calculateAmortizationSchedule(investedAmount, annualRate, termMonths);

      if (!dryRun) {
        // Delete existing payments for this participation
        const existingPayments = await db.collection("payments")
          .where("participationId", "==", participationId)
          .get();

        for (const paymentDoc of existingPayments.docs) {
          await db.collection("payments").doc(paymentDoc.id).delete();
        }

        if (existingPayments.size > 0) {
          console.log(`   🗑️  Deleted ${existingPayments.size} existing payments for ${userName}`);
        }
      }

      // Create new payment records
      let paymentsCreatedForParticipation = 0;
      for (let i = 0; i < paymentDates.length; i++) {
        const paymentDate = paymentDates[i];
        const scheduleEntry = schedule[i];

        if (!scheduleEntry) {
          console.log(`   ⚠️  No schedule entry for payment ${i + 1}`);
          break;
        }

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

        if (!dryRun) {
          await db.collection("payments").add(paymentRecord);
        }

        paymentsCreatedForParticipation++;
        totalPaymentsCreated++;
      }

      // Update participation with payment amount
      const monthlyPayment = schedule[0].payment;
      if (!dryRun) {
        await db.collection("participations").doc(participationId).update({
          paymentAmount: monthlyPayment.toFixed(2),
          "fundingStatus.paymentAmount": monthlyPayment.toFixed(2)
        });
      }

      console.log(`   ✅ ${userName}: $${investedAmount.toLocaleString()} → ${paymentsCreatedForParticipation} payments @ $${monthlyPayment.toFixed(2)}/mo`);
    }
  }

  console.log("\n================================");
  console.log(`📊 Summary:`);
  console.log(`   Total payments ${dryRun ? 'would be created' : 'created'}: ${totalPaymentsCreated}`);
  if (dryRun) {
    console.log(`\n   Run with --execute to actually create the payments`);
  }
  console.log("================================");
}

// Check for command line args
const isDryRun = !process.argv.includes('--execute');

generateAllPayments(isDryRun)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
