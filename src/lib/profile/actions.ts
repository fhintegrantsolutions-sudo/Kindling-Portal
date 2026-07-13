"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = {
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_city: String(formData.get("address_city") ?? "").trim() || null,
    address_state: String(formData.get("address_state") ?? "").trim() || null,
    address_zip: String(formData.get("address_zip") ?? "").trim() || null,
  };

  // Snapshot the entity's current address so we can tell the client whether this
  // save changed it (drives the W-9 prompt). Lenders can SELECT their own
  // entities, so the session client is enough for the read.
  const { data: current } = await supabase
    .from("investor_entities")
    .select("address_street, address_city, address_state, address_zip")
    .eq("owner_user_id", user.id)
    .eq("is_primary", true)
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
  // goes through the service-role client — scoped strictly to the row owned by
  // the *session's* user (identity comes from supabase.auth.getUser() above,
  // never from client input) and to their primary entity.
  const admin = createAdminClient();
  const { data: entity, error: entityError } = await admin
    .from("investor_entities")
    .update(address)
    .eq("owner_user_id", user.id)
    .eq("is_primary", true)
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

  revalidatePath("/profile");
  return { message: "Profile saved.", addressChanged, savedAt: Date.now() };
}
