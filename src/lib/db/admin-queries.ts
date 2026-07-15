import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  // Leads
  pendingAccessRequests: number;
  awaitingLeadSubmission: number;
  convertedLeads: number;
  // Participations funding pipeline
  participationsAwaitingFunding: number;
  participationsReceived: number;
  participationsDeposited: number;
  participationsCleared: number;
  // Portfolio
  totalUsers: number;
  activeParticipations: number;
  totalInvested: number;
  activeNotes: number;
  activeNotesPublic: number;
  activeNotesPrivate: number;
};

// Count of unique lenders by US state for the admin geography heat map.
// Normalizes state to its uppercase 2-letter code; rows without a state are
// dropped (so only mappable lenders get plotted).
export type StateUserCount = {
  state: string; // uppercase 2-letter code, e.g. "TX"
  count: number;
};

export async function getUsersByState(): Promise<StateUserCount[]> {
  const supabase = await createClient();

  // Only count users who have at least one cleared participation on a note
  // whose status is "Active" — admins/lenders without any active position
  // don't represent capital deployed and shouldn't show on the heat map.
  const { data: activeParts } = await supabase
    .from("participations")
    .select("user_id, note:notes!inner(status)")
    .eq("funding_cleared", true)
    .eq("note.status", "Active");

  const activeUserIds = new Set(
    ((activeParts ?? []) as Array<{ user_id: string | null }>)
      .map((p) => p.user_id)
      .filter(Boolean) as string[],
  );
  if (activeUserIds.size === 0) return [];

  // The mailing address lives on the investor entity, not the login. This is a
  // user-context count (unique lenders), so we read each login's PRIMARY entity.
  const { data } = await supabase
    .from("investor_entities")
    .select("owner_user_id, address_state")
    .in("owner_user_id", Array.from(activeUserIds))
    .eq("is_primary", true)
    .not("address_state", "is", null);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ address_state: string | null }>) {
    const raw = (row.address_state ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return Array.from(counts, ([state, count]) => ({ state, count })).sort(
    (a, b) => b.count - a.count,
  );
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const [
    pendingAR,
    awaitingLead,
    convertedAR,
    awaitingFunding,
    received,
    deposited,
    cleared,
    totalUsers,
    activeParts,
    allActive,
    activeNotes,
    activeNotesPublic,
    activeNotesPrivate,
  ] = await Promise.all([
    // Leads
    supabase
      .from("access_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    // Approved lead with a setup token, lead hasn't submitted yet
    supabase
      .from("access_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("access_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "converted"),
    // Participations by funding stage
    supabase
      .from("participations")
      .select("*, notes!inner(funding_archived_at)", { count: "exact", head: true })
      .eq("funding_received", false)
      .is("notes.funding_archived_at", null),
    supabase
      .from("participations")
      .select("*, notes!inner(funding_archived_at)", { count: "exact", head: true })
      .eq("funding_received", true)
      .eq("funding_deposited", false)
      .eq("funding_cleared", false)
      .is("notes.funding_archived_at", null),
    supabase
      .from("participations")
      .select("*, notes!inner(funding_archived_at)", { count: "exact", head: true })
      .eq("funding_deposited", true)
      .eq("funding_cleared", false)
      .is("notes.funding_archived_at", null),
    supabase
      .from("participations")
      .select("*, notes!inner(funding_archived_at)", { count: "exact", head: true })
      .eq("funding_cleared", true)
      .is("notes.funding_archived_at", null),
    // Portfolio
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    // "Active" participations = the row is Active AND the lender's funding
    // has cleared — un-cleared rows are still in the funding workflow, not
    // actually deployed capital.
    supabase
      .from("participations")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active")
      .eq("funding_cleared", true),
    supabase
      .from("participations")
      .select("invested_amount")
      .eq("status", "Active")
      .eq("funding_cleared", true),
    supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active"),
    supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active")
      .eq("is_private", false),
    supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active")
      .eq("is_private", true),
  ]);

  const totalInvested = (allActive.data ?? []).reduce(
    (sum, row) => sum + Number(row.invested_amount ?? 0),
    0,
  );

  return {
    pendingAccessRequests: pendingAR.count ?? 0,
    awaitingLeadSubmission: awaitingLead.count ?? 0,
    convertedLeads: convertedAR.count ?? 0,
    participationsAwaitingFunding: awaitingFunding.count ?? 0,
    participationsReceived: received.count ?? 0,
    participationsDeposited: deposited.count ?? 0,
    participationsCleared: cleared.count ?? 0,
    totalUsers: totalUsers.count ?? 0,
    activeParticipations: activeParts.count ?? 0,
    totalInvested,
    activeNotes: activeNotes.count ?? 0,
    activeNotesPublic: activeNotesPublic.count ?? 0,
    activeNotesPrivate: activeNotesPrivate.count ?? 0,
  };
}

export type RegistrationListItem = {
  id: string;
  status: "pending" | "approved" | "rejected" | "converted";
  first_name: string;
  last_name: string;
  email: string;
  investment_amount: string;
  created_at: string;
  note: { note_id: string; title: string } | null;
};

export async function getRegistrations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_registrations")
    .select(
      `
      id, status, first_name, last_name, email,
      investment_amount, created_at,
      note:notes ( note_id, title )
      `,
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as RegistrationListItem[];
}

export type RegistrationDetail = {
  id: string;
  status: "pending" | "approved" | "rejected" | "converted";
  user_id: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  entity_type: string;
  name_for_agreement: string;
  mailing_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  investment_amount: string;
  acknowledge_lender: boolean;
  created_at: string;
  note: {
    id: string;
    note_id: string;
    title: string;
    principal: string;
    rate: string;
    term_months: number;
  } | null;
};

export type AdminParticipationListItem = {
  id: string;
  user_id: string | null;
  access_request_id: string | null;
  invested_amount: string;
  status: string;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  funding_type: string | null;
  created_at: string;
  note: {
    note_id: string;
    title: string;
    funding_archived_at: string | null;
  } | null;
  lender_name: string | null;
  lender_email: string | null;
  business_name: string | null;
  is_prospect: boolean;
};

export async function getParticipations(filter?: {
  fundingState?: "awaiting_funding" | "received" | "deposited" | "cleared" | "awaiting_invite";
}) {
  const supabase = await createClient();
  let q = supabase
    .from("participations")
    .select(
      `
      id, user_id, access_request_id, invested_amount, status,
      funding_received, funding_deposited, funding_cleared,
      funding_type, created_at,
      note:notes ( note_id, title, funding_archived_at ),
      entity:investor_entities ( business_name )
      `,
    )
    .order("created_at", { ascending: false });

  switch (filter?.fundingState) {
    case "awaiting_funding":
      q = q.eq("funding_received", false);
      break;
    case "received":
      q = q.eq("funding_received", true).eq("funding_deposited", false);
      break;
    case "deposited":
      q = q.eq("funding_deposited", true).eq("funding_cleared", false);
      break;
    case "cleared":
      q = q.eq("funding_cleared", true);
      break;
    case "awaiting_invite":
      q = q.eq("funding_cleared", true).is("user_id", null);
      break;
  }

  const { data } = await q;
  // business_name now comes from the entity that holds the position (the
  // participation's entity_id), not from the login's profile. Leads that were
  // never converted have entity_id NULL and, exactly as before, show no
  // business name in this list.
  const rows = (data ?? []) as unknown as Array<
    Omit<
      AdminParticipationListItem,
      "lender_name" | "lender_email" | "business_name" | "is_prospect"
    > & { entity: { business_name: string | null } | null }
  >;
  if (rows.length === 0) return [];

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]),
  );
  const arIds = Array.from(
    new Set(
      rows
        .filter((r) => r.user_id === null)
        .map((r) => r.access_request_id)
        .filter(Boolean) as string[],
    ),
  );

  // Name + email stay login-level (profiles) — those columns aren't moving.
  const profileMap = new Map<
    string,
    { name: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>) {
      profileMap.set(p.id, {
        name:
          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null,
        email: p.email,
      });
    }
  }

  const arMap = new Map<
    string,
    { name: string | null; email: string | null }
  >();
  if (arIds.length > 0) {
    const { data: ars } = await supabase
      .from("access_requests")
      .select("id, first_name, last_name, email")
      .in("id", arIds);
    for (const a of (ars ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>) {
      arMap.set(a.id, {
        name:
          `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || null,
        email: a.email,
      });
    }
  }

  return rows.map((r) => {
    const { entity, ...rest } = r;
    let lenderName: string | null = null;
    let lenderEmail: string | null = null;
    let isProspect = false;
    if (r.user_id) {
      const p = profileMap.get(r.user_id);
      lenderName = p?.name ?? null;
      lenderEmail = p?.email ?? null;
    } else if (r.access_request_id) {
      const a = arMap.get(r.access_request_id);
      lenderName = a?.name ?? null;
      lenderEmail = a?.email ?? null;
      isProspect = true;
    }
    return {
      ...rest,
      lender_name: lenderName,
      lender_email: lenderEmail,
      business_name: entity?.business_name ?? null,
      is_prospect: isProspect,
    };
  });
}

export type AdminParticipationDetail = {
  id: string;
  user_id: string | null;
  access_request_id: string | null;
  invested_amount: string;
  submitted_amount: string | null;
  status: string;
  user_notes: string | null;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  funding_type: "wire" | "check" | "ach" | "other" | null;
  funding_investment_amount: string | null;
  funding_check_number: string | null;
  funding_wire_reference_number: string | null;
  funding_check_image_url: string | null;
  funding_received_date: string | null;
  funding_deposited_date: string | null;
  funding_cleared_date: string | null;
  funding_notes: string | null;
  funding_other_type_description: string | null;
  created_at: string;
  note: {
    id: string;
    note_id: string;
    title: string;
    principal: string;
    rate: string;
    term_months: number;
  } | null;
  // For returning lenders (user_id set): name + email from profiles
  // For new leads (user_id null, access_request_id set): name + email + phone
  // from the linked access_request
  lender: {
    name: string | null;
    email: string | null;
    phone: string | null;
    isProspect: boolean;
  } | null;
};

export async function getParticipationById(id: string) {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("participations")
    .select("*, note:notes ( id, note_id, title, principal, rate, term_months )")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const row = p as {
    user_id: string | null;
    access_request_id: string | null;
  };

  let lender: AdminParticipationDetail["lender"] = null;
  if (row.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", row.user_id)
      .maybeSingle();
    if (profile) {
      const fn = (profile.first_name as string | null) ?? "";
      const ln = (profile.last_name as string | null) ?? "";
      const fullName = `${fn} ${ln}`.trim();
      lender = {
        name: fullName || null,
        email: (profile.email as string | null) ?? null,
        phone: (profile.phone as string | null) ?? null,
        isProspect: false,
      };
    }
  } else if (row.access_request_id) {
    const { data: ar } = await supabase
      .from("access_requests")
      .select("first_name, last_name, email, phone")
      .eq("id", row.access_request_id)
      .maybeSingle();
    if (ar) {
      const fn = (ar.first_name as string | null) ?? "";
      const ln = (ar.last_name as string | null) ?? "";
      const fullName = `${fn} ${ln}`.trim();
      lender = {
        name: fullName || null,
        email: (ar.email as string | null) ?? null,
        phone: (ar.phone as string | null) ?? null,
        isProspect: true,
      };
    }
  }

  return {
    ...(p as object),
    lender,
  } as unknown as AdminParticipationDetail;
}

export async function getRegistrationById(
  id: string,
): Promise<RegistrationDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  let note: RegistrationDetail["note"] = null;
  const row = data as { note_id: string };
  if (row.note_id) {
    const { data: noteRow } = await supabase
      .from("notes")
      .select("id, note_id, title, principal, rate, term_months")
      .eq("id", row.note_id)
      .maybeSingle();
    if (noteRow) {
      note = noteRow as RegistrationDetail["note"];
    }
  }

  return { ...(data as object), note } as unknown as RegistrationDetail;
}

export type UserListItem = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "lender";
  is_referral_partner: boolean;
  created_at: string;
  /** How many investor entities this login owns. */
  entity_count: number;
  /** Entity display names, primary first. */
  entity_names: string[];
  /** Participations across every entity this login owns. */
  position_count: number;
};

type EntityStats = {
  entity_count: number;
  entity_names: string[];
  position_count: number;
};

/**
 * Entity counts / names / position counts keyed by owner user id.
 *
 * There is no FK between `profiles` and `investor_entities` (the FK points at
 * auth.users), so PostgREST cannot embed them — fetch separately, join in JS.
 */
async function getEntityStatsByOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, EntityStats>> {
  const stats = new Map<string, EntityStats>();
  if (userIds.length === 0) return stats;

  const { data: ents } = await supabase
    .from("investor_entities")
    .select("id, display_name, owner_user_id, is_primary")
    .in("owner_user_id", userIds)
    // Primary first, then alphabetical — the order the chips render in.
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });
  const rows = (ents ?? []) as Array<{
    id: string;
    display_name: string;
    owner_user_id: string;
    is_primary: boolean;
  }>;
  if (rows.length === 0) return stats;

  const { data: parts } = await supabase
    .from("participations")
    .select("entity_id")
    .in(
      "entity_id",
      rows.map((r) => r.id),
    );
  const positionsByEntity = new Map<string, number>();
  for (const p of (parts ?? []) as Array<{ entity_id: string | null }>) {
    if (!p.entity_id) continue;
    positionsByEntity.set(
      p.entity_id,
      (positionsByEntity.get(p.entity_id) ?? 0) + 1,
    );
  }

  for (const r of rows) {
    const cur = stats.get(r.owner_user_id) ?? {
      entity_count: 0,
      entity_names: [],
      position_count: 0,
    };
    cur.entity_count += 1;
    cur.entity_names.push(r.display_name);
    cur.position_count += positionsByEntity.get(r.id) ?? 0;
    stats.set(r.owner_user_id, cur);
  }
  return stats;
}

export async function getUsers(filter?: {
  role?: "admin" | "lender";
  q?: string;
}): Promise<UserListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, role, is_referral_partner, created_at",
    )
    // Sort by first_name (nulls last so unfilled profiles drop to the end);
    // last_name and email are tie-breakers.
    .order("first_name", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("email", { ascending: true });
  if (filter?.role) q = q.eq("role", filter.role);
  if (filter?.q) {
    const term = filter.q.replace(/[%_]/g, "");
    q = q.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }
  const { data } = await q;
  const profiles = (data ?? []) as Omit<
    UserListItem,
    "entity_count" | "entity_names" | "position_count"
  >[];

  const stats = await getEntityStatsByOwner(
    supabase,
    profiles.map((p) => p.id),
  );
  return profiles.map((p) => ({
    ...p,
    entity_count: stats.get(p.id)?.entity_count ?? 0,
    entity_names: stats.get(p.id)?.entity_names ?? [],
    position_count: stats.get(p.id)?.position_count ?? 0,
  }));
}

export type DuplicateGroup = {
  name: string;
  logins: Array<{
    id: string;
    email: string | null;
    entity_count: number;
    position_count: number;
    created_at: string;
  }>;
};

/**
 * Logins that share a first+last name (case-insensitive, trimmed).
 *
 * A name match is a HINT, not a judgement — two different people can share a
 * name. The UI must present these as candidates to review, never as confirmed
 * duplicates. Blank names are skipped; only groups of 2+ are returned.
 */
export async function getPossibleDuplicateLogins(): Promise<DuplicateGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at");
  const profiles = (data ?? []) as Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  }>;

  const groups = new Map<
    string,
    { name: string; ids: typeof profiles }
  >();
  for (const p of profiles) {
    const name = `${(p.first_name ?? "").trim()} ${(p.last_name ?? "").trim()}`
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const g = groups.get(key) ?? { name, ids: [] };
    g.ids.push(p);
    groups.set(key, g);
  }

  const dupes = [...groups.values()].filter((g) => g.ids.length >= 2);
  if (dupes.length === 0) return [];

  const stats = await getEntityStatsByOwner(
    supabase,
    dupes.flatMap((g) => g.ids.map((p) => p.id)),
  );

  return dupes
    .map((g) => ({
      name: g.name,
      logins: g.ids
        // Oldest login first — the likeliest survivor in a merge.
        .slice()
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((p) => ({
          id: p.id,
          email: p.email,
          entity_count: stats.get(p.id)?.entity_count ?? 0,
          position_count: stats.get(p.id)?.position_count ?? 0,
          created_at: p.created_at,
        }))
        // Drop logins that own zero entities — a merged-away (banned) login has
        // already had its entities re-parented, so it's not a live duplicate.
        .filter((l) => l.entity_count > 0),
    }))
    // Only a real duplicate if 2+ live logins still share the name.
    .filter((g) => g.logins.length >= 2)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type UserProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "lender";
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  entity_type: string | null;
  loan_agreement_title: string | null;
  created_at: string;
  updated_at: string;
};

export type UserParticipationRow = {
  id: string;
  invested_amount: string;
  status: string;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  note: { note_id: string; title: string } | null;
  // Monthly payment the lender is expected to receive on this
  // participation: their pro-rata share of the note's monthly payment.
  // null when the note doesn't have enough info to compute one (missing
  // principal/rate/term, or when the lender's funding hasn't cleared).
  monthly_payment: number | null;
};

export type UserBeneficiary = {
  id: string;
  name: string;
  relation: string;
  type: string;
  percentage: number;
};

export type UserDetail = {
  profile: UserProfile;
  participations: UserParticipationRow[];
  beneficiaries: UserBeneficiary[];
};

export async function getUserById(userId: string): Promise<UserDetail | null> {
  const supabase = await createClient();

  const [profileRes, entityRes, partsRes, bensRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    // Entity identity (type / agreement title / mailing address) lives on the
    // investor entity now. This is a user-context view, so read the PRIMARY one.
    supabase
      .from("investor_entities")
      .select(
        "entity_type, loan_agreement_title, address_street, address_city, address_state, address_zip",
      )
      .eq("owner_user_id", userId)
      .eq("is_primary", true)
      .maybeSingle(),
    supabase
      .from("participations")
      .select(
        `id, note_id, invested_amount, status,
         funding_received, funding_deposited, funding_cleared,
         note:notes ( id, note_id, title, principal, rate, term_months,
                      interest_type )`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("beneficiaries")
      .select("id, name, relation, type, percentage")
      .eq("user_id", userId)
      .order("type", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!profileRes.data) return null;

  const rawParts = (partsRes.data ?? []) as unknown as Array<{
    id: string;
    note_id: string;
    invested_amount: string;
    status: string;
    funding_received: boolean;
    funding_deposited: boolean;
    funding_cleared: boolean;
    note: {
      id: string;
      note_id: string;
      title: string;
      principal: string | number | null;
      rate: string | number | null;
      term_months: number | null;
      interest_type: string;
    } | null;
  }>;

  // Pre-fetch totals of cleared invested_amount per note so we can compute
  // each lender's pro-rata share of the note's monthly payment.
  const noteIds = Array.from(
    new Set(rawParts.map((r) => r.note_id).filter(Boolean)),
  );
  const totalsByNote = new Map<string, number>();
  if (noteIds.length > 0) {
    const { data: allParts } = await supabase
      .from("participations")
      .select("note_id, invested_amount, funding_cleared")
      .in("note_id", noteIds)
      .eq("funding_cleared", true);
    for (const p of (allParts ?? []) as Array<{
      note_id: string;
      invested_amount: string;
    }>) {
      const inv = Number(p.invested_amount);
      if (!Number.isFinite(inv)) continue;
      totalsByNote.set(p.note_id, (totalsByNote.get(p.note_id) ?? 0) + inv);
    }
  }

  const { computeMonthlyPayment } = await import("@/lib/notes/schedule");

  const participations: UserParticipationRow[] = rawParts.map((r) => {
    let monthly: number | null = null;
    const n = r.note;
    const total = totalsByNote.get(r.note_id);
    if (
      r.funding_cleared &&
      n &&
      n.principal !== null &&
      n.rate !== null &&
      n.term_months &&
      total &&
      total > 0
    ) {
      const noteMonthly = computeMonthlyPayment({
        principal: Number(n.principal),
        annualRatePct: Number(n.rate),
        termMonths: Number(n.term_months),
        interestType: n.interest_type,
      });
      if (noteMonthly !== null) {
        const myShare = Number(r.invested_amount) / total;
        monthly = Math.round(noteMonthly * myShare * 100) / 100;
      }
    }
    return {
      id: r.id,
      invested_amount: r.invested_amount,
      status: r.status,
      funding_received: r.funding_received,
      funding_deposited: r.funding_deposited,
      funding_cleared: r.funding_cleared,
      note: n ? { note_id: n.note_id, title: n.title } : null,
      monthly_payment: monthly,
    };
  });

  const entity = (entityRes.data ?? null) as Pick<
    UserProfile,
    | "entity_type"
    | "loan_agreement_title"
    | "address_street"
    | "address_city"
    | "address_state"
    | "address_zip"
  > | null;

  return {
    profile: {
      ...(profileRes.data as object),
      entity_type: entity?.entity_type ?? null,
      loan_agreement_title: entity?.loan_agreement_title ?? null,
      address_street: entity?.address_street ?? null,
      address_city: entity?.address_city ?? null,
      address_state: entity?.address_state ?? null,
      address_zip: entity?.address_zip ?? null,
    } as UserProfile,
    participations,
    beneficiaries: (bensRes.data ?? []) as UserBeneficiary[],
  };
}

export type ReferralCodeListItem = {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  user_name: string | null;
  user_email: string;
  total_referrals: number;
  signed_up_referrals: number;
  invested_referrals: number;
};

export async function getAllReferralCodes(): Promise<ReferralCodeListItem[]> {
  const supabase = await createClient();

  const [codesRes, statsRes, profilesRes] = await Promise.all([
    supabase
      .from("referral_codes")
      .select("id, user_id, code, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_stats")
      .select(
        "user_id, total_referrals, signed_up_referrals, invested_referrals",
      ),
    supabase.from("profiles").select("id, first_name, last_name, email"),
  ]);

  const codes = codesRes.data ?? [];
  const statsByUser = new Map(
    (statsRes.data ?? []).map((s) => [s.user_id as string, s]),
  );
  const profilesById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, p]),
  );

  return codes.map((c) => {
    const s = statsByUser.get(c.user_id as string);
    const profile = profilesById.get(c.user_id as string);
    const fn = (profile?.first_name as string | null) ?? "";
    const ln = (profile?.last_name as string | null) ?? "";
    const userName = `${fn} ${ln}`.trim() || null;
    return {
      id: c.id as string,
      user_id: c.user_id as string,
      code: c.code as string,
      is_active: c.is_active as boolean,
      created_at: c.created_at as string,
      user_name: userName,
      user_email: (profile?.email as string) ?? "",
      total_referrals: (s?.total_referrals as number) ?? 0,
      signed_up_referrals: (s?.signed_up_referrals as number) ?? 0,
      invested_referrals: (s?.invested_referrals as number) ?? 0,
    };
  });
}

export type ExternalReferralPartner = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  referral_code: string;
  notes: string | null;
  converted_user_id: string | null;
  converted_at: string | null;
  created_at: string;
};

export async function getExternalReferralPartners(): Promise<
  ExternalReferralPartner[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_partners")
    .select(
      "id, first_name, last_name, email, phone, business_name, referral_code, notes, converted_user_id, converted_at, created_at",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as ExternalReferralPartner[];
}

export type AdminReferralCodeForUser = {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  total_referrals: number;
  signed_up_referrals: number;
  invested_referrals: number;
};

export async function getReferralCodeByUserId(
  userId: string,
): Promise<AdminReferralCodeForUser | null> {
  const supabase = await createClient();
  const { data: code } = await supabase
    .from("referral_codes")
    .select("id, code, is_active, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!code) return null;

  const { data: stats } = await supabase
    .from("referral_stats")
    .select(
      "total_referrals, signed_up_referrals, invested_referrals",
    )
    .eq("user_id", userId)
    .maybeSingle();

  return {
    id: code.id as string,
    code: code.code as string,
    is_active: code.is_active as boolean,
    created_at: code.created_at as string,
    total_referrals: (stats?.total_referrals as number) ?? 0,
    signed_up_referrals: (stats?.signed_up_referrals as number) ?? 0,
    invested_referrals: (stats?.invested_referrals as number) ?? 0,
  };
}

export type AccessRequestListItem = {
  id: string;
  status: "pending" | "approved" | "rejected" | "converted";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  investment_amount: string | null;
  is_tcc_member: boolean;
  referral_code: string | null;
  created_at: string;
  note: { note_id: string; title: string } | null;
};

export async function getAccessRequests(filter?: {
  status?: "pending" | "approved" | "rejected" | "converted";
}): Promise<AccessRequestListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("access_requests")
    .select(
      `
      id, status, first_name, last_name, email, phone, note_id,
      investment_amount, is_tcc_member, referral_code, created_at
      `,
    )
    .order("created_at", { ascending: false });
  if (filter?.status) q = q.eq("status", filter.status);
  const { data } = await q;
  const rows = (data ?? []) as Array<{
    id: string;
    status: AccessRequestListItem["status"];
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    note_id: string | null;
    investment_amount: string | null;
    is_tcc_member: boolean;
    referral_code: string | null;
    created_at: string;
  }>;

  const noteIds = Array.from(
    new Set(rows.map((r) => r.note_id).filter(Boolean) as string[]),
  );
  const noteMap = new Map<string, { note_id: string; title: string }>();
  if (noteIds.length > 0) {
    const { data: notes } = await supabase
      .from("notes")
      .select("id, note_id, title")
      .in("id", noteIds);
    for (const n of notes ?? []) {
      noteMap.set(n.id as string, {
        note_id: n.note_id as string,
        title: n.title as string,
      });
    }
  }

  return rows.map((r) => ({
    ...r,
    note: r.note_id ? (noteMap.get(r.note_id) ?? null) : null,
  }));
}

export type AccessRequestDetail = {
  id: string;
  status: "pending" | "approved" | "rejected" | "converted";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_tcc_member: boolean;
  message: string | null;
  referral_code: string | null;
  note_id: string | null;
  investment_amount: string | null;
  setup_token: string | null;
  setup_token_expires_at: string | null;
  setup_completed_at: string | null;
  created_at: string;
  note: { id: string; note_id: string; title: string } | null;
};

export async function getAccessRequestById(
  id: string,
): Promise<AccessRequestDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("access_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  let note: AccessRequestDetail["note"] = null;
  const row = data as { note_id: string | null };
  if (row.note_id) {
    const { data: noteRow } = await supabase
      .from("notes")
      .select("id, note_id, title")
      .eq("id", row.note_id)
      .maybeSingle();
    if (noteRow) {
      note = {
        id: noteRow.id as string,
        note_id: noteRow.note_id as string,
        title: noteRow.title as string,
      };
    }
  }

  return { ...(data as object), note } as unknown as AccessRequestDetail;
}

export type NotePickerOption = {
  id: string;
  note_id: string;
  title: string;
};

export async function getNotesForPicker(): Promise<NotePickerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, note_id, title")
    .order("note_id", { ascending: false });
  return (data ?? []) as NotePickerOption[];
}

export type BorrowerPickerOption = {
  id: string;
  business_name: string;
};

export async function getBorrowersForPicker(): Promise<BorrowerPickerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("borrowers")
    .select("id, business_name")
    .order("business_name", { ascending: true });
  return (data ?? []) as BorrowerPickerOption[];
}

export type AdminBorrowerListItem = {
  id: string;
  business_name: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
  business_type: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
};

export async function getAdminBorrowers(): Promise<AdminBorrowerListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("borrowers")
    .select(
      "id, business_name, first_name, last_name, email, phone, business_type, city, state, created_at",
    )
    .order("business_name", { ascending: true });
  return (data ?? []) as AdminBorrowerListItem[];
}

export type AdminBorrowerDetail = {
  id: string;
  business_name: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  tax_id: string | null;
  business_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAdminBorrowerById(
  id: string,
): Promise<AdminBorrowerDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("borrowers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as AdminBorrowerDetail | null;
}

export type BorrowerNoteRow = {
  id: string;
  note_id: string;
  title: string;
  status: string;
  client_status: string;
};

export async function getNotesForBorrower(
  borrowerId: string,
): Promise<BorrowerNoteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, note_id, title, status, client_status")
    .eq("borrower_id", borrowerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as BorrowerNoteRow[];
}

export type LenderPickerOption = {
  id: string;
  email: string;
  name: string | null;
};

export async function getLendersForPicker(): Promise<LenderPickerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .order("first_name", { ascending: true });
  const rows = (data ?? []) as Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name:
      `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || null,
  }));
}

export type EntityPickerOption = {
  entity_id: string;
  display_name: string;
  owner_user_id: string;
  owner_name: string | null;
  owner_email: string | null;
};

// Every investor entity, labelled with the person who owns it. Private-note
// visibility is granted per ENTITY (you invite "Smith LLC", not the human).
//
// There is no FK between `profiles` and `investor_entities` (the FK points at
// auth.users), so PostgREST cannot embed them — join in JS.
export async function getEntitiesForPicker(): Promise<EntityPickerOption[]> {
  const supabase = await createClient();
  const { data: entities } = await supabase
    .from("investor_entities")
    .select("id, display_name, owner_user_id")
    .order("display_name", { ascending: true });
  const rows = (entities ?? []) as Array<{
    id: string;
    display_name: string;
    owner_user_id: string;
  }>;
  if (rows.length === 0) return [];

  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", ownerIds);
  const byId = new Map(
    (
      (profiles ?? []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>
    ).map((p) => [
      p.id,
      {
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null,
        email: p.email,
      },
    ]),
  );

  return rows.map((r) => ({
    entity_id: r.id,
    display_name: r.display_name,
    owner_user_id: r.owner_user_id,
    owner_name: byId.get(r.owner_user_id)?.name ?? null,
    owner_email: byId.get(r.owner_user_id)?.email ?? null,
  }));
}

// Returns the ENTITY ids on the note's allowlist. A note_visibility row without
// entity_id grants nothing (the RLS gate joins through investor_entities), so
// such rows are filtered out rather than surfaced as selections.
export async function getNoteVisibility(
  noteUuid: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_visibility")
    .select("entity_id")
    .eq("note_id", noteUuid);
  return ((data ?? []) as Array<{ entity_id: string | null }>)
    .map((r) => r.entity_id)
    .filter(Boolean) as string[];
}

export type AdminNoteListItem = {
  id: string;
  note_id: string;
  title: string;
  principal: string | null;
  rate: string;
  term_months: number;
  status: string;
  client_status: string;
  project_type: string;
  created_at: string;
  borrower: { business_name: string } | null;
};

export async function getAdminNotes(opts?: {
  sort?: "asc" | "desc";
  q?: string;
}): Promise<AdminNoteListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("notes")
    .select(
      `id, note_id, title, principal, rate, term_months, status, client_status,
       project_type, created_at, borrower_id`,
    );
  if (opts?.q) {
    const term = opts.q.replace(/[%_]/g, ""); // strip wildcards
    q = q.or(`note_id.ilike.%${term}%,title.ilike.%${term}%`);
  }
  q = q.order("note_id", { ascending: opts?.sort === "asc" });
  const { data } = await q;

  const rows = (data ?? []) as Array<{
    id: string;
    note_id: string;
    title: string;
    principal: string;
    rate: string;
    term_months: number;
    status: string;
    client_status: string;
    project_type: string;
    created_at: string;
    borrower_id: string | null;
  }>;

  const borrowerIds = Array.from(
    new Set(rows.map((r) => r.borrower_id).filter(Boolean) as string[]),
  );
  const borrowerMap = new Map<string, string>();
  if (borrowerIds.length > 0) {
    const { data: borrowers } = await supabase
      .from("borrowers")
      .select("id, business_name")
      .in("id", borrowerIds);
    for (const b of borrowers ?? []) {
      borrowerMap.set(b.id as string, b.business_name as string);
    }
  }

  return rows.map((r) => {
    const { borrower_id, ...rest } = r;
    return {
      ...rest,
      borrower: borrower_id
        ? { business_name: borrowerMap.get(borrower_id) ?? "—" }
        : null,
    };
  });
}

export type AdminNoteDetail = {
  id: string;
  note_id: string;
  borrower_id: string | null;
  title: string;
  principal: string | null;
  rate: string;
  term_months: number;
  term_years: number | null;
  project_type: string;
  loan_payment_status: string;
  contract_date: string | null;
  payment_start_date: string | null;
  maturity_date: string | null;
  funding_start_date: string | null;
  funding_end_date: string | null;
  funding_window_end: string | null;
  first_payment_date: string | null;
  monthly_payment: string | null;
  status: string;
  client_status: string;
  type: string;
  interest_type: string;
  is_private: boolean;
  has_profit_bonus: boolean;
  description: string | null;
  admin_notes: string | null;
  target_raise: string | null;
  min_investment: string | null;
  created_at: string;
  funding_archived_at: string | null;
  funding_archived_by: string | null;
  updated_at: string;
};

export async function getAdminNoteById(
  id: string,
): Promise<AdminNoteDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as AdminNoteDetail | null;
}

