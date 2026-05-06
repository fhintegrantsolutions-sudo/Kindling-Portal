import Link from "next/link";
import { getParticipations } from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FilterValue = "all" | "pending" | "received" | "deposited" | "cleared";

export default async function AdminParticipationsPage({
  searchParams,
}: {
  searchParams: Promise<{ funding?: FilterValue }>;
}) {
  const sp = await searchParams;
  const filter = sp.funding ?? "all";
  const participations = await getParticipations(
    filter === "all" ? undefined : { fundingState: filter },
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Participations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Funding workflow
        </h1>
      </header>

      <nav className="flex gap-1 border-b">
        <FilterTab label="All" value="all" current={filter} />
        <FilterTab label="Awaiting funding" value="pending" current={filter} />
        <FilterTab label="Received" value="received" current={filter} />
        <FilterTab label="Deposited" value="deposited" current={filter} />
        <FilterTab label="Cleared" value="cleared" current={filter} />
      </nav>

      {participations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No participations match this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {participations.map((p) => (
            <Link
              key={p.id}
              href={`/admin/participations/${p.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p.note?.note_id} ·{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                      <CardTitle>{p.note?.title}</CardTitle>
                    </div>
                    <FundingBadge p={p} />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field
                    label="Invested"
                    value={formatCurrency(p.invested_amount)}
                  />
                  <Field
                    label="Funding type"
                    value={p.funding_type ?? "—"}
                  />
                  <Field label="Status" value={p.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FundingBadge({
  p,
}: {
  p: {
    funding_received: boolean;
    funding_deposited: boolean;
    funding_cleared: boolean;
  };
}) {
  const label = p.funding_cleared
    ? "Cleared"
    : p.funding_deposited
      ? "Deposited"
      : p.funding_received
        ? "Received"
        : "Awaiting funding";
  return <span className="rounded-full border px-2 py-0.5 text-xs">{label}</span>;
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
      href={`/admin/participations?funding=${value}`}
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
