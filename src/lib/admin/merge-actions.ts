"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildMergePreview,
  mergeLoginsCore,
  type MergePreview,
  type MergeResult,
} from "./merge-core";

export type { MergePreview, MergeResult, MergeSummary } from "./merge-core";

/**
 * Typing this exact word is the only way to arm the merge. Not exported — a
 * "use server" module may only export async functions; the UI has its own copy.
 */
const MERGE_CONFIRM_TEXT = "MERGE";

/**
 * Service role, deliberately: the merge re-points ownership across five tables
 * plus auth, and admin RLS policies are not the right thing to lean on for a
 * write this destructive. requireAdmin() is the gate, and it runs first —
 * every exported action below calls it before touching a client.
 */
function db() {
  return createAdminClient();
}

/** READ ONLY. Exactly what a merge would change, computed fresh on the server. */
export async function previewMergeLogins(
  survivorId: string,
  absorbedIds: string[],
): Promise<{ preview?: MergePreview; error?: string }> {
  await requireAdmin();
  const unique = [...new Set(absorbedIds)].filter((id) => id !== survivorId);
  if (unique.length === 0) {
    return { error: "Select at least one other login to merge in." };
  }
  try {
    return { preview: await buildMergePreview(db(), survivorId, unique) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Consolidate `absorbedIds` into `survivorId`. Irreversible: the absorbed
 * logins are BANNED and can no longer sign in.
 *
 * Never auto-merges — `confirmText` must be typed by a human.
 */
export async function mergeLogins(
  survivorId: string,
  absorbedIds: string[],
  confirmText: string,
): Promise<MergeResult> {
  await requireAdmin();

  if (confirmText.trim() !== MERGE_CONFIRM_TEXT) {
    return { error: `Type ${MERGE_CONFIRM_TEXT} to confirm.` };
  }
  const unique = [...new Set(absorbedIds)];
  if (unique.length === 0) {
    return { error: "Select at least one login to merge in." };
  }
  if (unique.includes(survivorId)) {
    return { error: "The survivor cannot also be an absorbed login." };
  }

  const client = db();
  const result = await mergeLoginsCore(client, client, survivorId, unique);

  if (result.summary) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/[id]", "layout");
  }
  return result;
}