export type LedgerRow = {
  note_uuid: string;
  note_id: string;
  note_title: string;
  borrower_id: string | null;
  borrower_name: string | null;
  payment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  received_date: string | null;
  payment_id: string | null;
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  payment_notes: string | null;
  has_funded_participants: boolean;
};

// Returns every scheduled payment due in [yearMonth-01, +1 month) across all
// notes, joined with whether it's been recorded. yearMonth = "YYYY-MM".
// Optionally filters to a single borrower for per-borrower statement views.
export async function getLedgerForMonth(
  yearMonth: string,
  borrowerId?: string | null,
): Promise<LedgerRow[]> {
  const supabase = await createClient();
  const { generateSchedule } = await import("@/lib/notes/schedule");

  let q = supabase
    .from("notes")
    .select(
      "id, note_id, title, borrower_id, principal, rate, term_months, interest_type, first_payment_date",
    );
  if (borrowerId) q = q.eq("borrower_id", borrowerId);
  const { data: notes } = await q;
  const noteRows = (notes ?? []) as Array<{
    id: string;
    note_id: string;
    title: string;
    borrower_id: string | null;
    principal: string | null;
    rate: string | null;
    term_months: number | null;
    interest_type: string;
    first_payment_date: string | null;
  }>;

  const borrowerIds = Array.from(
    new Set(noteRows.map((n) => n.borrower_id).filter(Boolean) as string[]),
  );
  const borrowerNameById = new Map<string, string>();
  if (borrowerIds.length > 0) {
    const { data: bs } = await supabase
      .from("borrowers")
      .select("id, business_name")
      .in("id", borrowerIds);
    for (const b of (bs ?? []) as Array<{ id: string; business_name: string }>) {
      borrowerNameById.set(b.id, b.business_name);
    }
  }

  // For each candidate note, ask: do you have any funded participants?
  // (Drives whether the checkbox is enabled.)
  const noteIds = noteRows.map((n) => n.id);
  const fundedSet = new Set<string>();
  if (noteIds.length > 0) {
    const { data: parts } = await supabase
      .from("participations")
      .select("note_id")
      .in("note_id", noteIds)
      .eq("funding_cleared", true);
    for (const p of (parts ?? []) as Array<{ note_id: string }>) {
      fundedSet.add(p.note_id);
    }
  }

  // Recorded payments (with payment_number) for the month so we can mark
  // rows received. We pull a wider window than the requested month to
  // tolerate the schedule's clamped-end-of-month dates landing in adjacent
  // months when first_payment_date is, say, the 31st.
  const monthStart = `${yearMonth}-01`;
  const monthEnd = nextMonthStart(yearMonth);
  const { data: receivedRows } = await supabase
    .from("note_payments")
    .select(
      "id, note_id, payment_number, payment_date, payment_method, check_number, wire_reference, notes",
    )
    .gte("payment_date", monthStart)
    .lt("payment_date", monthEnd)
    .not("payment_number", "is", null);
  type ReceivedRow = {
    id: string;
    note_id: string;
    payment_number: number;
    payment_date: string;
    payment_method: string | null;
    check_number: string | null;
    wire_reference: string | null;
    notes: string | null;
  };
  const receivedByKey = new Map<string, ReceivedRow>();
  for (const r of (receivedRows ?? []) as ReceivedRow[]) {
    receivedByKey.set(`${r.note_id}:${r.payment_number}`, r);
  }

  const out: LedgerRow[] = [];
  for (const n of noteRows) {
    if (
      n.principal === null ||
      n.rate === null ||
      !n.term_months ||
      !n.first_payment_date
    ) {
      continue;
    }
    const result = generateSchedule({
      principal: Number(n.principal),
      annualRatePct: Number(n.rate),
      termMonths: Number(n.term_months),
      interestType: n.interest_type,
      firstPaymentDate: n.first_payment_date,
    });
    if (!result.ok) continue;
    for (const row of result.rows) {
      // Filter to rows whose scheduled due_date falls in the requested
      // month. Receipts that drift to an adjacent month are caught above
      // via the wider range of receivedRows; here we still group by the
      // schedule's intent.
      if (!row.due_date.startsWith(yearMonth)) continue;
      const got = receivedByKey.get(`${n.id}:${row.payment_number}`);
      out.push({
        note_uuid: n.id,
        note_id: n.note_id,
        note_title: n.title,
        borrower_id: n.borrower_id,
        borrower_name: n.borrower_id
          ? (borrowerNameById.get(n.borrower_id) ?? null)
          : null,
        payment_number: row.payment_number,
        due_date: row.due_date,
        principal_amount: row.principal_amount,
        interest_amount: row.interest_amount,
        received_date: got ? got.payment_date : null,
        payment_id: got ? got.id : null,
        payment_method: got ? got.payment_method : null,
        check_number: got ? got.check_number : null,
        wire_reference: got ? got.wire_reference : null,
        payment_notes: got ? got.notes : null,
        has_funded_participants: fundedSet.has(n.id),
      });
    }
  }

  // Primary sort: note_id ascending (oldest note first). Tie-breaker:
  // due_date ascending so a single note's payments group in date order.
  out.sort((a, b) => {
    if (a.note_id !== b.note_id) return a.note_id < b.note_id ? -1 : 1;
    return a.due_date < b.due_date ? -1 : 1;
  });
  return out;
}

