import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ParticipationWithNote = {
  id: string;
  note_id: string;
  invested_amount: string;
  status: string;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  created_at: string;
  note: {
    id: string;
    note_id: string;
    title: string;
    principal: string;
    rate: string;
    term_months: number;
    project_type: string;
    status: string;
    maturity_date: string | null;
  } | null;
};

export type Opportunity = {
  id: string;
  note_id: string;
  title: string;
  principal: string;
  rate: string;
  term_months: number;
  project_type: string;
  target_raise: string | null;
  min_investment: string | null;
  funding_end_date: string | null;
  description: string | null;
  borrower: { business_name: string } | null;
};

export async function getMyParticipations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("participations")
    .select(
      `
      id,
      note_id,
      invested_amount,
      status,
      funding_received,
      funding_deposited,
      funding_cleared,
      created_at,
      note:notes (
        id,
        note_id,
        title,
        principal,
        rate,
        term_months,
        project_type,
        status,
        maturity_date
      )
      `,
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as ParticipationWithNote[];
}

export async function getOpportunities() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select(
      `
      id,
      note_id,
      title,
      principal,
      rate,
      term_months,
      project_type,
      target_raise,
      min_investment,
      funding_end_date,
      description,
      borrower:borrowers (
        business_name
      )
      `,
    )
    .eq("status", "Active")
    .eq("client_status", "Available")
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Opportunity[];
}

export type NoteDetail = {
  id: string;
  note_id: string;
  title: string;
  principal: string;
  rate: string;
  term_months: number;
  term_years: number | null;
  project_type: string;
  type: string;
  interest_type: string;
  status: string;
  client_status: string;
  loan_payment_status: string;
  contract_date: string | null;
  payment_start_date: string | null;
  maturity_date: string | null;
  funding_start_date: string | null;
  funding_end_date: string | null;
  first_payment_date: string | null;
  monthly_payment: string | null;
  target_raise: string | null;
  min_investment: string | null;
  description: string | null;
  borrower: { business_name: string; contact_name: string | null } | null;
};

export async function getNoteByNoteId(noteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select(
      `
      id, note_id, title, principal, rate, term_months, term_years,
      project_type, type, interest_type, status, client_status,
      loan_payment_status, contract_date, payment_start_date,
      maturity_date, funding_start_date, funding_end_date,
      first_payment_date, monthly_payment, target_raise, min_investment,
      description,
      borrower:borrowers ( business_name, contact_name )
      `,
    )
    .eq("note_id", noteId)
    .maybeSingle();

  return data as unknown as NoteDetail | null;
}

export type MyParticipation = {
  id: string;
  invested_amount: string;
  status: string;
  user_notes: string | null;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  funding_type: string | null;
  funding_received_date: string | null;
  funding_deposited_date: string | null;
  funding_cleared_date: string | null;
  created_at: string;
};

export async function getMyParticipationByNoteId(noteUuid: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("participations")
    .select(
      `
      id, invested_amount, status, user_notes,
      funding_received, funding_deposited, funding_cleared,
      funding_type, funding_received_date, funding_deposited_date,
      funding_cleared_date, created_at
      `,
    )
    .eq("note_id", noteUuid)
    .eq("user_id", user.id)
    .maybeSingle();

  return data as MyParticipation | null;
}

export type Beneficiary = {
  id: string;
  user_id: string;
  name: string;
  relation: string;
  percentage: number;
  type: string;
  dob: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyBeneficiaries() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Beneficiary[];
}

export async function getBeneficiaryById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Beneficiary | null;
}

export async function getMyRegistrationByNoteId(noteUuid: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("note_registrations")
    .select("id, status, investment_amount, created_at")
    .eq("note_id", noteUuid)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
