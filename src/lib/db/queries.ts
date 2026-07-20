import "server-only";

import { getCurrentEntityContext } from "@/lib/entities/context";
import { createClient } from "@/lib/supabase/server";

// Lender-facing reads below are scoped by INVESTOR ENTITY, not by login:
// they filter on `entity_id IN ctx.entityIds` rather than `user_id = user.id`.
// RLS enforces the same boundary server-side via auth_owns_entity(). In Phase 1
// every login owns exactly one entity, so this is behavior-identical to the
// previous user-scoped reads. Login-level data (referrals) stays keyed on the user.

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
    interest_type: string;
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
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return [];

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
        interest_type,
        project_type,
        status,
        maturity_date
      )
      `,
    )
    .in("entity_id", ctx.entityIds)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as ParticipationWithNote[];
}

export type MonthlyCashflowPoint = {
  month: string; // "YYYY-MM"
  principal: number;
  interest: number;
};

// Aggregate the lender's projected monthly payments (principal + interest,
// pro-rated to their share) across all funded notes, keyed by calendar month.
// Returns a continuous month-by-month timeline from the first scheduled payment
// to the last, so bars rise when a new note begins paying and fall as notes
// mature. Notes missing schedule inputs (principal / dates) are skipped.
export async function getMyMonthlyCashflow(): Promise<MonthlyCashflowPoint[]> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return [];

  const { data } = await supabase
    .from("participations")
    .select(
      `
      invested_amount, funding_cleared,
      note:notes ( principal, rate, term_months, interest_type, first_payment_date, fee )
      `,
    )
    .in("entity_id", ctx.entityIds)
    .eq("funding_cleared", true);

  const rows = (data ?? []) as unknown as Array<{
    invested_amount: string;
    funding_cleared: boolean;
    note: {
      principal: string | null;
      rate: string | null;
      term_months: number | null;
      interest_type: string;
      first_payment_date: string | null;
      fee: string | null;
    } | null;
  }>;

  const { generateSchedule, addMonths } = await import("@/lib/notes/schedule");
  const byMonth = new Map<string, { principal: number; interest: number }>();

  for (const r of rows) {
    const n = r.note;
    if (
      !n ||
      n.principal === null ||
      n.rate === null ||
      !n.term_months ||
      !n.first_payment_date
    ) {
      continue;
    }
    const notePrincipal = Number(n.principal);
    if (!(notePrincipal > 0)) continue;
    const myShare = Number(r.invested_amount) / notePrincipal;
    const sched = generateSchedule({
      principal: notePrincipal,
      annualRatePct: Number(n.rate),
      termMonths: Number(n.term_months),
      interestType: String(n.interest_type),
      firstPaymentDate: String(n.first_payment_date),
      fee: n.fee === null ? 0 : Number(n.fee),
    });
    if (!sched.ok) continue;
    for (const row of sched.rows) {
      const month = row.due_date.slice(0, 7);
      const cur = byMonth.get(month) ?? { principal: 0, interest: 0 };
      cur.principal += row.principal_amount * myShare;
      cur.interest += row.interest_amount * myShare;
      // Net the lender's pro-rata one-time fee out of month 1 (only row 1
      // has fee_amount > 0). Subtract from interest so principal+interest
      // equals the net payment. fee < first payment, so this stays >= 0.
      const myFee = Math.round(row.fee_amount * myShare * 100) / 100;
      cur.interest -= myFee;
      byMonth.set(month, cur);
    }
  }

  if (byMonth.size === 0) return [];

  const sortedMonths = Array.from(byMonth.keys()).sort();
  const firstMonth = sortedMonths[0];
  const lastMonth = sortedMonths[sortedMonths.length - 1];

  // Fill every month from first to last so the timeline is continuous.
  const out: MonthlyCashflowPoint[] = [];
  let cursor = `${firstMonth}-01`;
  const stop = `${lastMonth}-01`;
  while (cursor <= stop) {
    const m = cursor.slice(0, 7);
    const v = byMonth.get(m) ?? { principal: 0, interest: 0 };
    out.push({
      month: m,
      principal: Math.round(v.principal * 100) / 100,
      interest: Math.round(v.interest * 100) / 100,
    });
    cursor = addMonths(cursor, 1);
  }
  return out;
}

// Total monthly payment the signed-in lender is expected to receive across
// all their funded participations. Each row's contribution is the note's
// monthly payment × the lender's pro-rata share of cleared funding on
// that note.
export async function getMyTotalMonthlyPayment(): Promise<number> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return 0;

  const { data: myParts } = await supabase
    .from("participations")
    .select(
      `id, note_id, invested_amount, funding_cleared,
       note:notes ( principal, rate, term_months, interest_type )`,
    )
    .in("entity_id", ctx.entityIds)
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

  // Projected share = invested_amount / note.principal. Lender-side RLS
  // hides other participations on each note, so we can't sum cleared
  // funding to match admin's distribution exactly. For fully-subscribed
  // notes this is identical; for under-subscribed notes it slightly
  // under-states the lender's projected income. See the matching note in
  // getMyScheduleForNote.
  const { computeMonthlyPayment } = await import("@/lib/notes/schedule");
  let total = 0;
  for (const r of rows) {
    const n = r.note;
    if (
      !n ||
      n.principal === null ||
      n.rate === null ||
      !n.term_months ||
      Number(n.principal) <= 0
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
    const myShare = Number(r.invested_amount) / Number(n.principal);
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

// Note ids that the given entities have access to via an explicit private-note
// grant or an existing participation. Used to scope PRIVATE notes to the entity
// you're currently viewing as.
async function noteIdsAccessibleToEntities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityIds: string[],
): Promise<Set<string>> {
  if (entityIds.length === 0) return new Set();
  const [vis, parts] = await Promise.all([
    supabase.from("note_visibility").select("note_id").in("entity_id", entityIds),
    supabase.from("participations").select("note_id").in("entity_id", entityIds),
  ]);
  const ids = new Set<string>();
  for (const r of (vis.data ?? []) as Array<{ note_id: string }>) ids.add(r.note_id);
  for (const r of (parts.data ?? []) as Array<{ note_id: string }>) ids.add(r.note_id);
  return ids;
}

export async function getOpportunities() {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
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
      is_private,
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

  const rows = (data ?? []) as unknown as Array<Opportunity & { is_private: boolean }>;

  // RLS decides whether this LOGIN may see a private note at all (it passes if
  // ANY entity they own was granted it). That's the right security boundary, but
  // it's not the right VIEW: a note granted to "Personal" must not appear while
  // you're viewing as an LLC. So scope private notes to the entities currently
  // in context.
  const accessible = await noteIdsAccessibleToEntities(
    supabase,
    ctx?.entityIds ?? [],
  );
  return rows.filter((n) => !n.is_private || accessible.has(n.id)) as Opportunity[];
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
  has_profit_bonus: boolean;
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
      description, has_profit_bonus,
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
  // The entity that HOLDS this position — paperwork (loan agreement, schedule
  // PDF) must carry this entity's legal name, not the login's primary entity.
  entity: {
    id: string;
    display_name: string;
    loan_agreement_title: string | null;
  } | null;
};

export async function getMyParticipationByNoteId(noteUuid: string) {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return null;

  const { data } = await supabase
    .from("participations")
    .select(
      `
      id, invested_amount, status, user_notes,
      funding_received, funding_deposited, funding_cleared,
      funding_type, funding_received_date, funding_deposited_date,
      funding_cleared_date, created_at,
      entity:investor_entities ( id, display_name, loan_agreement_title )
      `,
    )
    .eq("note_id", noteUuid)
    .in("entity_id", ctx.entityIds)
    // In "all" mode ctx.entityIds holds MULTIPLE entities and the same note can
    // be held through more than one of them, so this can match >1 row.
    // .maybeSingle() would throw; take the earliest participation instead.
    .order("created_at", { ascending: true })
    .limit(1);

  return ((data ?? [])[0] ?? null) as unknown as MyParticipation | null;
}

export type EntityTotal = {
  entity_id: string;
  display_name: string;
  invested: number;
  positions: number;
};

// Invested total + position count per entity, for the dashboard's "All entities"
// breakdown. Counts only Active + funding-cleared rows, matching the dashboard's
// definition of deployed capital.
export async function getMyTotalsByEntity(): Promise<EntityTotal[]> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return [];

  const { data } = await supabase
    .from("participations")
    .select("invested_amount, entity_id, status, funding_cleared")
    .in("entity_id", ctx.entityIds)
    .eq("status", "Active")
    .eq("funding_cleared", true);

  const byId = new Map<string, { invested: number; positions: number }>();
  for (const r of (data ?? []) as Array<{
    invested_amount: string;
    entity_id: string | null;
  }>) {
    if (!r.entity_id) continue;
    const cur = byId.get(r.entity_id) ?? { invested: 0, positions: 0 };
    cur.invested += Number(r.invested_amount ?? 0);
    cur.positions += 1;
    byId.set(r.entity_id, cur);
  }

  return ctx.entities
    .filter((e) => byId.has(e.id))
    .map((e) => ({
      entity_id: e.id,
      display_name: e.display_name,
      invested: byId.get(e.id)!.invested,
      positions: byId.get(e.id)!.positions,
    }))
    .sort((a, b) => b.invested - a.invested);
}

export type MyScheduleRow = {
  payment_number: number;
  due_date: string;
  my_principal: number;
  my_interest: number;
  my_fee: number; // this lender's pro-rata share of the one-time fee (row 1)
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
    .select(
      "principal, rate, term_months, interest_type, first_payment_date, fee",
    )
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

  // Projected share = invested_amount / note.principal. Lender-side RLS
  // hides other participations on this note, so we can't replicate admin's
  // distribution math exactly (which divides by the sum of funded shares
  // across all participants). For a fully-subscribed note the two are
  // identical; for an under-subscribed note this projection slightly
  // under-states the lender's actual share. Actual recorded payouts on
  // received rows always read from `participation_payment_payouts` (frozen
  // amounts), so this approximation only affects forward-looking rows.
  const { data: me } = await supabase
    .from("participations")
    .select("id, invested_amount, funding_cleared")
    .eq("id", participationId)
    .maybeSingle();
  if (
    !me ||
    !me.funding_cleared ||
    Number(me.invested_amount ?? 0) <= 0
  ) {
    return {
      ok: false,
      reason: "Schedule will appear once your funding clears.",
    };
  }
  const myShare = Number(me.invested_amount) / Number(note.principal);

  const { generateSchedule } = await import("@/lib/notes/schedule");
  const result = generateSchedule({
    principal: Number(note.principal),
    annualRatePct: Number(note.rate),
    termMonths: Number(note.term_months),
    interestType: String(note.interest_type),
    firstPaymentDate: String(note.first_payment_date),
    fee: note.fee !== null ? Number(note.fee) : 0,
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
    // Received rows already reflect the fee in the recorded payout; my_fee is
    // only meaningful on projected (unpaid) rows.
    const myFee = got ? 0 : Math.round(row.fee_amount * myShare * 100) / 100;
    runningBalance = Math.round((runningBalance - myPrincipal) * 100) / 100;
    return {
      payment_number: row.payment_number,
      due_date: row.due_date,
      my_principal: myPrincipal,
      my_interest: myInterest,
      my_fee: myFee,
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
  ssn_last4: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyBeneficiaries() {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return [];
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .in("entity_id", ctx.entityIds)
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
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return null;
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("id", id)
    .in("entity_id", ctx.entityIds)
    // Safe in all-mode: keyed by the beneficiary's unique id, so the entity_id
    // filter only authorizes the row — it can never widen the match past 1.
    .maybeSingle();
  return data as Beneficiary | null;
}

export async function getMyRegistrationByNoteId(noteUuid: string) {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return null;

  const { data } = await supabase
    .from("note_registrations")
    .select("id, status, investment_amount, created_at")
    .eq("note_id", noteUuid)
    .in("entity_id", ctx.entityIds)
    // Safe in all-mode: .limit(1) caps the result at one row before
    // .maybeSingle() runs, so multiple entities registering on the same note
    // can't throw — the newest registration wins.
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
