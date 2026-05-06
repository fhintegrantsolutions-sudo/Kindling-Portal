/**
 * Per-collection migration functions. Each one reads from Firestore,
 * transforms to our Postgres shape, and inserts via the service-role client
 * (which bypasses RLS).
 *
 * Order of calls is enforced by `index.ts` because of FK dependencies.
 */

import type { Firestore } from "firebase-admin/firestore";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IdMap, toIso, toDateOnly, strOrNull, numericOrNull, batchInsert } from "./helpers";

type AnyDoc = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

// ---------------------------------------------------------------------------
// users → auth.users + public.profiles
// ---------------------------------------------------------------------------

export async function migrateUsers(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
  opts: { sendPasswordResetEmails: boolean },
): Promise<{ created: number; skipped: number }> {
  const snap = await firestore.collection("users").get();
  let created = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const email = strOrNull(d.email);
    if (!email) {
      console.warn(`  [users] skip ${doc.id}: no email`);
      skipped++;
      continue;
    }

    // 1. create the auth user (or skip if email already exists)
    const { data: existingPage } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    // listUsers doesn't filter by email; use getUserByEmail-style pattern
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let supabaseUserId: string;
    if (byEmail) {
      supabaseUserId = byEmail.id as string;
    } else {
      const password = randomPassword();
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { migrated_from_firestore: true },
      });
      if (error || !created.user) {
        console.warn(`  [users] failed ${email}: ${error?.message ?? "no user"}`);
        skipped++;
        continue;
      }
      supabaseUserId = created.user.id;

      // Optional: trigger a password reset email so the user picks their own
      if (opts.sendPasswordResetEmails) {
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
        });
      }
    }

    // 2. update the profiles row created by the on_auth_user_created trigger
    const role = d.role === "admin" ? "admin" : "lender";
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        name: strOrNull(d.name),
        phone: strOrNull(d.phone),
        address_street: strOrNull(d.address),
        address_city: strOrNull(d.city),
        address_state: strOrNull(d.state),
        address_zip: strOrNull(d.zipCode),
        entity_type: strOrNull(d.entityType),
        loan_agreement_title: strOrNull(d.loanAgreementTitle),
        role,
      })
      .eq("id", supabaseUserId);
    if (profileErr) {
      console.warn(`  [users] profile update failed ${email}: ${profileErr.message}`);
    }

    idMap.set("users", doc.id, supabaseUserId);
    created++;
  }

  return { created, skipped };
}

function randomPassword(): string {
  // 32 chars, mixed — used only as a placeholder; users reset on first login
  return Array.from(
    { length: 32 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz".charAt(
      Math.floor(Math.random() * 54),
    ),
  ).join("");
}

// ---------------------------------------------------------------------------
// borrowers
// ---------------------------------------------------------------------------

export async function migrateBorrowers(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("borrowers").get();
  if (snap.empty) return 0;

  const rows = snap.docs.map((doc: AnyDoc) => {
    const d = doc.data();
    return {
      _firestoreId: doc.id,
      business_name: strOrNull(d.businessName) ?? "Unknown",
      contact_name: strOrNull(d.contactName) ?? "Unknown",
      email: strOrNull(d.email) ?? "",
      phone: strOrNull(d.phone) ?? "",
      address: strOrNull(d.address),
      city: strOrNull(d.city),
      state: strOrNull(d.state),
      zip_code: strOrNull(d.zipCode),
      tax_id: strOrNull(d.taxId),
      business_type: strOrNull(d.businessType),
      notes: strOrNull(d.notes),
    };
  });

  for (const row of rows) {
    const { _firestoreId, ...insert } = row;
    const { data, error } = await supabase
      .from("borrowers")
      .insert(insert)
      .select("id")
      .single();
    if (error) {
      console.warn(`  [borrowers] failed ${_firestoreId}: ${error.message}`);
      continue;
    }
    idMap.set("borrowers", _firestoreId, data.id as string);
  }
  return idMap.size("borrowers");
}

// ---------------------------------------------------------------------------
// notes
// ---------------------------------------------------------------------------

