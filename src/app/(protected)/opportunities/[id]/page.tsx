import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyRegistrationByNoteId,
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

  const [existingParticipation, existingRegistration] = await Promise.all([
    getMyParticipationByNoteId(note.id),
    getMyRegistrationByNoteId(note.id),
  ]);

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
            Registration submitted. An administrator will review and follow up
            shortly.
          </AlertDescription>
        </Alert>
      ) : null}

      <NoteDetailCard note={note} />

      <ActionPanel
        noteHumanId={note.note_id}
        existingParticipation={existingParticipation}
        existingRegistration={existingRegistration}
        minInvestment={note.min_investment}
      />
    </div>
  );
}

function ActionPanel({
  noteHumanId,
  existingParticipation,
  existingRegistration,
  minInvestment,
}: {
  noteHumanId: string;
  existingParticipation: { id: string } | null;
  existingRegistration: { id: string; status: string } | null;
  minInvestment: string | null;
}) {
  if (existingParticipation) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          You&apos;re already a participant in this note.
        </p>
        <Link href={`/notes/${noteHumanId}`}>
          <Button variant="outline">View your participation →</Button>
        </Link>
      </div>
    );
  }

  if (existingRegistration) {
    const label =
      existingRegistration.status === "pending"
        ? "Pending admin review"
        : existingRegistration.status === "approved"
          ? "Approved — awaiting funding"
          : "Rejected";
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          You&apos;ve registered for this note.
        </p>
        <p className="text-sm">
          Status: <span className="font-medium">{label}</span>
        </p>
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
