"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export async function approveRegistration(registrationId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reg, error: readErr } = await supabase
    .from("note_registrations")
    .select("id, status, user_id, note_id, investment_amount")
    .eq("id", registrationId)
    .maybeSingle();

  if (readErr || !reg) {
    throw new Error("Registration not found");
  }
  if (reg.status !== "pending") {
    throw new Error(`Registration is already ${reg.status}`);
  }
  if (!reg.user_id) {
    throw new Error("Registration has no user_id (guest submission)");
  }

  // 1. create the participation
  const { error: insertErr } = await supabase.from("participations").insert({
    user_id: reg.user_id,
    note_id: reg.note_id,
    invested_amount: reg.investment_amount,
    status: "Active",
  });
  if (insertErr) {
    throw new Error(`Failed to create participation: ${insertErr.message}`);
  }

  // 2. mark the registration approved
  const { error: updateErr } = await supabase
    .from("note_registrations")
    .update({ status: "approved" })
    .eq("id", registrationId);
  if (updateErr) {
    // Participation was created but registration status didn't update.
    // Surface the inconsistency rather than swallow it.
    throw new Error(
      `Participation created but failed to mark registration approved: ${updateErr.message}`,
    );
  }

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${registrationId}`);
  revalidatePath("/admin");
  redirect("/admin/registrations?approved=1");
}

export async function rejectRegistration(registrationId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reg, error: readErr } = await supabase
    .from("note_registrations")
    .select("id, status")
    .eq("id", registrationId)
    .maybeSingle();
  if (readErr || !reg) {
    throw new Error("Registration not found");
  }
  if (reg.status !== "pending") {
    throw new Error(`Registration is already ${reg.status}`);
  }

  const { error } = await supabase
    .from("note_registrations")
    .update({ status: "rejected" })
    .eq("id", registrationId);
  if (error) {
    throw new Error(`Failed to reject: ${error.message}`);
  }

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${registrationId}`);
  revalidatePath("/admin");
  redirect("/admin/registrations?rejected=1");
}
