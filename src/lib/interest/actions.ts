"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { isInterestWindowOpen } from "@/lib/notes/interest-window";
import { syncInterestTag } from "@/lib/ghl/notify-interest";

export type InterestActionState = { error?: string; message?: string };

// Load the note + confirm the lender owns the entity and the window is open.
async function guard(noteUuid: string, entityId: string) {
  const supabase = await createClient();
  const [ctx, profile] = await Promise.all([
    getCurrentEntityContext(),
    getCurrentProfile(),
  ]);
  if (!ctx || !profile) return { error: "Please sign in again." } as const;
  if (!ctx.entities.some((e) => e.id === entityId)) {
    return { error: "Choose one of your entities." } as const;
  }
  const { data: note } = await supabase
    .from("notes")
    .select("id, note_id, funding_start_date")
    .eq("id", noteUuid)
    .maybeSingle();
  if (!note) return { error: "Note not found." } as const;
  if (!isInterestWindowOpen(note.funding_start_date as string | null)) {
    return { error: "Interest for this note isn't open right now." } as const;
  }
  return { supabase, profile, note } as const;
}

// Record (or update) interest for an entity, with an optional estimated amount.
export async function saveNoteInterest(
  noteUuid: string,
  _prev: InterestActionState | undefined,
  formData: FormData,
): Promise<InterestActionState> {
  const entityId = String(formData.get("entity_id") ?? "").trim();
  const rawAmount = String(formData.get("estimated_amount") ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
  let amount: number | null = null;
  if (rawAmount) {
    const n = Number(rawAmount);
    if (!Number.isFinite(n) || n <= 0) {
      return { error: "Enter an amount greater than zero, or leave it blank." };
    }
    amount = Math.round(n * 100) / 100;
  }
  if (!entityId) return { error: "Choose which entity is interested." };

  const g = await guard(noteUuid, entityId);
  if ("error" in g) return { error: g.error };

  const { error } = await g.supabase.from("note_interests").upsert(
    {
      note_id: noteUuid,
      entity_id: entityId,
      user_id: g.profile.id,
      estimated_amount: amount,
    },
    { onConflict: "note_id,entity_id" },
  );
  if (error) return { error: error.message };

  await syncInterestTag({
    email: g.profile.email as string,
    first_name: g.profile.first_name as string | null,
    last_name: g.profile.last_name as string | null,
    note_id: g.note.note_id as string,
    interested: true,
  });

  revalidatePath("/opportunities");
  revalidatePath("/admin");
  revalidatePath(`/admin/notes/${noteUuid}`);
  return { message: "Thanks — we've noted your interest." };
}

// Withdraw an entity's interest.
export async function withdrawNoteInterest(
  noteUuid: string,
  entityId: string,
): Promise<InterestActionState> {
  const g = await guard(noteUuid, entityId);
  if ("error" in g) return { error: g.error };

  const { error } = await g.supabase
    .from("note_interests")
    .delete()
    .eq("note_id", noteUuid)
    .eq("entity_id", entityId);
  if (error) return { error: error.message };

  // Keep the GHL tag while any other entity of this login is still interested.
  const { count } = await g.supabase
    .from("note_interests")
    .select("id", { count: "exact", head: true })
    .eq("note_id", noteUuid)
    .eq("user_id", g.profile.id);
  if (!count) {
    await syncInterestTag({
      email: g.profile.email as string,
      note_id: g.note.note_id as string,
      interested: false,
    });
  }

  revalidatePath("/opportunities");
  revalidatePath("/admin");
  revalidatePath(`/admin/notes/${noteUuid}`);
  return { message: "Interest withdrawn." };
}
