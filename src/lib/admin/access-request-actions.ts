"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export type ApproveFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Approve an access request. With the unified-funding model this is the
 * single action that:
 *   1. Creates a participation in awaiting-funding state, with user_id=null
 *      and access_request_id pointing back at the access request
 *   2. Marks the access request status='converted'
 *
 * Funding tracking thereafter happens on the participation. The new lender
 * gets an invite via the participation's "Invite lender" action once funds
 * clear.
 */
export async function approveAccessRequest(
  id: string,
  _prev: ApproveFormState | undefined,
  formData: FormData,
): Promise<ApproveFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const noteId = String(formData.get("note_id") ?? "").trim() || null;
  const amountRaw = String(formData.get("investment_amount") ?? "").trim();
  const investmentAmount = amountRaw ? Number(amountRaw) : null;

  const fieldErrors: Record<string, string> = {};
  if (!noteId) fieldErrors.note_id = "Pick a note";
  if (
    investmentAmount === null ||
    !Number.isFinite(investmentAmount) ||
    investmentAmount <= 0
  ) {
    fieldErrors.investment_amount = "Enter an amount greater than zero";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verify the access request exists and is approvable
  const { data: ar } = await supabase
    .from("access_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!ar) return { error: "Access request not found" };
  if (ar.status === "converted") {
    return { error: "Already converted into a participation." };
  }
  if (ar.status === "rejected") {
    return { error: "This access request was rejected." };
  }

  // Insert the participation (awaiting-funding, no user yet)
  const { error: insertErr } = await supabase
    .from("participations")
    .insert({
      user_id: null,
      note_id: noteId,
      access_request_id: id,
      invested_amount: investmentAmount!.toString(),
      status: "Active",
    });
  if (insertErr) {
    return { error: `Failed to create participation: ${insertErr.message}` };
  }

  // Persist note + amount on the access_request and flip status
  const { error: updateErr } = await supabase
    .from("access_requests")
    .update({
      status: "converted",
      note_id: noteId,
      investment_amount: investmentAmount!.toString(),
    })
    .eq("id", id);
  if (updateErr) {
    return {
      error: `Participation created but failed to mark access request converted: ${updateErr.message}`,
    };
  }

  revalidatePath("/admin/access-requests");
  revalidatePath(`/admin/access-requests/${id}`);
  revalidatePath("/admin/participations");
  revalidatePath("/admin");
  return {};
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
