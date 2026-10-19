"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal";
import { normalizeEmail, toProperCase } from "@/lib/text";
import { formatPhone, phoneDigits } from "@/lib/phone";

const CODE_LEN = 6;
const CODE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

function makeCandidate(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)];
  }
  return s;
}

// Enable referrals for a lender: generates a code and flips the
// `is_referral_partner` badge in one step. Used by the "Enable referrals"
// button on /admin/users/[id], which is the only path to mark an existing
// lender as a referral partner.
export async function createReferralCode(userId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    throw new Error("Referrals are already enabled for this user.");
  }

  // Try a few candidates; UNIQUE on `code` enforces no collisions.
  let lastErr: string | undefined;
  for (let i = 0; i < 8; i++) {
    const code = makeCandidate();
    const { error } = await supabase
      .from("referral_codes")
      .insert({ user_id: userId, code, is_active: true });
    if (!error) {
      // Badge is a quick-filter mirror of "has an active referral_code".
      await supabase
        .from("profiles")
        .update({ is_referral_partner: true })
        .eq("id", userId);
      revalidatePath("/admin/referrals");
      revalidatePath(`/admin/users/${userId}`);
      revalidatePath("/profile/referrals");
      return;
    }
    lastErr = error.message;
    if (!error.message.toLowerCase().includes("duplicate")) {
      throw new Error(`Failed to enable referrals: ${error.message}`);
    }
  }
  throw new Error(
    `Could not generate a unique referral code after retries${lastErr ? `: ${lastErr}` : ""}`,
  );
}

