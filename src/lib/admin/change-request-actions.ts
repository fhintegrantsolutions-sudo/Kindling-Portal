"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { normalizeState, formatZip } from "@/lib/address";
import { toProperCase } from "@/lib/text";
import { typeDef } from "@/lib/change-requests/types";

export type ResolveState = { error?: string; message?: string };

function revalidate(id: string, userId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/change-requests");
  revalidatePath(`/admin/change-requests/${id}`);
  if (userId) revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/profile");
  revalidatePath("/profile/change-requests");
}

// Approve a request. For auto-apply types the requested values are written to
// the entity / profile first; then the request is marked completed.
export async function approveChangeRequest(
  id: string,
  _prev: ResolveState | undefined,
  formData: FormData,
): Promise<ResolveState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const note = String(formData.get("admin_note") ?? "").trim() || null;

  const { data: req } = await supabase
    .from("change_requests")
    .select("id, user_id, entity_id, type, details, status")
    .eq("id", id)
    .maybeSingle();
  if (!req) return { error: "Request not found." };
  if (req.status !== "open") return { error: "This request is already closed." };
  const def = typeDef(req.type as string);
  if (!def) return { error: "Unknown request type." };
  const d = (req.details ?? {}) as Record<string, string>;

  if (def.autoApply) {
    let error: { message: string } | null = null;
    if (req.type === "name") {
      ({ error } = await supabase
        .from("profiles")
        .update({ first_name: d.first_name, last_name: d.last_name })
        .eq("id", req.user_id));
    } else {
      if (!req.entity_id) return { error: "This request has no entity to update." };
      let patch: Record<string, string | null> = {};
      if (req.type === "mailing_address") {
        patch = {
          address_street: d.address_street ?? null,
          address_city: toProperCase(d.address_city ?? "") || null,
          address_state: normalizeState(d.address_state ?? "") || null,
          address_zip: formatZip(d.address_zip ?? "") || null,
        };
      } else if (req.type === "entity_email") {
        patch = { email: d.email ?? null };
      } else if (req.type === "la_title") {
        patch = { loan_agreement_title: d.loan_agreement_title ?? null };
      } else if (req.type === "la_entity_type") {
        patch = { entity_type: d.entity_type ?? null };
      } else if (req.type === "la_business_name") {
        patch = { business_name: d.business_name ?? null };
      }
      ({ error } = await supabase
        .from("investor_entities")
        .update(patch)
        .eq("id", req.entity_id));
    }
    if (error) return { error: `Couldn't apply the change: ${error.message}` };
  }

  const { error: upErr } = await supabase
    .from("change_requests")
    .update({
      status: "completed",
      admin_note: note,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upErr) return { error: upErr.message };

  revalidate(id, req.user_id as string);
  return {
    message: def.autoApply
      ? "Change applied and request completed."
      : "Request marked complete.",
  };
}

// Decline a request (with an optional note for the record).
export async function declineChangeRequest(
  id: string,
  _prev: ResolveState | undefined,
  formData: FormData,
): Promise<ResolveState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const note = String(formData.get("admin_note") ?? "").trim() || null;
  const { data: req } = await supabase
    .from("change_requests")
    .select("user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!req) return { error: "Request not found." };
  if (req.status !== "open") return { error: "This request is already closed." };
  const { error } = await supabase
    .from("change_requests")
    .update({
      status: "declined",
      admin_note: note,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate(id, req.user_id as string);
  return { message: "Request declined." };
}
