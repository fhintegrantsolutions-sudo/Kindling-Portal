import Link from "next/link";
import { getAdminBorrowers } from "@/lib/db/admin-queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminBorrowersPage() {
  const borrowers = await getAdminBorrowers();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Admin · Borrowers
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Borrowers</h1>
          <p className="text-sm text-muted-foreground">
            Businesses receiving loans. Linked to notes via borrower_id.
          </p>
        </div>
        <Link href="/admin/borrowers/new">
          <Button>New borrower</Button>
        </Link>
      </header>

      {borrowers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No borrowers yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {borrowers.map((b) => (
            <Link
              key={b.id}
              href={`/admin/borrowers/${b.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{b.business_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {b.contact_name} · {b.email}
                      </p>
                    </div>
                    {b.business_type ? (
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {b.business_type}
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
                  <Field label="Phone" value={b.phone} />
                  <Field
                    label="Location"
                    value={
                      [b.city, b.state].filter(Boolean).join(", ") || "—"
                    }
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
