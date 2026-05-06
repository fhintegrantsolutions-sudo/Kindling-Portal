import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  type MyParticipation,
} from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NoteDetailCard } from "@/components/note-detail-card";

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registered?: string }>;
}) {
  const { id } = await params;
  const { registered } = await searchParams;

  const note = await getNoteByNoteId(id);
  if (!note) notFound();

  const existingParticipation = await getMyParticipationByNoteId(note.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/opportunities"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to opportunities
      </Link>

      {registered === "1" ? (
        <Alert>
          <AlertDescription>
            Registration submitted. Send your funds per the wire / check / ACH
            instructions provided. Your participation appears in your
            portfolio in awaiting-funding state and will flip to active once
            funds clear.
          </AlertDescription>
        </Alert>
      ) : null}

      <NoteDetailCard note={note} />

      <ActionPanel
        noteHumanId={note.note_id}
        existingParticipation={existingParticipation}
        minInvestment={note.min_investment}
      />
    </div>
  );
}

function ActionPanel({
  noteHumanId,
  existingParticipation,
  minInvestment,
}: {
  noteHumanId: string;
  existingParticipation: MyParticipation | null;
  minInvestment: string | null;
}) {
  if (existingParticipation) {
    const isAwaitingFunding = !existingParticipation.funding_received;
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          {isAwaitingFunding
            ? "You've registered for this note — awaiting funds."
            : "You're already a participant in this note."}
        </p>
        <Link href={`/notes/${noteHumanId}`}>
          <Button variant="outline">View your participation →</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-6">
      <div>
        <p className="text-sm font-medium">Ready to invest?</p>
        {minInvestment ? (
          <p className="text-xs text-muted-foreground">
            Minimum investment {formatCurrency(minInvestment)}.
          </p>
        ) : null}
      </div>
      <Link href={`/opportunities/${noteHumanId}/register`}>
        <Button>Register to invest</Button>
      </Link>
    </div>
  );
}
