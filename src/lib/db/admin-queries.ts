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
