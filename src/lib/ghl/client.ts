import "server-only";

// Minimal GoHighLevel (LeadConnector) v2 API client, authenticated with the
// Private Integration Token. Reads GHL_PRIVATE_INTEGRATION_TOKEN and
// GHL_LOCATION_ID from the environment; every call no-ops (returns null/false)
// when they aren't configured, so callers can treat GHL as best-effort.

const BASE = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

function ghlConfig(): { token: string; locationId: string } | null {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) return null;
  return { token, locationId };
}

function ghlHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

// Create or update a contact by email; returns the GHL contact id (or null).
export async function ghlUpsertContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<string | null> {
  const cfg = ghlConfig();
  if (!cfg) return null;
  const res = await fetch(`${BASE}/contacts/upsert`, {
    method: "POST",
    headers: ghlHeaders(cfg.token),
    body: JSON.stringify({
      locationId: cfg.locationId,
      email: input.email,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      phone: input.phone || undefined,
    }),
  });
  if (!res.ok) {
    console.warn(`[ghl] upsertContact HTTP ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { contact?: { id?: string } };
  return json.contact?.id ?? null;
}

// Send an email to a contact via the Conversations API. Returns true on accept.
export async function ghlSendEmail(input: {
  contactId: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const cfg = ghlConfig();
  if (!cfg) return false;
  const res = await fetch(`${BASE}/conversations/messages`, {
    method: "POST",
    headers: ghlHeaders(cfg.token),
    body: JSON.stringify({
      type: "Email",
      contactId: input.contactId,
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    console.warn(`[ghl] sendEmail HTTP ${res.status}`);
    return false;
  }
  return true;
}
