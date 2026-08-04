import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getUsers } from "@/lib/db/admin-queries";
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
  const users = await getUsers({
    role: filter === "all" ? undefined : filter,
    q: query || undefined,
  });

  // A-Z index. The list is sorted by first name, so we bucket by the first
  // name's initial (falling back to email); anything non-alphabetic goes to "#".
  const letterOf = (u: (typeof users)[number]) => {
    const c = ((u.first_name || u.email || "#").trim().charAt(0) || "#").toUpperCase();
    return c >= "A" && c <= "Z" ? c : "#";
  };
  const anchorId = (letter: string) =>
    letter === "#" ? "letter-hash" : `letter-${letter}`;
  const presentLetters = new Set(users.map(letterOf));
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
          {/* All merging (incl. duplicate suggestions) lives in the picker. */}
          <Link
            href="/admin/users/merge"
            className={buttonVariants({ variant: "outline" })}
          >
            Merge logins…
          </Link>
          <CreateUserSheet />
        </div>
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
        <>
          <nav
            aria-label="Jump to letter"
            className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 rounded-md bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          >
            {ALPHABET.map((L) =>
              presentLetters.has(L) ? (
                <a
                  key={L}
                  href={`#${anchorId(L)}`}
                  className="flex size-6 items-center justify-center rounded text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {L}
                </a>
              ) : (
                <span
                  key={L}
                  aria-disabled
                  className="flex size-6 items-center justify-center rounded text-xs text-muted-foreground/30"
                >
                  {L}
                </span>
              ),
            )}
            {presentLetters.has("#") ? (
              <a
                href={`#${anchorId("#")}`}
                className="flex size-6 items-center justify-center rounded text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                #
              </a>
            ) : null}
          </nav>

          <div className="grid gap-4">
            {users.map((u, i) => {
              const isFirstOfLetter =
                i === 0 || letterOf(users[i - 1]) !== letterOf(u);
              return (
                <Link
                  key={u.id}
                  id={isFirstOfLetter ? anchorId(letterOf(u)) : undefined}
                  href={`/admin/users/${u.id}`}
                  className="block scroll-mt-14 rounded-lg transition-colors hover:bg-muted/40"
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
              );
            })}
          </div>
        </>
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
