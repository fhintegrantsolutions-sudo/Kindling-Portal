import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyRegistrationByNoteId,
  type MyParticipation,
} from "@/lib/db/queries";
import { getCurrentProfile } from "@/lib/dal";
import {
  getCurrentEntityContext,
  getPrimaryEntityIdentity,
} from "@/lib/entities/context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NoteDetailCard } from "@/components/note-detail-card";
import { RegistrationForm } from "./registration-form";

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

  // Both pieces of registration state are needed because admin can flip a
  // pending registration into a participation; either implies "already
  // signed up on this note" and should hide the form.
  const [existingParticipation, existingRegistration, profile, entity, ctx] =
    await Promise.all([
      getMyParticipationByNoteId(note.id),
      getMyRegistrationByNoteId(note.id),
      getCurrentProfile(),
      getPrimaryEntityIdentity(),
      getCurrentEntityContext(),
    ]);

  // The lender chooses which of their entities is investing (hidden input when
  // they only own one).
  const entities = (ctx?.entities ?? []).map((e) => ({
    id: e.id,
    display_name: e.display_name,
  }));
  const currentEntityId = ctx?.currentEntityId ?? null;

  // Name/phone are login-level (profiles); entity type, agreement title and
  // mailing address come from the lender's primary investor entity.
  const firstName = (profile?.first_name as string | null) ?? "";
  const lastName = (profile?.last_name as string | null) ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || null;
  const phone = (profile?.phone as string | null) ?? null;
  const entityType = entity?.entity_type ?? null;
  const loanTitle = entity?.loan_agreement_title ?? fullName;
  const mailingAddress =
    [
      entity?.address_street,
      entity?.address_city,
      entity?.address_state,
      entity?.address_zip,
    ]
      .filter(Boolean)
      .join(", ") || null;

  const missing: string[] = [];
  if (!firstName) missing.push("first name");
  if (!lastName) missing.push("last name");
  if (!phone) missing.push("phone");
  if (!entityType) missing.push("entity type");

  const alreadySignedUp = Boolean(
    existingParticipation || existingRegistration,
  );

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

      <NoteDetailCard note={note} showPrincipal={false} />

      {alreadySignedUp ? (
        <ExistingParticipationPanel
          noteHumanId={note.note_id}
          existingParticipation={existingParticipation}
        />
      ) : missing.length > 0 ? (
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              Your profile is missing: {missing.join(", ")}. Complete it
              before registering.
            </span>
            <Link href="/profile">
              <Button size="sm">Complete profile</Button>
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <RegistrationForm
          noteUuid={note.id}
          noteHumanId={note.note_id}
          minInvestment={note.min_investment}
          entities={entities}
          currentEntityId={currentEntityId}
          profile={{
            full_name: fullName,
            email: profile?.email ?? null,
            phone,
            entity_type: entityType,
            name_for_agreement: loanTitle,
            mailing_address: mailingAddress,
          }}
        />
      )}
    </div>
  );
}

function ExistingParticipationPanel({
  noteHumanId,
  existingParticipation,
}: {
  noteHumanId: string;
  existingParticipation: MyParticipation | null;
}) {
  const isAwaitingFunding =
    !existingParticipation || !existingParticipation.funding_received;
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
