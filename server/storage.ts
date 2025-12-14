import { 
  users, 
  notes, 
  participations, 
  payments,
  beneficiaries,
  documents,
  type User, 
  type InsertUser,
  type Note,
  type InsertNote,
  type Participation,
  type InsertParticipation,
  type Payment,
  type InsertPayment,
  type Beneficiary,
  type InsertBeneficiary,
  type Document,
  type InsertDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Notes
  getNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  getNotesByStatus(status: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  
  // Participations
  getParticipationsByUser(userId: string): Promise<(Participation & { note: Note })[]>;
  getParticipationsByNote(noteId: string): Promise<Participation[]>;
  createParticipation(participation: InsertParticipation): Promise<Participation>;
  updateParticipation(id: string, participation: Partial<InsertParticipation>): Promise<Participation | undefined>;
  
  // Payments
  getPaymentsByParticipation(participationId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  // Beneficiaries
  getBeneficiariesByUser(userId: string): Promise<Beneficiary[]>;
  createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary>;
  updateBeneficiary(id: string, beneficiary: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined>;
  deleteBeneficiary(id: string): Promise<void>;
  
  // Documents
  getDocumentsByUser(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    return await db.select().from(notes).orderBy(desc(notes.createdAt));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }

  async getNotesByStatus(status: string): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.status, status)).orderBy(desc(notes.createdAt));
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values(insertNote)
      .returning();
    return note;
  }

  async updateNote(id: string, noteUpdate: Partial<InsertNote>): Promise<Note | undefined> {
    const [note] = await db
      .update(notes)
      .set(noteUpdate)
      .where(eq(notes.id, id))
      .returning();
    return note || undefined;
  }

  // Participations
  async getParticipationsByUser(userId: string): Promise<(Participation & { note: Note })[]> {
    const results = await db
      .select()
      .from(participations)
      .leftJoin(notes, eq(participations.noteId, notes.id))
      .where(eq(participations.userId, userId))
      .orderBy(desc(participations.createdAt));
    
    return results.map(r => ({
      ...r.participations,
      note: r.notes!,
    }));
  }

  async getParticipationsByNote(noteId: string): Promise<Participation[]> {
    return await db.select().from(participations).where(eq(participations.noteId, noteId));
  }

  async createParticipation(insertParticipation: InsertParticipation): Promise<Participation> {
    const [participation] = await db
      .insert(participations)
      .values(insertParticipation)
      .returning();
    return participation;
  }

  async updateParticipation(id: string, participationUpdate: Partial<InsertParticipation>): Promise<Participation | undefined> {
    const [participation] = await db
      .update(participations)
      .set(participationUpdate)
      .where(eq(participations.id, id))
      .returning();
    return participation || undefined;
  }

  // Payments
  async getPaymentsByParticipation(participationId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.participationId, participationId)).orderBy(desc(payments.paymentDate));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values(insertPayment)
      .returning();
    return payment;
  }

  async updatePayment(id: string, paymentUpdate: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set(paymentUpdate)
      .where(eq(payments.id, id))
      .returning();
    return payment || undefined;
  }

  // Beneficiaries
  async getBeneficiariesByUser(userId: string): Promise<Beneficiary[]> {
    return await db.select().from(beneficiaries).where(eq(beneficiaries.userId, userId));
  }

  async createBeneficiary(insertBeneficiary: InsertBeneficiary): Promise<Beneficiary> {
    const [beneficiary] = await db
      .insert(beneficiaries)
      .values(insertBeneficiary)
      .returning();
    return beneficiary;
  }

  async updateBeneficiary(id: string, beneficiaryUpdate: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined> {
    const [beneficiary] = await db
      .update(beneficiaries)
      .set(beneficiaryUpdate)
      .where(eq(beneficiaries.id, id))
      .returning();
    return beneficiary || undefined;
  }

  async deleteBeneficiary(id: string): Promise<void> {
    await db.delete(beneficiaries).where(eq(beneficiaries.id, id));
  }

  // Documents
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.uploadedAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(id: string, documentUpdate: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(documentUpdate)
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }
}

export const storage = new DatabaseStorage();
