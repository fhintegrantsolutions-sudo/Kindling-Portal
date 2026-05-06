import Link from "next/link";
import { getUsers } from "@/lib/db/admin-queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FilterValue = "all" | "admin" | "lender";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: FilterValue }>;
}) {
  const sp = await searchParams;
  const filter = sp.role ?? "all";
  const users = await getUsers(
    filter === "all" ? undefined : { role: filter },
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Users
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">All users</h1>
      </header>

      <nav className="flex gap-1 border-b">
        <FilterTab label="All" value="all" current={filter} />
        <FilterTab label="Admins" value="admin" current={filter} />
        <FilterTab label="Lenders" value="lender" current={filter} />
      </nav>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No users match this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{u.name ?? "—"}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {u.role}
                    </span>
                  </div>
                </CardHeader>
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
      href={`/admin/users?role=${value}`}
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
