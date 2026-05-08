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
import { Input } from "@/components/ui/input";

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const sort: "asc" | "desc" = sp.sort === "asc" ? "asc" : "desc";
  const q = (sp.q ?? "").trim();
  const notes = await getAdminNotes({ sort, q: q || undefined });

  const flippedSort = sort === "asc" ? "desc" : "asc";
  const sortHref = (() => {
    const params = new URLSearchParams();
    params.set("sort", flippedSort);
    if (q) params.set("q", q);
    return `/admin/notes?${params.toString()}`;
  })();

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

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-1 min-w-64 items-center gap-2" action="/admin/notes">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by note ID or title…"
          />
          {/* preserve sort across search submissions */}
          <input type="hidden" name="sort" value={sort} />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {q ? (
            <Link
              href={`/admin/notes${sort === "asc" ? "?sort=asc" : ""}`}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Clear
            </Link>
          ) : null}
        </form>
        <Link
          href={sortHref}
          className="rounded-md border px-3 py-1 text-sm hover:bg-muted/40"
          title={`Sort by note ID ${flippedSort === "asc" ? "ascending" : "descending"}`}
        >
          Note ID {sort === "asc" ? "↑" : "↓"}
        </Link>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {q
                ? `No notes match "${q}".`
                : "No notes yet. Create one to get started."}
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
