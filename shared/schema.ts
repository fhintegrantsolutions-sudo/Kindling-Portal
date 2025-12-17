import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const investorEntities = pgTable("investor_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteId: text("note_id").notNull().unique(),
  borrower: text("borrower").notNull(),
  title: text("title").notNull(),
  principal: decimal("principal", { precision: 12, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  termMonths: integer("term_months").notNull(),
  contractDate: timestamp("contract_date"),
  paymentStartDate: timestamp("payment_start_date"),
  maturityDate: timestamp("maturity_date"),
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("Active"),
  type: text("type").notNull(),
  interestType: text("interest_type").notNull().default("Amortized"),
  description: text("description"),
  targetRaise: decimal("target_raise", { precision: 12, scale: 2 }),
  minInvestment: decimal("min_investment", { precision: 12, scale: 2 }),
  fundingStartDate: timestamp("funding_start_date"),
  fundingEndDate: timestamp("funding_end_date"),
  firstPaymentDate: text("first_payment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participations = pgTable("participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteId: varchar("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  entityId: varchar("entity_id").references(() => investorEntities.id, { onDelete: "set null" }),
  investedAmount: decimal("invested_amount", { precision: 12, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participationId: varchar("participation_id").notNull().references(() => participations.id, { onDelete: "cascade" }),
  paymentDate: timestamp("payment_date").notNull(),
  principalAmount: decimal("principal_amount", { precision: 12, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("Scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beneficiaries = pgTable("beneficiaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  percentage: integer("percentage").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  status: text("status").notNull().default("Pending"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const participationDocuments = pgTable("participation_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participationId: varchar("participation_id").notNull().references(() => participations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const noteRegistrations = pgTable("note_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteId: varchar("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  entityType: text("entity_type").notNull(),
  nameForAgreement: text("name_for_agreement").notNull(),
  mailingAddress: text("mailing_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  investmentAmount: decimal("investment_amount", { precision: 12, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  bankAccountType: text("bank_account_type").notNull(),
  bankAccountNumber: text("bank_account_number").notNull(),
  bankRoutingNumber: text("bank_routing_number").notNull(),
  bankAccountAddress: text("bank_account_address"),
  acknowledgeLender: boolean("acknowledge_lender").notNull().default(false),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const noteRegistrationsRelations = relations(noteRegistrations, ({ one }) => ({
  note: one(notes, {
    fields: [noteRegistrations.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteRegistrations.userId],
    references: [users.id],
  }),
}));

export const investorEntitiesRelations = relations(investorEntities, ({ one, many }) => ({
  user: one(users, {
    fields: [investorEntities.userId],
    references: [users.id],
  }),
  participations: many(participations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  participations: many(participations),
  beneficiaries: many(beneficiaries),
  documents: many(documents),
  registrations: many(noteRegistrations),
  entities: many(investorEntities),
}));

export const notesRelations = relations(notes, ({ many }) => ({
  participations: many(participations),
  registrations: many(noteRegistrations),
}));

export const participationsRelations = relations(participations, ({ one, many }) => ({
  user: one(users, {
    fields: [participations.userId],
    references: [users.id],
  }),
  note: one(notes, {
    fields: [participations.noteId],
    references: [notes.id],
  }),
  entity: one(investorEntities, {
    fields: [participations.entityId],
    references: [investorEntities.id],
  }),
  payments: many(payments),
  documents: many(participationDocuments),
}));

export const participationDocumentsRelations = relations(participationDocuments, ({ one }) => ({
  participation: one(participations, {
    fields: [participationDocuments.participationId],
    references: [participations.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  participation: one(participations, {
    fields: [payments.participationId],
    references: [participations.id],
  }),
}));

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  user: one(users, {
    fields: [beneficiaries.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});

export const insertParticipationSchema = createInsertSchema(participations).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertBeneficiarySchema = createInsertSchema(beneficiaries).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertParticipationDocumentSchema = createInsertSchema(participationDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertNoteRegistrationSchema = createInsertSchema(noteRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertInvestorEntitySchema = createInsertSchema(investorEntities).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertParticipation = z.infer<typeof insertParticipationSchema>;
export type Participation = typeof participations.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertParticipationDocument = z.infer<typeof insertParticipationDocumentSchema>;
export type ParticipationDocument = typeof participationDocuments.$inferSelect;

export type InsertNoteRegistration = z.infer<typeof insertNoteRegistrationSchema>;
export type NoteRegistration = typeof noteRegistrations.$inferSelect;

export type InsertInvestorEntity = z.infer<typeof insertInvestorEntitySchema>;
export type InvestorEntity = typeof investorEntities.$inferSelect;
