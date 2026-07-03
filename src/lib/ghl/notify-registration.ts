import "server-only";

import {
  ghlCreateOpportunity,
  ghlSendEmail,
  ghlUpsertContact,
} from "./client";

export type RegistrationNotification = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  note_id: string; // human note id, e.g. "K26003A"
  amount: number; // 2500
  amount_formatted: string; // "$2,500.00"
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Best-effort GoHighLevel notification when a lender submits a note
// registration: upsert the contact, then email them a confirmation with the
// amount. NEVER throws — a CRM/email hiccup must not fail a registration that
// already succeeded. No-ops when the PIT/location env vars aren't set.
export async function notifyRegistrationSubmitted(
  payload: RegistrationNotification,
): Promise<void> {
  try {
    // Tag the lender by note, e.g. "K26003" -> "lead k26003". Each note id is a
    // distinct note, so the full id is kept (K26003A and K26003B tag separately).
    const noteTag = `lead ${payload.note_id.toLowerCase()}`;
    const contactId = await ghlUpsertContact({
      email: payload.email,
      firstName: payload.first_name,
      lastName: payload.last_name,
      phone: payload.phone,
      tags: [noteTag],
    });
    if (!contactId) return;

    // Track the registration as an opportunity in the pipeline (independent
    // best-effort — a failure here must not skip the confirmation email).
    try {
      const lender =
        `${payload.first_name} ${payload.last_name}`.trim() || payload.email;
      await ghlCreateOpportunity({
        pipelineId: process.env.GHL_REGISTRATION_PIPELINE_ID ?? "",
        pipelineStageId: process.env.GHL_REGISTRATION_STAGE_ID ?? "",
        contactId,
        name: `${lender} — ${payload.note_id}`,
        monetaryValue: payload.amount,
      });
    } catch (e) {
      console.warn(
        "[ghl] createOpportunity failed:",
        e instanceof Error ? e.message : e,
      );
    }

    const firstName = payload.first_name.trim() || "there";
    const subject = `Your registration for ${payload.note_id} has been submitted`;
    const html = `<p>Hi ${esc(firstName)},</p>
<p>We&rsquo;ve received your registration for note <strong>${esc(payload.note_id)}</strong> in the amount of <strong>${esc(payload.amount_formatted)}</strong>.</p>
<p>We&rsquo;ll follow up with the next steps for funding. Thank you for participating!</p>
<p>&mdash; Kindling</p>`;

    await ghlSendEmail({ contactId, subject, html });
  } catch (e) {
    console.warn(
      "[ghl] notifyRegistrationSubmitted failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
