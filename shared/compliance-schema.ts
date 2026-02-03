import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
  mfaEnabled: z.boolean().default(false),
  mfaSecret: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended", "pending_verification"]).default("pending_verification"),
  emailVerified: z.boolean().default(false),
  lastLoginAt: z.union([z.date(), z.string()]).optional(),
  failedLoginAttempts: z.number().default(0),
  lockedUntil: z.union([z.date(), z.string()]).optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

export const insertSessionSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  refreshToken: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.union([z.date(), z.string()]),
  createdAt: z.union([z.date(), z.string()]).optional(),
});

export const insertPasswordResetTokenSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.union([z.date(), z.string()]),
  usedAt: z.union([z.date(), z.string()]).optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
});

export const insertEmailVerificationTokenSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.union([z.date(), z.string()]),
  verifiedAt: z.union([z.date(), z.string()]).optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export interface User extends Omit<InsertUser, 'lastLoginAt' | 'lockedUntil' | 'createdAt' | 'updatedAt'> {
  id: string;
  lastLoginAt?: Date | Timestamp;
  lockedUntil?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export type InsertSession = z.infer<typeof insertSessionSchema>;
export interface Session extends Omit<InsertSession, 'expiresAt' | 'createdAt'> {
  id: string;
  expiresAt: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export interface PasswordResetToken extends Omit<InsertPasswordResetToken, 'expiresAt' | 'usedAt' | 'createdAt'> {
  id: string;
  expiresAt: Date | Timestamp;
  usedAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export interface EmailVerificationToken extends Omit<InsertEmailVerificationToken, 'expiresAt' | 'verifiedAt' | 'createdAt'> {
  id: string;
  expiresAt: Date | Timestamp;
  verifiedAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

// ============================================
// ROLES & PERMISSIONS (RBAC)
// ============================================

export const insertRoleSchema = z.object({
  name: z.string().min(1), // e.g., "admin", "lender", "borrower", "accountant"
  displayName: z.string().min(1),
  description: z.string().optional(),
  isSystem: z.boolean().default(false), // system roles can't be deleted
});

export const insertPermissionSchema = z.object({
  resource: z.string().min(1), // e.g., "notes", "payments", "users"
  action: z.enum(["create", "read", "update", "delete", "approve"]),
  description: z.string().optional(),
});

export const insertRolePermissionSchema = z.object({
  roleId: z.string().min(1),
  permissionId: z.string().min(1),
});

export const insertUserRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
  assignedBy: z.string().min(1), // userId who assigned this role
  assignedAt: z.union([z.date(), z.string()]).optional(),
});

// ============================================
// ENTITIES (Proper KYC/Identity Management)
// ============================================

export const insertAddressSchema = z.object({
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().default("USA"),
  type: z.enum(["mailing", "physical", "business"]).default("mailing"),
});

export const insertEntitySchema = z.object({
  entityType: z.enum(["individual", "llc", "corporation", "trust", "partnership"]),
  legalName: z.string().min(1),
  dba: z.string().optional(), // doing business as
  taxId: z.string().optional(), // SSN or EIN
  taxIdType: z.enum(["ssn", "ein"]).optional(),
  dateOfBirth: z.union([z.date(), z.string()]).optional(), // for individuals
  formationDate: z.union([z.date(), z.string()]).optional(), // for entities
  formationState: z.string().optional(),
  addressId: z.string().optional(),
  primaryPhone: z.string().optional(),
  primaryEmail: z.string().email().optional(),
  kycStatus: z.enum(["pending", "verified", "rejected", "expired"]).default("pending"),
  kycVerifiedAt: z.union([z.date(), z.string()]).optional(),
  kycVerifiedBy: z.string().optional(), // userId who verified
  accreditedInvestor: z.boolean().default(false),
  accreditationVerifiedAt: z.union([z.date(), z.string()]).optional(),
  status: z.enum(["active", "suspended", "closed"]).default("active"),
});

export const insertEntityUserSchema = z.object({
  entityId: z.string().min(1),
  userId: z.string().min(1),
  relationship: z.enum(["owner", "authorized_signer", "beneficial_owner", "officer", "representative"]),
  title: z.string().optional(), // e.g., "CEO", "Managing Member"
  ownershipPercentage: z.number().min(0).max(100).optional(),
  canSign: z.boolean().default(false),
  canTransact: z.boolean().default(false),
  effectiveDate: z.union([z.date(), z.string()]).optional(),
  endDate: z.union([z.date(), z.string()]).optional(),
});

// ============================================
// LENDERS & BORROWERS (Linked to Entities)
// ============================================

export const insertLenderSchema = z.object({
  entityId: z.string().min(1),
  lenderType: z.enum(["individual", "institutional"]).default("individual"),
  investmentExperience: z.enum(["none", "limited", "moderate", "extensive"]).optional(),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  preferredInvestmentSize: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

export const insertBorrowerSchema = z.object({
  entityId: z.string().min(1),
  borrowerType: z.enum(["individual", "business"]).default("business"),
  creditScore: z.number().optional(),
  annualRevenue: z.string().optional(),
  yearsInBusiness: z.number().optional(),
  industry: z.string().optional(),
  status: z.enum(["active", "inactive", "default"]).default("active"),
});

// ============================================
// DOCUMENTS & ACKNOWLEDGEMENTS
// ============================================

export const insertDocumentSchema = z.object({
  entityId: z.string().min(1),
  documentType: z.enum([
    "drivers_license",
    "passport",
    "operating_agreement",
    "articles_of_incorporation",
    "w9",
    "accreditation_letter",
    "bank_statement",
    "promissory_note",
    "security_agreement",
    "disclosure",
    "other"
  ]),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().min(1), // userId
  status: z.enum(["pending_review", "approved", "rejected", "expired"]).default("pending_review"),
  reviewedBy: z.string().optional(), // userId
  reviewedAt: z.union([z.date(), z.string()]).optional(),
  expiresAt: z.union([z.date(), z.string()]).optional(),
  notes: z.string().optional(),
});

export const insertAcknowledgementSchema = z.object({
  documentId: z.string().min(1),
  userId: z.string().min(1),
  entityId: z.string().min(1),
  acknowledgedAt: z.union([z.date(), z.string()]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  documentVersion: z.string().optional(), // track which version was acknowledged
  signatureData: z.string().optional(), // for e-signatures
});

// ============================================
// AUDIT LOGS
// ============================================

export const insertAuditLogSchema = z.object({
  userId: z.string().min(1),
  action: z.string().min(1), // e.g., "user.login", "note.created", "payment.approved"
  resource: z.string().optional(), // e.g., "notes", "payments"
  resourceId: z.string().optional(), // ID of the affected resource
  entityId: z.string().optional(), // entity context
  changes: z.record(z.any()).optional(), // before/after values
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  status: z.enum(["success", "failure", "warning"]).default("success"),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional(), // additional context
});

// ============================================
// ACCOUNTS & LEDGER (Double-Entry Accounting)
// ============================================

export const insertAccountSchema = z.object({
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
  accountType: z.enum([
    "asset",
    "liability",
    "equity",
    "revenue",
    "expense",
    "contra_asset",
    "contra_liability"
  ]),
  subType: z.string().optional(), // e.g., "cash", "notes_receivable", "interest_income"
  entityId: z.string().optional(), // for entity-specific accounts
  parentAccountId: z.string().optional(), // for sub-accounts
  currency: z.string().default("USD"),
  status: z.enum(["active", "inactive", "closed"]).default("active"),
});

export const insertLedgerEventSchema = z.object({
  eventType: z.string().min(1), // e.g., "investment", "payment", "transfer"
  description: z.string().min(1),
  initiatedBy: z.string().min(1), // userId
  entityId: z.string().optional(),
  referenceType: z.string().optional(), // e.g., "note", "payment"
  referenceId: z.string().optional(),
  eventDate: z.union([z.date(), z.string()]),
  status: z.enum(["pending", "posted", "reversed", "failed"]).default("pending"),
  metadata: z.record(z.any()).optional(),
});

export const insertLedgerEntrySchema = z.object({
  ledgerEventId: z.string().min(1),
  accountId: z.string().min(1),
  entryType: z.enum(["debit", "credit"]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  description: z.string().optional(),
  entryDate: z.union([z.date(), z.string()]),
  reconciled: z.boolean().default(false),
  reconciledAt: z.union([z.date(), z.string()]).optional(),
});

// ============================================
// TypeScript Types
// ============================================

export type InsertRole = z.infer<typeof insertRoleSchema>;
export interface Role extends InsertRole {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export interface Permission extends InsertPermission {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export interface RolePermission extends InsertRolePermission {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export interface UserRole extends Omit<InsertUserRole, 'assignedAt'> {
  id: string;
  assignedAt: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export interface Address extends InsertAddress {
  id: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type InsertEntity = z.infer<typeof insertEntitySchema>;
export interface Entity extends Omit<InsertEntity, 'dateOfBirth' | 'formationDate' | 'kycVerifiedAt' | 'accreditationVerifiedAt'> {
  id: string;
  dateOfBirth?: Date | Timestamp;
  formationDate?: Date | Timestamp;
  kycVerifiedAt?: Date | Timestamp;
  accreditationVerifiedAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type InsertEntityUser = z.infer<typeof insertEntityUserSchema>;
export interface EntityUser extends Omit<InsertEntityUser, 'effectiveDate' | 'endDate'> {
  id: string;
  effectiveDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertLender = z.infer<typeof insertLenderSchema>;
export interface Lender extends InsertLender {
  id: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type InsertBorrower = z.infer<typeof insertBorrowerSchema>;
export interface Borrower extends InsertBorrower {
  id: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export interface Document extends Omit<InsertDocument, 'reviewedAt' | 'expiresAt'> {
  id: string;
  reviewedAt?: Date | Timestamp;
  expiresAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type InsertAcknowledgement = z.infer<typeof insertAcknowledgementSchema>;
export interface Acknowledgement extends Omit<InsertAcknowledgement, 'acknowledgedAt'> {
  id: string;
  acknowledgedAt: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export interface AuditLog extends InsertAuditLog {
  id: string;
  createdAt: Date | Timestamp;
}

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export interface Account extends InsertAccount {
  id: string;
  balance: number; // calculated field
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type InsertLedgerEvent = z.infer<typeof insertLedgerEventSchema>;
export interface LedgerEvent extends Omit<InsertLedgerEvent, 'eventDate'> {
  id: string;
  eventDate: Date | Timestamp;
  createdAt: Date | Timestamp;
  postedAt?: Date | Timestamp;
}

export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export interface LedgerEntry extends Omit<InsertLedgerEntry, 'entryDate' | 'reconciledAt'> {
  id: string;
  entryDate: Date | Timestamp;
  reconciledAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

// Collection names
export const COMPLIANCE_COLLECTIONS = {
  USERS: "users",
  SESSIONS: "sessions",
  PASSWORD_RESET_TOKENS: "password_reset_tokens",
  EMAIL_VERIFICATION_TOKENS: "email_verification_tokens",
  ROLES: "roles",
  PERMISSIONS: "permissions",
  ROLE_PERMISSIONS: "role_permissions",
  USER_ROLES: "user_roles",
  ADDRESSES: "addresses",
  ENTITIES: "entities",
  ENTITY_USERS: "entity_users",
  LENDERS: "lenders",
  BORROWERS: "borrowers",
  DOCUMENTS: "documents",
  ACKNOWLEDGEMENTS: "acknowledgements",
  AUDIT_LOGS: "audit_logs",
  ACCOUNTS: "accounts",
  LEDGER_EVENTS: "ledger_events",
  LEDGER_ENTRIES: "ledger_entries",
} as const;
