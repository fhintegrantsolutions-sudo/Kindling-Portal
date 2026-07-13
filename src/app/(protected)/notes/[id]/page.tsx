import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyBonusPayoutsForParticipation,
  getMyScheduleForNote,
} from "@/lib/db/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NoteDetailCard } from "@/components/note-detail-card";
import { getCurrentProfile } from "@/lib/dal";
import { getPrimaryEntityIdentity } from "@/lib/entities/context";
import { DownloadScheduleButton } from "./download-schedule-button";
import { EditInvestedAmount } from "./edit-invested-amount";

export default async function MyNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNoteByNoteId(id);
  if (!note) notFound();

  const participation = await getMyParticipationByNoteId(note.id);
  if (!participation) {
    redirect(`/opportunities/${note.note_id}`);
  }

  const [bonuses, schedule, profile, entity] = await Promise.all([
    getMyBonusPayoutsForParticipation(participation.id),
    getMyScheduleForNote(note.id, participation.id),
    getCurrentProfile(),
    getPrimaryEntityIdentity(),
  ]);
  // Prefer the formal loan-agreement title (e.g. "Specialized Trust Company
  // Custodian FBO Felipe Vazquez ROTH IRA") since that's what appears on the
  // executed loan docs — it lives on the lender's investor entity. Fall back to
  // first + last, then email, then a generic placeholder.
  const lenderName =
    (entity?.loan_agreement_title ?? "").trim() ||
    [
      (profile?.first_name as string | null) ?? "",
      (profile?.last_name as string | null) ?? "",
    ]
      .filter(Boolean)
      .join(" ") ||
    profile?.email ||
    "Lender";
  const totalBonuses = bonuses.reduce((s, b) => s + Number(b.amount), 0);

  const scheduleRows = schedule.ok ? schedule.rows : [];
  const receivedRows = scheduleRows.filter((r) => r.received_date !== null);
  const totalPrincipal = receivedRows.reduce(
    (s, r) => s + r.my_principal,
    0,
  );
  const totalInterest = receivedRows.reduce((s, r) => s + r.my_interest, 0);
  const totalReceived = totalPrincipal + totalInterest;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/notes"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to my notes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Your participation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Invested</p>
            <EditInvestedAmount
              participationId={participation.id}
              invested={participation.invested_amount}
              minInvestment={note.min_investment}
              fundingReceived={Boolean(participation.funding_received)}
            />
          </div>
          <Field label="Status" value={participation.status} />
          <Field
            label="Funding"
            value={
              participation.funding_cleared
                ? "Cleared"
                : participation.funding_deposited
                  ? "Deposited"
                  : participation.funding_received
                    ? "Received"
                    : "Pending"
            }
          />
          <Field
            label="Funding type"
            value={titleCaseFundingType(participation.funding_type)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Payment schedule</CardTitle>
            {schedule.ok && scheduleRows.length > 0 ? (
              <DownloadScheduleButton
                rows={scheduleRows}
                noteId={note.note_id}
                noteTitle={note.title}
                lenderName={lenderName}
                invested={participation.invested_amount}
                annualRatePct={Number(note.rate ?? 0)}
                termMonths={Number(note.term_months ?? 0)}
                interestType={String(note.interest_type ?? "")}
                startDate={note.first_payment_date ?? null}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!schedule.ok ? (
            <p className="text-sm text-muted-foreground">{schedule.reason}</p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Field
                  label="Received to date"
                  value={formatCurrency(totalReceived)}
                />
                <Field
                  label="Principal"
                  value={formatCurrency(totalPrincipal)}
                />
                <Field
                  label="Interest"
                  value={formatCurrency(totalInterest)}
                />
                <Field
                  label="Payments left"
                  value={`${scheduleRows.length - receivedRows.length} of ${scheduleRows.length}`}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="py-2 pr-2 font-medium">Date</th>
                      <th className="py-2 pr-2 font-medium text-right">
                        Principal
                      </th>
                      <th className="py-2 pr-2 font-medium text-right">
                        Interest
                      </th>
                      <th className="py-2 pr-2 font-medium text-right">
                        Balance
                      </th>
                      <th className="py-2 pr-2 font-medium text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((r) => (
                      <tr
                        key={r.payment_number}
                        className={`border-b last:border-b-0 ${
                          r.received_date ? "bg-muted/40" : ""
                        }`}
                      >
                        <td className="py-2 pr-2 text-muted-foreground">
                          {r.payment_number}
                        </td>
                        <td className="py-2 pr-2">
                          {formatDate(r.received_date ?? r.due_date)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {formatCurrency(r.my_principal)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {formatCurrency(r.my_interest)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(r.my_balance)}
                        </td>
                        <td className="py-2 pr-2 text-right text-xs">
                          {r.received_date ? (
                            <span className="text-green-700">Received</span>
                          ) : (
                            <span className="text-muted-foreground">
                              Scheduled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {note.has_profit_bonus ? (
      <Card>
        <CardHeader>
          <CardTitle>Profit bonuses</CardTitle>
        </CardHeader>
        <CardContent>
          {bonuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bonuses paid on this note yet.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm">
                <span className="text-muted-foreground">Total received: </span>
                <span className="font-medium">{formatCurrency(totalBonuses)}</span>
              </p>
              <ul className="flex flex-col gap-2">
                {bonuses.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{formatDate(b.paid_date)}</p>
                      {b.notes ? (
                        <p className="text-xs text-muted-foreground">
                          {b.notes}
                        </p>
                      ) : null}
                    </div>
                    <span className="font-medium">
                      {formatCurrency(b.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
      ) : null}

      <NoteDetailCard note={note} />
    </div>
  );
}

function titleCaseFundingType(value: string | null): string {
  if (!value) return "—";
  if (value.toLowerCase() === "ach") return "ACH";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
