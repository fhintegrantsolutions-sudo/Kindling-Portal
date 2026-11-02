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
  // The investor entity holding this position.
  entity: { id: string; display_name: string } | null;
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

// The current entity context's registration on an opportunity, if any. When a
// login owns several entities and is viewing "all", this aggregates across
// them: invested is the sum, and the funding flags collapse the whole set to a
// single stage (cleared only if every position cleared).
export type OpportunityRegistration = {
  invested_amount: string;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
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
  // null when the current entity context has not registered on this note.
  registration: OpportunityRegistration | null;
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
      entity:investor_entities ( id, display_name ),
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
  // The notes paying into this month (human note IDs), for the chart detail.
  noteIds: string[];
};

// Total profit-bonus dollars actually PAID (status "received") per calendar
// year to the current entity context's participations. Folded into the
// dashboard annual summary's interest (and marked with "*"). Scoped by the
// entity switcher like the rest of the dashboard.
export async function getMyBonusByYear(): Promise<Map<number, number>> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  const byYear = new Map<number, number>();
  if (!ctx || ctx.entityIds.length === 0) return byYear;

  const { data: parts } = await supabase
    .from("participations")
    .select("id")
    .in("entity_id", ctx.entityIds);
  const partIds = (parts ?? []).map((p) => p.id as string);
  if (partIds.length === 0) return byYear;

  const { data: payouts } = await supabase
    .from("participation_bonus_payouts")
    .select("amount, bonus:note_bonuses ( paid_date, status )")
    .in("participation_id", partIds);

  for (const row of payouts ?? []) {
    const bonus = row.bonus as unknown as {
      paid_date: string | null;
      status: string | null;
    } | null;
    if (bonus?.status !== "received" || !bonus.paid_date) continue;
    const y = Number(String(bonus.paid_date).slice(0, 4));
    if (!Number.isFinite(y)) continue;
    byYear.set(y, (byYear.get(y) ?? 0) + Number(row.amount ?? 0));
  }
  return byYear;
}

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
      note:notes ( note_id, principal, rate, term_months, interest_type, first_payment_date, fee, cospark_fee )
      `,
    )
    .in("entity_id", ctx.entityIds)
    .eq("funding_cleared", true);

  const rows = (data ?? []) as unknown as Array<{
    invested_amount: string;
    funding_cleared: boolean;
    note: {
      note_id: string;
      principal: string | null;
      rate: string | null;
      term_months: number | null;
      interest_type: string;
      first_payment_date: string | null;
      fee: string | null;
      cospark_fee: string | null;
    } | null;
  }>;

  const { generateLenderSchedule, addMonths, noteFirstPaymentFees } =
    await import("@/lib/notes/schedule");
  // Month -> principal / interest in integer cents.
  const byMonth = new Map<string, { principal: number; interest: number }>();
  // Distinct notes paying into each month (human note IDs), for the chart detail.
  const notesByMonth = new Map<string, Set<string>>();

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
    // The lender's own amortization — the same rows their note page shows.
    const sched = generateLenderSchedule({
      invested: Number(r.invested_amount),
      notePrincipal,
      annualRatePct: Number(n.rate),
      termMonths: Number(n.term_months),
      interestType: String(n.interest_type),
      firstPaymentDate: String(n.first_payment_date),
      noteFees: noteFirstPaymentFees(n),
    });
    if (!sched.ok) continue;
    const cents = (x: number) => Math.round(x * 100);
    for (const row of sched.rows) {
      const month = row.due_date.slice(0, 7);
      const cur = byMonth.get(month) ?? { principal: 0, interest: 0 };
      // The one-time fee reduces the lender's INTEREST only (row 1 only).
      cur.principal += cents(row.principal_amount);
      cur.interest += cents(row.interest_amount) - cents(row.fee_amount);
      byMonth.set(month, cur);
      const set = notesByMonth.get(month) ?? new Set<string>();
      set.add(n.note_id);
      notesByMonth.set(month, set);
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
      principal: v.principal / 100,
      interest: v.interest / 100,
      noteIds: Array.from(notesByMonth.get(m) ?? []).sort(),
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

  // Each participation's monthly payment is its own amortization (invested
  // amount at the note's rate and term), matching the lender's schedule.
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
    const myMonthly = computeMonthlyPayment({
      principal: Number(r.invested_amount),
      annualRatePct: Number(n.rate),
      termMonths: Number(n.term_months),
      interestType: n.interest_type,
    });
    if (myMonthly === null) continue;
    total += myMonthly;
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
    .eq("status", "Open")
    .eq("client_status", "Available")
    .gt("funding_start_date", today)
    .order("funding_start_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as UpcomingNote | null;
}

export type MyNoteInterest = {
  entity_id: string;
  estimated_amount: number | null;
};

// The signed-in lender's interest rows on one note, across all their entities
// (the panel shows each entity's status regardless of the switcher).
export async function getMyNoteInterests(
  noteUuid: string,
): Promise<MyNoteInterest[]> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entities.length === 0) return [];
  const { data } = await supabase
    .from("note_interests")
    .select("entity_id, estimated_amount")
    .eq("note_id", noteUuid)
    .in(
      "entity_id",
      ctx.entities.map((e) => e.id),
    );
  return ((data ?? []) as Array<{
    entity_id: string;
    estimated_amount: string | number | null;
  }>).map((r) => ({
    entity_id: r.entity_id,
    estimated_amount:
      r.estimated_amount !== null ? Number(r.estimated_amount) : null,
  }));
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
    .eq("status", "Open")
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
  const visible = rows.filter((n) => !n.is_private || accessible.has(n.id));

  // Mark which of these the current entity context has already registered on,
  // so the page can show status instead of a Register button. Keyed by the
  // note UUID; a login viewing "all" may match on any owned entity.
  const regByNote = new Map<string, OpportunityRegistration>();
  const entityIds = ctx?.entityIds ?? [];
  const noteIds = visible.map((n) => n.id);
  if (entityIds.length > 0 && noteIds.length > 0) {
    const { data: parts } = await supabase
      .from("participations")
      .select(
        "note_id, invested_amount, funding_received, funding_deposited, funding_cleared",
      )
      .in("entity_id", entityIds)
      .in("note_id", noteIds);

    const groups = new Map<string, typeof parts>();
    for (const p of parts ?? []) {
      const arr = groups.get(p.note_id) ?? [];
      arr.push(p);
      groups.set(p.note_id, arr);
    }
    for (const [id, arr] of groups) {
      const rowsForNote = arr ?? [];
      regByNote.set(id, {
        invested_amount: rowsForNote
          .reduce((sum, p) => sum + Number(p.invested_amount ?? 0), 0)
          .toFixed(2),
        funding_received: rowsForNote.some((p) => p.funding_received),
        funding_deposited: rowsForNote.some((p) => p.funding_deposited),
        funding_cleared: rowsForNote.every((p) => p.funding_cleared),
      });
    }
  }

  return visible.map((n) => ({
    ...n,
    registration: regByNote.get(n.id) ?? null,
  })) as Opportunity[];
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

// The signed-in lender's participations on one note within the current entity
// context (several in "All entities" mode when the note is held through more
// than one entity), oldest first — for the note page's entity tabs.
export async function getMyParticipationsForNote(
  noteUuid: string,
): Promise<Array<{ id: string; entity_name: string | null }>> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return [];
  const { data } = await supabase
    .from("participations")
    .select("id, entity:investor_entities ( display_name )")
    .eq("note_id", noteUuid)
    .in("entity_id", ctx.entityIds)
    .order("created_at", { ascending: true });
  return ((data ?? []) as unknown as Array<{
    id: string;
    entity: { display_name: string } | null;
  }>).map((r) => ({ id: r.id, entity_name: r.entity?.display_name ?? null }));
}

// One participation on the note. With participationId, that exact position
// (still scoped to the current entity context); otherwise the earliest.
export async function getMyParticipationByNoteId(
  noteUuid: string,
  participationId?: string,
) {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return null;

  let query = supabase
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
    .in("entity_id", ctx.entityIds);
  if (participationId) query = query.eq("id", participationId);
  // In "all" mode ctx.entityIds holds MULTIPLE entities and the same note can
  // be held through more than one of them, so this can match >1 row.
  // .maybeSingle() would throw; take the earliest participation instead.
  const { data } = await query
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
  // Recorded (borrower paid) but its due date hasn't arrived — shown as Pending.
  pending: boolean;
};

export type MyScheduleResult =
  | {
      ok: true;
      rows: MyScheduleRow[];
      // This lender's share of all first-payment deductions, and its split.
      one_time_fee: number;
      service_fee: number;
      cospark_fee: number;
    }
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
      "principal, rate, term_months, interest_type, first_payment_date, fee, cospark_fee",
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
  const invested = Number(me.invested_amount);

  // The lender's OWN amortization (their invested amount at the note's rate
  // and term), not a slice of the note's schedule — see generateLenderSchedule.
  const { generateLenderSchedule, noteFirstPaymentFees, lenderFeeShare } =
    await import("@/lib/notes/schedule");
  const result = generateLenderSchedule({
    invested,
    notePrincipal: Number(note.principal),
    annualRatePct: Number(note.rate),
    termMonths: Number(note.term_months),
    interestType: String(note.interest_type),
    firstPaymentDate: String(note.first_payment_date),
    noteFees: noteFirstPaymentFees(note),
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

  // A recorded payment stays "Pending" for the lender until its due date: the
  // borrower may pay early, but lenders see it as received only on/after the
  // scheduled date. Until then the row shows its scheduled amounts (which equal
  // the recorded payout). Dates compare in US Pacific so the flip never happens
  // before the due date anywhere in the US.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date()); // YYYY-MM-DD
  const receivedFor = (row: { payment_number: number; due_date: string }) =>
    row.due_date <= today ? receivedByNumber.get(row.payment_number) : undefined;

  const rows: MyScheduleRow[] = result.rows.map((row) => {
    const got = receivedFor(row);
    const myInterest = got ? got.interest : row.interest_amount;
    let myPrincipal: number;
    if (got) {
      myPrincipal = got.principal;
    } else {
      myPrincipal = row.principal_amount;
    }
    // The one-time fee reduces interest only, never principal. Received rows
    // already reflect it in the recorded payout; my_fee is only meaningful on
    // projected (unpaid) rows.
    const myFee = got ? 0 : row.fee_amount;
    // Balance comes from the lender's own schedule (unrounded, ends at $0.00
    // like calculator.net), not from subtracting rounded principal amounts.
    return {
      payment_number: row.payment_number,
      due_date: row.due_date,
      my_principal: myPrincipal,
      my_interest: myInterest,
      my_fee: myFee,
      my_balance: row.ending_balance,
      received_date: got ? got.date : null,
      pending: !got && receivedByNumber.has(row.payment_number),
    };
  });

  // The lender's one-time fee, independent of whether the first payment has
  // been received — so it can be shown after it's baked into the payout.
  const oneTimeFee = result.feeShare ?? 0;

  // Split it into its parts for display; the CoSpark part takes the remainder
  // so the two always sum to one_time_fee.
  const serviceFee = Math.min(
    oneTimeFee,
    lenderFeeShare(
      note.fee !== null ? Number(note.fee) : 0,
      invested,
      Number(note.principal),
    ),
  );
  const cosparkFee = Math.round((oneTimeFee - serviceFee) * 100) / 100;

  return {
    ok: true,
    rows,
    one_time_fee: oneTimeFee,
    service_fee: serviceFee,
    cospark_fee: cosparkFee,
  };
}

export type MyDocument = {
  id: string;
  type: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
};

// The lender's documents for one participation. RLS returns rows only when the
// caller owns the participation's entity AND its funding has cleared, so this is
// safe to call with the plain session client — no extra gating needed here.
export async function getMyParticipationDocuments(
  participationId: string,
): Promise<MyDocument[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("participation_documents")
    .select("id, type, file_name, size_bytes, created_at")
    .eq("participation_id", participationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as MyDocument[];
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

export type MyChangeRequest = {
  id: string;
  type: string;
  details: Record<string, string>;
  message: string | null;
  status: "open" | "completed" | "declined";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  entity_name: string | null;
};

// The signed-in lender's change requests, newest first.
export async function getMyChangeRequests(): Promise<MyChangeRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("change_requests")
    .select(
      "id, type, details, message, status, admin_note, created_at, resolved_at, entity:investor_entities ( display_name )",
    )
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as Array<
    Omit<MyChangeRequest, "entity_name"> & {
      entity: { display_name: string } | null;
    }
  >).map((r) => ({
    ...r,
    details: (r.details ?? {}) as Record<string, string>,
    entity_name: r.entity?.display_name ?? null,
  }));
}
