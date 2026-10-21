"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { normalizeEmail } from "@/lib/text";
import { notifyChangeRequest } from "@/lib/ghl/notify-change-request";
import { isMessageRequired, typeDef } from "./types";

export type ChangeRequestFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

// Lender submits a change request. Validated against the type's field list;
// emails Kindling (info@kindling.network) via GHL.
export async function submitChangeRequest(
  _prev: ChangeRequestFormState | undefined,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const [profile, ctx] = await Promise.all([
    getCurrentProfile(),
    getCurrentEntityContext(),
  ]);
  if (!profile || !ctx) return { error: "Please sign in again." };

  const def = typeDef(String(formData.get("type") ?? ""));
  if (!def || def.lenderSelectable === false) {
    return { fieldErrors: { type: "Choose what you'd like to change." } };
  }

  const fieldErrors: Record<string, string> = {};
  let entityId: string | null = null;
  if (def.needsEntity) {
    entityId = String(formData.get("entity_id") ?? "").trim() || null;
    if (!entityId || !ctx.entities.some((e) => e.id === entityId)) {
      fieldErrors.entity_id = "Choose which entity this is for.";
    }
  }

  const details: Record<string, string> = {};
  for (const f of def.fields) {
    let v = String(formData.get(f.key) ?? "").trim();
    if (f.type === "email" && v) {
      v = normalizeEmail(v);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
        fieldErrors[f.key] = "Enter a valid email address.";
      }
    }
    if (f.required && !v) fieldErrors[f.key] = "Required";
    if (v) details[f.key] = v;
  }
  const message = String(formData.get("message") ?? "").trim() || null;
  if (isMessageRequired(def) && !message) {
    fieldErrors.message = "Please describe the change.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      user_id: profile.id,
      entity_id: entityId,
      type: def.type,
      details,
      message,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: "We couldn't submit your request. Please try again." };
  }

  const lender =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    (profile.email as string) ||
    "Lender";
  await notifyChangeRequest({
    lender,
    lenderEmail: (profile.email as string) ?? null,
    activity: def.label,
    entity: entityId
      ? (ctx.entities.find((e) => e.id === entityId)?.display_name ?? null)
      : null,
    lines: def.fields
      .filter((f) => details[f.key])
      .map((f) => [f.label, details[f.key]] as [string, string]),
    message,
    requestId: data.id as string,
  });

  revalidatePath("/profile/change-requests");
  revalidatePath("/admin");
  revalidatePath("/admin/change-requests");
  return {
    message:
      "Thanks — your request was submitted. We'll follow up within 24–48 business hours.",
  };
}
