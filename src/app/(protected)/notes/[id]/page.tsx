import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
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
