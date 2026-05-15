"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toProperCase } from "@/lib/text";

export type ProfileFormState = {
  error?: string;
  message?: string;
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

  // entity_type and loan_agreement_title are intentionally NOT writable from
  // this self-serve action — they're locked on the lender's profile UI and
  // can only be changed by admin support (see ReadonlyField on the form).
  const fields = {
    first_name: toProperCase(String(formData.get("first_name") ?? "")) || null,
    last_name: toProperCase(String(formData.get("last_name") ?? "")) || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_city: String(formData.get("address_city") ?? "").trim() || null,
    address_state: String(formData.get("address_state") ?? "").trim() || null,
    address_zip: String(formData.get("address_zip") ?? "").trim() || null,
  };

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

  revalidatePath("/profile");
  return { message: "Profile saved." };
}
