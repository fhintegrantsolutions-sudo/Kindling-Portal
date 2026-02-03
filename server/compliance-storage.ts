import {
  COMPLIANCE_COLLECTIONS,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type RolePermission,
  type InsertRolePermission,
  type UserRole,
  type InsertUserRole,
  type Address,
  type InsertAddress,
  type Entity,
  type InsertEntity,
  type EntityUser,
  type InsertEntityUser,
  type Lender,
  type InsertLender,
  type Borrower,
  type InsertBorrower,
  type Document,
  type InsertDocument,
  type Acknowledgement,
  type InsertAcknowledgement,
  type AuditLog,
  type InsertAuditLog,
  type Account,
  type InsertAccount,
  type LedgerEvent,
  type InsertLedgerEvent,
  type LedgerEntry,
  type InsertLedgerEntry,
} from "@shared/compliance-schema";
import { db } from "./db";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

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

export interface ComplianceStorage {
  // ============================================
  // USERS & AUTHENTICATION
  // ============================================
  createUser(email: string, password: string): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updatePassword(userId: string, newPassword: string): Promise<void>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  
  // ============================================
  // SESSIONS
  // ============================================
  createSession(userId: string, expiresAt: Date, ipAddress?: string, userAgent?: string): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  
  // ============================================
  // PASSWORD RESET
  // ============================================
  createPasswordResetToken(userId: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  
  // ============================================
  // EMAIL VERIFICATION
  // ============================================
  createEmailVerificationToken(userId: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerified(userId: string, token: string): Promise<void>;
  
  // ============================================
  // ROLES
  // ============================================
  getRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<void>;

  // ============================================
  // PERMISSIONS
  // ============================================
  getPermissions(): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  deletePermission(id: string): Promise<void>;

  // ============================================
  // ROLE PERMISSIONS
  // ============================================
  getRolePermissions(roleId: string): Promise<Permission[]>;
  addRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removeRolePermission(roleId: string, permissionId: string): Promise<void>;
  hasPermission(roleId: string, resource: string, action: string): Promise<boolean>;

  // ============================================
  // USER ROLES
  // ============================================
  getUserRoles(userId: string): Promise<Role[]>;
  assignUserRole(userRole: InsertUserRole): Promise<UserRole>;
  removeUserRole(userId: string, roleId: string): Promise<void>;
  userHasPermission(userId: string, resource: string, action: string): Promise<boolean>;

  // ============================================
  // ADDRESSES
  // ============================================
  getAddress(id: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined>;

  // ============================================
  // ENTITIES
  // ============================================
  getEntities(): Promise<Entity[]>;
  getEntity(id: string): Promise<Entity | undefined>;
  getEntityByTaxId(taxId: string): Promise<Entity | undefined>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: string, entity: Partial<InsertEntity>): Promise<Entity | undefined>;
  getEntitiesByUser(userId: string): Promise<Entity[]>;

  // ============================================
  // ENTITY USERS
  // ============================================
  getEntityUsers(entityId: string): Promise<EntityUser[]>;
  getUserEntities(userId: string): Promise<EntityUser[]>;
  linkEntityUser(entityUser: InsertEntityUser): Promise<EntityUser>;
  unlinkEntityUser(entityId: string, userId: string): Promise<void>;

  // ============================================
  // LENDERS
  // ============================================
  getLenders(): Promise<Lender[]>;
  getLender(id: string): Promise<Lender | undefined>;
  getLenderByEntityId(entityId: string): Promise<Lender | undefined>;
  createLender(lender: InsertLender): Promise<Lender>;
  updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender | undefined>;

  // ============================================
  // BORROWERS
  // ============================================
  getBorrowers(): Promise<Borrower[]>;
  getBorrower(id: string): Promise<Borrower | undefined>;
  getBorrowerByEntityId(entityId: string): Promise<Borrower | undefined>;
  createBorrower(borrower: InsertBorrower): Promise<Borrower>;
  updateBorrower(id: string, borrower: Partial<InsertBorrower>): Promise<Borrower | undefined>;

  // ============================================
  // DOCUMENTS
  // ============================================
  getDocuments(entityId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;

  // ============================================
  // ACKNOWLEDGEMENTS
  // ============================================
  getAcknowledgements(documentId: string): Promise<Acknowledgement[]>;
  getEntityAcknowledgements(entityId: string): Promise<Acknowledgement[]>;
  createAcknowledgement(acknowledgement: InsertAcknowledgement): Promise<Acknowledgement>;
  hasAcknowledged(documentId: string, userId: string, entityId: string): Promise<boolean>;

  // ============================================
  // AUDIT LOGS
  // ============================================
  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]>;
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;

  // ============================================
  // ACCOUNTS
  // ============================================
  getAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByNumber(accountNumber: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  getAccountBalance(accountId: string): Promise<number>;

  // ============================================
  // LEDGER EVENTS
  // ============================================
  getLedgerEvents(filters?: {
    eventType?: string;
    entityId?: string;
    referenceType?: string;
    referenceId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LedgerEvent[]>;
  getLedgerEvent(id: string): Promise<LedgerEvent | undefined>;
  createLedgerEvent(ledgerEvent: InsertLedgerEvent): Promise<LedgerEvent>;
  updateLedgerEventStatus(id: string, status: "pending" | "posted" | "reversed" | "failed"): Promise<LedgerEvent | undefined>;

  // ============================================
  // LEDGER ENTRIES
  // ============================================
  getLedgerEntries(ledgerEventId: string): Promise<LedgerEntry[]>;
  createLedgerEntry(ledgerEntry: InsertLedgerEntry): Promise<LedgerEntry>;
  getLedgerEntriesByAccount(accountId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LedgerEntry[]>;
  reconcileEntry(id: string): Promise<LedgerEntry | undefined>;
}

class FirestoreComplianceStorage implements ComplianceStorage {
  // ============================================
  // USERS & AUTHENTICATION
  // ============================================
  async createUser(email: string, password: string): Promise<User> {
    // Check if email already exists
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.USERS).doc();
    const userData = {
      email,
      passwordHash,
      mfaEnabled: false,
      status: 'pending_verification',
      emailVerified: false,
      failedLoginAttempts: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(userData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as User;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.USERS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
      lastLoginAt: doc.data()?.lastLoginAt ? timestampToDate(doc.data()?.lastLoginAt) : undefined,
      lockedUntil: doc.data()?.lockedUntil ? timestampToDate(doc.data()?.lockedUntil) : undefined,
    } as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.USERS)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
      lastLoginAt: doc.data().lastLoginAt ? timestampToDate(doc.data().lastLoginAt) : undefined,
      lockedUntil: doc.data().lockedUntil ? timestampToDate(doc.data().lockedUntil) : undefined,
    } as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const updateData: any = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // Convert dates to timestamps
    if (updates.lastLoginAt) {
      updateData.lastLoginAt = dateToTimestamp(updates.lastLoginAt as any);
    }
    if (updates.lockedUntil) {
      updateData.lockedUntil = dateToTimestamp(updates.lockedUntil as any);
    }

    await db.collection(COMPLIANCE_COLLECTIONS.USERS).doc(id).update(updateData);
    return this.getUserById(id);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.collection(COMPLIANCE_COLLECTIONS.USERS).doc(userId).update({
      passwordHash,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  // ============================================
  // SESSIONS
  // ============================================
  async createSession(userId: string, expiresAt: Date, ipAddress?: string, userAgent?: string): Promise<Session> {
    const token = randomBytes(32).toString('hex');
    const refreshToken = randomBytes(32).toString('hex');

    const docRef = db.collection(COMPLIANCE_COLLECTIONS.SESSIONS).doc();
    const sessionData = {
      userId,
      token,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(sessionData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      expiresAt: timestampToDate(doc.data()?.expiresAt),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.SESSIONS)
      .where("token", "==", token)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const session = {
      id: doc.id,
      ...doc.data(),
      expiresAt: timestampToDate(doc.data().expiresAt),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Session;

    // Check if expired
    const now = new Date();
    if (session.expiresAt instanceof Date && session.expiresAt < now) {
      await this.deleteSession(token);
      return undefined;
    }

    return session;
  }

  async deleteSession(token: string): Promise<void> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.SESSIONS)
      .where("token", "==", token)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.SESSIONS)
      .where("userId", "==", userId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = Timestamp.now();
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.SESSIONS)
      .where("expiresAt", "<", now)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // ============================================
  // PASSWORD RESET
  // ============================================
  async createPasswordResetToken(userId: string, expiresAt: Date): Promise<PasswordResetToken> {
    const token = randomBytes(32).toString('hex');
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.PASSWORD_RESET_TOKENS).doc();
    const tokenData = {
      userId,
      token,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(tokenData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      expiresAt: timestampToDate(doc.data()?.expiresAt),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as PasswordResetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.PASSWORD_RESET_TOKENS)
      .where("token", "==", token)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const resetToken = {
      id: doc.id,
      ...doc.data(),
      expiresAt: timestampToDate(doc.data().expiresAt),
      createdAt: timestampToDate(doc.data().createdAt),
      usedAt: doc.data().usedAt ? timestampToDate(doc.data().usedAt) : undefined,
    } as PasswordResetToken;

    // Check if expired or used
    const now = new Date();
    if (resetToken.usedAt || (resetToken.expiresAt instanceof Date && resetToken.expiresAt < now)) {
      return undefined;
    }

    return resetToken;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.PASSWORD_RESET_TOKENS)
      .where("token", "==", token)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        usedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================
  async createEmailVerificationToken(userId: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const token = randomBytes(32).toString('hex');
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.EMAIL_VERIFICATION_TOKENS).doc();
    const tokenData = {
      userId,
      token,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(tokenData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      expiresAt: timestampToDate(doc.data()?.expiresAt),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as EmailVerificationToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.EMAIL_VERIFICATION_TOKENS)
      .where("token", "==", token)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const verifyToken = {
      id: doc.id,
      ...doc.data(),
      expiresAt: timestampToDate(doc.data().expiresAt),
      createdAt: timestampToDate(doc.data().createdAt),
      verifiedAt: doc.data().verifiedAt ? timestampToDate(doc.data().verifiedAt) : undefined,
    } as EmailVerificationToken;

    // Check if expired or already verified
    const now = new Date();
    if (verifyToken.verifiedAt || (verifyToken.expiresAt instanceof Date && verifyToken.expiresAt < now)) {
      return undefined;
    }

    return verifyToken;
  }

  async markEmailVerified(userId: string, token: string): Promise<void> {
    // Mark token as verified
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.EMAIL_VERIFICATION_TOKENS)
      .where("token", "==", token)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        verifiedAt: FieldValue.serverTimestamp(),
      });
    }

    // Update user
    await db.collection(COMPLIANCE_COLLECTIONS.USERS).doc(userId).update({
      emailVerified: true,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // ============================================
  // ROLES
  // ============================================
  async getRoles(): Promise<Role[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ROLES).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Role));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.ROLES).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Role;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ROLES)
      .where("name", "==", name)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Role;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ROLES).doc();
    const roleData = {
      ...insertRole,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(roleData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Role;
  }

  async updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ROLES).doc(id);
    await docRef.update(role);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Role;
  }