export async function migrateNotes(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("notes").get();

  // Build a borrower lookup by business_name, since legacy notes referenced
  // borrowers by name string rather than ID.
  const { data: borrowers } = await supabase
    .from("borrowers")
    .select("id, business_name");
  const borrowerByName = new Map<string, string>(
    (borrowers ?? []).map((b) => [
      (b.business_name as string).toLowerCase(),
      b.id as string,
    ]),
  );

  for (const doc of snap.docs) {
    const d = doc.data();
    const borrowerName = strOrNull(d.borrower);
    const borrowerId = borrowerName
      ? (borrowerByName.get(borrowerName.toLowerCase()) ?? null)
      : null;

    const insert = {
      note_id: strOrNull(d.noteId) ?? doc.id,
      borrower_id: borrowerId,
      title: strOrNull(d.title) ?? "Untitled",
      principal: numericOrNull(d.principal) ?? "0",
      rate: numericOrNull(d.rate) ?? "0",
      term_months: typeof d.termMonths === "number" ? d.termMonths : 12,
      term_years: typeof d.termYears === "number" ? d.termYears : null,
      project_type: strOrNull(d.projectType) ?? "other",
      loan_payment_status: strOrNull(d.loanPaymentStatus) ?? "Current",
      contract_date: toDateOnly(d.contractDate),
      payment_start_date: toDateOnly(d.paymentStartDate),
      maturity_date: toDateOnly(d.maturityDate),
      funding_start_date: toDateOnly(d.fundingStartDate),
      funding_end_date: toDateOnly(d.fundingEndDate),
      funding_window_end: toDateOnly(d.fundingWindowEnd),
      first_payment_date: toDateOnly(d.firstPaymentDate),
      monthly_payment: numericOrNull(d.monthlyPayment),
      status: strOrNull(d.status) ?? "Active",
      client_status: strOrNull(d.clientStatus) ?? "Available",
      type: strOrNull(d.type) ?? "note",
      interest_type: strOrNull(d.interestType) ?? "Amortized",
      description: strOrNull(d.description),
      admin_notes: strOrNull(d.adminNotes),
      target_raise: numericOrNull(d.targetRaise),
      min_investment: numericOrNull(d.minInvestment),
      locked_sections: d.lockedSections ?? null,
    };

    const { data, error } = await supabase
      .from("notes")
      .insert(insert)
      .select("id")
      .single();
    if (error) {
      console.warn(`  [notes] failed ${doc.id}: ${error.message}`);
      continue;
    }
    idMap.set("notes", doc.id, data.id as string);
  }
  return idMap.size("notes");
}

// ---------------------------------------------------------------------------
// note_registrations
// ---------------------------------------------------------------------------

