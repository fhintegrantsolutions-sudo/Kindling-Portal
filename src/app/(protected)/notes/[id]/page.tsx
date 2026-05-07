import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyBonusPayoutsForParticipation,
  getMyScheduleForNote,
} from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NoteDetailCard } from "@/components/note-detail-card";
import { getCurrentProfile } from "@/lib/dal";
import { DownloadScheduleButton } from "./download-schedule-button";

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

  const [bonuses, schedule, profile] = await Promise.all([
    getMyBonusPayoutsForParticipation(participation.id),
    getMyScheduleForNote(note.id, participation.id),
    getCurrentProfile(),
  ]);
  const lenderName =
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
          <Field
            label="Invested"
            value={formatCurrency(participation.invested_amount)}
          />
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
            value={participation.funding_type ?? "—"}
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
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!schedule.ok ? (
            <p className="text-sm text-muted-foreground">{schedule.reason}</p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
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
                          {r.received_date ?? r.due_date}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatCurrency(r.my_principal)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatCurrency(r.my_interest)}
                        </td>
                        <td className="py-2 pr-2 text-right text-muted-foreground">
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
                      <p className="font-medium">{b.paid_date}</p>
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

      <NoteDetailCard note={note} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
