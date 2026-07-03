import { notFound } from "next/navigation";
import {
  getAdminNoteById,
  getBorrowersForPicker,
  getLendersForPicker,
  getNoteFundingArchiveSummary,
  getNoteVisibility,
} from "@/lib/db/admin-queries";
import { NoteForm } from "../../note-form";
import { ArchiveFundingButton } from "./archive-funding-button";

export default async function NoteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, borrowers, lenders, visibleUserIds, archiveSummary] =
    await Promise.all([
      getAdminNoteById(id),
      getBorrowersForPicker(),
      getLendersForPicker(),
      getNoteVisibility(id),
      getNoteFundingArchiveSummary(id),
    ]);
  if (!note) notFound();

  // Warnings only matter before archiving; an already-archived note shows the
  // archived panel and ignores them.
  const warnings: string[] = [];
  if (!note.funding_archived_at) {
    if (note.status !== "Active") {
      warnings.push(`Note status is "${note.status}", not Active.`);
    }
    if (archiveSummary.uncleared > 0) {
      warnings.push(
        `${archiveSummary.uncleared} of ${archiveSummary.total} participation(s) have not cleared funding yet.`,
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ArchiveFundingButton
        noteId={note.id}
        archivedAt={note.funding_archived_at}
        warnings={warnings}
      />
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
          has_profit_bonus: note.has_profit_bonus,
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
    </div>
  );
}
