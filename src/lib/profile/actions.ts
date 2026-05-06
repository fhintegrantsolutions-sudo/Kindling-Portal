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

  const fields = {
    name: String(formData.get("name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_city: String(formData.get("address_city") ?? "").trim() || null,
    address_state: String(formData.get("address_state") ?? "").trim() || null,
    address_zip: String(formData.get("address_zip") ?? "").trim() || null,
    entity_type: String(formData.get("entity_type") ?? "").trim() || null,
    loan_agreement_title:
      String(formData.get("loan_agreement_title") ?? "").trim() || null,
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
