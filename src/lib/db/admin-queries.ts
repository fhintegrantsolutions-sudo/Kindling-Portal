import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  pendingAccessRequests: number;
  pendingRegistrations: number;
  activeParticipations: number;
  totalInvested: number;
  activeNotes: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const [pendingAR, pendingReg, activeParts, allActive, activeNotes] =
    await Promise.all([
      supabase
        .from("access_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("note_registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("participations")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active"),
      supabase
        .from("participations")
        .select("invested_amount")
        .eq("status", "Active"),
      supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active"),
    ]);

  const totalInvested = (allActive.data ?? []).reduce(
    (sum, row) => sum + Number(row.invested_amount ?? 0),
    0,
  );

  return {
    pendingAccessRequests: pendingAR.count ?? 0,
    pendingRegistrations: pendingReg.count ?? 0,
    activeParticipations: activeParts.count ?? 0,
    totalInvested,
    activeNotes: activeNotes.count ?? 0,
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
  note: { note_id: string; title: string } | null;
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
      note:notes ( note_id, title )
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
  return (data ?? []) as unknown as AdminParticipationListItem[];
}

export type AdminParticipationDetail = {
  id: string;
  user_id: string | null;
  access_request_id: string | null;
  invested_amount: string;
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
      .select("name, email, phone")
      .eq("id", row.user_id)
      .maybeSingle();
    if (profile) {
      lender = {
        name: (profile.name as string | null) ?? null,
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
  name: string | null;
  role: "admin" | "lender";
  created_at: string;
};

export async function getUsers(filter?: { role?: "admin" | "lender" }) {
  const supabase = await createClient();
  let q = supabase
    .from("profiles")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false });
  if (filter?.role) q = q.eq("role", filter.role);
  const { data } = await q;
  return (data ?? []) as UserListItem[];
}

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
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
};

export type UserPendingRegistration = {
  id: string;
  investment_amount: string;
  created_at: string;
  note: { note_id: string; title: string } | null;
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
  pendingRegistrations: UserPendingRegistration[];
  beneficiaries: UserBeneficiary[];
};

export async function getUserById(userId: string): Promise<UserDetail | null> {
  const supabase = await createClient();

  const [profileRes, partsRes, regsRes, bensRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("participations")
      .select(
        `id, invested_amount, status,
         funding_received, funding_deposited, funding_cleared,
         note:notes ( note_id, title )`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("note_registrations")
      .select(
        `id, investment_amount, created_at,
         note:notes ( note_id, title )`,
      )
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("beneficiaries")
      .select("id, name, relation, type, percentage")
      .eq("user_id", userId)
      .order("type", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!profileRes.data) return null;

  return {
    profile: profileRes.data as UserProfile,
    participations: (partsRes.data ?? []) as unknown as UserParticipationRow[],
    pendingRegistrations: (regsRes.data ?? []) as unknown as UserPendingRegistration[],
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
    supabase.from("profiles").select("id, name, email"),
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
    return {
      id: c.id as string,
      user_id: c.user_id as string,
      code: c.code as string,
      is_active: c.is_active as boolean,
      created_at: c.created_at as string,
      user_name: (profile?.name as string | null) ?? null,
      user_email: (profile?.email as string) ?? "",
      total_referrals: (s?.total_referrals as number) ?? 0,
      signed_up_referrals: (s?.signed_up_referrals as number) ?? 0,
      invested_referrals: (s?.invested_referrals as number) ?? 0,
    };
  });
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
      investment_amount, created_at
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
  contact_name: string;
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
      "id, business_name, contact_name, email, phone, business_type, city, state, created_at",
    )
    .order("business_name", { ascending: true });
  return (data ?? []) as AdminBorrowerListItem[];
}

export type AdminBorrowerDetail = {
  id: string;
  business_name: string;
  contact_name: string;
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
    .select("id, email, name")
    .order("name", { ascending: true });
  return (data ?? []) as LenderPickerOption[];
}

export async function getNoteVisibility(
  noteUuid: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_visibility")
    .select("user_id")
    .eq("note_id", noteUuid);
  return (data ?? []).map((r) => r.user_id as string);
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

export async function getAdminNotes(): Promise<AdminNoteListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select(
      `id, note_id, title, principal, rate, term_months, status, client_status,
       project_type, created_at, borrower_id`,
    )
    .order("created_at", { ascending: false });

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
  description: string | null;
  admin_notes: string | null;
  target_raise: string | null;
  min_investment: string | null;
  created_at: string;
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

export async function countAdmins(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}
