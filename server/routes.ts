import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
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
import { sendWelcomeEmail, sendAccountingNotification, sendPaymentConfirmation, sendAccountSetupEmail } from "./notifications";
import { randomUUID } from "crypto";
import { auditMiddleware, setUserContext } from "./audit-middleware";
import { complianceStorage } from "./compliance-storage";
import { referralStorage } from "./referral-storage";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware to require admin role (checks session, then falls back to header for dev tools)
async function requireAdmin(req: any, res: any, next: any) {
  try {
    let user;

    // Check session first
    if (req.session?.userId) {
      user = await storage.getUser(req.session.userId);
    }

    // Fall back to x-username header (for dev tools / admin UI that still uses headers)
    if (!user) {
      const identifier = req.headers["x-username"];
      if (identifier) {
        user = await storage.getUserByUsername(identifier as string);
        if (!user) user = await storage.getUserByEmail(identifier as string);
        if (!user && identifier === "admin") user = await storage.getUserByEmail("admin@kindling.com");
      }
    }

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = { id: user.id.toString(), email: user.email || user.username, name: user.name || user.username };
    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // Apply audit middleware to all routes
  app.use(setUserContext);
  app.use(auditMiddleware);

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================

  // Login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Support both bcrypt-hashed and plain-text passwords (for existing accounts)
      let passwordValid = false;
      if (user.password) {
        const isBcrypt = user.password.startsWith("$2");
        if (isBcrypt) {
          passwordValid = await bcrypt.compare(password, user.password);
        } else {
          passwordValid = password === user.password;
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Create session
      req.session.userId = user.id;
      req.session.isAdmin = user.role === "admin";

      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

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

  // Get current user profile (session-based)
  app.get("/api/me", async (req, res) => {
    try {
      let user;

      // Check session first
      if (req.session?.userId) {
        user = await storage.getUser(req.session.userId);
      }

      // Fall back to x-user-id header for dev/admin tools
      if (!user) {
        const headerUserId = req.headers["x-user-id"] as string;
        if (headerUserId) {
          user = await storage.getUser(headerUserId);
        }
      }

      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
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

  // Upload a document for a participation (admin only)
  // Accepts raw binary body (application/octet-stream) with type & filename as headers
  app.post(
    "/api/admin/participations/:id/documents",
    requireAdmin,
    express.raw({ type: "application/octet-stream", limit: "20mb" }),
    async (req: any, res: any) => {
      try {
        const type = req.query.type as string;
        const originalName = (req.headers["x-filename"] as string) || "upload";
        if (!type) return res.status(400).json({ error: "Document type is required" });
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "No file data received" });
        }
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const savedFilename = `${unique}-${originalName}`;
        const filePath = path.join(uploadDir, savedFilename);
        fs.writeFileSync(filePath, req.body);
        const doc = await storage.createParticipationDocument({
          participationId: req.params.id,
          type,
          fileName: originalName,
          fileUrl: `/uploads/${savedFilename}`,
        });
        res.status(201).json(doc);
      } catch (error) {
        res.status(500).json({ error: "Failed to upload document" });
      }
    }
  );

  // Delete a participation document (admin only)
  app.delete("/api/admin/participations/:participationId/documents/:docId", requireAdmin, async (req, res) => {
    try {
      const doc = await storage.getParticipationDocument(req.params.docId);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      await storage.deleteParticipationDocument(req.params.docId);
      // Remove file from disk if it's a local upload
      if (doc.fileUrl?.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), doc.fileUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
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

  // Get current user's referral code (session-based)
  app.get("/api/my-referral-code", async (req, res) => {
    try {
      let user;
      if (req.session?.userId) {
        user = await storage.getUser(req.session.userId);
      }
      if (!user) {
        const headerUserId = req.headers["x-user-id"] as string;
        if (headerUserId) user = await storage.getUser(headerUserId);
      }
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const referralCode = await referralStorage.getReferralCodeByUserId(user.id);
      if (!referralCode) return res.json(null);

      res.json(referralCode);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch referral code" });
    }
  });

  // ============================================================================
  // ACCESS REQUESTS (public — no auth required)
  // ============================================================================

  app.post("/api/access-requests", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, isTccMember, message, referralCode } = req.body;
      if (!firstName || !lastName || !email || !phone) {
        return res.status(400).json({ error: "First name, last name, email, and phone are required" });
      }

      const request = await storage.createAccessRequest({
        firstName,
        lastName,
        email,
        phone,
        isTccMember: !!isTccMember,
        message: message || undefined,
        referralCode: referralCode || undefined,
        status: "pending",
      });

      // If they came via a referral link, backfill the referral record with their name/email
      if (referralCode) {
        try {
          const allReferrals = await referralStorage.getReferrals();
          const match = allReferrals.find(
            r => r.referralCode === referralCode && !r.referredEmail
          );
          if (match) {
            await referralStorage.updateReferral(match.id, {
              referredName: `${firstName} ${lastName}`,
              referredEmail: email,
            });
          }
        } catch {
          // Non-fatal — don't fail the request over this
        }
      }

      return res.status(201).json(request);
    } catch (error) {
      console.error("Failed to create access request:", error);
      res.status(500).json({ error: "Failed to submit access request" });
    }
  });

  app.get("/api/admin/access-requests", requireAdmin, async (_req, res) => {
    try {
      const requests = await storage.getAccessRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch access requests" });
    }
  });

  app.patch("/api/admin/access-requests/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updated = await storage.updateAccessRequest(id, { status });
      if (!updated) return res.status(404).json({ error: "Access request not found" });

      // When approved, generate a setup token and email the applicant
      if (status === "approved") {
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
        await storage.createSetupToken({
          token,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          expiresAt,
          used: false,
        });

        const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5001}`;
        const setupUrl = `${baseUrl}/setup-account?token=${token}`;
        try {
          await sendAccountSetupEmail(updated.email, updated.firstName, setupUrl);
        } catch (emailError) {
          console.error("Failed to send setup email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update access request" });
    }
  });

  // Validate a setup token (GET /api/setup-account/validate?token=xxx)
  app.get("/api/setup-account/validate", async (req, res) => {
    try {
      const { token } = req.query as { token: string };
      if (!token) return res.status(400).json({ error: "Token is required" });

      const record = await storage.getSetupToken(token);
      if (!record) return res.status(404).json({ error: "Invalid or expired link" });
      if (record.used) {
        return res.status(410).json({
          error: "This setup link has already been used",
          email: record.email
        });
      }
      if (new Date() > new Date(record.expiresAt as Date)) {
        return res.status(410).json({
          error: "This setup link has expired",
          email: record.email
        });
      }

      res.json({ email: record.email, firstName: record.firstName, lastName: record.lastName });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate token" });
    }
  });

  // Request a new setup link (POST /api/setup-account/resend)
  app.post("/api/setup-account/resend", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      // Find the approved access request for this email
      const accessRequests = await storage.getAccessRequests();
      const accessRequest = accessRequests.find(
        (ar) => ar.email.toLowerCase() === email.toLowerCase() && ar.status === "approved"
      );

      if (!accessRequest) {
        return res.status(404).json({
          error: "No approved access request found for this email address"
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: "An account already exists for this email. Please try logging in."
        });
      }

      // Generate new setup token
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
      await storage.createSetupToken({
        token,
        email: accessRequest.email,
        firstName: accessRequest.firstName,
        lastName: accessRequest.lastName,
        phone: accessRequest.phone,
        expiresAt,
        used: false,
      });

      // Send setup email
      const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5001}`;
      const setupUrl = `${baseUrl}/setup-account?token=${token}`;
      try {
        await sendAccountSetupEmail(accessRequest.email, accessRequest.firstName, setupUrl);
      } catch (emailError) {
        console.error("Failed to send setup email:", emailError);
        return res.status(500).json({ error: "Failed to send email. Please try again later." });
      }

      res.json({
        success: true,
        message: "A new setup link has been sent to your email address"
      });
    } catch (error) {
      console.error("Resend setup link error:", error);
      res.status(500).json({ error: "Failed to send new setup link" });
    }
  });

  // Complete account setup (POST /api/setup-account)
  app.post("/api/setup-account", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ error: "Token and password are required" });
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

      const record = await storage.getSetupToken(token);
      if (!record) return res.status(404).json({ error: "Invalid or expired link" });
      if (record.used) return res.status(410).json({ error: "This setup link has already been used" });
      if (new Date() > new Date(record.expiresAt as Date)) {
        return res.status(410).json({ error: "This setup link has expired" });
      }

      // Check if user already exists with this email
      const existing = await storage.getUserByEmail(record.email);
      if (existing) return res.status(409).json({ error: "An account with this email already exists" });

      const hashedPassword = await bcrypt.hash(password, 12);
      const username = record.email.split("@")[0];

      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        name: `${record.firstName} ${record.lastName}`,
        email: record.email,
        phone: record.phone,
        role: "lender",
      });

      await storage.markSetupTokenUsed(token);

      // Log them in automatically
      (req.session as any).userId = newUser.id;

      res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
    } catch (error) {
      console.error("Account setup error:", error);
      res.status(500).json({ error: "Failed to create account" });
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

      // Extract user's first and last name from their full name
      const nameParts = user?.name?.split(" ") || [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { referralCode, ...bodyWithoutReferral } = req.body;
      const registrationData = {
        ...bodyWithoutReferral,
        userId: user?.id,
        // Get personal info and address from user's profile instead of form
        firstName,
        lastName,
        phone: user?.phone || "",
        email: user?.email || "",
        mailingAddress: user?.address || "",
        city: user?.city || "",
        state: user?.state || "",
        zipCode: user?.zipCode || "",
        investmentAmount: String(req.body.investmentAmount),
      };
      const validatedRegistration = insertNoteRegistrationSchema.parse(registrationData);
      const registration = await storage.createNoteRegistration(validatedRegistration);

      // If a referral code was provided, update the referral record to "invested"
      if (referralCode && user) {
        try {
          const code = await referralStorage.getReferralCodeByCode(referralCode);
          if (code && code.isActive) {
            const referrals = await referralStorage.getReferralsByReferrer(code.userId);
            const existingReferral = referrals.find(
              (r) => r.referredUserId === user!.id || r.referredEmail === user!.email
            );
            if (existingReferral) {
              await referralStorage.updateReferral(existingReferral.id, {
                status: "invested",
                firstInvestmentDate: new Date(),
                firstInvestmentAmount: Number(req.body.investmentAmount),
              });
            } else {
              await referralStorage.createReferral({
                referrerId: code.userId,
                referredUserId: user.id,
                referredEmail: user.email,
                referredName: user.name,
                referralCode,
                status: "invested",
                firstInvestmentDate: new Date(),
                firstInvestmentAmount: Number(req.body.investmentAmount),
              });
            }
            await referralStorage.updateReferralStats(code.userId);
          }
        } catch (referralError) {
          // Don't fail the registration if referral tracking fails
          console.error("Failed to update referral on registration:", referralError);
        }
      }

      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create registration" });
    }
  });

  // Update a note registration
  app.patch("/api/registrations/:id", async (req, res) => {
    try {
      const registrationId = req.params.id;
      const { investmentAmount } = req.body;

      if (!investmentAmount) {
        return res.status(400).json({ error: "Investment amount is required" });
      }

      const updatedRegistration = await storage.updateNoteRegistration(registrationId, {
        investmentAmount: String(investmentAmount),
      });

      res.json(updatedRegistration);
    } catch (error) {
      console.error("Update registration error:", error);
      res.status(500).json({ error: "Failed to update registration" });
    }
  });

  // Update a participation's invested amount
  app.patch("/api/participations/:id", async (req, res) => {
    try {
      const participationId = req.params.id;
      const { investedAmount } = req.body;

      console.log("PATCH /api/participations/:id - Received:", { participationId, investedAmount, body: req.body });

      if (!investedAmount) {
        return res.status(400).json({ error: "Invested amount is required" });
      }

      const updateData = { investedAmount: String(investedAmount) };
      console.log("PATCH /api/participations/:id - Updating with:", updateData);

      const updatedParticipation = await storage.updateParticipation(participationId, updateData);

      console.log("PATCH /api/participations/:id - Updated participation:", updatedParticipation);

      res.json(updatedParticipation);
    } catch (error) {
      console.error("Update participation error:", error);
      res.status(500).json({ error: "Failed to update participation" });
    }
  });

  // Decline a participation (set status to Declined)
  app.patch("/api/participations/:id/decline", async (req, res) => {
    try {
      const participationId = req.params.id;
      console.log("PATCH /api/participations/:id/decline - Declining:", participationId);

      const participation = await storage.getParticipation(participationId);
      if (!participation) {
        return res.status(404).json({ error: "Participation not found" });
      }

      const updatedParticipation = await storage.updateParticipation(participationId, {
        status: "Declined"
      });

      if (!updatedParticipation) {
        console.error("PATCH /api/participations/:id/decline - Update returned undefined");
        return res.status(500).json({ error: "Failed to update participation status" });
      }

      console.log("PATCH /api/participations/:id/decline - Declined successfully", {
        id: updatedParticipation.id,
        status: updatedParticipation.status
      });

      res.json(updatedParticipation);
    } catch (error) {
      console.error("Decline participation error:", error);
      res.status(500).json({ error: "Failed to decline participation" });
    }
  });

  // Reactivate a declined participation (set status back to Active)
  app.patch("/api/participations/:id/reactivate", async (req, res) => {
    try {
      const participationId = req.params.id;
      console.log("PATCH /api/participations/:id/reactivate - Reactivating:", participationId);

      const participation = await storage.getParticipation(participationId);
      if (!participation) {
        return res.status(404).json({ error: "Participation not found" });
      }

      const updatedParticipation = await storage.updateParticipation(participationId, {
        status: "Active"
      });
      console.log("PATCH /api/participations/:id/reactivate - Reactivated successfully");

      res.json(updatedParticipation);
    } catch (error) {
      console.error("Reactivate participation error:", error);
      res.status(500).json({ error: "Failed to reactivate participation" });
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
  app.post("/api/admin/users/:userId/roles", requireAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        return res.status(400).json({ error: "roleId is required" });
      }

      await complianceStorage.assignUserRole({
        userId,
        roleId,
        assignedBy: req.user.id,
      });
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

  // Get user's primary entity with type
  app.get("/api/admin/users/:userId/entity", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      // Get all entities associated with the user
      const entities = await complianceStorage.getEntitiesByUser(userId);

      if (entities.length === 0) {
        return res.json({ entity: null, entityCount: 0 });
      }

      // Get the primary entity (first one with 'owner' relationship, or just the first)
      const entityUsers = await complianceStorage.getUserEntities(userId);
      const primaryEntityUser = entityUsers.find(eu => eu.relationship === 'owner') || entityUsers[0];
      const primaryEntity = entities.find(e => e.id === primaryEntityUser?.entityId) || entities[0];

      // Get lender info to enrich response
      const lender = await complianceStorage.getLenderByEntityId(primaryEntity.id);

      res.json({
        entity: primaryEntity,
        entityCount: entities.length,
        relationship: primaryEntityUser?.relationship,
        lender: lender || null,
      });
    } catch (error) {
      console.error("Failed to fetch user entity:", error);
      res.status(500).json({ error: "Failed to fetch user entity" });
    }
  });

  // ============================================================================
  // REFERRAL ROUTES - Referral Tracking System
  // ============================================================================

  // Get all referral codes
  app.get("/api/admin/referral-codes", requireAdmin, async (req, res) => {
    try {
      const referralCodes = await referralStorage.getReferralCodes();

      // Enrich with user information
      const users = await storage.getUsers();
      const enrichedCodes = referralCodes.map(code => {
        const user = users.find(u => u.id === code.userId);
        return {
          ...code,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      });

      res.json(enrichedCodes);
    } catch (error) {
      console.error("Failed to fetch referral codes:", error);
      res.status(500).json({ error: "Failed to fetch referral codes" });
    }
  });

  // Get referral code for a user
  app.get("/api/admin/users/:userId/referral-code", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const referralCode = await referralStorage.getReferralCodeByUserId(userId);

      // Return null if no code exists (don't auto-generate)
      res.json(referralCode || null);
    } catch (error) {
      console.error("Failed to fetch referral code:", error);
      res.status(500).json({ error: "Failed to fetch referral code" });
    }
  });

  // Create or update referral code for a user
  app.post("/api/admin/users/:userId/referral-code", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { code, isActive } = req.body;

      console.log("POST referral-code:", { userId, code, isActive });

      const existingCode = await referralStorage.getReferralCodeByUserId(userId);
      console.log("Existing code:", existingCode);

      let result;
      if (existingCode) {
        // Update existing code
        result = await referralStorage.updateReferralCode(existingCode.id, {
          code: code || existingCode.code,
          isActive: isActive !== undefined ? isActive : existingCode.isActive,
        });
        console.log("Updated code:", result);
      } else {
        // Create new code
        const uniqueCode = code ? await referralStorage.generateUniqueCode(code) :
          await referralStorage.generateUniqueCode(userId.substring(0, 8));
        console.log("Generated unique code:", uniqueCode);

        result = await referralStorage.createReferralCode({
          userId,
          code: uniqueCode,
          isActive: isActive !== undefined ? isActive : true,
        });
        console.log("Created code:", result);
      }

      if (!result) {
        console.error("Result is null/undefined");
        return res.status(500).json({ error: "Failed to create/update referral code - result is null" });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Failed to create/update referral code:", error);
      return res.status(500).json({ error: "Failed to create/update referral code" });
    }
  });

  // Get all referrals with enriched data
  app.get("/api/admin/referrals", requireAdmin, async (req, res) => {
    try {
      const referrals = await referralStorage.getReferrals();
      const users = await storage.getUsers();

      // Enrich with referrer information
      const enrichedReferrals = referrals.map(referral => {
        const referrer = users.find(u => u.id === referral.referrerId);
        const referred = referral.referredUserId ? users.find(u => u.id === referral.referredUserId) : null;

        return {
          ...referral,
          referrer: referrer ? { id: referrer.id, name: referrer.name, email: referrer.email } : null,
          referred: referred ? { id: referred.id, name: referred.name, email: referred.email } : null,
        };
      });

      res.json(enrichedReferrals);
    } catch (error) {
      console.error("Failed to fetch referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Get referrals by referrer
  app.get("/api/admin/users/:userId/referrals", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const referrals = await referralStorage.getReferralsByReferrer(userId);

      // Enrich with referred user information
      const users = await storage.getUsers();
      const enrichedReferrals = referrals.map(referral => {
        const referred = referral.referredUserId ? users.find(u => u.id === referral.referredUserId) : null;

        return {
          ...referral,
          referred: referred ? { id: referred.id, name: referred.name, email: referred.email } : null,
        };
      });

      res.json(enrichedReferrals);
    } catch (error) {
      console.error("Failed to fetch user referrals:", error);
      res.status(500).json({ error: "Failed to fetch user referrals" });
    }
  });

  // Create a new referral (track when someone clicks a referral link)
  app.post("/api/referrals/track", async (req, res) => {
    try {
      const { referralCode, referredEmail, referredName } = req.body;

      if (!referralCode) {
        return res.status(400).json({ error: "Referral code is required" });
      }

      // Verify referral code exists and is active
      const code = await referralStorage.getReferralCodeByCode(referralCode);
      if (!code) {
        return res.status(404).json({ error: "Invalid referral code" });
      }

      if (!code.isActive) {
        return res.status(400).json({ error: "Referral code is inactive" });
      }

      // Increment click count
      await referralStorage.incrementClickCount(referralCode);

      // Create referral record
      const referral = await referralStorage.createReferral({
        referrerId: code.userId,
        referralCode,
        referredEmail,
        referredName,
        status: "pending",
      });

      res.json(referral);
    } catch (error) {
      console.error("Failed to track referral:", error);
      res.status(500).json({ error: "Failed to track referral" });
    }
  });

  // Update referral status
  app.patch("/api/admin/referrals/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        referredUserId,
        referredEmail,
        referredName,
        signupDate,
        firstInvestmentDate,
        firstInvestmentAmount,
        notes
      } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (referredUserId) updateData.referredUserId = referredUserId;
      if (referredEmail) updateData.referredEmail = referredEmail;
      if (referredName) updateData.referredName = referredName;
      if (signupDate) updateData.signupDate = new Date(signupDate);
      if (firstInvestmentDate) updateData.firstInvestmentDate = new Date(firstInvestmentDate);
      if (firstInvestmentAmount !== undefined) updateData.firstInvestmentAmount = firstInvestmentAmount;
      if (notes !== undefined) updateData.notes = notes;

      const referral = await referralStorage.updateReferral(id, updateData);

      if (!referral) {
        return res.status(404).json({ error: "Referral not found" });
      }

      // Update referrer's stats
      await referralStorage.updateReferralStats(referral.referrerId);

      res.json(referral);
    } catch (error) {
      console.error("Failed to update referral:", error);
      res.status(500).json({ error: "Failed to update referral" });
    }
  });

  // Get referral stats for a user
  app.get("/api/admin/users/:userId/referral-stats", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      // Update stats before returning
      const stats = await referralStorage.updateReferralStats(userId);

      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  return httpServer;
}
