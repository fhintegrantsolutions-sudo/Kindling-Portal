import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  getPossibleDuplicateLogins,
  getUsers,
  type DuplicateGroup,
} from "@/lib/db/admin-queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreateUserSheet } from "./create-user-sheet";

type FilterValue = "all" | "admin" | "lender";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: FilterValue; q?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.role ?? "all";
  const query = (sp.q ?? "").trim();
  const [users, duplicates] = await Promise.all([
    getUsers({
      role: filter === "all" ? undefined : filter,
      q: query || undefined,
    }),
    getPossibleDuplicateLogins(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Admin · Users
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">All users</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* The duplicate-name card below is only a shortcut — this reaches the
              full picker, so any two logins can be merged. */}
          <Link
            href="/admin/users/merge"
            className={buttonVariants({ variant: "outline" })}
          >
            Merge logins…
          </Link>
          <CreateUserSheet />
        </div>
      </header>

      {duplicates.length > 0 ? (
        <DuplicatesCard groups={duplicates} />
      ) : null}

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
                      {/* Only surface entities for people who own more than
                          one — the ~174 single-entity lenders stay clean. */}
                      {u.entity_count >= 2 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {u.entity_names.map((name) => (
                            <span
                              key={name}
                              className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
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

// A shared name is a HINT, never a judgement — two different people can share
// one. Everything here is worded as "review these", and there is deliberately
// no bulk / "merge all" action: each group must be opened and judged on its own.
function DuplicatesCard({ groups }: { groups: DuplicateGroup[] }) {
  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base">Possible duplicate logins</CardTitle>
        <p className="text-sm text-muted-foreground">
          These people share a name. Review each one before merging — a shared
          name doesn&apos;t prove they&apos;re the same person.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.map((g) => {
          // Oldest login is the default survivor; the admin can change it in
          // the merge tool.
          const [survivor, ...absorbed] = g.logins;
          const params = new URLSearchParams();
          params.set("survivor", survivor.id);
          for (const a of absorbed) params.append("absorbed", a.id);
          return (
            <div
              key={g.name}
              className="flex flex-col gap-2 rounded-lg border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">{g.name}</p>
                <Link
                  href={`/admin/users/merge?${params.toString()}`}
                  className="shrink-0 text-xs underline underline-offset-4 hover:no-underline"
                >
                  Review &amp; merge…
                </Link>
              </div>
              <ul className="flex flex-col gap-1">
                {g.logins.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                  >
                    <Link
                      href={`/admin/users/${l.id}`}
                      className="underline underline-offset-4 hover:no-underline"
                    >
                      {l.email ?? "—"}
                    </Link>
                    <span>
                      {l.entity_count}{" "}
                      {l.entity_count === 1 ? "entity" : "entities"}
                    </span>
                    <span>
                      {l.position_count}{" "}
                      {l.position_count === 1 ? "position" : "positions"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
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
