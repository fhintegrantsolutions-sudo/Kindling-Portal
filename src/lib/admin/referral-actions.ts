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
