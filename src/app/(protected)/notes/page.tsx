import { getMyParticipations } from "@/lib/db/queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MyNotesPage() {
  const participations = await getMyParticipations();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My Notes</h1>
        <p className="text-sm text-muted-foreground">
          Your active and historical participations.
        </p>
      </header>

      {participations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No participations yet.
            </p>
            <a
              href="/opportunities"
              className="text-sm font-medium underline underline-offset-4"
            >
              Browse opportunities →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {participations.map((p) => {
            const note = p.note;
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {note?.note_id}
                      </p>
                      <CardTitle>{note?.title}</CardTitle>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {p.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field
                    label="Invested"
                    value={formatCurrency(p.invested_amount)}
                  />
                  <Field
                    label="Rate"
                    value={note ? formatPercent(note.rate) : "—"}
                  />
                  <Field
                    label="Term"
                    value={note ? `${note.term_months} mo` : "—"}
                  />
                  <Field
                    label="Funding"
                    value={
                      p.funding_cleared
                        ? "Cleared"
                        : p.funding_deposited
                          ? "Deposited"
                          : p.funding_received
                            ? "Received"
                            : "Pending"
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
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
