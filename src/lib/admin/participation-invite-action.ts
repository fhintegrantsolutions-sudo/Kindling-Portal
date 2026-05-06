"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal";

/**
 * For new-lead participations (user_id IS NULL): once funds clear, the admin
 * clicks "Invite lender" and this action:
 *   1. Reads the linked access_request for prospect contact info
 *   2. Creates a Supabase auth user via inviteUserByEmail (sends invite email)
 *   3. Backfills participation.user_id with the new user's id
 *   4. Updates the auto-created profile with name + phone from access_request
 *
 * Refuses if user_id already set (returning lender — no invite needed) or
 * funding hasn't cleared yet.
 */
export async function inviteLenderForParticipation(
  participationId: string,
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: p, error: readErr } = await supabase
    .from("participations")
    .select("id, user_id, funding_cleared, access_request_id")
    .eq("id", participationId)
    .maybeSingle();
  if (readErr || !p) throw new Error("Participation not found");
  if (p.user_id) {
    throw new Error("This participation already has a user account.");
  }
  if (!p.funding_cleared) {
    throw new Error("Funding must be cleared before inviting the lender.");
  }
  if (!p.access_request_id) {
    throw new Error(
      "This participation has no linked access request — no contact info to invite.",
    );
  }

  // Read the prospect's contact info from the originating access request
  const { data: ar } = await supabase
    .from("access_requests")
    .select("email, first_name, last_name, phone")
    .eq("id", p.access_request_id)
    .maybeSingle();
  if (!ar?.email) {
    throw new Error("Linked access request is missing an email.");
  }

  // Send the invite via service-role admin API
  const admin = createAdminClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(ar.email, {
      redirectTo: `${appUrl}/auth/callback?next=/account-setup`,
      data: {
        first_name: ar.first_name,
        last_name: ar.last_name,
        access_request_id: p.access_request_id,
      },
    });
  if (inviteErr || !invited.user) {
    throw new Error(
      `Invite failed: ${inviteErr?.message ?? "no user returned"}`,
    );
  }
  const newUserId = invited.user.id;

  // Update profile (the on_auth_user_created trigger created the row)
  const fullName = `${ar.first_name ?? ""} ${ar.last_name ?? ""}`.trim();
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      name: fullName || null,
      phone: ar.phone || null,
    })
    .eq("id", newUserId);
  if (profileErr) {
    console.error("invite: profile update failed", profileErr.message);
  }

  // Backfill the participation
  const { error: partErr } = await admin
    .from("participations")
    .update({ user_id: newUserId })
    .eq("id", participationId);
  if (partErr) {
    throw new Error(
      `Invite sent but failed to backfill participation.user_id: ${partErr.message}`,
    );
  }

  revalidatePath("/admin/participations");
  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