export async function migrateNoteRegistrations(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("note_registrations").get();
  let count = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const note_id = idMap.get("notes", d.noteId);
    if (!note_id) {
      console.warn(`  [registrations] skip ${doc.id}: unknown noteId ${d.noteId}`);
      continue;
    }
    const user_id = idMap.get("users", d.userId);
    const status =
      d.status === "approved" || d.status === "rejected" ? d.status : "pending";

    const insert = {
      note_id,
      user_id,
      first_name: strOrNull(d.firstName) ?? "",
      last_name: strOrNull(d.lastName) ?? "",
      phone: strOrNull(d.phone) ?? "",
      email: strOrNull(d.email) ?? "",
      entity_type: strOrNull(d.entityType) ?? "Individual",
      name_for_agreement: strOrNull(d.nameForAgreement) ?? "",
      mailing_address: strOrNull(d.mailingAddress),
      city: strOrNull(d.city),
      state: strOrNull(d.state),
      zip_code: strOrNull(d.zipCode),
      investment_amount: numericOrNull(d.investmentAmount) ?? "0",
      bank_name: strOrNull(d.bankName) ?? "",
      bank_account_type: strOrNull(d.bankAccountType) ?? "",
      bank_account_number: strOrNull(d.bankAccountNumber) ?? "",
      bank_routing_number: strOrNull(d.bankRoutingNumber) ?? "",
      bank_account_address: strOrNull(d.bankAccountAddress),
      acknowledge_lender: Boolean(d.acknowledgeLender),
      status,
    };
    const { error } = await supabase.from("note_registrations").insert(insert);
    if (error) {
      console.warn(`  [registrations] failed ${doc.id}: ${error.message}`);
      continue;
    }
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// participations (with funding_status nested object → flat columns)
// ---------------------------------------------------------------------------

export async function migrateParticipations(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("participations").get();

  for (const doc of snap.docs) {
    const d = doc.data();
    const note_id = idMap.get("notes", d.noteId);
    const user_id = idMap.get("users", d.userId);
    if (!note_id || !user_id) {
      console.warn(
        `  [participations] skip ${doc.id}: noteId=${d.noteId} userId=${d.userId} not found in id-map`,
      );
      continue;
    }

    const fs = (d.fundingStatus ?? {}) as Record<string, unknown>;
    const fundingType =
      fs.fundingType === "wire" ||
      fs.fundingType === "check" ||
      fs.fundingType === "ach" ||
      fs.fundingType === "other"
        ? (fs.fundingType as "wire" | "check" | "ach" | "other")
        : null;

    const insert = {
      user_id,
      note_id,
      invested_amount: numericOrNull(d.investedAmount) ?? "0",
      status: strOrNull(d.status) ?? "Active",
      user_notes: strOrNull(d.userNotes),
      funding_received: Boolean(fs.received),
      funding_deposited: Boolean(fs.deposited),
      funding_cleared: Boolean(fs.cleared),
      funding_type: fundingType,
      funding_investment_amount: numericOrNull(fs.investmentAmount),
      funding_check_number: strOrNull(fs.checkNumber),
      funding_wire_reference_number: strOrNull(fs.wireReferenceNumber),
      funding_check_image_url: strOrNull(fs.checkImageUrl),
      funding_received_date: toDateOnly(fs.receivedDate),
      funding_deposited_date: toDateOnly(fs.depositedDate),
      funding_cleared_date: toDateOnly(fs.clearedDate),
      funding_notes: strOrNull(fs.notes),
      funding_other_type_description: strOrNull(fs.otherFundingTypeDescription),
    };

    const { data, error } = await supabase
      .from("participations")
      .insert(insert)
      .select("id")
      .single();
    if (error) {
      console.warn(`  [participations] failed ${doc.id}: ${error.message}`);
      continue;
    }
    idMap.set("participations", doc.id, data.id as string);
  }
  return idMap.size("participations");
}

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------

export async function migratePayments(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("payments").get();
  const rows: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const participation_id = idMap.get("participations", d.participationId);
    if (!participation_id) {
      console.warn(`  [payments] skip ${doc.id}: unknown participationId`);
      continue;
    }
    const date = toDateOnly(d.paymentDate);
    if (!date) {
      console.warn(`  [payments] skip ${doc.id}: invalid paymentDate`);
      continue;
    }
    rows.push({
      participation_id,
      payment_date: date,
      principal_amount: numericOrNull(d.principalAmount) ?? "0",
      interest_amount: numericOrNull(d.interestAmount) ?? "0",
      status: strOrNull(d.status) ?? "Scheduled",
    });
  }

  await batchInsert("payments", rows, (chunk) =>
    supabase.from("payments").insert(chunk),
  );
  return rows.length;
}

// ---------------------------------------------------------------------------
// beneficiaries
// ---------------------------------------------------------------------------

export async function migrateBeneficiaries(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("beneficiaries").get();
  const rows: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const user_id = idMap.get("users", d.userId);
    if (!user_id) {
      console.warn(`  [beneficiaries] skip ${doc.id}: unknown userId`);
      continue;
    }
    const pct = Number(d.percentage);
    rows.push({
      user_id,
      name: strOrNull(d.name) ?? "Unknown",
      relation: strOrNull(d.relation) ?? "Unknown",
      percentage: Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0,
      type: d.type === "Contingent" ? "Contingent" : "Primary",
      dob: toDateOnly(d.dob),
      phone: strOrNull(d.phone),
      address: strOrNull(d.address),
    });
  }

  await batchInsert("beneficiaries", rows, (chunk) =>
    supabase.from("beneficiaries").insert(chunk),
  );
  return rows.length;
}

// ---------------------------------------------------------------------------
// documents (user-attached)
// ---------------------------------------------------------------------------

export async function migrateDocuments(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("documents").get();
  const rows: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const user_id = idMap.get("users", d.userId);
    if (!user_id) {
      console.warn(`  [documents] skip ${doc.id}: unknown userId`);
      continue;
    }
    rows.push({
      user_id,
      type: strOrNull(d.type) ?? "other",
      file_name: strOrNull(d.fileName) ?? "unknown",
      file_url: strOrNull(d.fileUrl) ?? "",
      status: strOrNull(d.status) ?? "Pending",
    });
  }

  await batchInsert("documents", rows, (chunk) =>
    supabase.from("documents").insert(chunk),
  );
  return rows.length;
}

