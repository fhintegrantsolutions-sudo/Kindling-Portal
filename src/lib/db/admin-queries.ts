import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  pendingRegistrations: number;
  activeParticipations: number;
  totalInvested: number;
  activeNotes: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const [pendingReg, activeParts, allActive, activeNotes] = await Promise.all([
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
    pendingRegistrations: pendingReg.count ?? 0,
    activeParticipations: activeParts.count ?? 0,
    totalInvested,
    activeNotes: activeNotes.count ?? 0,
  };
}

export type RegistrationListItem = {
  id: string;
  status: "pending" | "approved" | "rejected";
  first_name: string;
  last_name: string;
  email: string;
  investment_amount: string;
  created_at: string;
  note: { note_id: string; title: string } | null;
};

export async function getRegistrations(filter?: {
  status?: "pending" | "approved" | "rejected";
}) {
  const supabase = await createClient();
  let q = supabase
    .from("note_registrations")
    .select(
      `
      id, status, first_name, last_name, email,
      investment_amount, created_at,
      note:notes ( note_id, title )
      `,
    )
    .order("created_at", { ascending: false });

  if (filter?.status) {
    q = q.eq("status", filter.status);
  }
  const { data } = await q;
  return (data ?? []) as unknown as RegistrationListItem[];
}

export type RegistrationDetail = {
  id: string;
  status: "pending" | "approved" | "rejected";
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
  bank_name: string;
  bank_account_type: string;
  bank_account_number: string;
  bank_routing_number: string;
  bank_account_address: string | null;
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
  user_id: string;
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
  fundingState?: "pending" | "received" | "deposited" | "cleared";
}) {
  const supabase = await createClient();
  let q = supabase
    .from("participations")
    .select(
      `
      id, user_id, invested_amount, status,
      funding_received, funding_deposited, funding_cleared,
      funding_type, created_at,
      note:notes ( note_id, title )
      `,
    )
    .order("created_at", { ascending: false });

  switch (filter?.fundingState) {
    case "pending":
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
  }

  const { data } = await q;
  return (data ?? []) as unknown as AdminParticipationListItem[];
}

export type AdminParticipationDetail = {
  id: string;
  user_id: string;
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
  // hydrated separately from profiles (auth.users isn't joinable via PostgREST)
  lender: { name: string | null; email: string | null } | null;
};

export async function getParticipationById(id: string) {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("participations")
    .select(
      `
      id, user_id, invested_amount, status, user_notes,
      funding_received, funding_deposited, funding_cleared,
      funding_type, funding_investment_amount,
      funding_check_number, funding_wire_reference_number,
      funding_check_image_url,
      funding_received_date, funding_deposited_date, funding_cleared_date,
      funding_notes, funding_other_type_description,
      created_at,
      note:notes ( id, note_id, title, principal, rate, term_months )
      `,
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", (p as { user_id: string }).user_id)
    .maybeSingle();

  return {
    ...(p as object),
    lender: profile ?? null,
  } as unknown as AdminParticipationDetail;
}

export async function getRegistrationById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_registrations")
    .select(
      `
      id, status, user_id,
      first_name, last_name, phone, email, entity_type, name_for_agreement,
      mailing_address, city, state, zip_code,
      investment_amount,
      bank_name, bank_account_type, bank_account_number,
      bank_routing_number, bank_account_address,
      acknowledge_lender, created_at,
      note:notes ( id, note_id, title, principal, rate, term_months )
      `,
    )
    .eq("id", id)
    .maybeSingle();
  return data as unknown as RegistrationDetail | null;
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

export async function countAdmins(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}
