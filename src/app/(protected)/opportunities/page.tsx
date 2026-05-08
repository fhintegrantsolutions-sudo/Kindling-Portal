import Link from "next/link";
import { getNextUpcomingNote, getOpportunities } from "@/lib/db/queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "./countdown";

export default async function OpportunitiesPage() {
  const [notes, upcoming] = await Promise.all([
    getOpportunities(),
    getNextUpcomingNote(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Available notes open for participation.
        </p>
      </header>

      {upcoming ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Next note opens
              </p>
              <p className="text-base font-medium">
                {upcoming.note_id} · {upcoming.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {upcoming.funding_start_date}
              </p>
            </div>
            <p className="text-sm">
              <Countdown
                target={upcoming.funding_start_date}
                mode="open"
                prefix="Opens in"
                expiredText="opening today"
              />
            </p>
          </CardContent>
        </Card>
      ) : null}

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No opportunities are open right now. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((n) => {
            const borrower = n.borrower;
            return (
              <Link
                key={n.id}
                href={`/opportunities/${n.note_id}`}
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
                      {borrower?.business_name ? (
                        <p className="text-sm text-muted-foreground">
                          {borrower.business_name}
                        </p>
                      ) : null}
                    </div>
                    {n.funding_end_date ? (
                      <div className="text-right text-xs">
                        <p className="uppercase tracking-wider text-muted-foreground">
                          Closes
                        </p>
                        <p>
                          <Countdown
                            target={n.funding_end_date}
                            mode="close"
                            prefix="in"
                            expiredText="closing soon"
                          />
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label="Rate" value={formatPercent(n.rate)} />
                    <Field label="Term" value={`${n.term_months} mo`} />
                    <Field
                      label="Min investment"
                      value={
                        n.min_investment
                          ? formatCurrency(n.min_investment)
                          : "—"
                      }
                    />
                  </div>
                  {n.description ? (
                    <p className="text-sm text-muted-foreground">
                      {n.description}
                    </p>
                  ) : null}
                </CardContent>
                </Card>
              </Link>
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
