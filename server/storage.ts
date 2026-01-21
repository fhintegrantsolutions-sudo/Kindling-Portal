import { 
  COLLECTIONS,
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
  type ParticipationDocument,
  type InsertParticipationDocument,
  type NoteRegistration,
  type InsertNoteRegistration,
  type Activity,
  type InsertActivity,
  type Borrower,
  type InsertBorrower,
} from "@shared/schema";
import { db } from "./db";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Helper function to convert Firestore Timestamp to Date
function timestampToDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return timestamp;
}

// Helper to convert Date to Timestamp for Firestore
function dateToTimestamp(date: Date | string | undefined): Timestamp | undefined {
  if (!date) return undefined;
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return undefined;
}

// Helper to safely get time from Date or Timestamp
function getTime(date: Date | Timestamp): number {
  if (date instanceof Timestamp) {
    return date.toMillis();
  }
  if (date instanceof Date) {
    return date.getTime();
  }
  return 0;
}

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
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
  
  // Participation Documents
  getDocumentsByParticipation(participationId: string): Promise<ParticipationDocument[]>;
  createParticipationDocument(document: InsertParticipationDocument): Promise<ParticipationDocument>;
  
  // Get single participation with note
  getParticipation(id: string): Promise<(Participation & { note: Note }) | undefined>;
  
  // Note Registrations
  createNoteRegistration(registration: InsertNoteRegistration): Promise<NoteRegistration>;
  getNoteRegistrationsByNote(noteId: string): Promise<NoteRegistration[]>;
  getNoteRegistrationsByUser(userId: string): Promise<NoteRegistration[]>;
  
  // Admin methods
  getAllNoteRegistrations(): Promise<NoteRegistration[]>;
  getNoteRegistration(id: string): Promise<NoteRegistration | undefined>;
  updateNoteRegistration(id: string, registration: Partial<InsertNoteRegistration>): Promise<NoteRegistration | undefined>;
  
  // Activities
  getActivitiesByUser(userId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Borrowers
  getBorrowers(): Promise<Borrower[]>;
  getBorrower(id: string): Promise<Borrower | undefined>;
  createBorrower(borrower: InsertBorrower): Promise<Borrower>;
  updateBorrower(id: string, borrower: Partial<InsertBorrower>): Promise<Borrower | undefined>;
  deleteBorrower(id: string): Promise<void>;
}

