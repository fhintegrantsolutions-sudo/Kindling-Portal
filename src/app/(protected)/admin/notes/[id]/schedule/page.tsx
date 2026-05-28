import { notFound } from "next/navigation";
import {
  getAdminBorrowerById,
  getAdminNoteById,
  getNotePayments,
} from "@/lib/db/admin-queries";
import { generateSchedule } from "@/lib/notes/schedule";
import { ScheduleSection, type ReceivedPayment } from "../schedule-section";
import { DownloadNoteScheduleButton } from "../download-note-schedule-button";

export default async function NoteSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, payments] = await Promise.all([
    getAdminNoteById(id),
    getNotePayments(id),
  ]);
  if (!note) notFound();

  let scheduleRows: import("@/lib/notes/schedule").ScheduleRow[] | null = null;
  let scheduleError: string | null = null;
  if (
    note.principal !== null &&
    note.first_payment_date !== null &&
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
    if (result.ok) scheduleRows = result.rows;
    else scheduleError = result.reason;
  }

  const received: ReceivedPayment[] = payments
    .filter((p) => p.payment_number !== null)
    .map((p) => ({
      payment_id: p.id,
      payment_number: p.payment_number as number,
      recorded_date: p.payment_date,
      principal_amount: p.principal_amount,
      interest_amount: p.interest_amount,
      payment_method: p.payment_method,
      check_number: p.check_number,
      wire_reference: p.wire_reference,
      notes: p.notes,
    }));

  // Borrower business name for the PDF header. Use "—" if the note has no
  // borrower attached (draft notes).
  const borrower = note.borrower_id
    ? await getAdminBorrowerById(note.borrower_id)
    : null;
  const borrowerName =
    (borrower?.business_name as string | undefined)?.trim() || "—";

  const downloadButton =
    scheduleRows && scheduleRows.length > 0 && note.principal !== null ? (
      <DownloadNoteScheduleButton
        rows={scheduleRows}
        receivedNumbers={
          new Set(received.map((r) => r.payment_number))
        }
        noteId={note.note_id}
        noteTitle={note.title}
        borrowerName={borrowerName}
        principal={Number(note.principal)}
        annualRatePct={Number(note.rate ?? 0)}
        termMonths={Number(note.term_months ?? 0)}
        interestType={String(note.interest_type ?? "")}
        startDate={note.first_payment_date ?? null}
      />
    ) : null;

  return (
    <ScheduleSection
      noteUuid={note.id}
      schedule={scheduleRows}
      scheduleError={scheduleError}
      received={received}
      headerAction={downloadButton}
    />
  );
}
