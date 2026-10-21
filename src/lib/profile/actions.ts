"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { formatZip, isValidZip, normalizeState } from "@/lib/address";
import { toProperCase } from "@/lib/text";
import { notifyChangeRequest } from "@/lib/ghl/notify-change-request";

export type ProfileFormState = {
  error?: string;
  message?: string;
  // True when this save changed the mailing address, so the UI can prompt the
  // lender about updating their W-9. `savedAt` is a per-save token the client
  // keys the prompt on, so each qualifying save re-opens it.
  addressChanged?: boolean;
  savedAt?: number;
};

export async function updateProfile(
  _prev: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // first_name / last_name are intentionally NOT writable here — they're locked
  // (greyed out) on the lender's profile UI. entity_type and loan_agreement_title
  // are likewise admin-only (shown read-only on the Loan agreement tab).
  // Phone is optional, but if present it must be a complete US number. Store
  // it in the canonical (XXX) XXX-XXXX form so every record looks the same.
  const phoneRaw = phoneDigits(String(formData.get("phone") ?? ""));
  if (phoneRaw.length > 0 && phoneRaw.length !== 10) {
    return { error: "Enter a valid 10-digit phone number." };
  }
  const phone = phoneRaw.length === 10 ? formatPhone(phoneRaw) : null;
  const zipRaw = String(formData.get("address_zip") ?? "");
  if (!isValidZip(zipRaw)) {
    return { error: "Enter a valid 5-digit ZIP code." };
  }
  const address = {
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_city: toProperCase(String(formData.get("address_city") ?? "")) || null,
    address_state:
      normalizeState(String(formData.get("address_state") ?? "")) || null,
    address_zip: formatZip(zipRaw) || null,
  };

  // The address belongs to the SELECTED entity — never the primary one. Writing
  // to the primary here would silently overwrite the personal entity's address
  // while the lender was editing their LLC.
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entities.length === 0) {
    return {
      error:
        "No investor entity is set up for your account. Contact info@kindling.network.",
    };
  }
  if (ctx.mode === "all" || !ctx.currentEntityId) {
    return {
      error:
        "Your mailing address is set per entity. Choose an entity from the switcher, then save.",
    };
  }
  const targetEntityId = ctx.currentEntityId;

  // Snapshot the entity's current address so we can tell the client whether this
  // save changed it (drives the W-9 prompt). Lenders can SELECT their own
  // entities, so the session client is enough for the read.
  const { data: current } = await supabase
    .from("investor_entities")
    .select("address_street, address_city, address_state, address_zip")
    .eq("id", targetEntityId)
    .maybeSingle();

  // Phone stays on the login-level profile row.
  // Use .select() to detect silent RLS rejections: without it, .update()
  // returns success even when 0 rows match the policy, masking failures.
  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({ phone })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }
  if (!updatedProfile) {
    return {
      error:
        "Profile could not be updated — your session may have expired. Try signing out and back in.",
    };
  }

  // The mailing address lives on the investor entity. Lenders have no UPDATE
  // policy on investor_entities (entities are admin-managed), so this one write
  // goes through the service-role client. It's scoped to the SELECTED entity AND
  // re-checks ownership against the *session's* user (identity comes from
  // supabase.auth.getUser() above, never from client input) — the service-role
  // client bypasses RLS, so this owner check is the only thing standing between
  // a tampered cookie and someone else's row. getCurrentEntityContext() already
  // validates ownership; the owner_user_id filter is belt-and-braces.
  const admin = createAdminClient();
  const { data: entity, error: entityError } = await admin
    .from("investor_entities")
    .update(address)
    .eq("id", targetEntityId)
    .eq("owner_user_id", user.id)
    .select("id")
    .maybeSingle();

  if (entityError) {
    return { error: entityError.message };
  }
  if (!entity) {
    return {
      error:
        "Your address could not be updated — no investor entity is set up for this account. Contact info@kindling.network.",
    };
  }

  const addressChanged =
    !!current &&
    ((current.address_street ?? null) !== address.address_street ||
      (current.address_city ?? null) !== address.address_city ||
      (current.address_state ?? null) !== address.address_state ||
      (current.address_zip ?? null) !== address.address_zip);

  // Lenders change their mailing address directly, but Kindling is notified:
  // log it under Change requests (as completed) and email info@kindling.network.
  if (addressChanged) {
    const fmt = (a: {
      address_street: string | null;
      address_city: string | null;
      address_state: string | null;
      address_zip: string | null;
    }) =>
      [a.address_street, [a.address_city, a.address_state].filter(Boolean).join(", "), a.address_zip]
        .filter(Boolean)
        .join(" ") || "—";
    const oldAddress = fmt(current!);
    const newAddress = fmt(address);
    const { data: who } = await admin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const entityName =
      ctx.entities.find((e) => e.id === targetEntityId)?.display_name ?? null;
    const { data: logged } = await admin
      .from("change_requests")
      .insert({
        user_id: user.id,
        entity_id: targetEntityId,
        type: "mailing_address",
        details: {
          address_street: address.address_street ?? "",
          address_city: address.address_city ?? "",
          address_state: address.address_state ?? "",
          address_zip: address.address_zip ?? "",
        },
        message: `Previous address: ${oldAddress}`,
        status: "completed",
        admin_note: "Updated directly by the lender on Profile.",
        resolved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    const lender =
      `${who?.first_name ?? ""} ${who?.last_name ?? ""}`.trim() ||
      who?.email ||
      user.email ||
      "Lender";
    await notifyChangeRequest({
      lender,
      lenderEmail: (who?.email as string | null) ?? user.email ?? null,
      activity: "Mailing address updated",
      entity: entityName,
      lines: [
        ["Previous address", oldAddress],
        ["New address", newAddress],
      ],
      message: null,
      requestId: (logged?.id as string | undefined) ?? "",
      intro:
        "A lender updated their mailing address on their Profile. They may also need an updated W-9.",
    });
    revalidatePath("/admin/change-requests");
  }

  revalidatePath("/profile");
  return { message: "Profile saved.", addressChanged, savedAt: Date.now() };
}