export async function setReferralCodeActive(
  referralCodeId: string,
  isActive: boolean,
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: target } = await supabase
    .from("referral_codes")
    .select("user_id")
    .eq("id", referralCodeId)
    .maybeSingle();
  if (!target) throw new Error("Referral code not found");

  const { error } = await supabase
    .from("referral_codes")
    .update({ is_active: isActive })
    .eq("id", referralCodeId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/users/${target.user_id}`);
  revalidatePath("/profile/referrals");
}

// ============================================================================
// External referral partners — people who refer leads without holding a portal
// account. Stored in `referral_partners`, never in `profiles`/`auth.users`
// until/unless they're converted to a lender.
// ============================================================================

export type CreateExternalPartnerState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export async function createExternalPartner(
  _prev: CreateExternalPartnerState | undefined,
  formData: FormData,
): Promise<CreateExternalPartnerState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parsePartnerFields(formData);
  const fieldErrors = validatePartnerFields(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Same alphabet/length as `referral_codes.code` so the two namespaces line
  // up — when a partner is later converted, we copy the code straight into
  // `referral_codes` without regenerating.
  let lastErr: string | undefined;
  for (let i = 0; i < 8; i++) {
    const code = makeCandidate();
    const { error } = await supabase.from("referral_partners").insert({
      ...fields,
      referral_code: code,
    });
    if (!error) {
      revalidatePath("/admin/referrals");
      return { message: `Added — code ${code}` };
    }
    lastErr = error.message;
    const msg = error.message.toLowerCase();
    if (msg.includes("duplicate") && msg.includes("referral_code")) continue;
    if (msg.includes("duplicate") && msg.includes("email"))
      return { fieldErrors: { email: "An entry with this email already exists." } };
    return { error: error.message };
  }
  return {
    error: `Could not generate a unique referral code${lastErr ? `: ${lastErr}` : ""}`,
  };
}

type PartnerFields = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  business_name: string | null;
  notes: string | null;
};

function parsePartnerFields(formData: FormData): PartnerFields {
  return {
    first_name: toProperCase(String(formData.get("first_name") ?? "")),
    last_name: toProperCase(String(formData.get("last_name") ?? "")),
    email: normalizeEmail(String(formData.get("email") ?? "")),
    phone: formatPhone(String(formData.get("phone") ?? "")),
    business_name: String(formData.get("business_name") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validatePartnerFields(f: PartnerFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.first_name) errors.first_name = "Required";
  if (!f.last_name) errors.last_name = "Required";
  if (!f.email) errors.email = "Required";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email))
    errors.email = "Enter a valid email";
  if (!f.phone) errors.phone = "Required";
  else if (phoneDigits(f.phone).length !== 10)
    errors.phone = "Enter a valid 10-digit phone number";
  return errors;
}

export type UpdateExternalPartnerState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

// Edit fields on an external partner. The referral_code is intentionally NOT
// editable — tracked /request-access?ref= URLs in the wild rely on it.
export async function updateExternalPartner(
  id: string,
  _prev: UpdateExternalPartnerState | undefined,
  formData: FormData,
): Promise<UpdateExternalPartnerState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parsePartnerFields(formData);
  const fieldErrors = validatePartnerFields(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase
    .from("referral_partners")
    .update(fields)
    .eq("id", id);
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("duplicate") && msg.includes("email"))
      return {
        fieldErrors: { email: "Another partner already has this email." },
      };
    return { error: error.message };
  }

  revalidatePath("/admin/referrals");
  return { message: "Saved." };
}

export async function deleteExternalPartner(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("referral_partners")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/referrals");
}

// Convert an external partner to a full lender. Creates the auth user + a
// hydrated profile, flags the profile as a referral partner, and copies the
// existing partner code into `referral_codes` so any tracked URLs in the wild
// keep resolving to the same person. The `referral_partners` row stays
// around as a historical breadcrumb (with `converted_user_id` set).
export async function convertPartnerToLender(
  partnerId: string,
): Promise<{ userId: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: partner, error: pErr } = await admin
    .from("referral_partners")
    .select("id, first_name, last_name, email, phone, referral_code, converted_user_id")
    .eq("id", partnerId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!partner) throw new Error("Partner not found");
  if (partner.converted_user_id)
    throw new Error("This partner is already a lender.");
  if (!partner.email)
    throw new Error("Add an email to the partner before converting.");

  // 1. Create the auth user (no invite email — admin can trigger that
  // separately via /admin/users if/when they want the lender to log in).
  const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
    email: partner.email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { converted_from_referral_partner: partner.id },
  });
  if (uErr || !userRes.user) {
    throw new Error(`Could not create auth user: ${uErr?.message ?? "unknown"}`);
  }
  const userId = userRes.user.id;

  // 2. Hydrate the profile (the row is auto-created by the auth trigger;
  // we update it with the partner's known fields).
  const { error: profErr } = await admin
    .from("profiles")
    .update({
      first_name: partner.first_name,
      last_name: partner.last_name,
      phone: partner.phone,
      role: "lender",
      is_referral_partner: true,
    })
    .eq("id", userId);
  if (profErr) throw new Error(`Profile hydrate failed: ${profErr.message}`);

  // 3. Copy the partner code into `referral_codes` so existing /request-access
  // ?ref= links keep working after the partner has a real auth row.
  const { error: codeErr } = await admin.from("referral_codes").insert({
    user_id: userId,
    code: partner.referral_code,
    is_active: true,
  });
  if (codeErr) throw new Error(`Code copy failed: ${codeErr.message}`);

  // 4. Mark the partner row as converted (kept as a breadcrumb).
  const { error: markErr } = await admin
    .from("referral_partners")
    .update({
      converted_user_id: userId,
      converted_at: new Date().toISOString(),
    })
    .eq("id", partnerId);
  if (markErr) throw new Error(`Mark-converted failed: ${markErr.message}`);

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/users/${userId}`);
  return { userId };
}

function randomPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  return Array.from(
    { length: 32 },
    () => chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

// Clear the badge (and disable any active referral code).
export async function removeReferralPartner(userId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error: profErr } = await supabase
    .from("profiles")
    .update({ is_referral_partner: false })
    .eq("id", userId);
  if (profErr) throw new Error(profErr.message);

  // Deactivate any active codes so they stop accepting new referrals.
  await supabase
    .from("referral_codes")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/users/${userId}`);
}
