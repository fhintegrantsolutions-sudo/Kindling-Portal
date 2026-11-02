import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBaseClient } from "@/lib/supabase/base";

// Demo account: a login whose profiles.demo_of points at a real lender. It sees
// that lender's portal read-only (RLS demo policies, migration
// 20261101000000_demo_account.sql), with their personal details masked here.

export const DEMO_MESSAGE = "This is a demo account — changes are disabled.";

const DEMO_EMAIL = "demo@kindling.network";
const DEMO_PHONE = "(555) 555-0100";
const DEMO_STREET = "123 Demo Street";
const DEMO_CITY = "Springfield";
const DEMO_ZIP = "00000";

// Keys whose values are always hidden from a demo login.
const HIDDEN_KEYS = new Set(["ssn_last4", "dob"]);

export type Demo = {
  // The real lender this demo login mirrors.
  targetUserId: string;
  fetch: typeof fetch;
};

// Per request: is the signed-in login a demo? Uses the unmasked base client so
// it can't recurse through createClient().
export const getDemo = cache(async (): Promise<Demo | null> => {
  const supabase = await createBaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("demo_of")
    .eq("id", user.id)
    .maybeSingle();
  // Before the migration runs the column doesn't exist: treat as not a demo.
  const targetUserId = !error
    ? ((data as { demo_of: string | null } | null)?.demo_of ?? null)
    : null;
  if (!targetUserId) return null;

  const replacements = await buildReplacements(targetUserId);
  return { targetUserId, fetch: maskingFetch(replacements) };
});

export async function isDemo(): Promise<boolean> {
  return (await getDemo()) !== null;
}

// The user id whose data lender pages should show: the mirrored lender for a
// demo login, otherwise the login itself.
export async function getEffectiveUserId(userId: string): Promise<string> {
  return (await getDemo())?.targetUserId ?? userId;
}

type Pair = [from: RegExp, to: string];

// Whole-word match, so a short name like "Ann" never touches "Annual". Names
// of 5+ letters may also match inside a word ("JaneDoe-Ack.pdf") when
// `inside` is set.
function wordPattern(s: string, inside = false): RegExp {
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return inside && s.length >= 5
    ? new RegExp(escaped, "gi")
    : new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "gi");
}

// Real value -> demo value for every personal detail of the mirrored lender.
async function buildReplacements(targetUserId: string): Promise<Pair[]> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: entities }, { data: beneficiaries }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("first_name, last_name, phone, email")
        .eq("id", targetUserId)
        .maybeSingle(),
      admin
        .from("investor_entities")
        .select(
          "display_name, entity_type, business_name, loan_agreement_title, address_street, address_city, address_zip, email, is_primary",
        )
        .eq("owner_user_id", targetUserId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true }),
      admin
        .from("beneficiaries")
        .select("name, phone, address")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: true }),
    ]);

  const raw: Array<[string, string, boolean]> = [];
  const add = (from: unknown, to: string, inside = false) => {
    const s = typeof from === "string" ? from.trim() : "";
    if (s.length >= 3 && s !== to) raw.push([s, to, inside]);
  };

  const p = profile as Record<string, string | null> | null;
  const first = p?.first_name?.trim() ?? "";
  const last = p?.last_name?.trim() ?? "";
  if (first && last) add(`${first} ${last}`, "Demo Lender");
  add(p?.phone, DEMO_PHONE);
  add(p?.email, DEMO_EMAIL);

  let n = 0;
  for (const e of (entities ?? []) as Array<Record<string, unknown>>) {
    const individual = e.entity_type === "Individual" || e.is_primary === true;
    const name = individual
      ? "Demo Lender"
      : `Demo ${e.entity_type === "Trust" ? "Family Trust" : "Holdings"}${++n > 1 ? ` ${n}` : ""}${e.entity_type === "LLC" ? " LLC" : ""}`;
    add(e.loan_agreement_title, name);
    add(e.business_name, name);
    if (e.display_name !== "Personal") add(e.display_name, name);
    add(e.address_street, DEMO_STREET);
    add(e.address_city, DEMO_CITY);
    add(e.address_zip, DEMO_ZIP);
    add(e.email, DEMO_EMAIL);
  }

  const seen = new Map<string, string>();
  for (const b of (beneficiaries ?? []) as Array<Record<string, string | null>>) {
    const name = b.name?.trim();
    if (name && !seen.has(name)) {
      seen.set(name, `Beneficiary ${String.fromCharCode(65 + seen.size)}`);
      add(name, seen.get(name)!);
    }
    add(b.phone, DEMO_PHONE);
    add(b.address, `${DEMO_STREET}, ${DEMO_CITY}`);
  }

  // Catch-alls for anything left (e.g. a family name inside a file name).
  if (last) add(last, "Demo", true);
  if (first) add(first, "Demo", true);

  // Longest first so "Jane Doe" is replaced before "Doe".
  return raw
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to, inside]) => [wordPattern(from, inside), to]);
}

function maskValue(v: unknown, pairs: Pair[]): unknown {
  if (typeof v === "string") {
    let s = v;
    for (const [from, to] of pairs) s = s.replace(from, to);
    return s;
  }
  if (Array.isArray(v)) return v.map((x) => maskValue(x, pairs));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      out[k] = HIDDEN_KEYS.has(k) ? null : maskValue(x, pairs);
    }
    return out;
  }
  return v;
}

// Wraps fetch so every PostgREST JSON response is masked before the app sees it.
function maskingFetch(pairs: Pair[]): typeof fetch {
  return async (input, init) => {
    const res = await fetch(input, init);
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const type = res.headers.get("content-type") ?? "";
    if (!url.includes("/rest/v1/") || !type.includes("json") || !res.ok) {
      return res;
    }
    const text = await res.text();
    let body: string;
    try {
      body = JSON.stringify(maskValue(JSON.parse(text), pairs));
    } catch {
      body = text;
    }
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