export class FirestoreStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    const snapshot = await db.collection(COLLECTIONS.USERS).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as User));
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await db.collection(COLLECTIONS.USERS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where("username", "==", username)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const docRef = db.collection(COLLECTIONS.USERS).doc();
    const userData = {
      ...insertUser,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(userData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as User;
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    const snapshot = await db.collection(COLLECTIONS.NOTES)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      contractDate: doc.data().contractDate ? timestampToDate(doc.data().contractDate) : undefined,
      paymentStartDate: doc.data().paymentStartDate ? timestampToDate(doc.data().paymentStartDate) : undefined,
      maturityDate: doc.data().maturityDate ? timestampToDate(doc.data().maturityDate) : undefined,
      fundingStartDate: doc.data().fundingStartDate ? timestampToDate(doc.data().fundingStartDate) : undefined,
      fundingEndDate: doc.data().fundingEndDate ? timestampToDate(doc.data().fundingEndDate) : undefined,
      createdAt: timestampToDate(doc.data().createdAt),
    } as Note));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const doc = await db.collection(COLLECTIONS.NOTES).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      contractDate: doc.data()?.contractDate ? timestampToDate(doc.data()?.contractDate) : undefined,
      paymentStartDate: doc.data()?.paymentStartDate ? timestampToDate(doc.data()?.paymentStartDate) : undefined,
      maturityDate: doc.data()?.maturityDate ? timestampToDate(doc.data()?.maturityDate) : undefined,
      fundingStartDate: doc.data()?.fundingStartDate ? timestampToDate(doc.data()?.fundingStartDate) : undefined,
      fundingEndDate: doc.data()?.fundingEndDate ? timestampToDate(doc.data()?.fundingEndDate) : undefined,
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Note;
  }

  async getNotesByStatus(status: string): Promise<Note[]> {
    const snapshot = await db.collection(COLLECTIONS.NOTES)
      .where("status", "==", status)
      .get();
    const notes = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        contractDate: data.contractDate ? timestampToDate(data.contractDate) : undefined,
        paymentStartDate: data.paymentStartDate ? timestampToDate(data.paymentStartDate) : undefined,
        maturityDate: data.maturityDate ? timestampToDate(data.maturityDate) : undefined,
        fundingStartDate: data.fundingStartDate ? timestampToDate(data.fundingStartDate) : undefined,
        fundingEndDate: data.fundingEndDate ? timestampToDate(data.fundingEndDate) : undefined,
        createdAt: timestampToDate(data.createdAt),
      } as Note;
    });
    // Sort in memory
    return notes.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const docRef = db.collection(COLLECTIONS.NOTES).doc();
    const noteData = {
      ...insertNote,
      contractDate: dateToTimestamp(insertNote.contractDate as any),
      paymentStartDate: dateToTimestamp(insertNote.paymentStartDate as any),
      maturityDate: dateToTimestamp(insertNote.maturityDate as any),
      fundingStartDate: dateToTimestamp(insertNote.fundingStartDate as any),
      fundingEndDate: dateToTimestamp(insertNote.fundingEndDate as any),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(noteData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      contractDate: doc.data()?.contractDate ? timestampToDate(doc.data()?.contractDate) : undefined,
      paymentStartDate: doc.data()?.paymentStartDate ? timestampToDate(doc.data()?.paymentStartDate) : undefined,
      maturityDate: doc.data()?.maturityDate ? timestampToDate(doc.data()?.maturityDate) : undefined,
      fundingStartDate: doc.data()?.fundingStartDate ? timestampToDate(doc.data()?.fundingStartDate) : undefined,
      fundingEndDate: doc.data()?.fundingEndDate ? timestampToDate(doc.data()?.fundingEndDate) : undefined,
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Note;
  }

  async updateNote(id: string, noteUpdate: Partial<InsertNote>): Promise<Note | undefined> {
    const docRef = db.collection(COLLECTIONS.NOTES).doc(id);
    const updateData: any = { ...noteUpdate };
    if (noteUpdate.contractDate) updateData.contractDate = dateToTimestamp(noteUpdate.contractDate as any);
    if (noteUpdate.paymentStartDate) updateData.paymentStartDate = dateToTimestamp(noteUpdate.paymentStartDate as any);
    if (noteUpdate.maturityDate) updateData.maturityDate = dateToTimestamp(noteUpdate.maturityDate as any);
    if (noteUpdate.fundingStartDate) updateData.fundingStartDate = dateToTimestamp(noteUpdate.fundingStartDate as any);
    if (noteUpdate.fundingEndDate) updateData.fundingEndDate = dateToTimestamp(noteUpdate.fundingEndDate as any);
    
    await docRef.update(updateData);
    return this.getNote(id);
  }

  // Participations
  async getParticipationsByUser(userId: string): Promise<(Participation & { note: Note })[]> {
    const snapshot = await db.collection(COLLECTIONS.PARTICIPATIONS)
      .where("userId", "==", userId)
      .get();
    
    const results = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const data = doc.data();
        const participation = {
          id: doc.id,
          ...data,
          purchaseDate: timestampToDate(data.purchaseDate),
          createdAt: timestampToDate(data.createdAt),
        } as Participation;
        
        const note = await this.getNote(data.noteId);
        return {
          ...participation,
          note: note!,
        };
      })
    );
    
    // Sort by createdAt in memory
    return results
      .filter((r: any) => r.note !== undefined)
      .sort((a: any, b: any) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  async getParticipationsByNote(noteId: string): Promise<Participation[]> {
    const snapshot = await db.collection(COLLECTIONS.PARTICIPATIONS)
      .where("noteId", "==", noteId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      purchaseDate: timestampToDate(doc.data().purchaseDate),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Participation));
  }

  async createParticipation(insertParticipation: InsertParticipation): Promise<Participation> {
    const docRef = db.collection(COLLECTIONS.PARTICIPATIONS).doc();
    const participationData = {
      ...insertParticipation,
      purchaseDate: dateToTimestamp(insertParticipation.purchaseDate as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(participationData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      purchaseDate: timestampToDate(doc.data()?.purchaseDate),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Participation;
  }

  async updateParticipation(id: string, participationUpdate: Partial<InsertParticipation>): Promise<Participation | undefined> {
    const docRef = db.collection(COLLECTIONS.PARTICIPATIONS).doc(id);
    const updateData: any = { ...participationUpdate };
    if (participationUpdate.purchaseDate) {
      updateData.purchaseDate = dateToTimestamp(participationUpdate.purchaseDate as any);
    }
    await docRef.update(updateData);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      purchaseDate: timestampToDate(doc.data()?.purchaseDate),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Participation;
  }

  // Payments
  async getPaymentsByParticipation(participationId: string): Promise<Payment[]> {
    const snapshot = await db.collection(COLLECTIONS.PAYMENTS)
      .where("participationId", "==", participationId)
      .get();
    const payments = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paymentDate: timestampToDate(data.paymentDate),
        createdAt: timestampToDate(data.createdAt),
      } as Payment;
    });
    return payments.sort((a, b) => getTime(b.paymentDate) - getTime(a.paymentDate));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const docRef = db.collection(COLLECTIONS.PAYMENTS).doc();
    const paymentData = {
      ...insertPayment,
      paymentDate: dateToTimestamp(insertPayment.paymentDate as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(paymentData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      paymentDate: timestampToDate(doc.data()?.paymentDate),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Payment;
  }

  async updatePayment(id: string, paymentUpdate: Partial<InsertPayment>): Promise<Payment | undefined> {
    const docRef = db.collection(COLLECTIONS.PAYMENTS).doc(id);
    const updateData: any = { ...paymentUpdate };
    if (paymentUpdate.paymentDate) {
      updateData.paymentDate = dateToTimestamp(paymentUpdate.paymentDate as any);
    }
    await docRef.update(updateData);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      paymentDate: timestampToDate(doc.data()?.paymentDate),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Payment;
  }

  // Beneficiaries
  async getBeneficiariesByUser(userId: string): Promise<Beneficiary[]> {
    const snapshot = await db.collection(COLLECTIONS.BENEFICIARIES)
      .where("userId", "==", userId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Beneficiary));
  }

  async createBeneficiary(insertBeneficiary: InsertBeneficiary): Promise<Beneficiary> {
    const docRef = db.collection(COLLECTIONS.BENEFICIARIES).doc();
    const beneficiaryData = {
      ...insertBeneficiary,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(beneficiaryData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Beneficiary;
  }

  async updateBeneficiary(id: string, beneficiaryUpdate: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined> {
    const docRef = db.collection(COLLECTIONS.BENEFICIARIES).doc(id);
    await docRef.update(beneficiaryUpdate);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Beneficiary;
  }

  async deleteBeneficiary(id: string): Promise<void> {
    await db.collection(COLLECTIONS.BENEFICIARIES).doc(id).delete();
  }

  // Documents
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    const snapshot = await db.collection(COLLECTIONS.DOCUMENTS)
      .where("userId", "==", userId)
      .get();
    const docs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uploadedAt: timestampToDate(data.uploadedAt),
      } as Document;
    });
    return docs.sort((a, b) => getTime(b.uploadedAt) - getTime(a.uploadedAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc();
    const documentData = {
      ...insertDocument,
      uploadedAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(documentData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      uploadedAt: timestampToDate(doc.data()?.uploadedAt),
    } as Document;
  }

  async updateDocument(id: string, documentUpdate: Partial<InsertDocument>): Promise<Document | undefined> {
    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc(id);
    await docRef.update(documentUpdate);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      uploadedAt: timestampToDate(doc.data()?.uploadedAt),
    } as Document;
  }

  // Participation Documents
  async getDocumentsByParticipation(participationId: string): Promise<ParticipationDocument[]> {
    const snapshot = await db.collection(COLLECTIONS.PARTICIPATION_DOCUMENTS)
      .where("participationId", "==", participationId)
      .get();
    const docs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
      } as ParticipationDocument;
    });
    return docs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  async createParticipationDocument(insertDoc: InsertParticipationDocument): Promise<ParticipationDocument> {
    const docRef = db.collection(COLLECTIONS.PARTICIPATION_DOCUMENTS).doc();
    const documentData = {
      ...insertDoc,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(documentData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as ParticipationDocument;
  }

  // Get single participation with note
  async getParticipation(id: string): Promise<(Participation & { note: Note }) | undefined> {
    const doc = await db.collection(COLLECTIONS.PARTICIPATIONS).doc(id).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data();
    if (!data) return undefined;
    
    const participation = {
      id: doc.id,
      ...data,
      purchaseDate: timestampToDate(data.purchaseDate),
      createdAt: timestampToDate(data.createdAt),
    } as Participation;
    
    const note = await this.getNote(data.noteId);
    if (!note) return undefined;
    
    return {
      ...participation,
      note,
    };
  }

  // Note Registrations
  async createNoteRegistration(insertRegistration: InsertNoteRegistration): Promise<NoteRegistration> {
    const docRef = db.collection(COLLECTIONS.NOTE_REGISTRATIONS).doc();
    const registrationData = {
      ...insertRegistration,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(registrationData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as NoteRegistration;
  }

  async getNoteRegistrationsByNote(noteId: string): Promise<NoteRegistration[]> {
    const snapshot = await db.collection(COLLECTIONS.NOTE_REGISTRATIONS)
      .where("noteId", "==", noteId)
      .get();
    const regs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
      } as NoteRegistration;
    });
    return regs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  async getNoteRegistrationsByUser(userId: string): Promise<NoteRegistration[]> {
    const snapshot = await db.collection(COLLECTIONS.NOTE_REGISTRATIONS)
      .where("userId", "==", userId)
      .get();
    const regs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
      } as NoteRegistration;
    });
    return regs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  // Admin methods
  async getAllNoteRegistrations(): Promise<NoteRegistration[]> {
    const snapshot = await db.collection(COLLECTIONS.NOTE_REGISTRATIONS).get();
    const regs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
      } as NoteRegistration;
    });
    return regs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  async getNoteRegistration(id: string): Promise<NoteRegistration | undefined> {
    const doc = await db.collection(COLLECTIONS.NOTE_REGISTRATIONS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as NoteRegistration;
  }

  async updateNoteRegistration(id: string, registration: Partial<InsertNoteRegistration>): Promise<NoteRegistration | undefined> {
    const docRef = db.collection(COLLECTIONS.NOTE_REGISTRATIONS).doc(id);
    await docRef.update(registration);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as NoteRegistration;
  }

  // Activities
  async getActivitiesByUser(userId: string, limit: number = 10): Promise<Activity[]> {
    const snapshot = await db.collection(COLLECTIONS.ACTIVITIES)
      .where("userId", "==", userId)
      .get();
    const activities = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        activityDate: timestampToDate(data.activityDate),
        createdAt: timestampToDate(data.createdAt),
      } as Activity;
    });
    return activities
      .sort((a, b) => getTime(b.activityDate) - getTime(a.activityDate))
      .slice(0, limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const docRef = db.collection(COLLECTIONS.ACTIVITIES).doc();
    const activityData = {
      ...insertActivity,
      activityDate: dateToTimestamp(insertActivity.activityDate as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(activityData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      activityDate: timestampToDate(doc.data()?.activityDate),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Activity;
  }

  // Borrowers
  async getBorrowers(): Promise<Borrower[]> {
    const snapshot = await db.collection(COLLECTIONS.BORROWERS).get();
    const borrowers = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
      } as Borrower;
    });
    return borrowers.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }

  async getBorrower(id: string): Promise<Borrower | undefined> {
    const doc = await db.collection(COLLECTIONS.BORROWERS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Borrower;
  }

  async createBorrower(insertBorrower: InsertBorrower): Promise<Borrower> {
    const docRef = db.collection(COLLECTIONS.BORROWERS).doc();
    const borrowerData = {
      ...insertBorrower,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(borrowerData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Borrower;
  }

  async updateBorrower(id: string, borrower: Partial<InsertBorrower>): Promise<Borrower | undefined> {
    const docRef = db.collection(COLLECTIONS.BORROWERS).doc(id);
    await docRef.update(borrower);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Borrower;
  }

  async deleteBorrower(id: string): Promise<void> {
    await db.collection(COLLECTIONS.BORROWERS).doc(id).delete();
  }
}

export const storage = new FirestoreStorage();
