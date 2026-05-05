/**
 * Referral Schema for tracking user referrals
 * Phase 1: Basic tracking only (no automated rewards)
 */

export interface ReferralCode {
  id: string;
  userId: string;              // User who owns this referral code
  code: string;                // Unique referral code (e.g., "HALEY2026")
  isActive: boolean;           // Can be disabled by admin
  createdAt: Date;
  clickCount: number;          // Track how many times link was clicked
  updatedAt?: Date;
}

export interface Referral {
  id: string;
  referrerId: string;          // User who made the referral
  referredUserId?: string;     // User who was referred (null until they sign up)
  referredEmail?: string;      // Email used during signup
  referredName?: string;       // Name of referred user
  referralCode: string;        // Code that was used
  status: "pending" | "signed_up" | "invested" | "qualified";
  signupDate?: Date;           // When referred user signed up
  firstInvestmentDate?: Date;  // When they made first investment
  firstInvestmentAmount?: number;
  notes?: string;              // Admin notes
  createdAt: Date;             // When referral link was clicked/used
  updatedAt?: Date;
}

export interface ReferralStats {
  userId: string;
  totalReferrals: number;
  pendingReferrals: number;
  signedUpReferrals: number;
  investedReferrals: number;
  qualifiedReferrals: number;
  totalInvestmentVolume: number;
  lastUpdated: Date;
}
