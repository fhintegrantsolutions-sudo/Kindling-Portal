"use server";

import { revalidatePath } from "next/cache";
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
  const fields = {
    phone: String(formData.get("phone") ?? "").trim() || null,
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_city: String(formData.get("address_city") ?? "").trim() || null,
    address_state: String(formData.get("address_state") ?? "").trim() || null,
    address_zip: String(formData.get("address_zip") ?? "").trim() || null,
  };

  // Snapshot the current address so we can tell the client whether it changed.
  const { data: current } = await supabase
    .from("profiles")
    .select("address_street, address_city, address_state, address_zip")
    .eq("id", user.id)
    .maybeSingle();

  // Use .select() to detect silent RLS rejections: without it, .update()
  // returns success even when 0 rows match the policy, masking failures.
  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return {
      error:
        "Profile could not be updated — your session may have expired. Try signing out and back in.",
    };
  }

  const addressChanged =
    !!current &&
    ((current.address_street ?? null) !== fields.address_street ||
      (current.address_city ?? null) !== fields.address_city ||
      (current.address_state ?? null) !== fields.address_state ||
      (current.address_zip ?? null) !== fields.address_zip);

  revalidatePath("/profile");
  return { message: "Profile saved.", addressChanged, savedAt: Date.now() };
}
