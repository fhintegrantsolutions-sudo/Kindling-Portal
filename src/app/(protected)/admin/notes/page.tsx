import Link from "next/link";
import { getAdminNotes } from "@/lib/db/admin-queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminNotesPage() {
  const notes = await getAdminNotes();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Admin · Notes
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Loan offerings. Lenders see notes where status is Active and
            client status is Available.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/notes/ledger">
            <Button variant="outline">Payment ledger</Button>
          </Link>
          <Link href="/admin/notes/bonus-ledger">
            <Button variant="outline">Bonus ledger</Button>
          </Link>
          <Link href="/admin/notes/new">
            <Button>New note</Button>
          </Link>
        </div>
      </header>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No notes yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/admin/notes/${n.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {n.note_id} · {n.project_type}
                      </p>
                      <CardTitle>{n.title}</CardTitle>
                      {n.borrower ? (
                        <p className="text-sm text-muted-foreground">
                          {n.borrower.business_name}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <span className="rounded-full border px-2 py-0.5">
                        {n.status}
                      </span>
                      <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                        {n.client_status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                  <Field
                    label="Principal"
                    value={formatCurrency(n.principal)}
                  />
                  <Field label="Rate" value={formatPercent(n.rate)} />
                  <Field label="Term" value={`${n.term_months} mo`} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
