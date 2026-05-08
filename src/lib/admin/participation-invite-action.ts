"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal";

/**
 * For new-lead participations (user_id IS NULL): once funds clear, the admin
 * clicks "Invite lender" and this action:
 *   1. Reads the linked access_request for prospect contact info
 *   2. Reads the spawned note_registration for entity / address / agreement
 *      details the lead filled out at /setup-participation
 *   3. Creates a Supabase auth user via inviteUserByEmail (sends invite email)
 *   4. Backfills participation.user_id with the new user's id
 *   5. Hydrates the auto-created profile with everything we have so the
 *      lender's first /profile visit isn't a blank form
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

  // Read the spawned note_registration too — the lead filled in entity /
  // address / loan-agreement-name there at /setup-participation, and we
  // want those on their profile when they sign in.
  const { data: reg } = await supabase
    .from("note_registrations")
    .select(
      "entity_type, name_for_agreement, mailing_address, city, state, zip_code",
    )
    .eq("access_request_id", p.access_request_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  // Hydrate profile (the on_auth_user_created trigger created the row).
  // Skip null/empty values so we don't overwrite anything the user may
  // have already filled in elsewhere.
  const profileUpdate: Record<string, string> = {};
  if (ar.first_name) profileUpdate.first_name = ar.first_name;
  if (ar.last_name) profileUpdate.last_name = ar.last_name;
  if (ar.phone) profileUpdate.phone = ar.phone;
  if (reg?.entity_type) profileUpdate.entity_type = reg.entity_type;
  if (reg?.name_for_agreement)
    profileUpdate.loan_agreement_title = reg.name_for_agreement;
  if (reg?.mailing_address)
    profileUpdate.address_street = reg.mailing_address;
  if (reg?.city) profileUpdate.address_city = reg.city;
  if (reg?.state) profileUpdate.address_state = reg.state;
  if (reg?.zip_code) profileUpdate.address_zip = reg.zip_code;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileErr } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", newUserId);
    if (profileErr) {
      console.error("invite: profile update failed", profileErr.message);
    }
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
