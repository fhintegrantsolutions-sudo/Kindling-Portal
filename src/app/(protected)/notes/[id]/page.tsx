import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyBonusPayoutsForParticipation,
} from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NoteDetailCard } from "@/components/note-detail-card";

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

  const bonuses = await getMyBonusPayoutsForParticipation(participation.id);
  const totalBonuses = bonuses.reduce((s, b) => s + Number(b.amount), 0);

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
