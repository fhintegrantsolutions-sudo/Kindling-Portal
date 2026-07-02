import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminNoteById,
  getFundedParticipantsForNote,
  getNoteBonuses,
  getNotePayments,
} from "@/lib/db/admin-queries";
import { computeMonthlyPayment, generateSchedule } from "@/lib/notes/schedule";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NoteOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, participants, payments, bonuses] = await Promise.all([
    getAdminNoteById(id),
    getFundedParticipantsForNote(id),
    getNotePayments(id),
    getNoteBonuses(id),
  ]);
  if (!note) notFound();

  const monthly = computeMonthlyPayment({
    principal: note.principal !== null ? Number(note.principal) : null,
    annualRatePct: note.rate !== null ? Number(note.rate) : null,
    termMonths: note.term_months ?? null,
    interestType: note.interest_type,
  });

  const totalInvested = participants.reduce(
    (s, p) => s + Number(p.invested_amount),
    0,
  );

  const principalReceived = payments.reduce(
    (s, p) => s + Number(p.principal_amount),
    0,
  );
  const interestReceived = payments.reduce(
    (s, p) => s + Number(p.interest_amount),
    0,
  );
  const bonusGross = bonuses.reduce((s, b) => s + Number(b.gross_amount), 0);

  // Find the next scheduled payment that hasn't been recorded yet.
  const recordedNumbers = new Set(
    payments
      .filter((p) => p.payment_number !== null)
      .map((p) => p.payment_number as number),
  );
  let nextDue: { number: number; date: string } | null = null;
  if (
    note.principal !== null &&
    note.first_payment_date &&
    note.term_months &&
    note.rate !== null
  ) {
    const result = generateSchedule({
      principal: Number(note.principal),
      annualRatePct: Number(note.rate),
      termMonths: Number(note.term_months),
      interestType: note.interest_type,
      firstPaymentDate: note.first_payment_date,
    });
    if (result.ok) {
      const next = result.rows.find((r) => !recordedNumbers.has(r.payment_number));
      if (next)
        nextDue = { number: next.payment_number, date: next.due_date };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>At a glance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Principal"
            value={
              note.principal !== null ? formatCurrency(note.principal) : "—"
            }
          />
          <Stat label="Rate" value={`${note.rate}%`} />
          <Stat label="Term" value={`${note.term_months} months`} />
          <Stat label="Interest" value={note.interest_type} />
          <Stat
            label="Monthly payment"
            value={monthly !== null ? formatCurrency(monthly) : "—"}
          />
          <Stat
            label="Status"
            value={`${note.status} · ${note.client_status}`}
          />
          <Stat
            label="Funded"
            value={`${formatCurrency(totalInvested)} · ${participants.length} lender${participants.length === 1 ? "" : "s"}`}
          />
          <Stat
            label="Next payment"
            value={nextDue ? `#${nextDue.number} · ${formatDate(nextDue.date)}` : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Received to date</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Principal" value={formatCurrency(principalReceived)} />
          <Stat label="Interest" value={formatCurrency(interestReceived)} />
          <Stat
            label="Total payments"
            value={formatCurrency(principalReceived + interestReceived)}
          />
          <Stat label="Bonus gross" value={formatCurrency(bonusGross)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funded participants</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lenders eligible for pro-rata distribution.
          </p>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No funded participants yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {participants.map((p) => {
                const inner = (
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {p.lender_name ?? p.lender_email ?? "—"}
                      </p>
                      {p.business_name ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {p.business_name}
                        </p>
                      ) : null}
                      {p.lender_name && p.lender_email ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {p.lender_email}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">
                        {formatCurrency(p.invested_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {p.share_pct.toFixed(2)}%
                        {p.monthly_payment !== null
                          ? ` · ${formatCurrency(p.monthly_payment)}/mo`
                          : ""}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={p.participation_id}>
                    {p.user_id ? (
                      <Link
                        href={`/admin/users/${p.user_id}`}
                        className="block rounded-md hover:bg-muted/40"
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
