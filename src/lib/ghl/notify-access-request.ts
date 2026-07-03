import "server-only";

import { ghlCreateOpportunity, ghlUpsertContact } from "./client";

export type AccessRequestNotification = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
};

// Best-effort GoHighLevel notification when someone submits the public
// "Request access" form: upsert the contact, then create an opportunity in the
// lead pipeline (GHL_LEAD_PIPELINE_ID / GHL_LEAD_STAGE_ID). NEVER throws — a CRM
// hiccup must not fail the access request. No-ops if the PIT/pipeline env vars
// aren't set.
export async function notifyAccessRequestSubmitted(
  payload: AccessRequestNotification,
): Promise<void> {
  try {
    const contactId = await ghlUpsertContact({
      email: payload.email,
      firstName: payload.first_name,
      lastName: payload.last_name,
      phone: payload.phone,
    });
    if (!contactId) return;

    const name =
      `${payload.first_name} ${payload.last_name}`.trim() || payload.email;
    await ghlCreateOpportunity({
      pipelineId: process.env.GHL_LEAD_PIPELINE_ID ?? "",
      pipelineStageId: process.env.GHL_LEAD_STAGE_ID ?? "",
      contactId,
      name,
    });
  } catch (e) {
    console.warn(
      "[ghl] notifyAccessRequestSubmitted failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
