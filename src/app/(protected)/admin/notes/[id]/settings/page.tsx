import { notFound } from "next/navigation";
import {
  getAdminNoteById,
  getBorrowersForPicker,
  getLendersForPicker,
  getNoteVisibility,
} from "@/lib/db/admin-queries";
import { NoteForm } from "../../note-form";

export default async function NoteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, borrowers, lenders, visibleUserIds] = await Promise.all([
    getAdminNoteById(id),
    getBorrowersForPicker(),
    getLendersForPicker(),
    getNoteVisibility(id),
  ]);
  if (!note) notFound();

  return (
    <NoteForm
      noteId={note.id}
      borrowers={borrowers}
      lenders={lenders}
      visibleUserIds={visibleUserIds}
      defaults={{
        note_id: note.note_id,
        title: note.title,
        borrower_id: note.borrower_id,
        project_type: note.project_type,
        type: note.type,
        interest_type: note.interest_type,
        is_private: note.is_private,
        principal: note.principal,
        rate: note.rate,
        term_months: String(note.term_months),
        min_investment: note.min_investment,
        target_raise: note.target_raise,
        monthly_payment: note.monthly_payment,
        contract_date: note.contract_date,
        first_payment_date: note.first_payment_date,
        maturity_date: note.maturity_date,
        funding_start_date: note.funding_start_date,
        funding_end_date: note.funding_end_date,
        description: note.description,
        admin_notes: note.admin_notes,
        status: note.status,
        client_status: note.client_status,
      }}
    />
  );
}
