import Link from "next/link";
import { getRegistrations } from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: "pending" | "approved" | "rejected";
    approved?: string;
    rejected?: string;
  }>;
}) {
  const sp = await searchParams;
  const filter = sp.status ?? "pending";
  const registrations = await getRegistrations({ status: filter });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Registrations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Registration queue
        </h1>
      </header>

      {sp.approved === "1" ? (
        <Alert>
          <AlertDescription>
            Registration approved. Participation created.
          </AlertDescription>
        </Alert>
      ) : null}
      {sp.rejected === "1" ? (
        <Alert>
          <AlertDescription>Registration rejected.</AlertDescription>
        </Alert>
      ) : null}

      <nav className="flex gap-1 border-b">
        <FilterTab label="Pending" status="pending" current={filter} />
        <FilterTab label="Approved" status="approved" current={filter} />
        <FilterTab label="Rejected" status="rejected" current={filter} />
      </nav>

      {registrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No {filter} registrations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {registrations.map((r) => (
            <Link
              key={r.id}
              href={`/admin/registrations/${r.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {r.note?.note_id} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      <CardTitle>
                        {r.first_name} {r.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {r.email}
                      </p>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {r.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="Note" value={r.note?.title ?? "—"} />
                  <Field
                    label="Investment"
                    value={formatCurrency(r.investment_amount)}
                  />
                </CardContent>
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
  status,
  current,
}: {
  label: string;
  status: "pending" | "approved" | "rejected";
  current: string;
}) {
  const active = current === status;
  return (
    <Link
      href={`/admin/registrations?status=${status}`}
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