  async deleteRole(id: string): Promise<void> {
    await db.collection(COMPLIANCE_COLLECTIONS.ROLES).doc(id).delete();
  }

  // ============================================
  // PERMISSIONS
  // ============================================
  async getPermissions(): Promise<Permission[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.PERMISSIONS).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Permission));
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.PERMISSIONS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Permission;
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.PERMISSIONS).doc();
    const permissionData = {
      ...insertPermission,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(permissionData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Permission;
  }

  async deletePermission(id: string): Promise<void> {
    await db.collection(COMPLIANCE_COLLECTIONS.PERMISSIONS).doc(id).delete();
  }

  // ============================================
  // ROLE PERMISSIONS
  // ============================================
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ROLE_PERMISSIONS)
      .where("roleId", "==", roleId)
      .get();
    
    const permissionIds = snapshot.docs.map(doc => doc.data().permissionId);
    if (permissionIds.length === 0) return [];

    const permissions: Permission[] = [];
    for (const permissionId of permissionIds) {
      const permission = await this.getPermission(permissionId);
      if (permission) permissions.push(permission);
    }
    return permissions;
  }

  async addRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ROLE_PERMISSIONS).doc();
    const data = {
      ...rolePermission,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as RolePermission;
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<void> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ROLE_PERMISSIONS)
      .where("roleId", "==", roleId)
      .where("permissionId", "==", permissionId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async hasPermission(roleId: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getRolePermissions(roleId);
    return permissions.some(p => p.resource === resource && p.action === action);
  }

  // ============================================
  // USER ROLES
  // ============================================
  async getUserRoles(userId: string): Promise<Role[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.USER_ROLES)
      .where("userId", "==", userId)
      .get();
    
    const roleIds = snapshot.docs.map(doc => doc.data().roleId);
    if (roleIds.length === 0) return [];

    const roles: Role[] = [];
    for (const roleId of roleIds) {
      const role = await this.getRole(roleId);
      if (role) roles.push(role);
    }
    return roles;
  }

  async assignUserRole(userRole: InsertUserRole): Promise<UserRole> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.USER_ROLES).doc();
    const data = {
      ...userRole,
      assignedAt: dateToTimestamp(userRole.assignedAt as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      assignedAt: timestampToDate(doc.data()?.assignedAt),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as UserRole;
  }

  async removeUserRole(userId: string, roleId: string): Promise<void> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.USER_ROLES)
      .where("userId", "==", userId)
      .where("roleId", "==", roleId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    for (const role of roles) {
      const hasPermission = await this.hasPermission(role.id, resource, action);
      if (hasPermission) return true;
    }
    return false;
  }

  // ============================================
  // ADDRESSES
  // ============================================
  async getAddress(id: string): Promise<Address | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.ADDRESSES).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Address;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ADDRESSES).doc();
    const addressData = {
      ...insertAddress,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(addressData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Address;
  }

  async updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ADDRESSES).doc(id);
    await docRef.update({
      ...address,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Address;
  }

  // ============================================
  // ENTITIES
  // ============================================
  async getEntities(): Promise<Entity[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ENTITIES).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateOfBirth: timestampToDate(doc.data().dateOfBirth),
      formationDate: timestampToDate(doc.data().formationDate),
      kycVerifiedAt: timestampToDate(doc.data().kycVerifiedAt),
      accreditationVerifiedAt: timestampToDate(doc.data().accreditationVerifiedAt),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Entity));
  }

  async getEntity(id: string): Promise<Entity | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.ENTITIES).doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateOfBirth: timestampToDate(data?.dateOfBirth),
      formationDate: timestampToDate(data?.formationDate),
      kycVerifiedAt: timestampToDate(data?.kycVerifiedAt),
      accreditationVerifiedAt: timestampToDate(data?.accreditationVerifiedAt),
      createdAt: timestampToDate(data?.createdAt),
      updatedAt: timestampToDate(data?.updatedAt),
    } as Entity;
  }

  async getEntityByTaxId(taxId: string): Promise<Entity | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ENTITIES)
      .where("taxId", "==", taxId)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateOfBirth: timestampToDate(data.dateOfBirth),
      formationDate: timestampToDate(data.formationDate),
      kycVerifiedAt: timestampToDate(data.kycVerifiedAt),
      accreditationVerifiedAt: timestampToDate(data.accreditationVerifiedAt),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as Entity;
  }

  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ENTITIES).doc();
    const entityData = {
      ...insertEntity,
      dateOfBirth: dateToTimestamp(insertEntity.dateOfBirth as any),
      formationDate: dateToTimestamp(insertEntity.formationDate as any),
      kycVerifiedAt: dateToTimestamp(insertEntity.kycVerifiedAt as any),
      accreditationVerifiedAt: dateToTimestamp(insertEntity.accreditationVerifiedAt as any),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(entityData);
    const doc = await docRef.get();
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateOfBirth: timestampToDate(data?.dateOfBirth),
      formationDate: timestampToDate(data?.formationDate),
      kycVerifiedAt: timestampToDate(data?.kycVerifiedAt),
      accreditationVerifiedAt: timestampToDate(data?.accreditationVerifiedAt),
      createdAt: timestampToDate(data?.createdAt),
    } as Entity;
  }

  async updateEntity(id: string, entity: Partial<InsertEntity>): Promise<Entity | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ENTITIES).doc(id);
    const updateData: any = { ...entity, updatedAt: FieldValue.serverTimestamp() };
    if (entity.dateOfBirth) updateData.dateOfBirth = dateToTimestamp(entity.dateOfBirth as any);
    if (entity.formationDate) updateData.formationDate = dateToTimestamp(entity.formationDate as any);
    if (entity.kycVerifiedAt) updateData.kycVerifiedAt = dateToTimestamp(entity.kycVerifiedAt as any);
    if (entity.accreditationVerifiedAt) updateData.accreditationVerifiedAt = dateToTimestamp(entity.accreditationVerifiedAt as any);
    
    await docRef.update(updateData);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateOfBirth: timestampToDate(data?.dateOfBirth),
      formationDate: timestampToDate(data?.formationDate),
      kycVerifiedAt: timestampToDate(data?.kycVerifiedAt),
      accreditationVerifiedAt: timestampToDate(data?.accreditationVerifiedAt),
      createdAt: timestampToDate(data?.createdAt),
      updatedAt: timestampToDate(data?.updatedAt),
    } as Entity;
  }

  async getEntitiesByUser(userId: string): Promise<Entity[]> {
    const entityUserSnapshot = await db.collection(COMPLIANCE_COLLECTIONS.ENTITY_USERS)
      .where("userId", "==", userId)
      .get();
    
    const entityIds = entityUserSnapshot.docs.map(doc => doc.data().entityId);
    if (entityIds.length === 0) return [];

    const entities: Entity[] = [];
    for (const entityId of entityIds) {
      const entity = await this.getEntity(entityId);
      if (entity) entities.push(entity);
    }
    return entities;
  }

  // ============================================
  // ENTITY USERS
  // ============================================
  async getEntityUsers(entityId: string): Promise<EntityUser[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ENTITY_USERS)
      .where("entityId", "==", entityId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      effectiveDate: timestampToDate(doc.data().effectiveDate),
      endDate: timestampToDate(doc.data().endDate),
      createdAt: timestampToDate(doc.data().createdAt),
    } as EntityUser));
  }

  async getUserEntities(userId: string): Promise<EntityUser[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ENTITY_USERS)
      .where("userId", "==", userId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      effectiveDate: timestampToDate(doc.data().effectiveDate),
      endDate: timestampToDate(doc.data().endDate),
      createdAt: timestampToDate(doc.data().createdAt),
    } as EntityUser));
  }

  async linkEntityUser(insertEntityUser: InsertEntityUser): Promise<EntityUser> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ENTITY_USERS).doc();
    const data = {
      ...insertEntityUser,
      effectiveDate: dateToTimestamp(insertEntityUser.effectiveDate as any),
      endDate: dateToTimestamp(insertEntityUser.endDate as any),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      effectiveDate: timestampToDate(doc.data()?.effectiveDate),
      endDate: timestampToDate(doc.data()?.endDate),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as EntityUser;
  }

  async unlinkEntityUser(entityId: string, userId: string): Promise<void> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ENTITY_USERS)
      .where("entityId", "==", entityId)
      .where("userId", "==", userId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // ============================================
  // LENDERS
  // ============================================
  async getLenders(): Promise<Lender[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.LENDERS).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Lender));
  }

  async getLender(id: string): Promise<Lender | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.LENDERS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Lender;
  }

  async getLenderByEntityId(entityId: string): Promise<Lender | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.LENDERS)
      .where("entityId", "==", entityId)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Lender;
  }

  async createLender(insertLender: InsertLender): Promise<Lender> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.LENDERS).doc();
    const lenderData = {
      ...insertLender,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(lenderData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Lender;
  }

  async updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.LENDERS).doc(id);
    await docRef.update({
      ...lender,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Lender;
  }

  // ============================================
  // BORROWERS
  // ============================================
  async getBorrowers(): Promise<Borrower[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.BORROWERS).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Borrower));
  }

  async getBorrower(id: string): Promise<Borrower | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.BORROWERS).doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Borrower;
  }

  async getBorrowerByEntityId(entityId: string): Promise<Borrower | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.BORROWERS)
      .where("entityId", "==", entityId)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Borrower;
  }

  async createBorrower(insertBorrower: InsertBorrower): Promise<Borrower> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.BORROWERS).doc();
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
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.BORROWERS).doc(id);
    await docRef.update({
      ...borrower,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Borrower;
  }

  // ============================================
  // DOCUMENTS
  // ============================================
  async getDocuments(entityId: string): Promise<Document[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.DOCUMENTS)
      .where("entityId", "==", entityId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      reviewedAt: timestampToDate(doc.data().reviewedAt),
      expiresAt: timestampToDate(doc.data().expiresAt),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Document));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.DOCUMENTS).doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      reviewedAt: timestampToDate(data?.reviewedAt),
      expiresAt: timestampToDate(data?.expiresAt),
      createdAt: timestampToDate(data?.createdAt),
      updatedAt: timestampToDate(data?.updatedAt),
    } as Document;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.DOCUMENTS).doc();
    const documentData = {
      ...insertDocument,
      reviewedAt: dateToTimestamp(insertDocument.reviewedAt as any),
      expiresAt: dateToTimestamp(insertDocument.expiresAt as any),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(documentData);
    const doc = await docRef.get();
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      reviewedAt: timestampToDate(data?.reviewedAt),
      expiresAt: timestampToDate(data?.expiresAt),
      createdAt: timestampToDate(data?.createdAt),
    } as Document;
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.DOCUMENTS).doc(id);
    const updateData: any = { ...document, updatedAt: FieldValue.serverTimestamp() };
    if (document.reviewedAt) updateData.reviewedAt = dateToTimestamp(document.reviewedAt as any);
    if (document.expiresAt) updateData.expiresAt = dateToTimestamp(document.expiresAt as any);
    
    await docRef.update(updateData);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      reviewedAt: timestampToDate(data?.reviewedAt),
      expiresAt: timestampToDate(data?.expiresAt),
      createdAt: timestampToDate(data?.createdAt),
      updatedAt: timestampToDate(data?.updatedAt),
    } as Document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.collection(COMPLIANCE_COLLECTIONS.DOCUMENTS).doc(id).delete();
  }

  // ============================================
  // ACKNOWLEDGEMENTS
  // ============================================
  async getAcknowledgements(documentId: string): Promise<Acknowledgement[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ACKNOWLEDGEMENTS)
      .where("documentId", "==", documentId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      acknowledgedAt: timestampToDate(doc.data().acknowledgedAt),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Acknowledgement));
  }

  async getEntityAcknowledgements(entityId: string): Promise<Acknowledgement[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ACKNOWLEDGEMENTS)
      .where("entityId", "==", entityId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      acknowledgedAt: timestampToDate(doc.data().acknowledgedAt),
      createdAt: timestampToDate(doc.data().createdAt),
    } as Acknowledgement));
  }

  async createAcknowledgement(insertAcknowledgement: InsertAcknowledgement): Promise<Acknowledgement> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ACKNOWLEDGEMENTS).doc();
    const data = {
      ...insertAcknowledgement,
      acknowledgedAt: dateToTimestamp(insertAcknowledgement.acknowledgedAt as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      acknowledgedAt: timestampToDate(doc.data()?.acknowledgedAt),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Acknowledgement;
  }

  async hasAcknowledged(documentId: string, userId: string, entityId: string): Promise<boolean> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ACKNOWLEDGEMENTS)
      .where("documentId", "==", documentId)
      .where("userId", "==", userId)
      .where("entityId", "==", entityId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  // ============================================
  // AUDIT LOGS
  // ============================================
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    let query: any = db.collection(COMPLIANCE_COLLECTIONS.AUDIT_LOGS);

    if (filters?.userId) query = query.where("userId", "==", filters.userId);
    if (filters?.action) query = query.where("action", "==", filters.action);
    if (filters?.resource) query = query.where("resource", "==", filters.resource);
    if (filters?.resourceId) query = query.where("resourceId", "==", filters.resourceId);
    if (filters?.entityId) query = query.where("entityId", "==", filters.entityId);
    if (filters?.startDate) query = query.where("createdAt", ">=", Timestamp.fromDate(filters.startDate));
    if (filters?.endDate) query = query.where("createdAt", "<=", Timestamp.fromDate(filters.endDate));

    query = query.orderBy("createdAt", "desc");
    
    if (filters?.limit) query = query.limit(filters.limit);
    else query = query.limit(100); // default limit

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    } as AuditLog));
  }

  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.AUDIT_LOGS).doc();
    const data = {
      ...insertAuditLog,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as AuditLog;
  }

  // ============================================
  // ACCOUNTS
  // ============================================
  async getAccounts(): Promise<Account[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ACCOUNTS).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      balance: 0, // calculated separately
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Account));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.ACCOUNTS).doc(id).get();
    if (!doc.exists) return undefined;
    const balance = await this.getAccountBalance(id);
    return {
      id: doc.id,
      ...doc.data(),
      balance,
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Account;
  }

  async getAccountByNumber(accountNumber: string): Promise<Account | undefined> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.ACCOUNTS)
      .where("accountNumber", "==", accountNumber)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const balance = await this.getAccountBalance(doc.id);
    return {
      id: doc.id,
      ...doc.data(),
      balance,
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    } as Account;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ACCOUNTS).doc();
    const accountData = {
      ...insertAccount,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(accountData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      balance: 0,
      createdAt: timestampToDate(doc.data()?.createdAt),
    } as Account;
  }

  async updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.ACCOUNTS).doc(id);
    await docRef.update({
      ...account,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    const balance = await this.getAccountBalance(id);
    return {
      id: doc.id,
      ...doc.data(),
      balance,
      createdAt: timestampToDate(doc.data()?.createdAt),
      updatedAt: timestampToDate(doc.data()?.updatedAt),
    } as Account;
  }

  async getAccountBalance(accountId: string): Promise<number> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.LEDGER_ENTRIES)
      .where("accountId", "==", accountId)
      .get();
    
    let balance = 0;
    snapshot.docs.forEach(doc => {
      const entry = doc.data();
      if (entry.entryType === "debit") {
        balance += entry.amount;
      } else {
        balance -= entry.amount;
      }
    });
    return balance;
  }

  // ============================================
  // LEDGER EVENTS
  // ============================================
  async getLedgerEvents(filters?: {
    eventType?: string;
    entityId?: string;
    referenceType?: string;
    referenceId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LedgerEvent[]> {
    let query: any = db.collection(COMPLIANCE_COLLECTIONS.LEDGER_EVENTS);

    if (filters?.eventType) query = query.where("eventType", "==", filters.eventType);
    if (filters?.entityId) query = query.where("entityId", "==", filters.entityId);
    if (filters?.referenceType) query = query.where("referenceType", "==", filters.referenceType);
    if (filters?.referenceId) query = query.where("referenceId", "==", filters.referenceId);
    if (filters?.status) query = query.where("status", "==", filters.status);
    if (filters?.startDate) query = query.where("eventDate", ">=", Timestamp.fromDate(filters.startDate));
    if (filters?.endDate) query = query.where("eventDate", "<=", Timestamp.fromDate(filters.endDate));

    query = query.orderBy("eventDate", "desc");
    
    if (filters?.limit) query = query.limit(filters.limit);
    else query = query.limit(100);

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      eventDate: timestampToDate(doc.data().eventDate),
      createdAt: timestampToDate(doc.data().createdAt),
      postedAt: timestampToDate(doc.data().postedAt),
    } as LedgerEvent));
  }

  async getLedgerEvent(id: string): Promise<LedgerEvent | undefined> {
    const doc = await db.collection(COMPLIANCE_COLLECTIONS.LEDGER_EVENTS).doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      eventDate: timestampToDate(data?.eventDate),
      createdAt: timestampToDate(data?.createdAt),
      postedAt: timestampToDate(data?.postedAt),
    } as LedgerEvent;
  }

  async createLedgerEvent(insertLedgerEvent: InsertLedgerEvent): Promise<LedgerEvent> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.LEDGER_EVENTS).doc();
    const data = {
      ...insertLedgerEvent,
      eventDate: dateToTimestamp(insertLedgerEvent.eventDate as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    const docData = doc.data();
    return {
      id: doc.id,
      ...docData,
      eventDate: timestampToDate(docData?.eventDate),
      createdAt: timestampToDate(docData?.createdAt),
    } as LedgerEvent;
  }

  async updateLedgerEventStatus(id: string, status: "pending" | "posted" | "reversed" | "failed"): Promise<LedgerEvent | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.LEDGER_EVENTS).doc(id);
    const updateData: any = { status };
    if (status === "posted") {
      updateData.postedAt = FieldValue.serverTimestamp();
    }
    await docRef.update(updateData);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      eventDate: timestampToDate(data?.eventDate),
      createdAt: timestampToDate(data?.createdAt),
      postedAt: timestampToDate(data?.postedAt),
    } as LedgerEvent;
  }

  // ============================================
  // LEDGER ENTRIES
  // ============================================
  async getLedgerEntries(ledgerEventId: string): Promise<LedgerEntry[]> {
    const snapshot = await db.collection(COMPLIANCE_COLLECTIONS.LEDGER_ENTRIES)
      .where("ledgerEventId", "==", ledgerEventId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      entryDate: timestampToDate(doc.data().entryDate),
      reconciledAt: timestampToDate(doc.data().reconciledAt),
      createdAt: timestampToDate(doc.data().createdAt),
    } as LedgerEntry));
  }

  async createLedgerEntry(insertLedgerEntry: InsertLedgerEntry): Promise<LedgerEntry> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.LEDGER_ENTRIES).doc();
    const data = {
      ...insertLedgerEntry,
      entryDate: dateToTimestamp(insertLedgerEntry.entryDate as any) || FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    const doc = await docRef.get();
    const docData = doc.data();
    return {
      id: doc.id,
      ...docData,
      entryDate: timestampToDate(docData?.entryDate),
      createdAt: timestampToDate(docData?.createdAt),
    } as LedgerEntry;
  }

  async getLedgerEntriesByAccount(accountId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LedgerEntry[]> {
    let query: any = db.collection(COMPLIANCE_COLLECTIONS.LEDGER_ENTRIES)
      .where("accountId", "==", accountId);

    if (filters?.startDate) query = query.where("entryDate", ">=", Timestamp.fromDate(filters.startDate));
    if (filters?.endDate) query = query.where("entryDate", "<=", Timestamp.fromDate(filters.endDate));

    query = query.orderBy("entryDate", "desc");
    
    if (filters?.limit) query = query.limit(filters.limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      entryDate: timestampToDate(doc.data().entryDate),
      reconciledAt: timestampToDate(doc.data().reconciledAt),
      createdAt: timestampToDate(doc.data().createdAt),
    } as LedgerEntry));
  }

  async reconcileEntry(id: string): Promise<LedgerEntry | undefined> {
    const docRef = db.collection(COMPLIANCE_COLLECTIONS.LEDGER_ENTRIES).doc(id);
    await docRef.update({
      reconciled: true,
      reconciledAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      entryDate: timestampToDate(data?.entryDate),
      reconciledAt: timestampToDate(data?.reconciledAt),
      createdAt: timestampToDate(data?.createdAt),
    } as LedgerEntry;
  }
}

export const complianceStorage = new FirestoreComplianceStorage();
