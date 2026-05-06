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
