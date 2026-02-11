import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertNoteSchema, 
  insertParticipationSchema,
  insertBeneficiarySchema,
  insertDocumentSchema,
  insertParticipationDocumentSchema,
  insertNoteRegistrationSchema,
  insertBorrowerSchema
} from "@shared/schema";
import { z } from "zod";
import { sendWelcomeEmail, sendAccountingNotification, sendPaymentConfirmation } from "./notifications";
import { auditMiddleware, setUserContext } from "./audit-middleware";
import { complianceStorage } from "./compliance-storage";

// Middleware to require admin role
async function requireAdmin(req: any, res: any, next: any) {
  try {
    // For now, check if user is admin based on username or email
    // In production, this should use proper session/JWT authentication
    const identifier = req.headers["x-username"] || "fhintegrantsolutions";
    
    // Try to find user by username first, then by email
    let user = await storage.getUserByUsername(identifier as string);
    if (!user) {
      user = await storage.getUserByEmail(identifier as string);
    }
    // Also try common admin patterns
    if (!user && identifier === "admin") {
      user = await storage.getUserByEmail("admin@kindling.com");
    }
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Set user context for audit logging
    req.user = {
      id: user.id.toString(),
      email: user.email || user.username,
      name: user.name || user.username,
    };
    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Apply audit middleware to all routes
  app.use(setUserContext);
  app.use(auditMiddleware);
  
  // Notes
  app.get("/api/notes", async (req, res) => {
    try {
      const notes = await storage.getNotes();
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.get("/api/notes/opportunities", async (req, res) => {
    try {
      const preRegister = await storage.getNotesByStatus("Pre Register");
      const funding = await storage.getNotesByStatus("Funding");
      const opportunity = await storage.getNotesByStatus("Opportunity");
      const notes = [...preRegister, ...funding, ...opportunity];
      
      // Enrich notes with borrower business names
      const borrowers = await storage.getBorrowers();
      const enrichedNotes = notes.map(note => {
        const borrower = borrowers.find(b => b.id === note.borrower);
        return {
          ...note,
          borrower: borrower?.businessName || note.borrower
        };
      });
      
      // Sort by closing date (fundingEndDate or maturityDate), earliest first
      const sortedNotes = enrichedNotes.sort((a, b) => {
        const dateA = new Date(a.fundingEndDate || a.maturityDate || '9999-12-31').getTime();
        const dateB = new Date(b.fundingEndDate || b.maturityDate || '9999-12-31').getTime();
        return dateA - dateB;
      });
      
      res.json(sortedNotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/notes/active", async (req, res) => {
    try {
      const activeNotes = await storage.getNotesByStatus("Active");
      res.json(activeNotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active notes" });
    }
  });

  app.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      // Enrich with borrower name
      const borrower = await storage.getBorrower(note.borrower);
      res.json({
        ...note,
        borrower: borrower?.businessName || note.borrower
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const validatedNote = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(validatedNote);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Participations
  app.get("/api/participations/user/:userId", async (req, res) => {
    try {
      const participations = await storage.getParticipationsByUser(req.params.userId);
      res.json(participations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participations" });
    }
  });

  // Get demo user's participations (check x-user-id header or use default)
  app.get("/api/my-participations", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      let user;
      if (userId) {
        user = await storage.getUser(userId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const participations = await storage.getParticipationsByUser(user.id);

      // Enrich notes with borrower names and add payment count
      const borrowers = await storage.getBorrowers();
      const enrichedParticipations = await Promise.all(participations.map(async (p) => {
        // Get payment count for this participation
        const payments = await storage.getPaymentsByParticipation(p.id);
        const paymentCount = payments.length;

        console.log(`Participation ${p.id} (${p.note?.noteId}): ${paymentCount} payments`);

        return {
          ...p,
          paymentCount,
          note: p.note ? {
            ...p.note,
            borrower: borrowers.find(b => b.id === p.note.borrower)?.businessName || p.note.borrower
          } : p.note
        };
      }));

      console.log(`Returning ${enrichedParticipations.length} participations with payment counts`);
      res.json(enrichedParticipations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participations" });
    }
  });

  // Get current user profile (check x-user-id header or use default)
  app.get("/api/me", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      let user;
      if (userId) {
        user = await storage.getUser(userId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get current user's beneficiaries
  app.get("/api/my-beneficiaries", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      let user;
      if (userId) {
        user = await storage.getUser(userId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const beneficiaries = await storage.getBeneficiariesByUser(user.id);
      res.json(beneficiaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch beneficiaries" });
    }
  });

  // Get current user's documents
  app.get("/api/my-documents", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      let user;
      if (userId) {
        user = await storage.getUser(userId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const documents = await storage.getDocumentsByUser(user.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/participations", async (req, res) => {
    try {
      const validatedParticipation = insertParticipationSchema.parse(req.body);
      const participation = await storage.createParticipation(validatedParticipation);
      res.status(201).json(participation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create participation" });
    }
  });

  // Get single participation with note details
  app.get("/api/participations/:id", async (req, res) => {
    try {
      const participation = await storage.getParticipation(req.params.id);
      if (!participation) {
        return res.status(404).json({ error: "Participation not found" });
      }

      // Enrich with borrower name
      if (participation.note) {
        const borrower = await storage.getBorrower(participation.note.borrower);
        participation.note.borrower = borrower?.businessName || participation.note.borrower;
      }

      res.json(participation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participation" });
    }
  });

  // Update participation user notes
  app.patch("/api/participations/:id/notes", async (req, res) => {
    try {
      const { userNotes } = req.body;
      console.log(`Updating notes for ${req.params.id}:`, userNotes);
      const participation = await storage.updateParticipation(req.params.id, { userNotes });
      if (!participation) {
        return res.status(404).json({ error: "Participation not found" });
      }
      console.log(`Updated participation has userNotes:`, participation.userNotes);
      res.json(participation);
    } catch (error) {
      console.error('Error updating notes:', error);
      res.status(500).json({ error: "Failed to update notes" });
    }
  });

  // Get payments for a participation
  app.get("/api/participations/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByParticipation(req.params.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Get documents for a participation
  app.get("/api/participations/:id/documents", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByParticipation(req.params.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participation documents" });
    }
  });

  // Beneficiaries
  app.get("/api/beneficiaries/user/:userId", async (req, res) => {
    try {
      const beneficiaries = await storage.getBeneficiariesByUser(req.params.userId);
      res.json(beneficiaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch beneficiaries" });
    }
  });

  app.post("/api/beneficiaries", async (req, res) => {
    try {
      const validatedBeneficiary = insertBeneficiarySchema.parse(req.body);
      const beneficiary = await storage.createBeneficiary(validatedBeneficiary);
      res.status(201).json(beneficiary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create beneficiary" });
    }
  });

  app.delete("/api/beneficiaries/:id", async (req, res) => {
    try {
      await storage.deleteBeneficiary(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete beneficiary" });
    }
  });

  // Documents
  app.get("/api/documents/user/:userId", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByUser(req.params.userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validatedDocument = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedDocument);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, req.body);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Activities
  app.get("/api/my-activities", async (req, res) => {
    try {
      const demoUser = await storage.getUserByUsername("kdavidsh");
      if (!demoUser) {
        return res.status(404).json({ error: "Demo user not found" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getActivitiesByUser(demoUser.id, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Note Registrations
  app.post("/api/registrations", async (req, res) => {
    try {
      // Get current user from header or default to hdavidsh
      const headerUserId = req.headers["x-user-id"] as string;
      let user;
      if (headerUserId) {
        user = await storage.getUser(headerUserId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }
      const registrationData = {
        ...req.body,
        userId: user?.id, // Use undefined instead of null if no user
        investmentAmount: String(req.body.investmentAmount),
      };
      const validatedRegistration = insertNoteRegistrationSchema.parse(registrationData);
      const registration = await storage.createNoteRegistration(validatedRegistration);
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create registration" });
    }
  });

  // Get current user's note registrations
  app.get("/api/my-registrations", async (req, res) => {
    try {
      const headerUserId = req.headers["x-user-id"] as string;
      let user;
      if (headerUserId) {
        user = await storage.getUser(headerUserId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const registrations = await storage.getNoteRegistrationsByUser(user.id);

      // Fetch the note details for each registration
      const registrationsWithNotes = await Promise.all(
        registrations.map(async (reg) => {
          const note = await storage.getNote(reg.noteId);
          return {
            ...reg,
            note
          };
        })
      );

      res.json(registrationsWithNotes);
    } catch (error) {
      console.error("Get registrations error:", error);
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  });

  // Check if user has already registered for a note
  app.get("/api/registrations/check/:noteId", async (req, res) => {
    try {
      const { noteId } = req.params;
      const headerUserId = req.headers["x-user-id"] as string;
      let user;
      if (headerUserId) {
        user = await storage.getUser(headerUserId);
      }
      if (!user) {
        user = await storage.getUserByUsername("hdavidsh");
      }

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if user has filled out the registration form
      const registrations = await storage.getAllNoteRegistrations();
      const hasFormRegistration = registrations.some(
        (reg) => reg.noteId === noteId && reg.userId === user.id
      );

      // Also check if user already has a participation (actual investment) in this note
      const userParticipations = await storage.getParticipationsByUser(user.id);
      const hasParticipation = userParticipations.some(
        (p) => p.noteId === noteId
      );

      // User has "registered" if they either filled out the form OR already have a participation
      const hasRegistered = hasFormRegistration || hasParticipation;

      res.json({ hasRegistered });
    } catch (error) {
      console.error("Check registration error:", error);
      res.status(500).json({ error: "Failed to check registration status" });
    }
  });

  // Admin Routes
  // Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all note registrations
  app.get("/api/admin/registrations", requireAdmin, async (req, res) => {
    try {
      const registrations = await storage.getAllNoteRegistrations();
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  });

  // Approve registration and create user
  app.post("/api/admin/registrations/:id/approve", requireAdmin, async (req, res) => {
    try {
      const registration = await storage.getNoteRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const username = registration.email.split("@")[0];

      // Create user account
      const newUser = await storage.createUser({
        username,
        password: tempPassword,
        name: `${registration.firstName} ${registration.lastName}`,
        email: registration.email,
        phone: registration.phone,
        address: registration.mailingAddress,
        city: registration.city,
        state: registration.state,
        zipCode: registration.zipCode,
        role: "lender",
      });

      // Update registration with user ID and status
      await storage.updateNoteRegistration(req.params.id, {
        userId: newUser.id,
        status: "Approved",
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(
          registration.email,
          `${registration.firstName} ${registration.lastName}`,
          username,
          tempPassword
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      // Send accounting notification
      try {
        const note = await storage.getNote(registration.noteId);
        if (note) {
          await sendAccountingNotification(
            req.params.id,
            registration.investmentAmount,
            `${registration.firstName} ${registration.lastName}`,
            note.title
          );
        }
      } catch (emailError) {
        console.error("Failed to send accounting notification:", emailError);
      }

      res.json({ message: "Registration approved and user created", user: newUser });
    } catch (error) {
      console.error("Approval error:", error);
      res.status(500).json({ error: "Failed to approve registration" });
    }
  });

  // Get all participations with user and note details
  app.get("/api/admin/participations", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const allParticipations = [];
      
      for (const user of users) {
        const participations = await storage.getParticipationsByUser(user.id);
        
        // Add payment summaries for each participation
        for (const p of participations) {
          const payments = await storage.getPaymentsByParticipation(p.id);
          const totalPaidPrincipal = payments.reduce((sum, pay) => sum + parseFloat(pay.principalAmount || '0'), 0);
          const totalPaidInterest = payments.reduce((sum, pay) => sum + parseFloat(pay.interestAmount || '0'), 0);
          const totalPaid = totalPaidPrincipal + totalPaidInterest;
          const paymentCount = payments.length;
          
          allParticipations.push({
            ...p,
            user: { id: user.id, name: user.name, email: user.email },
            paymentSummary: {
              totalPaidPrincipal: totalPaidPrincipal.toFixed(2),
              totalPaidInterest: totalPaidInterest.toFixed(2),
              totalPaid: totalPaid.toFixed(2),
              paymentCount,
            },
          });
        }
      }
      
      res.json(allParticipations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participations" });
    }
  });

  // Get participations by note ID with user details
  app.get("/api/admin/notes/:noteId/lenders", requireAdmin, async (req, res) => {
    try {
      const participations = await storage.getParticipationsByNote(req.params.noteId);
      const users = await storage.getUsers();
      
      const lenders = participations.map(p => {
        const user = users.find(u => u.id === p.userId);
        return {
          ...p,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      });
      
      res.json(lenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lenders for note" });
    }
  });

  // Update participation funding status
  app.patch("/api/admin/participations/:id/funding-status", requireAdmin, async (req, res) => {
    try {
      const { 
        received, 
        deposited, 
        cleared,
        fundingType,
        investmentAmount,
        checkNumber,
        wireReferenceNumber,
        checkImageUrl,
        receivedDate,
        depositedDate,
        clearedDate,
        notes,
      } = req.body;
      
      const participation = await storage.updateParticipation(req.params.id, {
        fundingStatus: {
          received: received ?? false,
          deposited: deposited ?? false,
          cleared: cleared ?? false,
          fundingType: fundingType || undefined,
          investmentAmount: investmentAmount || undefined,
          checkNumber: checkNumber || undefined,
          wireReferenceNumber: wireReferenceNumber || undefined,
          checkImageUrl: checkImageUrl || undefined,
          receivedDate: receivedDate || undefined,
          depositedDate: depositedDate || undefined,
          clearedDate: clearedDate || undefined,
          notes: notes || undefined,
        },
      });

      if (!participation) {
        return res.status(404).json({ error: "Participation not found" });
      }

      // If cleared, send confirmation email and create user if needed
      if (cleared && !participation.fundingStatus?.cleared) {
        const user = await storage.getUser(participation.userId);
        const note = await storage.getNote(participation.noteId);
        if (user && note) {
          try {
            await sendPaymentConfirmation(
              user.email,
              participation.investedAmount,
              note.title,
              new Date()
            );
          } catch (emailError) {
            console.error("Failed to send payment confirmation:", emailError);
          }
        }
      }

      res.json(participation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update funding status" });
    }
  });

  // Create new note
  app.post("/api/admin/notes", requireAdmin, async (req, res) => {
    try {
      const validatedNote = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(validatedNote);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Update note
  app.patch("/api/admin/notes/:id", requireAdmin, async (req, res) => {
    try {
      const note = await storage.updateNote(req.params.id, req.body);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // Get all borrowers
  app.get("/api/admin/borrowers", requireAdmin, async (req, res) => {
    try {
      const borrowers = await storage.getBorrowers();
      res.json(borrowers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch borrowers" });
    }
  });

  // Get single borrower
  app.get("/api/admin/borrowers/:id", requireAdmin, async (req, res) => {
    try {
      const borrower = await storage.getBorrower(req.params.id);
      if (!borrower) {
        return res.status(404).json({ error: "Borrower not found" });
      }
      res.json(borrower);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch borrower" });
    }
  });

  // Create borrower
  app.post("/api/admin/borrowers", requireAdmin, async (req, res) => {
    try {
      const validatedBorrower = insertBorrowerSchema.parse(req.body);
      const borrower = await storage.createBorrower(validatedBorrower);
      res.status(201).json(borrower);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create borrower" });
    }
  });

  // Update borrower
  app.patch("/api/admin/borrowers/:id", requireAdmin, async (req, res) => {
    try {
      const borrower = await storage.updateBorrower(req.params.id, req.body);
      if (!borrower) {
        return res.status(404).json({ error: "Borrower not found" });
      }
      res.json(borrower);
    } catch (error) {
      res.status(500).json({ error: "Failed to update borrower" });
    }
  });

  app.delete("/api/admin/borrowers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBorrower(req.params.id);
      res.status(204).send();
    } catch (error) {
      log(`Error deleting borrower: ${error}`);
      res.status(500).json({ error: "Failed to delete borrower" });
    }
  });

  // ============================================================================
  // COMPLIANCE ROUTES - Entity & KYC Management
  // ============================================================================

  // Get all entities
  app.get("/api/admin/entities", requireAdmin, async (req, res) => {
    try {
      const entities = await complianceStorage.getEntities();
      res.json(entities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entities" });
    }
  });

  // Get single entity
  app.get("/api/admin/entities/:id", requireAdmin, async (req, res) => {
    try {
      const entity = await complianceStorage.getEntity(req.params.id);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json(entity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity" });
    }
  });

  // Get entity users
  app.get("/api/admin/entities/:id/users", requireAdmin, async (req, res) => {
    try {
      const entityUsers = await complianceStorage.getEntityUsers(req.params.id);
      res.json(entityUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity users" });
    }
  });

  // Get entity documents
  app.get("/api/admin/entities/:id/documents", requireAdmin, async (req, res) => {
    try {
      const documents = await complianceStorage.getDocuments({ entityId: req.params.id });
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity documents" });
    }
  });

  // Update entity KYC status
  app.patch("/api/admin/entities/:id/kyc-status", requireAdmin, async (req, res) => {
    try {
      const { status, rejectionReason } = req.body;
      
      const updateData: any = {
        kycStatus: status,
        kycReviewedAt: new Date(),
        kycReviewedBy: req.user?.id,
      };

      if (status === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      const entity = await complianceStorage.updateEntity(req.params.id, updateData);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json(entity);
    } catch (error) {
      res.status(500).json({ error: "Failed to update KYC status" });
    }
  });

  // Approve document
  app.post("/api/admin/documents/:id/approve", requireAdmin, async (req, res) => {
    try {
      const document = await complianceStorage.updateDocument(req.params.id, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user?.id,
      });
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve document" });
    }
  });

  // Reject document
  app.post("/api/admin/documents/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      
      const document = await complianceStorage.updateDocument(req.params.id, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: req.user?.id,
        rejectionReason: reason,
      });
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject document" });
    }
  });

  // Get audit logs
  app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
    try {
      const { userId, action, resource, startDate, endDate, limit } = req.query;
      
      const logs = await complianceStorage.getAuditLogs({
        userId: userId as string,
        action: action as string,
        resource: resource as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100,
      });
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ===== ROLES & PERMISSIONS ROUTES =====
  
  // Get all roles with their permissions
  app.get("/api/admin/roles", requireAdmin, async (req, res) => {
    try {
      const roles = await complianceStorage.getRoles();
      
      // Fetch permissions for each role
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const permissions = await complianceStorage.getRolePermissions(role.id);
          return {
            ...role,
            permissions,
          };
        })
      );
      
      res.json(rolesWithPermissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Create new role
  app.post("/api/admin/roles", requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }
      
      const role = await complianceStorage.createRole({
        name,
        description,
      });
      
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create role" });
    }
  });

  // Update role
  app.patch("/api/admin/roles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      const role = await complianceStorage.updateRole(id, {
        name,
        description,
      });
      
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update role" });
    }
  });

  // Delete role
  app.delete("/api/admin/roles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      await complianceStorage.deleteRole(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete role" });
    }
  });

  // Get all permissions
  app.get("/api/admin/permissions", requireAdmin, async (req, res) => {
    try {
      const permissions = await complianceStorage.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Add permission to role
  app.post("/api/admin/roles/:roleId/permissions", requireAdmin, async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissionId } = req.body;
      
      if (!permissionId) {
        return res.status(400).json({ error: "permissionId is required" });
      }
      
      await complianceStorage.addRolePermission(roleId, permissionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to add permission" });
    }
  });

  // Remove permission from role
  app.delete("/api/admin/roles/:roleId/permissions/:permissionId", requireAdmin, async (req, res) => {
    try {
      const { roleId, permissionId } = req.params;
      
      await complianceStorage.removeRolePermission(roleId, permissionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to remove permission" });
    }
  });

  // Get user roles
  app.get("/api/admin/users/:userId/roles", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const roles = await complianceStorage.getUserRoles(userId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Assign role to user
  app.post("/api/admin/users/:userId/roles", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      
      if (!roleId) {
        return res.status(400).json({ error: "roleId is required" });
      }
      
      await complianceStorage.assignUserRole(userId, roleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to assign role" });
    }
  });

  // Remove role from user
  app.delete("/api/admin/users/:userId/roles/:roleId", requireAdmin, async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      
      await complianceStorage.removeUserRole(userId, roleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to remove role" });
    }
  });

  return httpServer;
}
