import "server-only";

import { ghlSendEmail, ghlUpsertContact } from "./client";

const ADMIN_EMAIL = "info@kindling.network";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Best-effort email to Kindling when a lender submits a change request, sent
// through GoHighLevel like the other portal emails. Subject:
// "Change Request: <Lender> - <Activity>". NEVER throws.
export async function notifyChangeRequest(payload: {
  lender: string;
  lenderEmail: string | null;
  activity: string;
  entity: string | null;
  lines: Array<[string, string]>;
  message: string | null;
  requestId: string;
  // Opening line of the email; defaults to a submitted-request intro.
  intro?: string;
}): Promise<void> {
  try {
    const contactId = await ghlUpsertContact({
      email: ADMIN_EMAIL,
      firstName: "Kindling",
      lastName: "Admin",
    });
    if (!contactId) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const rows = [
      ["Lender", payload.lender],
      ["Lender email", payload.lenderEmail ?? "—"],
      ["Request", payload.activity],
      ...(payload.entity ? [["Entity", payload.entity]] : []),
      ...payload.lines,
      ...(payload.message ? [["Message", payload.message]] : []),
    ] as Array<[string, string]>;
    const html = `<p>${esc(payload.intro ?? "A lender submitted a change request.")}</p>
<table cellpadding="4" style="border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="color:#666">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join("\n")}
</table>
<p><a href="${esc(appUrl)}/admin/change-requests/${esc(payload.requestId)}">Review in the portal</a></p>`;
    await ghlSendEmail({
      contactId,
      subject: `Change Request: ${payload.lender} - ${payload.activity}`,
      html,
    });
  } catch (e) {
    console.warn(
      "[ghl] notifyChangeRequest failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
