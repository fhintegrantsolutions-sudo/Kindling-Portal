import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create demo user - Haley Davidshofer
  const user = await storage.createUser({
    username: "hdavidsh",
    password: "demo123",
    name: "Haley Davidshofer",
    email: "hdavidsh@gmail.com",
  });
  console.log("✓ Created demo user: Haley Davidshofer");

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

  // Create Haley Davidshofer's participations from CSV data
  // K24002: $10,000 at 9.50% = $210.02/month
  await storage.createParticipation({
    userId: user.id,
    noteId: note2.id,
    investedAmount: "10000.00",
    purchaseDate: new Date("2024-11-30"),
    status: "Active",
  });

  // K25001: $5,000 at 10.75% = $108.09/month
  await storage.createParticipation({
    userId: user.id,
    noteId: note3.id,
    investedAmount: "5000.00",
    purchaseDate: new Date("2025-02-20"),
    status: "Active",
  });

  // K25002: $5,000 at 9.50% = $105.01/month
  await storage.createParticipation({
    userId: user.id,
    noteId: note4.id,
    investedAmount: "5000.00",
    purchaseDate: new Date("2025-05-15"),
    status: "Active",
  });

  // K25003: $10,750 at 9.50% = $225.77/month
  await storage.createParticipation({
    userId: user.id,
    noteId: note5.id,
    investedAmount: "10750.00",
    purchaseDate: new Date("2025-08-15"),
    status: "Active",
  });

  // K25004: $5,000 at 9.50% = $105.01/month
  await storage.createParticipation({
    userId: user.id,
    noteId: note6.id,
    investedAmount: "5000.00",
    purchaseDate: new Date("2025-11-14"),
    status: "Active",
  });

  console.log("✓ Created Haley's 5 participations: K24002 ($10,000), K25001 ($5,000), K25002 ($5,000), K25003 ($10,750), K25004 ($5,000)");

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
  console.log(`\nDemo credentials:\nUsername: hdavidsh\nPassword: demo123\nTotal Invested: $35,750`);
}

seed().catch(console.error);
