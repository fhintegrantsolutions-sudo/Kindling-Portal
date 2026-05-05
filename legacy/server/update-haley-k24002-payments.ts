import { db } from './firebase';

// K24002 details:
// - First payment: December 25, 2024
// - Rate: 9.5%
// - Term: 60 months
// - Haley's investment: $10,000

function calculateAmortization(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
}

async function updateHaleyK24002Payments() {
  console.log('Updating Haley K24002 payment history...\n');
  
  const HALEY_USER_ID = 'aRNXqXD1GlEQaJoLX8aK';
  const K24002_RATE = 9.5;
  const K24002_TERM = 60;
  
  // Get K24002 note
  const notesSnapshot = await db.collection('notes').where('noteId', '==', 'K24002').get();
  if (notesSnapshot.empty) {
    console.log('K24002 not found');
    return;
  }
  const noteDocId = notesSnapshot.docs[0].id;
  console.log('Found K24002, doc ID:', noteDocId);
  
  // Get Haley's participation
  const participations = await db.collection('participations')
    .where('noteId', '==', noteDocId)
    .where('userId', '==', HALEY_USER_ID)
    .get();
  
  if (participations.empty) {
    console.log('Haley has no K24002 participation');
    return;
  }
  
  const participation = participations.docs[0];
  const pData = participation.data();
  const participationId = participation.id;
  
  const investedAmount = parseFloat(pData.investedAmount || pData.fundingStatus?.investmentAmount || '0');
  console.log(`Found Haley's K24002 participation:`);
  console.log(`  - Participation ID: ${participationId}`);
  console.log(`  - Investment: $${investedAmount.toLocaleString()}`);
  
  // Calculate monthly payment
  const monthlyPayment = calculateAmortization(investedAmount, K24002_RATE, K24002_TERM);
  console.log(`  - Monthly payment: $${monthlyPayment.toFixed(2)}`);
  
  // Update participation with payment amount
  await db.collection('participations').doc(participationId).update({
    paymentAmount: monthlyPayment.toFixed(2)
  });
  console.log(`  - Updated participation with paymentAmount`);
  
  // Check for existing payments
  const existingPayments = await db.collection('payments')
    .where('participationId', '==', participationId)
    .get();
  
  if (!existingPayments.empty) {
    console.log(`  - Found ${existingPayments.size} existing payments, deleting...`);
    const batch = db.batch();
    existingPayments.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  // Generate payments from December 25, 2024 to January 25, 2026
  // That's 14 payments
  const firstPaymentDate = new Date(2024, 11, 25); // December 25, 2024
  const currentDate = new Date(2026, 1, 6); // February 6, 2026
  
  let balance = investedAmount;
  const monthlyRate = K24002_RATE / 100 / 12;
  let paymentNumber = 1;
  let totalPaymentsCreated = 0;
  
  let paymentDate = new Date(firstPaymentDate);
  
  while (paymentDate <= currentDate && paymentNumber <= K24002_TERM) {
    const interestAmount = balance * monthlyRate;
    const principalAmount = monthlyPayment - interestAmount;
    
    await db.collection('payments').add({
      participationId: participationId,
      paymentDate: paymentDate.toISOString(),
      principalAmount: principalAmount.toFixed(2),
      interestAmount: interestAmount.toFixed(2),
      totalAmount: monthlyPayment.toFixed(2),
      status: 'Completed',
      paymentNumber: paymentNumber,
      createdAt: new Date().toISOString()
    });
    
    balance -= principalAmount;
    totalPaymentsCreated++;
    
    // Move to next month
    paymentDate.setMonth(paymentDate.getMonth() + 1);
    paymentNumber++;
  }
  
  console.log(`  ✓ Created ${totalPaymentsCreated} payments`);
  console.log(`\n========================================`);
  console.log(`Done! Created ${totalPaymentsCreated} payments for Haley's K24002`);
  console.log(`Monthly payment: $${monthlyPayment.toFixed(2)}`);
  console.log(`========================================`);
}

updateHaleyK24002Payments()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
