import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const user = await storage.createUser({
    username: "demo",
    password: "demo123",
    name: "Alex Johnson",
    email: "alex.j@example.com",
  });
  console.log("✓ Created demo user");

  // Create active notes
  const note1 = await storage.createNote({
    title: "Austin Multi-Family Fund II",
    principal: "50000.00",
    rate: "10.00",
    termMonths: 24,
    startDate: new Date("2024-01-15"),
    status: "Active",
    type: "Real Estate",
    interestType: "Amortized",
    description: "Senior secured debt for multi-family residential development in Austin metro area.",
  });

  const note2 = await storage.createNote({
    title: "Tech Growth Bridge Loan",
    principal: "25000.00",
    rate: "12.00",
    termMonths: 12,
    startDate: new Date("2024-03-01"),
    status: "Active",
    type: "Venture Debt",
    interestType: "Simple Interest",
    description: "Short-term bridge financing for Series A growth-stage technology company.",
  });

  const note3 = await storage.createNote({
    title: "Green Energy Infrastructure",
    principal: "50000.00",
    rate: "9.50",
    termMonths: 36,
    startDate: new Date("2023-11-20"),
    status: "Active",
    type: "Infrastructure",
    interestType: "Amortized",
    description: "Infrastructure financing for commercial solar installation projects.",
  });
  console.log("✓ Created active notes");

  // Create opportunities
  await storage.createNote({
    title: "Miami Residential Redevelopment",
    principal: "0",
    rate: "11.00",
    termMonths: 18,
    startDate: new Date("2024-07-15"),
    status: "Opportunity",
    type: "Real Estate",
    interestType: "Amortized",
    description: "Senior secured debt for the renovation of a 12-unit apartment complex in Little Havana.",
    targetRaise: "2000000.00",
    minInvestment: "25000.00",
    closingDate: new Date("2024-07-15"),
  });

  await storage.createNote({
    title: "SaaS Revenue Financing Series A",
    principal: "0",
    rate: "13.00",
    termMonths: 24,
    startDate: new Date("2024-08-01"),
    status: "Opportunity",
    type: "Venture Debt",
    interestType: "Simple Interest",
    description: "Revenue-based financing for a high-growth logistics software company reaching $5M ARR.",
    targetRaise: "5000000.00",
    minInvestment: "50000.00",
    closingDate: new Date("2024-08-01"),
  });
  console.log("✓ Created opportunities");

  // Create participations
  await storage.createParticipation({
    userId: user.id,
    noteId: note1.id,
    investedAmount: "50000.00",
    purchaseDate: new Date("2024-01-15"),
    status: "Active",
  });

  await storage.createParticipation({
    userId: user.id,
    noteId: note2.id,
    investedAmount: "25000.00",
    purchaseDate: new Date("2024-03-01"),
    status: "Active",
  });

  await storage.createParticipation({
    userId: user.id,
    noteId: note3.id,
    investedAmount: "50000.00",
    purchaseDate: new Date("2023-11-20"),
    status: "Active",
  });
  console.log("✓ Created participations");

  // Create beneficiaries
  await storage.createBeneficiary({
    userId: user.id,
    name: "Sarah Johnson",
    relation: "Spouse",
    percentage: 50,
  });

  await storage.createBeneficiary({
    userId: user.id,
    name: "Michael Johnson",
    relation: "Son",
    percentage: 50,
  });
  console.log("✓ Created beneficiaries");

  // Create sample document
  await storage.createDocument({
    userId: user.id,
    type: "W9",
    fileName: "2023_W9_Form.pdf",
    fileUrl: "/documents/sample-w9.pdf",
    status: "Verified",
  });
  console.log("✓ Created sample document");

  console.log("✅ Database seeded successfully!");
  console.log(`\nDemo credentials:\nUsername: demo\nPassword: demo123`);
}

seed().catch(console.error);
