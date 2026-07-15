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
 *   4. Hydrates the auto-created profile with the login-level contact info so
 *      the lender's first /profile visit isn't a blank form
 *   5. Provisions the lender's primary investor_entity from the registration
 *      snapshot (entity type / business name / agreement name / address)
 *   6. Backfills participation.user_id + entity_id (and the note_registration's
 *      entity_id) so the new login owns its rows
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
  // address / loan-agreement-name there at /setup-participation, and that
  // snapshot becomes their investor entity when they sign in.
  const { data: reg } = await supabase
    .from("note_registrations")
    .select(
      "id, entity_type, business_name, name_for_agreement, mailing_address, city, state, zip_code",
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

  // Hydrate profile (the on_auth_user_created trigger created the row) with
  // login-level contact info only. Entity/address details live on the
  // investor entity provisioned below. Skip null/empty values so we don't
  // overwrite anything the user may have already filled in elsewhere.
  const profileUpdate: Record<string, string> = {};
  if (ar.first_name) profileUpdate.first_name = ar.first_name;
  if (ar.last_name) profileUpdate.last_name = ar.last_name;
  if (ar.phone) profileUpdate.phone = ar.phone;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileErr } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", newUserId);
    if (profileErr) {
      console.error("invite: profile update failed", profileErr.message);
    }
  }

  // Provision the lender's primary investor entity from the registration
  // snapshot. Idempotent-safe: if this user somehow already has an entity
  // (retry / prior partial run), reuse it — a second is_primary row would be
  // rejected by investor_entities_one_primary_idx anyway.
  const entityId = await ensurePrimaryEntity(admin, newUserId, ar.email, reg);

  // Backfill the participation with the new owner + entity.
  const { error: partErr } = await admin
    .from("participations")
    .update({ user_id: newUserId, entity_id: entityId })
    .eq("id", participationId);
  if (partErr) {
    throw new Error(
      `Invite sent but failed to backfill participation.user_id: ${partErr.message}`,
    );
  }

  // Claim the lead's note_registration rows for the new login as well, so the
  // lender can see their own paperwork under RLS.
  const { error: regUpdErr } = await admin
    .from("note_registrations")
    .update({ user_id: newUserId, entity_id: entityId })
    .eq("access_request_id", p.access_request_id);
  if (regUpdErr) {
    console.error(
      "invite: note_registrations backfill failed",
      regUpdErr.message,
    );
  }

  revalidatePath("/admin/participations");
  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

type EntitySnapshot = {
  entity_type: string | null;
  business_name: string | null;
  name_for_agreement: string | null;
  mailing_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
} | null;

/**
 * Return the user's primary investor entity, creating it from the lead's
 * note_registration snapshot if they don't have one yet.
 *
 * display_name mirrors the backfill migration
 * (20260712000001_investor_entities_backfill.sql): the trimmed business_name
 * when non-empty, else "Personal" for Individual/unknown entity types, else
 * the entity_type label itself.
 *
 * `email` is seeded from the address we just invited — the same address the
 * lead corresponded under. Without it this path would mint the one kind of row
 * the whole feature exists to prevent: an entity with no email of its own, whose
 * correspondence address would be lost the moment its login is merged away.
 */
async function ensurePrimaryEntity(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  reg: EntitySnapshot,
): Promise<string> {
  const { data: existing } = await admin
    .from("investor_entities")
    .select("id")
    .eq("owner_user_id", userId)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const entityType = reg?.entity_type?.trim() || null;
  const businessName = reg?.business_name?.trim() || null;
  const displayName =
    businessName ??
    (entityType === null || entityType === "Individual"
      ? "Personal"
      : entityType);

  const { data: created, error: entityErr } = await admin
    .from("investor_entities")
    .insert({
      owner_user_id: userId,
      display_name: displayName,
      email,
      entity_type: entityType,
      business_name: businessName,
      loan_agreement_title: reg?.name_for_agreement ?? null,
      address_street: reg?.mailing_address ?? null,
      address_city: reg?.city ?? null,
      address_state: reg?.state ?? null,
      address_zip: reg?.zip_code ?? null,
      is_primary: true,
    })
    .select("id")
    .maybeSingle();

  if (entityErr || !created?.id) {
    throw new Error(
      `Invite sent but failed to create the lender's investor entity: ${
        entityErr?.message ?? "no row returned"
      }`,
    );
  }
  return created.id as string;
}
