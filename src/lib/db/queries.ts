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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as ParticipationWithNote[];
}

// Total monthly payment the signed-in lender is expected to receive across
// all their funded participations. Each row's contribution is the note's
// monthly payment × the lender's pro-rata share of cleared funding on
// that note.
export async function getMyTotalMonthlyPayment(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: myParts } = await supabase
    .from("participations")
    .select(
      `id, note_id, invested_amount, funding_cleared,
       note:notes ( principal, rate, term_months, interest_type )`,
    )
    .eq("user_id", user.id)
    .eq("funding_cleared", true);

  const rows = (myParts ?? []) as unknown as Array<{
    id: string;
    note_id: string;
    invested_amount: string;
    funding_cleared: boolean;
    note: {
      principal: string | number | null;
      rate: string | number | null;
      term_months: number | null;
      interest_type: string;
    } | null;
  }>;
  if (rows.length === 0) return 0;

  const noteIds = Array.from(new Set(rows.map((r) => r.note_id)));
  const { data: allClearedParts } = await supabase
    .from("participations")
    .select("note_id, invested_amount")
    .in("note_id", noteIds)
    .eq("funding_cleared", true);
  const totalsByNote = new Map<string, number>();
  for (const p of (allClearedParts ?? []) as Array<{
    note_id: string;
    invested_amount: string;
  }>) {
    const inv = Number(p.invested_amount);
    if (!Number.isFinite(inv)) continue;
    totalsByNote.set(p.note_id, (totalsByNote.get(p.note_id) ?? 0) + inv);
  }

  const { computeMonthlyPayment } = await import("@/lib/notes/schedule");
  let total = 0;
  for (const r of rows) {
    const n = r.note;
    const totalCleared = totalsByNote.get(r.note_id);
    if (
      !n ||
      n.principal === null ||
      n.rate === null ||
      !n.term_months ||
      !totalCleared ||
      totalCleared <= 0
    ) {
      continue;
    }
    const noteMonthly = computeMonthlyPayment({
      principal: Number(n.principal),
      annualRatePct: Number(n.rate),
      termMonths: Number(n.term_months),
      interestType: n.interest_type,
    });
    if (noteMonthly === null) continue;
    const myShare = Number(r.invested_amount) / totalCleared;
    total += noteMonthly * myShare;
  }
  return Math.round(total * 100) / 100;
}

export type UpcomingNote = {
  id: string;
  note_id: string;
  title: string;
  funding_start_date: string;
  funding_end_date: string | null;
};

// Soonest note whose funding_start_date is still in the future. Drives the
// "Next note opens in X" countdown at the top of /opportunities.
export async function getNextUpcomingNote(): Promise<UpcomingNote | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("notes")
    .select("id, note_id, title, funding_start_date, funding_end_date")
    .eq("status", "Active")
    .eq("client_status", "Available")
    .gt("funding_start_date", today)
    .order("funding_start_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as UpcomingNote | null;
}

