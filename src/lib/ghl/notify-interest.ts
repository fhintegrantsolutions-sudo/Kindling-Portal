import "server-only";

import {
  ghlAddContactTags,
  ghlRemoveContactTags,
  ghlUpsertContact,
} from "./client";
import { noteInterestTag } from "./note-tags";

// Best-effort GoHighLevel sync for the "interested" stage: tag the lender's
// contact "interested k26004" (or remove it on withdraw). NEVER throws — a CRM
// hiccup must not fail the portal action. No-ops when GHL isn't configured.
export async function syncInterestTag(payload: {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  note_id: string;
  interested: boolean;
}): Promise<void> {
  try {
    const tag = noteInterestTag(payload.note_id);
    if (!tag || !payload.email) return;
    const contactId = await ghlUpsertContact({
      email: payload.email,
      firstName: payload.first_name ?? undefined,
      lastName: payload.last_name ?? undefined,
    });
    if (!contactId) return;
    if (payload.interested) await ghlAddContactTags(contactId, [tag]);
    else await ghlRemoveContactTags(contactId, [tag]);
  } catch (e) {
    console.warn(
      "[ghl] syncInterestTag failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
