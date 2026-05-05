import { db } from "./db";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  ReferralCode,
  Referral,
  ReferralStats
} from "./referral-schema";

const COLLECTIONS = {
  REFERRAL_CODES: "referralCodes",
  REFERRALS: "referrals",
  REFERRAL_STATS: "referralStats",
};

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

export interface InsertReferralCode {
  userId: string;
  code: string;
  isActive?: boolean;
}

export interface InsertReferral {
  referrerId: string;
  referredUserId?: string;
  referredEmail?: string;
  referredName?: string;
  referralCode: string;
  status?: "pending" | "signed_up" | "invested" | "qualified";
  signupDate?: Date;
  firstInvestmentDate?: Date;
  firstInvestmentAmount?: number;
  notes?: string;
}

export class ReferralStorage {
  // Referral Codes
  async getReferralCodes(): Promise<ReferralCode[]> {
    const snapshot = await db.collection(COLLECTIONS.REFERRAL_CODES)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: doc.data().updatedAt ? timestampToDate(doc.data().updatedAt) : undefined,
    } as ReferralCode));
  }

  async getReferralCode(id: string): Promise<ReferralCode | undefined> {
    const doc = await db.collection(COLLECTIONS.REFERRAL_CODES).doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data?.createdAt),
      updatedAt: data?.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    } as ReferralCode;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const snapshot = await db.collection(COLLECTIONS.REFERRAL_CODES)
      .where("code", "==", code)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    } as ReferralCode;
  }

  async getReferralCodeByUserId(userId: string): Promise<ReferralCode | undefined> {
    const snapshot = await db.collection(COLLECTIONS.REFERRAL_CODES)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    } as ReferralCode;
  }

  async createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
    const docRef = db.collection(COLLECTIONS.REFERRAL_CODES).doc();
    const referralCodeData = {
      userId: data.userId,
      code: data.code,
      isActive: data.isActive !== undefined ? data.isActive : true,
      clickCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(referralCodeData);
    const doc = await docRef.get();
    const docData = doc.data();
    return {
      id: doc.id,
      ...docData,
      createdAt: timestampToDate(docData?.createdAt),
    } as ReferralCode;
  }

  async updateReferralCode(id: string, updates: Partial<ReferralCode>): Promise<ReferralCode | undefined> {
    const docRef = db.collection(COLLECTIONS.REFERRAL_CODES).doc(id);
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await docRef.update(updateData);
    return this.getReferralCode(id);
  }

  async incrementClickCount(code: string): Promise<void> {
    const referralCode = await this.getReferralCodeByCode(code);
    if (!referralCode) return;

    const docRef = db.collection(COLLECTIONS.REFERRAL_CODES).doc(referralCode.id);
    await docRef.update({
      clickCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Referrals
  async getReferrals(): Promise<Referral[]> {
    const snapshot = await db.collection(COLLECTIONS.REFERRALS)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: doc.data().updatedAt ? timestampToDate(doc.data().updatedAt) : undefined,
      signupDate: doc.data().signupDate ? timestampToDate(doc.data().signupDate) : undefined,
      firstInvestmentDate: doc.data().firstInvestmentDate ? timestampToDate(doc.data().firstInvestmentDate) : undefined,
    } as Referral));
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const doc = await db.collection(COLLECTIONS.REFERRALS).doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data?.createdAt),
      updatedAt: data?.updatedAt ? timestampToDate(data.updatedAt) : undefined,
      signupDate: data?.signupDate ? timestampToDate(data.signupDate) : undefined,
      firstInvestmentDate: data?.firstInvestmentDate ? timestampToDate(data.firstInvestmentDate) : undefined,
    } as Referral;
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    const snapshot = await db.collection(COLLECTIONS.REFERRALS)
      .where("referrerId", "==", referrerId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: doc.data().updatedAt ? timestampToDate(doc.data().updatedAt) : undefined,
      signupDate: doc.data().signupDate ? timestampToDate(doc.data().signupDate) : undefined,
      firstInvestmentDate: doc.data().firstInvestmentDate ? timestampToDate(doc.data().firstInvestmentDate) : undefined,
    } as Referral));
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const docRef = db.collection(COLLECTIONS.REFERRALS).doc();
    const referralData = {
      referrerId: data.referrerId,
      referredUserId: data.referredUserId,
      referredEmail: data.referredEmail,
      referredName: data.referredName,
      referralCode: data.referralCode,
      status: data.status || "pending",
      signupDate: data.signupDate,
      firstInvestmentDate: data.firstInvestmentDate,
      firstInvestmentAmount: data.firstInvestmentAmount,
      notes: data.notes,
      createdAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(referralData);
    const doc = await docRef.get();
    const docData = doc.data();
    return {
      id: doc.id,
      ...docData,
      createdAt: timestampToDate(docData?.createdAt),
      signupDate: docData?.signupDate ? timestampToDate(docData.signupDate) : undefined,
      firstInvestmentDate: docData?.firstInvestmentDate ? timestampToDate(docData.firstInvestmentDate) : undefined,
    } as Referral;
  }

  async updateReferral(id: string, updates: Partial<InsertReferral>): Promise<Referral | undefined> {
    const docRef = db.collection(COLLECTIONS.REFERRALS).doc(id);
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await docRef.update(updateData);
    return this.getReferral(id);
  }

  // Referral Stats
  async getReferralStats(userId: string): Promise<ReferralStats | undefined> {
    const doc = await db.collection(COLLECTIONS.REFERRAL_STATS).doc(userId).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return {
      userId,
      ...data,
      lastUpdated: timestampToDate(data?.lastUpdated),
    } as ReferralStats;
  }

  async updateReferralStats(userId: string): Promise<ReferralStats> {
    const referrals = await this.getReferralsByReferrer(userId);

    const stats: ReferralStats = {
      userId,
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(r => r.status === "pending").length,
      signedUpReferrals: referrals.filter(r => r.status === "signed_up").length,
      investedReferrals: referrals.filter(r => r.status === "invested").length,
      qualifiedReferrals: referrals.filter(r => r.status === "qualified").length,
      totalInvestmentVolume: referrals.reduce((sum, r) => sum + (r.firstInvestmentAmount || 0), 0),
      lastUpdated: new Date(),
    };

    await db.collection(COLLECTIONS.REFERRAL_STATS).doc(userId).set({
      ...stats,
      lastUpdated: FieldValue.serverTimestamp(),
    });

    return stats;
  }

  // Generate unique referral code
  // Excludes 0 (zero) and O (letter) to avoid confusion
  async generateUniqueCode(baseCode: string): Promise<string> {
    let code = baseCode.toUpperCase().replace(/[^A-NP-Z1-9]/g, '');
    let counter = 0;

    while (await this.getReferralCodeByCode(code)) {
      counter++;
      code = `${baseCode}${counter}`.toUpperCase().replace(/[^A-NP-Z1-9]/g, '');
    }

    return code;
  }
}

export const referralStorage = new ReferralStorage();
