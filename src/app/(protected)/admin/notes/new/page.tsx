import Link from "next/link";
import {
  getBorrowersForPicker,
  getLendersForPicker,
} from "@/lib/db/admin-queries";
import { NoteForm } from "../note-form";

export default async function NewNotePage() {
  const [borrowers, lenders] = await Promise.all([
    getBorrowersForPicker(),
    getLendersForPicker(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/notes"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to notes
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New note</h1>
      </header>

      <NoteForm
        borrowers={borrowers}
        lenders={lenders}
        visibleUserIds={[]}
        defaults={{
          note_id: "",
          title: "",
          borrower_id: null,
          project_type: "",
          type: "note",
          interest_type: "Amortized",
          is_private: false,
          principal: "",
          rate: "",
          term_months: "",
          min_investment: null,
          target_raise: null,
          monthly_payment: null,
          contract_date: null,
          first_payment_date: null,
          maturity_date: null,
          funding_end_date: null,
          description: null,
          admin_notes: null,
          status: "Active",
          client_status: "Available",
        }}
      />
    </div>
  );
}
