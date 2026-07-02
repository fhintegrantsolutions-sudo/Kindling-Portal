import "server-only";

// Payload POSTed to the GoHighLevel Inbound-Webhook workflow when a lender
// submits a note registration. Field names are the keys the GHL workflow
// references as {{inboundWebhookRequest.<field>}} in the email template.
export type RegistrationNotification = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  note_id: string; // human note id, e.g. "K26003A"
  amount: number; // 2500
  amount_formatted: string; // "$2,500.00"
};

// Best-effort notification to GoHighLevel. Fire-and-forget from the caller's
// perspective: it NEVER throws, so a CRM hiccup can't fail a registration that
// already succeeded. No-ops until GHL_REGISTRATION_WEBHOOK_URL is configured.
export async function notifyRegistrationSubmitted(
  payload: RegistrationNotification,
): Promise<void> {
  const url = process.env.GHL_REGISTRATION_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(
        `[ghl] registration webhook returned HTTP ${res.status} for note ${payload.note_id}`,
      );
    }
  } catch (e) {
    console.warn(
      "[ghl] registration webhook failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
