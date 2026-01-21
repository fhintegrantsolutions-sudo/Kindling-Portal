import "dotenv/config";
import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding Firestore database...");

  try {
    // Create admin user
    const admin = await storage.createUser({
      username: "admin",
      password: "admin123",
      name: "Admin User",
      email: "admin@kindling.com",
      phone: "(555) 000-0000",
      role: "admin",
    });
    console.log("✓ Created admin user");

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
      role: "lender",
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
    console.log("✓ Created note K24001");

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
    console.log("✓ Created note K24002");

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
    console.log("✓ Created note K25001");

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
    console.log("✓ Created note K25002");

    const note5 = await storage.createNote({
      noteId: "K25003",
      borrower: "Crossroads Business Consulting",
      title: "Crossroads Bridge Loan K25003",
      principal: "621101.00",
      rate: "9.50",
      termMonths: 60,
      status: "Funding",
      type: "Bridge Loan",
      interestType: "Amortized",
      targetRaise: "621101.00",
      minInvestment: "25000.00",
      fundingStartDate: new Date("2025-06-01"),
      fundingEndDate: new Date("2025-06-30"),
      firstPaymentDate: "July 25th",
      description: "Bridge loan for Crossroads Business Consulting - 60 month term at 9.50% interest. Currently in funding stage.",
    });
    console.log("✓ Created note K25003 (Funding)");

    const note6 = await storage.createNote({
      noteId: "K25004",
      borrower: "Crossroads Business Consulting",
      title: "Crossroads Bridge Loan K25004",
      principal: "450000.00",
      rate: "10.25",
      termMonths: 48,
      status: "Opportunity",
      type: "Bridge Loan",
      interestType: "Amortized",
      targetRaise: "450000.00",
      minInvestment: "20000.00",
      fundingStartDate: new Date("2025-07-01"),
      fundingEndDate: new Date("2025-07-31"),
      firstPaymentDate: "August 25th",
      description: "Upcoming bridge loan opportunity for Crossroads Business Consulting - 48 month term at 10.25% interest.",
    });
    console.log("✓ Created note K25004 (Opportunity)");

    // Create participations for the demo user
    const participation1 = await storage.createParticipation({
      userId: user.id,
      noteId: note1.id,
      investedAmount: "25000.00",
      purchaseDate: new Date("2024-08-15"),
      status: "Active",
    });
    console.log("✓ Created participation for K24001");

    const participation2 = await storage.createParticipation({
      userId: user.id,
      noteId: note2.id,
      investedAmount: "50000.00",
      purchaseDate: new Date("2024-11-30"),
      status: "Active",
    });
    console.log("✓ Created participation for K24002");

    const participation3 = await storage.createParticipation({
      userId: user.id,
      noteId: note3.id,
      investedAmount: "75000.00",
      purchaseDate: new Date("2025-02-20"),
      status: "Active",
    });
    console.log("✓ Created participation for K25001");

    const participation4 = await storage.createParticipation({
      userId: user.id,
      noteId: note4.id,
      investedAmount: "100000.00",
      purchaseDate: new Date("2025-05-15"),
      status: "Active",
    });
    console.log("✓ Created participation for K25002");

    // Create some activities
    await storage.createActivity({
      userId: user.id,
      participationId: participation4.id,
      type: "funding",
      description: "Initial investment in K25002",
      amount: "100000.00",
      noteId: "K25002",
      activityDate: new Date("2025-05-15"),
    });

    await storage.createActivity({
      userId: user.id,
      participationId: participation1.id,
      type: "payment",
      description: "Monthly payment received for K24001",
      amount: "500.00",
      noteId: "K24001",
      activityDate: new Date("2025-09-25"),
    });

    await storage.createActivity({
      userId: user.id,
      participationId: participation2.id,
      type: "payment",
      description: "Monthly payment received for K24002",
      amount: "1050.00",
      noteId: "K24002",
      activityDate: new Date("2025-12-25"),
    });

    console.log("✓ Created activities");

    // Create sample beneficiaries
    await storage.createBeneficiary({
      userId: user.id,
      name: "John Davidshofer",
      relation: "Spouse",
      percentage: 50,
      type: "Primary",
      phone: "(555) 234-5678",
    });

    await storage.createBeneficiary({
      userId: user.id,
      name: "Sarah Davidshofer",
      relation: "Daughter",
      percentage: 30,
      type: "Primary",
      phone: "(555) 345-6789",
    });

    await storage.createBeneficiary({
      userId: user.id,
      name: "Michael Davidshofer",
      relation: "Son",
      percentage: 20,
      type: "Primary",
      phone: "(555) 456-7890",
    });

    console.log("✓ Created beneficiaries");

    console.log("\n✅ Seeding completed successfully!");
    console.log("\nDemo credentials:");
    console.log("  Username: kdavidsh");
    console.log("  Password: demo123");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("\n🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
