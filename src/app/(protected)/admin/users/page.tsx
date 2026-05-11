import Link from "next/link";
import { getUsers } from "@/lib/db/admin-queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FilterValue = "all" | "admin" | "lender";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: FilterValue; q?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.role ?? "all";
  const query = (sp.q ?? "").trim();
  const users = await getUsers({
    role: filter === "all" ? undefined : filter,
    q: query || undefined,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Users
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">All users</h1>
      </header>

      <nav className="flex gap-1 border-b">
        <FilterTab label="All" value="all" current={filter} query={query} />
        <FilterTab label="Admins" value="admin" current={filter} query={query} />
        <FilterTab label="Lenders" value="lender" current={filter} query={query} />
      </nav>

      <form
        className="flex flex-1 items-center gap-2"
        action="/admin/users"
      >
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by first name, last name, or email…"
        />
        {/* preserve role across search submissions */}
        <input type="hidden" name="role" value={filter} />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {query ? (
          <Link
            href={`/admin/users${filter === "all" ? "" : `?role=${filter}`}`}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {query ? `No users match "${query}".` : "No users match this filter."}
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
                      <CardTitle>
                        {[u.first_name, u.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <span className="rounded-full border px-2 py-0.5">
                        {u.role}
                      </span>
                      {u.is_referral_partner ? (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                          Referral partner
                        </span>
                      ) : null}
                    </div>
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
  query,
}: {
  label: string;
  value: FilterValue;
  current: string;
  query: string;
}) {
  const active = current === value;
  const params = new URLSearchParams();
  params.set("role", value);
  if (query) params.set("q", query);
  return (
    <Link
      href={`/admin/users?${params.toString()}`}
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
