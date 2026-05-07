import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminNoteById,
  getBorrowersForPicker,
  getFundedParticipantsForNote,
  getLendersForPicker,
  getNoteBonuses,
  getNoteVisibility,
} from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NoteForm } from "../note-form";
import { BonusesSection } from "./bonuses-section";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, borrowers, lenders, visibleUserIds, bonuses, participants] =
    await Promise.all([
      getAdminNoteById(id),
      getBorrowersForPicker(),
      getLendersForPicker(),
      getNoteVisibility(id),
      getNoteBonuses(id),
      getFundedParticipantsForNote(id),
    ]);
  if (!note) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/notes"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to notes
      </Link>
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {note.note_id}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{note.title}</h1>
      </header>

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
          maturity_date: note.maturity_date,
          funding_end_date: note.funding_end_date,
          description: note.description,
          admin_notes: note.admin_notes,
          status: note.status,
          client_status: note.client_status,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Funded participants</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lenders eligible for bonus pro-rata distribution.
          </p>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No funded participants yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {participants.map((p) => (
                <li
                  key={p.participation_id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.lender_name ?? p.lender_email ?? "—"}
                    </p>
                    {p.lender_name && p.lender_email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.lender_email}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(p.invested_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.share_pct.toFixed(2)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BonusesSection noteUuid={note.id} bonuses={bonuses} />
    </div>
  );
}