export async function migrateParticipationDocuments(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("participation_documents").get();
  const rows: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const participation_id = idMap.get("participations", d.participationId);
    if (!participation_id) {
      console.warn(`  [participation_documents] skip ${doc.id}: unknown participationId`);
      continue;
    }
    rows.push({
      participation_id,
      type: strOrNull(d.type) ?? "other",
      file_name: strOrNull(d.fileName) ?? "unknown",
      file_url: strOrNull(d.fileUrl) ?? "",
    });
  }

  await batchInsert("participation_documents", rows, (chunk) =>
    supabase.from("participation_documents").insert(chunk),
  );
  return rows.length;
}

// ---------------------------------------------------------------------------
// access_requests
// ---------------------------------------------------------------------------

export async function migrateAccessRequests(
  firestore: Firestore,
  supabase: SupabaseClient,
): Promise<number> {
  const snap = await firestore.collection("access_requests").get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    const status =
      d.status === "approved" || d.status === "rejected" ? d.status : "pending";
    return {
      first_name: strOrNull(d.firstName) ?? "",
      last_name: strOrNull(d.lastName) ?? "",
      email: strOrNull(d.email) ?? "",
      phone: strOrNull(d.phone) ?? "",
      is_tcc_member: Boolean(d.isTccMember),
      message: strOrNull(d.message),
      referral_code: strOrNull(d.referralCode),
      status,
      created_at: toIso(d.createdAt) ?? new Date().toISOString(),
    };
  });

  await batchInsert("access_requests", rows, (chunk) =>
    supabase.from("access_requests").insert(chunk),
  );
  return rows.length;
}

// ---------------------------------------------------------------------------
// referrals (referral_codes + referrals)
// ---------------------------------------------------------------------------

export async function migrateReferralCodes(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  // Legacy may use either `referral_codes` or `referralCodes` collection name
  let snap = await firestore.collection("referralCodes").get();
  if (snap.empty) snap = await firestore.collection("referral_codes").get();

  const rows: Record<string, unknown>[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const user_id = idMap.get("users", d.userId);
    const code = strOrNull(d.code);
    if (!user_id || !code) {
      console.warn(`  [referral_codes] skip ${doc.id}: missing userId or code`);
      continue;
    }
    rows.push({
      user_id,
      code,
      is_active: d.isActive !== false,
    });
  }

  await batchInsert("referral_codes", rows, (chunk) =>
    supabase.from("referral_codes").insert(chunk),
  );
  return rows.length;
}

export async function migrateReferrals(
  firestore: Firestore,
  supabase: SupabaseClient,
  idMap: IdMap,
): Promise<number> {
  const snap = await firestore.collection("referrals").get();
  const rows: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const referrer_id = idMap.get("users", d.referrerId);
    if (!referrer_id) {
      console.warn(`  [referrals] skip ${doc.id}: unknown referrerId`);
      continue;
    }
    const referred_user_id = idMap.get("users", d.referredUserId);
    const status =
      d.status === "signed_up" ||
      d.status === "invested" ||
      d.status === "qualified"
        ? d.status
        : "pending";
    rows.push({
      referrer_id,
      referred_user_id,
      referred_email: strOrNull(d.referredEmail),
      referred_name: strOrNull(d.referredName),
      referral_code: strOrNull(d.referralCode) ?? "",
      status,
      signup_date: toIso(d.signupDate),
      first_investment_date: toIso(d.firstInvestmentDate),
      first_investment_amount: numericOrNull(d.firstInvestmentAmount),
      notes: strOrNull(d.notes),
    });
  }

  await batchInsert("referrals", rows, (chunk) =>
    supabase.from("referrals").insert(chunk),
  );
  return rows.length;
}

// ---------------------------------------------------------------------------
// truncate (one-shot reset)
// ---------------------------------------------------------------------------

/**
 * Wipe all domain tables in the right FK order before a fresh migration.
 * Does NOT touch profiles or auth.users — those are handled separately by
 * migrateUsers (skip-if-exists by email). To fully wipe users you'd delete
 * them from the Supabase dashboard.
 */
export async function truncateDomainTables(
  supabase: SupabaseClient,
): Promise<void> {
  const tables = [
    "referrals",
    "referral_codes",
    "participation_documents",
    "documents",
    "beneficiaries",
    "payments",
    "participations",
    "note_registrations",
    "notes",
    "borrowers",
    "access_requests",
  ];
  for (const t of tables) {
    const { error } = await supabase
      .from(t)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      throw new Error(`Failed to truncate ${t}: ${error.message}`);
    }
  }
}
