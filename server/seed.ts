import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create demo user - Karen Davidshofer
  const user = await storage.createUser({
    username: "kdavidsh",
    password: "demo123",
    name: "Karen Davidshofer",
    email: "kdavidsh@gmail.com",
    phone: "(555) 123-4567",
    address: "123 Main Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
  });
  console.log("✓ Created demo user: Karen Davidshofer");

  // Create real notes from CSV data
  const note1 = await storage.createNote({
    noteId: "K24001",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K24001",
    principal: "105000.00",
    rate: "7.50",
    termMonths: 60,
    contractDate: new Date("2024-08-15"),
    paymentStartDate: new Date("2024-09-25"),
    maturityDate: new Date("2029-09-25"),
    monthlyPayment: "2103.98",
    status: "Active",
    type: "Bridge Loan",
    interestType: "Amortized",
    firstPaymentDate: "September 25th",
    description: "Bridge loan for Crossroads Business Consulting - 60 month term at 7.50% interest.",
  });

  const note2 = await storage.createNote({
    noteId: "K24002",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K24002",
    principal: "356000.00",
    rate: "9.50",
    termMonths: 60,
    contractDate: new Date("2024-11-30"),
    paymentStartDate: new Date("2024-12-25"),
    maturityDate: new Date("2029-12-25"),
    monthlyPayment: "7476.66",
    status: "Active",
    type: "Bridge Loan",
    interestType: "Amortized",
    firstPaymentDate: "December 25th",
    description: "Bridge loan for Crossroads Business Consulting - 60 month term at 9.50% interest.",
  });

  const note3 = await storage.createNote({
    noteId: "K25001",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K25001",
    principal: "595000.00",
    rate: "10.75",
    termMonths: 60,
    contractDate: new Date("2025-02-20"),
    paymentStartDate: new Date("2025-03-25"),
    maturityDate: new Date("2030-03-25"),
    monthlyPayment: "12862.68",
    status: "Active",
    type: "Bridge Loan",
    interestType: "Amortized",
    firstPaymentDate: "March 25th",
    description: "Bridge loan for Crossroads Business Consulting - 60 month term at 10.75% interest.",
  });

  const note4 = await storage.createNote({
    noteId: "K25002",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K25002",
    principal: "1158666.00",
    rate: "9.50",
    termMonths: 60,
    contractDate: new Date("2025-05-15"),
    paymentStartDate: new Date("2025-06-25"),
    maturityDate: new Date("2030-06-25"),
    monthlyPayment: "24334.14",
    status: "Active",
    type: "Bridge Loan",
    interestType: "Amortized",
    fundingStartDate: new Date("2025-04-15"),
    fundingEndDate: new Date("2025-05-09"),
    firstPaymentDate: "June 25th",
    description: "Bridge loan for Crossroads Business Consulting - 60 month term at 9.50% interest.",
  });

  const note5 = await storage.createNote({
    noteId: "K25003",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K25003",
    principal: "621101.00",
    rate: "9.50",
    termMonths: 60,
    contractDate: new Date("2025-08-15"),
    paymentStartDate: new Date("2025-09-25"),
    maturityDate: new Date("2030-09-25"),
    monthlyPayment: "13044.28",
    status: "Active",
    type: "Bridge Loan",
    interestType: "Amortized",
    fundingStartDate: new Date("2025-06-16"),
    fundingEndDate: new Date("2025-08-08"),
    firstPaymentDate: "September 25th",
    description: "Bridge loan for Crossroads Business Consulting - 60 month term at 9.50% interest.",
  });

  const note6 = await storage.createNote({
    noteId: "K25004",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K25004",
    principal: "563158.10",
    rate: "9.50",
    termMonths: 60,
    contractDate: new Date("2025-11-14"),
    paymentStartDate: new Date("2025-12-25"),
    maturityDate: new Date("2030-12-25"),
    monthlyPayment: "11827.37",
    status: "Active",
    type: "Bridge Loan",
    interestType: "Amortized",
    fundingStartDate: new Date("2025-09-01"),
    fundingEndDate: new Date("2025-11-07"),
    firstPaymentDate: "December 25th",
    description: "Bridge loan for Crossroads Business Consulting - 60 month term at 9.50% interest.",
  });

  // Funding opportunity - projected terms based on prior notes
  await storage.createNote({
    noteId: "K26001",
    borrower: "Crossroads Business Consulting",
    title: "Crossroads Bridge Loan K26001",
    principal: "0",
    rate: "9.50",
    termMonths: 60,
    contractDate: new Date("2026-02-13"),
    paymentStartDate: new Date("2026-03-25"),
    maturityDate: new Date("2031-03-25"),
    status: "Funding",
    type: "Bridge Loan",
    interestType: "Amortized",
    fundingStartDate: new Date("2025-11-17"),
    fundingEndDate: new Date("2026-02-06"),
    firstPaymentDate: "March 25th",
    description: "Currently in funding phase - Bridge loan opportunity for Crossroads Business Consulting. Projected 60-month term at 9.50% interest based on prior note terms.",
    targetRaise: "750000.00",
    minInvestment: "10000.00",
  });

  console.log("✓ Created notes from CSV data");

  // Create Karen Davidshofer's participations from CSV data
  // K24002: $20,000 at 9.50% = $420.04/month
  const participation1 = await storage.createParticipation({
    userId: user.id,
    noteId: note2.id,
    investedAmount: "20000.00",
    purchaseDate: new Date("2024-11-30"),
    status: "Active",
  });

  // K25001: $20,000 at 10.75% = $432.36/month
  const participation2 = await storage.createParticipation({
    userId: user.id,
    noteId: note3.id,
    investedAmount: "20000.00",
    purchaseDate: new Date("2025-02-20"),
    status: "Active",
  });

  // K25002: $20,000 at 9.50% = $420.04/month
  const participation3 = await storage.createParticipation({
    userId: user.id,
    noteId: note4.id,
    investedAmount: "20000.00",
    purchaseDate: new Date("2025-05-15"),
    status: "Active",
  });

  // K25003: $10,000 at 9.50% = $210.02/month
  const participation4 = await storage.createParticipation({
    userId: user.id,
    noteId: note5.id,
    investedAmount: "10000.00",
    purchaseDate: new Date("2025-08-15"),
    status: "Active",
  });

  // K25004: $20,000 at 9.50% = $420.04/month
  const participation5 = await storage.createParticipation({
    userId: user.id,
    noteId: note6.id,
    investedAmount: "20000.00",
    purchaseDate: new Date("2025-11-14"),
    status: "Active",
  });

  console.log("✓ Created Karen's 5 participations: K24002 ($20,000), K25001 ($20,000), K25002 ($20,000), K25003 ($10,000), K25004 ($20,000)");

  // Create sample payment history for participation1 (K24002 - Karen's $20,000, started Dec 2024)
  // Monthly payment ~$420.04 split between principal and interest
  const paymentData = [
    { date: new Date("2024-12-25"), principal: "261.70", interest: "158.34", status: "Completed" },
    { date: new Date("2025-01-25"), principal: "263.78", interest: "156.26", status: "Completed" },
    { date: new Date("2025-02-25"), principal: "265.88", interest: "154.16", status: "Completed" },
    { date: new Date("2025-03-25"), principal: "267.98", interest: "152.06", status: "Completed" },
    { date: new Date("2025-04-25"), principal: "270.10", interest: "149.94", status: "Completed" },
    { date: new Date("2025-05-25"), principal: "272.24", interest: "147.80", status: "Completed" },
    { date: new Date("2025-06-25"), principal: "274.40", interest: "145.64", status: "Completed" },
    { date: new Date("2025-07-25"), principal: "276.56", interest: "143.48", status: "Completed" },
    { date: new Date("2025-08-25"), principal: "278.74", interest: "141.30", status: "Completed" },
    { date: new Date("2025-09-25"), principal: "280.94", interest: "139.10", status: "Completed" },
    { date: new Date("2025-10-25"), principal: "283.16", interest: "136.88", status: "Completed" },
    { date: new Date("2025-11-25"), principal: "285.40", interest: "134.64", status: "Completed" },
    { date: new Date("2025-12-25"), principal: "287.66", interest: "132.38", status: "Scheduled" },
  ];

  for (const payment of paymentData) {
    await storage.createPayment({
      participationId: participation1.id,
      paymentDate: payment.date,
      principalAmount: payment.principal,
      interestAmount: payment.interest,
      status: payment.status,
    });
  }
  console.log("✓ Created 13 payment records for K24002");

  // Create sample payments for participation2 (K25001 - Karen's $20,000, started March 2025)
  // Monthly payment ~$432.36 split between principal and interest
  const payment2Data = [
    { date: new Date("2025-03-25"), principal: "253.03", interest: "179.33", status: "Completed" },
    { date: new Date("2025-04-25"), principal: "255.29", interest: "177.07", status: "Completed" },
    { date: new Date("2025-05-25"), principal: "257.58", interest: "174.78", status: "Completed" },
    { date: new Date("2025-06-25"), principal: "259.88", interest: "172.48", status: "Completed" },
    { date: new Date("2025-07-25"), principal: "262.21", interest: "170.15", status: "Completed" },
    { date: new Date("2025-08-25"), principal: "264.55", interest: "167.81", status: "Completed" },
    { date: new Date("2025-09-25"), principal: "266.92", interest: "165.44", status: "Completed" },
    { date: new Date("2025-10-25"), principal: "269.31", interest: "163.05", status: "Completed" },
    { date: new Date("2025-11-25"), principal: "271.72", interest: "160.64", status: "Completed" },
    { date: new Date("2025-12-25"), principal: "274.15", interest: "158.21", status: "Scheduled" },
  ];

  for (const payment of payment2Data) {
    await storage.createPayment({
      participationId: participation2.id,
      paymentDate: payment.date,
      principalAmount: payment.principal,
      interestAmount: payment.interest,
      status: payment.status,
    });
  }
  console.log("✓ Created 10 payment records for K25001");

  // Create lender documents for each participation
  const participationDocData = [
    { participationId: participation1.id, noteId: "K24002" },
    { participationId: participation2.id, noteId: "K25001" },
    { participationId: participation3.id, noteId: "K25002" },
    { participationId: participation4.id, noteId: "K25003" },
    { participationId: participation5.id, noteId: "K25004" },
  ];

  for (const doc of participationDocData) {
    await storage.createParticipationDocument({
      participationId: doc.participationId,
      type: "Amortization Schedule",
      fileName: `${doc.noteId}_Amortization_Schedule.pdf`,
      fileUrl: `/documents/${doc.noteId.toLowerCase()}_amortization.pdf`,
    });
    await storage.createParticipationDocument({
      participationId: doc.participationId,
      type: "Acknowledgement Letter",
      fileName: `${doc.noteId}_Acknowledgement_Letter.pdf`,
      fileUrl: `/documents/${doc.noteId.toLowerCase()}_acknowledgement.pdf`,
    });
  }
  console.log("✓ Created lender documents (amortization schedules and acknowledgement letters) for all participations");

  // Create sample beneficiary
  await storage.createBeneficiary({
    userId: user.id,
    name: "Sample Beneficiary",
    relation: "Family",
    percentage: 100,
  });
  console.log("✓ Created beneficiary");

  // Create sample document
  await storage.createDocument({
    userId: user.id,
    type: "W9",
    fileName: "2024_W9_Form.pdf",
    fileUrl: "/documents/sample-w9.pdf",
    status: "Verified",
  });
  console.log("✓ Created sample document");

  console.log("✅ Database seeded successfully!");
  console.log(`\nDemo credentials:\nUsername: kdavidsh\nPassword: demo123\nTotal Invested: $90,000`);
}

seed().catch(console.error);
