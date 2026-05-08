"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    first_name: String(formData.get("first_name") ?? "").trim() || null,
    last_name: String(formData.get("last_name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_city: String(formData.get("address_city") ?? "").trim() || null,
    address_state: String(formData.get("address_state") ?? "").trim() || null,
    address_zip: String(formData.get("address_zip") ?? "").trim() || null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { message: "Profile saved." };
}
