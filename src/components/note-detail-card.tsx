import type { NoteDetail } from "@/lib/db/queries";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NoteDetailCard({
  note,
  // The note's total principal is the whole deal size — admin-only. Default to
  // hidden so it's opt-in; a lender-facing caller never has to remember to
  // suppress it.
  showPrincipal = false,
}: {
  note: NoteDetail;
  showPrincipal?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {note.note_id} · {note.project_type}
        </p>
        <CardTitle>{note.title}</CardTitle>
        {note.borrower?.business_name ? (
          <p className="text-sm text-muted-foreground">
            {note.borrower.business_name}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {showPrincipal && note.principal ? (
            <Field label="Principal" value={formatCurrency(note.principal)} />
          ) : null}
          <Field label="Rate" value={formatPercent(note.rate)} />
          <Field label="Term" value={`${note.term_months} mo`} />
          <Field
            label="Min investment"
            value={
              note.min_investment ? formatCurrency(note.min_investment) : "—"
            }
          />
          <Field label="Type" value={note.type} />
          <Field label="Interest type" value={note.interest_type} />
          <Field
            label="Maturity"
            value={formatDate(note.maturity_date)}
          />
          <Field
            label="Funding closes"
            value={formatDate(note.funding_end_date)}
          />
        </div>
        {note.description ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Description</p>
            <p className="text-sm">{note.description}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
