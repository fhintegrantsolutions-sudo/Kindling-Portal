"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export type ApproveFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  setupUrl?: string;
};

// Toggle whether an access request's submitter is a CoSpark member. Lets an
// admin correct the answer (e.g. a lead who is a member but answered "no", or
// records imported without the flag set).
export async function setAccessRequestCoSparkMember(
  requestId: string,
  isMember: boolean,
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("access_requests")
    .update({ is_tcc_member: isMember })
    .eq("id", requestId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/access-requests/${requestId}`);
  revalidatePath("/admin/access-requests");
  return {};
}

const SETUP_TOKEN_TTL_DAYS = 14;

/**
 * Approve an access request. Persists the note + amount the admin chose
 * and generates a one-time setup_token. Returns the public URL the admin
 * sends to the lead so the lead can fill in their own legal-doc info.
 *
 * NO participation is created here. The participation is created when the
 * lead submits the setup form (see submitLeadParticipationForm in
 * src/lib/lead/actions.ts).
 */
export async function approveAccessRequest(
  id: string,
  _prev: ApproveFormState | undefined,
  formData: FormData,
): Promise<ApproveFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const noteId = String(formData.get("note_id") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!noteId) fieldErrors.note_id = "Pick a note";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { data: ar } = await supabase
    .from("access_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!ar) return { error: "Access request not found" };
  if (ar.status === "converted") {
    return { error: "Already converted." };
  }
  if (ar.status === "rejected") {
    return { error: "This access request was rejected." };
  }

  const token = randomBytes(24).toString("hex"); // 48 hex chars
  const expires = new Date(
    Date.now() + SETUP_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: updateErr } = await supabase
    .from("access_requests")
    .update({
      status: "approved",
      note_id: noteId,
      setup_token: token,
      setup_token_expires_at: expires,
    })
    .eq("id", id);
  if (updateErr) {
    return { error: `Failed to approve: ${updateErr.message}` };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  revalidatePath("/admin/access-requests");
  revalidatePath(`/admin/access-requests/${id}`);
  revalidatePath("/admin");
  return { setupUrl: `${appUrl}/setup-participation/${token}` };
}

export async function rejectAccessRequest(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("access_requests")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/access-requests");
  revalidatePath(`/admin/access-requests/${id}`);
  revalidatePath("/admin");
}
