import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getNoteByNoteId,
  getMyParticipationByNoteId,
  getMyRegistrationByNoteId,
} from "@/lib/db/queries";
import { getCurrentProfile } from "@/lib/dal";
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
  const fullName = `${firstName} ${lastName}`.trim();

  const mailingAddress = [
    profile?.address_street ?? "",
  ].filter(Boolean).join(", ");

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
        <p className="text-sm text-muted-foreground">
          Submit your registration to invest. An admin will review and approve.
        </p>
      </header>

      <RegistrationForm
        noteUuid={note.id}
        noteHumanId={note.note_id}
        minInvestment={note.min_investment}
        defaults={{
          first_name: firstName || null,
          last_name: lastName || null,
          phone: profile?.phone ?? null,
          email: profile?.email ?? null,
          entity_type: profile?.entity_type ?? null,
          name_for_agreement: profile?.loan_agreement_title ?? fullName ?? null,
          mailing_address: mailingAddress || null,
          city: profile?.address_city ?? null,
          state: profile?.address_state ?? null,
          zip_code: profile?.address_zip ?? null,
        }}
      />
    </div>
  );
}
