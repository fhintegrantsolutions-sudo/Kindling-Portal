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
//
// DANGER: /contacts/upsert REPLACES the contact's entire `tags` array — it does
// NOT merge. Passing one tag here wipes every other tag on that contact. This
// function therefore NEVER sends `tags`; use ghlAddContactTags() to add tags
// without destroying the existing ones. (Verified against the live API.)
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

// ADD tags to a contact without disturbing the ones already on it.
// POST /contacts/{id}/tags is additive (unlike the upsert endpoint).
export async function ghlAddContactTags(
  contactId: string,
  tags: string[],
): Promise<boolean> {
  const cfg = ghlConfig();
  if (!cfg) return false;
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  if (!contactId || clean.length === 0) return false;
  const res = await fetch(`${BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: ghlHeaders(cfg.token),
    body: JSON.stringify({ tags: clean }),
  });
  if (!res.ok) {
    console.warn(`[ghl] addContactTags HTTP ${res.status}`);
    return false;
  }
  return true;
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

// Create an opportunity in a given pipeline/stage for a contact. No-ops
// (returns null) if pipelineId or pipelineStageId is empty, so callers can pass
// env-driven ids that may be unset. Returns the new opportunity id.
export async function ghlCreateOpportunity(input: {
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  name: string;
  monetaryValue?: number;
}): Promise<string | null> {
  const cfg = ghlConfig();
  if (!cfg) return null;
  if (!input.pipelineId || !input.pipelineStageId) return null;
  const res = await fetch(`${BASE}/opportunities/`, {
    method: "POST",
    headers: ghlHeaders(cfg.token),
    body: JSON.stringify({
      pipelineId: input.pipelineId,
      pipelineStageId: input.pipelineStageId,
      locationId: cfg.locationId,
      name: input.name,
      status: "open",
      contactId: input.contactId,
      monetaryValue: input.monetaryValue,
    }),
  });
  if (!res.ok) {
    console.warn(`[ghl] createOpportunity HTTP ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { opportunity?: { id?: string } };
  return json.opportunity?.id ?? null;
}

// Remove tags from a contact by contact id. Uses contacts.write (same scope as
// upsert). Returns true on success; no-ops if no contact/tags given.
export async function ghlRemoveContactTags(
  contactId: string,
  tags: string[],
): Promise<boolean> {
  const cfg = ghlConfig();
  if (!cfg) return false;
  if (!contactId || tags.length === 0) return false;
  const res = await fetch(`${BASE}/contacts/${contactId}/tags`, {
    method: "DELETE",
    headers: ghlHeaders(cfg.token),
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    console.warn(`[ghl] removeContactTags HTTP ${res.status}`);
    return false;
  }
  return true;
}

// Create a tag in the location's tag library. Idempotent from the caller's view:
// treats a duplicate (400/422 "already exists") as success, since the goal is
// only to guarantee the tag exists. Requires the PIT to hold the location tags
// write scope. Returns true when the tag exists after the call.
export async function ghlCreateTag(name: string): Promise<boolean> {
  const cfg = ghlConfig();
  if (!cfg) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  const res = await fetch(`${BASE}/locations/${cfg.locationId}/tags`, {
    method: "POST",
    headers: ghlHeaders(cfg.token),
    body: JSON.stringify({ name: trimmed }),
  });
  if (res.ok) return true;
  // A tag that already exists is a success for our purposes.
  if (res.status === 400 || res.status === 422) {
    const body = await res.text();
    if (/exist/i.test(body)) return true;
    console.warn(`[ghl] createTag HTTP ${res.status}: ${body}`);
    return false;
  }
  console.warn(`[ghl] createTag HTTP ${res.status}`);
  return false;
}