export async function getOpportunities() {
  const supabase = await createClient();
  // Today in YYYY-MM-DD. Notes whose funding_end_date is in the past drop
  // off the listing on the next day (i.e. the closing day still shows;
  // the day after, it's gone — effectively a 12:01am cutover).
  const today = new Date().toISOString().slice(0, 10);
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
    .or(`funding_start_date.is.null,funding_start_date.lte.${today}`)
    .or(`funding_end_date.is.null,funding_end_date.gte.${today}`)
    .order("funding_start_date", { ascending: true, nullsFirst: false })
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
  borrower: { business_name: string } | null;
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
      borrower:borrowers ( business_name )
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

export type MyScheduleRow = {
  payment_number: number;
  due_date: string;
  my_principal: number;
  my_interest: number;
  my_balance: number;
  received_date: string | null;
};

export type MyScheduleResult =
  | { ok: true; rows: MyScheduleRow[] }
  | { ok: false; reason: string };

export async function getMyScheduleForNote(
  noteUuid: string,
  participationId: string,
): Promise<MyScheduleResult> {
  const supabase = await createClient();

  // Note params for the schedule.
  const { data: note } = await supabase
    .from("notes")
    .select("principal, rate, term_months, interest_type, first_payment_date")
    .eq("id", noteUuid)
    .maybeSingle();
  if (!note) return { ok: false, reason: "Note not found." };
  if (
    note.principal === null ||
    note.rate === null ||
    !note.term_months ||
    !note.first_payment_date
  ) {
    return {
      ok: false,
      reason: "Schedule isn't available yet — note is missing setup details.",
    };
  }

  // Lender's share basis. Use participations on the note that are funded
  // (cleared) so the share matches what admin uses when distributing.
  const { data: parts } = await supabase
    .from("participations")
    .select("id, invested_amount, funding_cleared")
    .eq("note_id", noteUuid);
  const cleared = (parts ?? []).filter(
    (p) => p.funding_cleared && Number(p.invested_amount ?? 0) > 0,
  );
  const me = cleared.find((p) => p.id === participationId);
  if (!me) {
    return {
      ok: false,
      reason: "Schedule will appear once your funding clears.",
    };
  }
  const totalShare = cleared.reduce(
    (s, p) => s + Number(p.invested_amount ?? 0),
    0,
  );
  const myShare = Number(me.invested_amount) / totalShare;

  const { generateSchedule } = await import("@/lib/notes/schedule");
  const result = generateSchedule({
    principal: Number(note.principal),
    annualRatePct: Number(note.rate),
    termMonths: Number(note.term_months),
    interestType: String(note.interest_type),
    firstPaymentDate: String(note.first_payment_date),
  });
  if (!result.ok) return { ok: false, reason: result.reason };

  // Recorded payouts to me (frozen amounts).
  const { data: payouts } = await supabase
    .from("participation_payment_payouts")
    .select(
      `principal_amount, interest_amount,
       payment:note_payments ( payment_number, payment_date )`,
    )
    .eq("participation_id", participationId);
  const receivedByNumber = new Map<
    number,
    { principal: number; interest: number; date: string }
  >();
  for (const r of (payouts ?? []) as unknown as Array<{
    principal_amount: string;
    interest_amount: string;
    payment: { payment_number: number | null; payment_date: string } | null;
  }>) {
    if (!r.payment || r.payment.payment_number === null) continue;
    receivedByNumber.set(r.payment.payment_number, {
      principal: Number(r.principal_amount),
      interest: Number(r.interest_amount),
      date: r.payment.payment_date,
    });
  }

  let runningBalance = Number(me.invested_amount);
  const rows: MyScheduleRow[] = result.rows.map((row) => {
    const got = receivedByNumber.get(row.payment_number);
    const myPrincipal = got
      ? got.principal
      : Math.round(row.principal_amount * myShare * 100) / 100;
    const myInterest = got
      ? got.interest
      : Math.round(row.interest_amount * myShare * 100) / 100;
    runningBalance = Math.round((runningBalance - myPrincipal) * 100) / 100;
    return {
      payment_number: row.payment_number,
      due_date: row.due_date,
      my_principal: myPrincipal,
      my_interest: myInterest,
      my_balance: runningBalance < 0 ? 0 : runningBalance,
      received_date: got ? got.date : null,
    };
  });

  return { ok: true, rows };
}

export type MyBonusPayout = {
  id: string;
  amount: string;
  paid_date: string;
  notes: string | null;
};

export async function getMyBonusPayoutsForParticipation(
  participationId: string,
): Promise<MyBonusPayout[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("participation_bonus_payouts")
    .select(
      `id, amount,
       bonus:note_bonuses ( paid_date, notes )`,
    )
    .eq("participation_id", participationId);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    amount: string;
    bonus: { paid_date: string; notes: string | null } | null;
  }>;
  return rows
    .filter((r) => r.bonus !== null)
    .map((r) => ({
      id: r.id,
      amount: r.amount,
      paid_date: r.bonus!.paid_date,
      notes: r.bonus!.notes,
    }))
    .sort((a, b) => (a.paid_date < b.paid_date ? 1 : -1));
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("user_id", user.id)
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Beneficiary[];
}

export type MyReferralCode = {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
};

export async function getMyReferralCode(): Promise<MyReferralCode | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("referral_codes")
    .select("id, code, is_active, created_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return data as MyReferralCode | null;
}

export type MyReferralRow = {
  id: string;
  referred_email: string | null;
  referred_name: string | null;
  status: "pending" | "signed_up" | "invested" | "qualified";
  signup_date: string | null;
  first_investment_date: string | null;
  first_investment_amount: string | null;
  created_at: string;
};

export async function getMyReferrals(): Promise<MyReferralRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("referrals")
    .select(
      "id, referred_email, referred_name, status, signup_date, first_investment_date, first_investment_amount, created_at",
    )
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as MyReferralRow[];
}

export async function getBeneficiaryById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
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
