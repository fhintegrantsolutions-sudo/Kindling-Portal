"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// A lender's own private notes on one of their participations. The lender UPDATE
// RLS policy only permits changes pre-funding, but these notes must be editable
// at any time — so we verify ownership in code (session user owns the
// participation directly, or owns the entity that holds it) and write with the
// service-role client, touching ONLY user_notes. Mirrors the ownership check in
// getDocumentDownloadUrl. Never shown to admins or other lenders.
export async function updateMyParticipationNotes(
  participationId: string,
  notes: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data: part } = await admin
    .from("participations")
    .select("id, user_id, entity_id")
    .eq("id", participationId)
    .maybeSingle();
  if (!part) return { error: "Participation not found." };

  let owns = part.user_id === user.id;
  if (!owns && part.entity_id) {
    const { data: entity } = await admin
      .from("investor_entities")
      .select("id")
      .eq("id", part.entity_id)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    owns = Boolean(entity);
  }
  if (!owns) return { error: "Not available." };

  const { error } = await admin
    .from("participations")
    .update({ user_notes: notes.trim() || null })
    .eq("id", participationId);
  if (error) return { error: error.message };
  return {};
}