export type BonusLedgerRow = {
  id: string;
  note_uuid: string;
  note_id: string;
  note_title: string;
  borrower_id: string | null;
  borrower_name: string | null;
  paid_date: string;
  gross_amount: string;
  retained_amount: string;
  status: "requested" | "received";
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  notes: string | null;
};

// All bonuses with paid_date in [yearMonth, +1 month). Optional borrower
// filter for sending statements to a single borrower.
export async function getBonusLedgerForMonth(
  yearMonth: string,
  borrowerId?: string | null,
): Promise<BonusLedgerRow[]> {
  const supabase = await createClient();
  const monthStart = `${yearMonth}-01`;
  const monthEnd = nextMonthStart(yearMonth);

  const { data: bonuses } = await supabase
    .from("note_bonuses")
    .select(
      "id, note_id, paid_date, gross_amount, retained_amount, status, payment_method, check_number, wire_reference, notes",
    )
    .gte("paid_date", monthStart)
    .lt("paid_date", monthEnd)
    .order("paid_date", { ascending: true });
  const bRows = (bonuses ?? []) as Array<{
    id: string;
    note_id: string;
    paid_date: string;
    gross_amount: string;
    retained_amount: string;
    status: "requested" | "received";
    payment_method: string | null;
    check_number: string | null;
    wire_reference: string | null;
    notes: string | null;
  }>;
  if (bRows.length === 0) return [];

  const noteIds = Array.from(new Set(bRows.map((b) => b.note_id)));
  const { data: notes } = await supabase
    .from("notes")
    .select("id, note_id, title, borrower_id")
    .in("id", noteIds);
  const noteMap = new Map<
    string,
    { note_id: string; title: string; borrower_id: string | null }
  >();
  for (const n of (notes ?? []) as Array<{
    id: string;
    note_id: string;
    title: string;
    borrower_id: string | null;
  }>) {
    noteMap.set(n.id, {
      note_id: n.note_id,
      title: n.title,
      borrower_id: n.borrower_id,
    });
  }

  const borrowerIds = Array.from(
    new Set(
      Array.from(noteMap.values())
        .map((n) => n.borrower_id)
        .filter(Boolean) as string[],
    ),
  );
  const borrowerNameById = new Map<string, string>();
  if (borrowerIds.length > 0) {
    const { data: bs } = await supabase
      .from("borrowers")
      .select("id, business_name")
      .in("id", borrowerIds);
    for (const b of (bs ?? []) as Array<{ id: string; business_name: string }>) {
      borrowerNameById.set(b.id, b.business_name);
    }
  }

  const out: BonusLedgerRow[] = bRows
    .map((b) => {
      const n = noteMap.get(b.note_id);
      if (!n) return null;
      return {
        id: b.id,
        note_uuid: b.note_id,
        note_id: n.note_id,
        note_title: n.title,
        borrower_id: n.borrower_id,
        borrower_name: n.borrower_id
          ? (borrowerNameById.get(n.borrower_id) ?? null)
          : null,
        paid_date: b.paid_date,
        gross_amount: b.gross_amount,
        retained_amount: b.retained_amount,
        status: b.status,
        payment_method: b.payment_method,
        check_number: b.check_number,
        wire_reference: b.wire_reference,
        notes: b.notes,
      };
    })
    .filter((x): x is BonusLedgerRow => x !== null);

  return borrowerId ? out.filter((r) => r.borrower_id === borrowerId) : out;
}

