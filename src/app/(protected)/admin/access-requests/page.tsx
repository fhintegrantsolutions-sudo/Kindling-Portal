import Link from "next/link";
import { getAccessRequests } from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FilterValue = "pending" | "approved" | "converted" | "rejected";

export default async function AdminAccessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: FilterValue }>;
}) {
  const sp = await searchParams;
  const filter = sp.status ?? "pending";
  const items = await getAccessRequests({ status: filter });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Access requests
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Access requests
        </h1>
        <p className="text-sm text-muted-foreground">
          Prospective lenders. Approve → email setup link → lead submits →
          participation appears for funding tracking.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        <FilterTab label="Pending" value="pending" current={filter} />
        <FilterTab
          label="Awaiting lead submission"
          value="approved"
          current={filter}
        />
        <FilterTab label="Converted" value="converted" current={filter} />
        <FilterTab label="Rejected" value="rejected" current={filter} />
      </nav>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No {filter} access requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/admin/access-requests/${r.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>
                        {r.first_name} {r.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {r.email} · {r.phone}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {r.status}
                    </span>
                  </div>
                </CardHeader>
                {r.note || r.investment_amount ? (
                  <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
                    <Field
                      label="Note"
                      value={
                        r.note ? `${r.note.note_id} · ${r.note.title}` : "—"
                      }
                    />
                    <Field
                      label="Amount"
                      value={
                        r.investment_amount
                          ? formatCurrency(r.investment_amount)
                          : "—"
                      }
                    />
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  value,
  current,
}: {
  label: string;
  value: FilterValue;
  current: string;
}) {
  const active = current === value;
  return (
    <Link
      href={`/admin/access-requests?status=${value}`}
      className={`border-b-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
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
