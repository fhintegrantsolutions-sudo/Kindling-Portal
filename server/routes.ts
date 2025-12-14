import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertNoteSchema, 
  insertParticipationSchema,
  insertBeneficiarySchema,
  insertDocumentSchema,
  insertParticipationDocumentSchema,
  insertNoteRegistrationSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
      const funding = await storage.getNotesByStatus("Funding");
      const opportunity = await storage.getNotesByStatus("Opportunity");
      res.json([...funding, ...opportunity]);
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
      res.json(note);
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

  // Get demo user's participations (for now, hardcoded demo user)
  app.get("/api/my-participations", async (req, res) => {
    try {
      const demoUser = await storage.getUserByUsername("kdavidsh");
      if (!demoUser) {
        return res.status(404).json({ error: "Demo user not found" });
      }
      const participations = await storage.getParticipationsByUser(demoUser.id);
      res.json(participations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participations" });
    }
  });

  // Get current user profile (demo user for now)
  app.get("/api/me", async (req, res) => {
    try {
      const demoUser = await storage.getUserByUsername("kdavidsh");
      if (!demoUser) {
        return res.status(404).json({ error: "Demo user not found" });
      }
      const { password, ...userWithoutPassword } = demoUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get current user's beneficiaries
  app.get("/api/my-beneficiaries", async (req, res) => {
    try {
      const demoUser = await storage.getUserByUsername("kdavidsh");
      if (!demoUser) {
        return res.status(404).json({ error: "Demo user not found" });
      }
      const beneficiaries = await storage.getBeneficiariesByUser(demoUser.id);
      res.json(beneficiaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch beneficiaries" });
    }
  });

  // Get current user's documents
  app.get("/api/my-documents", async (req, res) => {
    try {
      const demoUser = await storage.getUserByUsername("kdavidsh");
      if (!demoUser) {
        return res.status(404).json({ error: "Demo user not found" });
      }
      const documents = await storage.getDocumentsByUser(demoUser.id);
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
      res.json(participation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participation" });
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

  // Note Registrations
  app.post("/api/registrations", async (req, res) => {
    try {
      const demoUser = await storage.getUserByUsername("kdavidsh");
      const registrationData = {
        ...req.body,
        userId: demoUser?.id || null,
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

  return httpServer;
}