function nextMonthStart(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map((s) => parseInt(s, 10));
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-01`;
}

export async function countAdmins(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export type FundedParticipantRow = {
  participation_id: string;
  user_id: string | null;
  lender_name: string | null;
  lender_email: string | null;
  business_name: string | null;
  invested_amount: string;
  share_pct: number;
  monthly_payment: number | null;
};

export async function getFundedParticipantsForNote(
  noteUuid: string,
): Promise<FundedParticipantRow[]> {
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("principal, rate, term_months, interest_type")
    .eq("id", noteUuid)
    .maybeSingle();
  // business_name comes from the entity holding the position; name/email stay
  // login-level (profiles).
  const { data: parts } = await supabase
    .from("participations")
    .select(
      "id, user_id, invested_amount, entity:investor_entities ( business_name )",
    )
    .eq("note_id", noteUuid)
    .eq("funding_cleared", true);

  const rows = (parts ?? []) as unknown as Array<{
    id: string;
    user_id: string | null;
    invested_amount: string;
    entity: { business_name: string | null } | null;
  }>;
  if (rows.length === 0) return [];

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]),
  );
  const profileMap = new Map<
    string,
    { name: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>) {
      const fullName =
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null;
      profileMap.set(p.id, {
        name: fullName,
        email: p.email,
      });
    }
  }

  const total = rows.reduce((s, r) => s + Number(r.invested_amount ?? 0), 0);

  // Compute the note's monthly payment once; per-row monthly is the
  // lender's pro-rata of that.
  const { computeMonthlyPayment } = await import("@/lib/notes/schedule");
  const noteMonthly =
    note &&
    note.principal !== null &&
    note.rate !== null &&
    note.term_months
      ? computeMonthlyPayment({
          principal: Number(note.principal),
          annualRatePct: Number(note.rate),
          termMonths: Number(note.term_months),
          interestType: String(note.interest_type),
        })
      : null;

  return rows
    .map((r) => {
      const profile = r.user_id ? profileMap.get(r.user_id) : null;
      const invested = Number(r.invested_amount ?? 0);
      const monthly =
        noteMonthly !== null && total > 0
          ? Math.round(((invested / total) * noteMonthly) * 100) / 100
          : null;
      return {
        participation_id: r.id,
        user_id: r.user_id,
        lender_name: profile?.name ?? null,
        lender_email: profile?.email ?? null,
        business_name: r.entity?.business_name ?? null,
        invested_amount: r.invested_amount,
        share_pct: total > 0 ? (invested / total) * 100 : 0,
        monthly_payment: monthly,
      };
    })
    .sort((a, b) => {
      // Alphabetize by lender name (fall back to email so rows without
      // a name still group together at the end).
      const an = (a.lender_name ?? a.lender_email ?? "").toLowerCase();
      const bn = (b.lender_name ?? b.lender_email ?? "").toLowerCase();
      return an.localeCompare(bn);
    });
}

export type AdminBonusRow = {
  id: string;
  paid_date: string;
  gross_amount: string;
  retained_amount: string;
  status: "requested" | "received";
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  notes: string | null;
  created_at: string;
  payouts: Array<{
    id: string;
    amount: string;
    share_basis: string;
    participation_id: string;
    lender_name: string | null;
    lender_email: string | null;
  }>;
};

export async function getNoteBonuses(
  noteUuid: string,
): Promise<AdminBonusRow[]> {
  const supabase = await createClient();
  const { data: bonuses } = await supabase
    .from("note_bonuses")
    .select(
      "id, paid_date, gross_amount, retained_amount, status, payment_method, check_number, wire_reference, notes, created_at",
    )
    .eq("note_id", noteUuid)
    .order("paid_date", { ascending: false });
  if (!bonuses || bonuses.length === 0) return [];

  const bonusIds = bonuses.map((b) => b.id as string);
  const { data: payouts } = await supabase
    .from("participation_bonus_payouts")
    .select(
      `id, bonus_id, amount, share_basis, participation_id,
       participation:participations ( user_id )`,
    )
    .in("bonus_id", bonusIds);

  const rows = (payouts ?? []) as unknown as Array<{
    id: string;
    bonus_id: string;
    amount: string;
    share_basis: string;
    participation_id: string;
    participation: { user_id: string | null } | null;
  }>;
  const userIds = Array.from(
    new Set(
      rows.map((r) => r.participation?.user_id).filter(Boolean) as string[],
    ),
  );
  const profileMap = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>) {
      const fullName =
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null;
      profileMap.set(p.id, { name: fullName, email: p.email });
    }
  }

  const byBonus = new Map<string, AdminBonusRow["payouts"]>();
  for (const p of rows) {
    const list = byBonus.get(p.bonus_id) ?? [];
    const profile = p.participation?.user_id
      ? profileMap.get(p.participation.user_id)
      : null;
    list.push({
      id: p.id,
      amount: p.amount,
      share_basis: p.share_basis,
      participation_id: p.participation_id,
      lender_name: profile?.name ?? null,
      lender_email: profile?.email ?? null,
    });
    byBonus.set(p.bonus_id, list);
  }

  return bonuses.map((b) => {
    const row = b as {
      id: string;
      paid_date: string;
      gross_amount: string;
      retained_amount: string | null;
      status: "requested" | "received";
      payment_method: string | null;
      check_number: string | null;
      wire_reference: string | null;
      notes: string | null;
      created_at: string;
    };
    return {
      id: row.id,
      paid_date: row.paid_date,
      gross_amount: row.gross_amount,
      retained_amount: row.retained_amount ?? "0",
      status: row.status,
      payment_method: row.payment_method,
      check_number: row.check_number,
      wire_reference: row.wire_reference,
      notes: row.notes,
      created_at: row.created_at,
      payouts: byBonus.get(row.id) ?? [],
    };
  });
}

export type AdminNotePaymentRow = {
  id: string;
  payment_number: number | null;
  payment_date: string;
  principal_amount: string;
  interest_amount: string;
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  notes: string | null;
  created_at: string;
  payouts: Array<{
    id: string;
    principal_amount: string;
    interest_amount: string;
    share_basis: string;
    participation_id: string;
    lender_name: string | null;
    lender_email: string | null;
  }>;
};

export async function getNotePayments(
  noteUuid: string,
): Promise<AdminNotePaymentRow[]> {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("note_payments")
    .select(
      "id, payment_number, payment_date, principal_amount, interest_amount, payment_method, check_number, wire_reference, notes, created_at",
    )
    .eq("note_id", noteUuid)
    .order("payment_date", { ascending: false });
  if (!payments || payments.length === 0) return [];

  const paymentIds = payments.map((p) => p.id as string);
  const { data: payouts } = await supabase
    .from("participation_payment_payouts")
    .select(
      `id, note_payment_id, principal_amount, interest_amount, share_basis,
       participation_id, participation:participations ( user_id )`,
    )
    .in("note_payment_id", paymentIds);

  const rows = (payouts ?? []) as unknown as Array<{
    id: string;
    note_payment_id: string;
    principal_amount: string;
    interest_amount: string;
    share_basis: string;
    participation_id: string;
    participation: { user_id: string | null } | null;
  }>;
  const userIds = Array.from(
    new Set(
      rows
        .map((r) => r.participation?.user_id)
        .filter(Boolean) as string[],
    ),
  );
  const profileMap = new Map<
    string,
    { name: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>) {
      const fullName =
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null;
      profileMap.set(p.id, { name: fullName, email: p.email });
    }
  }

  const byPayment = new Map<string, AdminNotePaymentRow["payouts"]>();
  for (const r of rows) {
    const list = byPayment.get(r.note_payment_id) ?? [];
    const profile = r.participation?.user_id
      ? profileMap.get(r.participation.user_id)
      : null;
    list.push({
      id: r.id,
      principal_amount: r.principal_amount,
      interest_amount: r.interest_amount,
      share_basis: r.share_basis,
      participation_id: r.participation_id,
      lender_name: profile?.name ?? null,
      lender_email: profile?.email ?? null,
    });
    byPayment.set(r.note_payment_id, list);
  }

  return payments.map((p) => {
    const row = p as {
      id: string;
      payment_number: number | null;
      payment_date: string;
      principal_amount: string;
      interest_amount: string;
      payment_method: string | null;
      check_number: string | null;
      wire_reference: string | null;
      notes: string | null;
      created_at: string;
    };
    return {
      id: row.id,
      payment_number: row.payment_number ?? null,
      payment_date: row.payment_date,
      principal_amount: row.principal_amount,
      interest_amount: row.interest_amount,
      payment_method: row.payment_method,
      check_number: row.check_number,
      wire_reference: row.wire_reference,
      notes: row.notes,
      created_at: row.created_at,
      payouts: byPayment.get(row.id) ?? [],
    };
  });
}

/**
 * Prev/next note neighbors for the admin note detail header, ordered by note_id
 * ascending so they read left-to-right by number. prev is the next-LOWER note_id
 * (the ‹ control), next is the next-HIGHER note_id (the › control). Either side
 * is null at the ends of the range.
 */
export async function getAdminNoteNeighbors(currentNoteId: string): Promise<{
  prev: { id: string; note_id: string } | null;
  next: { id: string; note_id: string } | null;
}> {
  const supabase = await createClient();
  const [prev, next] = await Promise.all([
    supabase
      .from("notes")
      .select("id, note_id")
      .lt("note_id", currentNoteId)
      .order("note_id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notes")
      .select("id, note_id")
      .gt("note_id", currentNoteId)
      .order("note_id", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    prev: (prev.data as { id: string; note_id: string } | null) ?? null,
    next: (next.data as { id: string; note_id: string } | null) ?? null,
  };
}

/**
 * Funding-archive eligibility summary for a note: total participations and how
 * many have not cleared funding yet. Used to build the soft warning on the
 * Settings tab archive button.
 */
export async function getNoteFundingArchiveSummary(
  noteUuid: string,
): Promise<{ total: number; uncleared: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("participations")
    .select("funding_cleared")
    .eq("note_id", noteUuid);
  const rows = (data ?? []) as Array<{ funding_cleared: boolean }>;
  return {
    total: rows.length,
    uncleared: rows.filter((r) => !r.funding_cleared).length,
  };
}

export type AdminEntity = {
  id: string;
  display_name: string;
  entity_type: string | null;
  business_name: string | null;
  loan_agreement_title: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  /**
   * Contact email for this entity. Seeded from the owning login, but INDEPENDENT
   * of it: after a merge the entity keeps the address it corresponded under.
   */
  email: string | null;
  is_primary: boolean;
  positions: number;
  invested: number;
};

/**
 * All investor entities owned by a login, primary first, with each entity's
 * participation count + invested total (used by the admin entities panel to
 * show — and pre-disable — the delete guard).
 */
export async function getEntitiesForUser(
  userId: string,
): Promise<AdminEntity[]> {
  const supabase = await createClient();
  const { data: ents } = await supabase
    .from("investor_entities")
    .select(
      "id, display_name, entity_type, business_name, loan_agreement_title, address_street, address_city, address_state, address_zip, email, is_primary",
    )
    .eq("owner_user_id", userId)
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });
  const rows = (ents ?? []) as Omit<AdminEntity, "positions" | "invested">[];
  if (rows.length === 0) return [];

  const { data: parts } = await supabase
    .from("participations")
    .select("entity_id, invested_amount")
    .in(
      "entity_id",
      rows.map((r) => r.id),
    );

  const agg = new Map<string, { positions: number; invested: number }>();
  for (const p of (parts ?? []) as Array<{
    entity_id: string | null;
    invested_amount: string | null;
  }>) {
    if (!p.entity_id) continue;
    const cur = agg.get(p.entity_id) ?? { positions: 0, invested: 0 };
    cur.positions += 1;
    cur.invested += Number(p.invested_amount ?? 0);
    agg.set(p.entity_id, cur);
  }
  return rows.map((r) => ({
    ...r,
    positions: agg.get(r.id)?.positions ?? 0,
    invested: agg.get(r.id)?.invested ?? 0,
  }));
}
