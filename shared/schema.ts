import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

// Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  role: z.enum(["admin", "lender"]).default("lender"),
});

export const insertNoteSchema = z.object({
  noteId: z.string().min(1),
  borrower: z.string().min(1),
  title: z.string().min(1),
  principal: z.string(),
  rate: z.string(),
  termMonths: z.number().int().positive(),
  termYears: z.number().optional(),
  projectType: z.string().min(1),
  loanPaymentStatus: z.string().default("Current"),
  contractDate: z.union([z.date(), z.string()]).optional(),
  paymentStartDate: z.union([z.date(), z.string()]).optional(),
  maturityDate: z.union([z.date(), z.string()]).optional(),
  fundingStartDate: z.union([z.date(), z.string()]).optional(),
  fundingEndDate: z.union([z.date(), z.string()]).optional(),
  fundingWindowEnd: z.union([z.date(), z.string()]).optional(),
  firstPaymentDate: z.union([z.date(), z.string()]).optional(),
  monthlyPayment: z.string().optional(),
  status: z.string().default("Active"),
  clientStatus: z.string().default("Available"),
  type: z.string(),
  interestType: z.string().default("Amortized"),
  description: z.string().optional(),
  targetRaise: z.string().optional(),
  minInvestment: z.string().optional(),
});

export const insertParticipationSchema = z.object({
  userId: z.string().min(1),
  noteId: z.string().min(1),
  investedAmount: z.string(),
  purchaseDate: z.union([z.date(), z.string()]),
  status: z.string().default("Active"),
  fundingStatus: z.object({
    received: z.boolean().default(false),
    deposited: z.boolean().default(false),
    cleared: z.boolean().default(false),
  }).optional(),
});

export const insertPaymentSchema = z.object({
  participationId: z.string().min(1),
  paymentDate: z.union([z.date(), z.string()]),
  principalAmount: z.string(),
  interestAmount: z.string(),
  status: z.string().default("Scheduled"),
});

export const insertBeneficiarySchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  relation: z.string().min(1),
  percentage: z.number().int().min(0).max(100),
  type: z.string().default("Primary"),
  dob: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const insertDocumentSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  status: z.string().default("Pending"),
});

export const insertParticipationDocumentSchema = z.object({
  participationId: z.string().min(1),
  type: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
});

export const insertNoteRegistrationSchema = z.object({
  noteId: z.string().min(1),
  userId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  entityType: z.string().min(1),
  nameForAgreement: z.string().min(1),
  mailingAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  investmentAmount: z.string(),
  bankName: z.string().min(1),
  bankAccountType: z.string().min(1),
  bankAccountNumber: z.string().min(1),
  bankRoutingNumber: z.string().min(1),
  bankAccountAddress: z.string().optional(),
  acknowledgeLender: z.boolean().default(false),
  status: z.string().default("Pending"),
});

export const insertActivitySchema = z.object({
  userId: z.string().min(1),
  participationId: z.string().optional(),
  type: z.string().min(1),
  description: z.string().min(1),
  amount: z.string(),
  noteId: z.string().optional(),
  activityDate: z.union([z.date(), z.string()]),
});

export const insertBorrowerSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  taxId: z.string().optional(),
  businessType: z.string().optional(),
  notes: z.string().optional(),
});

// TypeScript types for Firestore documents
export type InsertUser = z.infer<typeof insertUserSchema>;
export interface User extends InsertUser {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertNote = z.infer<typeof insertNoteSchema>;
export interface Note extends Omit<InsertNote, 'contractDate' | 'paymentStartDate' | 'maturityDate' | 'fundingStartDate' | 'fundingEndDate' | 'fundingWindowEnd' | 'firstPaymentDate'> {
  id: string;
  contractDate?: Date | Timestamp;
  paymentStartDate?: Date | Timestamp;
  maturityDate?: Date | Timestamp;
  fundingStartDate?: Date | Timestamp;
  fundingEndDate?: Date | Timestamp;
  fundingWindowEnd?: Date | Timestamp;
  firstPaymentDate?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertParticipation = z.infer<typeof insertParticipationSchema>;
export interface Participation extends Omit<InsertParticipation, 'purchaseDate'> {
  id: string;
  purchaseDate: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export interface Payment extends Omit<InsertPayment, 'paymentDate'> {
  id: string;
  paymentDate: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export interface Beneficiary extends InsertBeneficiary {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export interface Document extends InsertDocument {
  id: string;
  uploadedAt: Date | Timestamp;
}

export type InsertParticipationDocument = z.infer<typeof insertParticipationDocumentSchema>;
export interface ParticipationDocument extends InsertParticipationDocument {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertNoteRegistration = z.infer<typeof insertNoteRegistrationSchema>;
export interface NoteRegistration extends InsertNoteRegistration {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export interface Activity extends Omit<InsertActivity, 'activityDate'> {
  id: string;
  activityDate: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertBorrower = z.infer<typeof insertBorrowerSchema>;
export interface Borrower extends InsertBorrower {
  id: string;
  createdAt: Date | Timestamp;
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: "users",
  NOTES: "notes",
  PARTICIPATIONS: "participations",
  PAYMENTS: "payments",
  BENEFICIARIES: "beneficiaries",
  DOCUMENTS: "documents",
  PARTICIPATION_DOCUMENTS: "participation_documents",
  NOTE_REGISTRATIONS: "note_registrations",
  ACTIVITIES: "activities",
  BORROWERS: "borrowers",
} as const;
