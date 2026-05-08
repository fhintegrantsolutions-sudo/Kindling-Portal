import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyRegistrationByNoteId,
} from "@/lib/db/queries";
import { getCurrentProfile } from "@/lib/dal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RegistrationForm } from "./registration-form";

export default async function RegisterForNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNoteByNoteId(id);
  if (!note) notFound();

  // If already registered or already participating, send back to the
  // detail page where they'll see their existing status.
  const [existingRegistration, existingParticipation] = await Promise.all([
    getMyRegistrationByNoteId(note.id),
    getMyParticipationByNoteId(note.id),
  ]);
  if (existingRegistration || existingParticipation) {
    redirect(`/opportunities/${note.note_id}`);
  }

  const profile = await getCurrentProfile();
  const firstName = (profile?.first_name as string | null) ?? "";
  const lastName = (profile?.last_name as string | null) ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || null;
  const phone = (profile?.phone as string | null) ?? null;
  const entityType = (profile?.entity_type as string | null) ?? null;
  const loanTitle =
    (profile?.loan_agreement_title as string | null) ?? fullName;
  const mailingAddress =
    [
      profile?.address_street,
      profile?.address_city,
      profile?.address_state,
      profile?.address_zip,
    ]
      .filter(Boolean)
      .join(", ") || null;

  const missing: string[] = [];
  if (!firstName) missing.push("first name");
  if (!lastName) missing.push("last name");
  if (!phone) missing.push("phone");
  if (!entityType) missing.push("entity type");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href={`/opportunities/${note.note_id}`}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to {note.note_id}
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Register · {note.note_id}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{note.title}</h1>
      </header>

      {missing.length > 0 ? (
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              Your profile is missing: {missing.join(", ")}. Complete it before
              registering.
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
