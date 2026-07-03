import "server-only";

import { ghlCreateTag } from "./client";

// The bare note tag ("k26003") — applied to a lender once their funds arrive.
export function noteBaseTag(noteId: string): string {
  return noteId.trim().toLowerCase();
}

// The lead tag ("lead k26003") — applied when a lender registers, removed once
// their funds are received.
export function noteLeadTag(noteId: string): string {
  const base = noteBaseTag(noteId);
  return base ? `lead ${base}` : "";
}

// The two GHL tags every note gets provisioned with: the bare note id and the
// lead variant, both lowercased from the human note id.
export function noteTagNames(noteId: string): string[] {
  const base = noteBaseTag(noteId);
  if (!base) return [];
  return [base, `lead ${base}`];
}

// Best-effort: ensure a note's tags exist in the GHL tag library when the note
// is created. NEVER throws — a CRM hiccup must not fail note creation. No-ops
// when the GHL env vars aren't set.
export async function ensureNoteTags(noteId: string): Promise<void> {
  try {
    for (const name of noteTagNames(noteId)) {
      await ghlCreateTag(name);
    }
  } catch (e) {
    console.warn(
      "[ghl] ensureNoteTags failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
