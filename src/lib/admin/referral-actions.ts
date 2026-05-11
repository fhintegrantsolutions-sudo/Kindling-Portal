"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

const CODE_LEN = 6;
const CODE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

function makeCandidate(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)];
  }
  return s;
}

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

// Add a user as a referral partner: flips the badge on their profile AND
// generates a referral code if they don't already have one. Idempotent for
// the badge; the code-generation step is skipped if one exists.
export type AddReferralPartnerState = {
  error?: string;
  message?: string;
};

export async function addReferralPartner(
  _prev: AddReferralPartnerState | undefined,
  formData: FormData,
): Promise<AddReferralPartnerState> {
  await requireAdmin();
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) return { error: "Select a lender." };

  // 1. Flag the profile.
  const { error: profErr } = await supabase
    .from("profiles")
    .update({ is_referral_partner: true })
    .eq("id", userId);
  if (profErr) return { error: profErr.message };

  // 2. Generate a code if they don't have one. We swallow the existing-code
  // case so the action is idempotent for re-adding the badge.
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) {
    try {
      await createReferralCode(userId);
    } catch (e) {
      if (
        !(e instanceof Error) ||
        !e.message.includes("already enabled")
      ) {
        return {
          error: `Badge set, but referral code generation failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
        };
      }
    }
  }

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/users/${userId}`);
  return { message: "Added as referral partner." };
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
