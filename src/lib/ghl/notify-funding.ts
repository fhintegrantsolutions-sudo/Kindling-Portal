import "server-only";

import {
  ghlAddContactTags,
  ghlRemoveContactTags,
  ghlUpsertContact,
} from "./client";
import { noteBaseTag, noteLeadTag } from "./note-tags";

// When a participation's funds are received, transition the lender's GHL tags
// from lead to participant: add the bare note tag ("k26003") and remove the
// lead tag ("lead k26003"). Matched by email (the contact already exists from
// registration). Best-effort — NEVER throws, so a CRM hiccup can't fail the
// funding save. No-ops when the GHL env vars aren't set.
export async function tagParticipantFundsReceived(payload: {
  email: string;
  note_id: string;
}): Promise<void> {
  try {
    const base = noteBaseTag(payload.note_id);
    const lead = noteLeadTag(payload.note_id);
    if (!base || !payload.email) return;

    const contactId = await ghlUpsertContact({ email: payload.email });
    if (!contactId) return;

    // Additive — upsert would replace the contact's whole tag array.
    await ghlAddContactTags(contactId, [base]);
    if (lead) await ghlRemoveContactTags(contactId, [lead]);
  } catch (e) {
    console.warn(
      "[ghl] tagParticipantFundsReceived failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
