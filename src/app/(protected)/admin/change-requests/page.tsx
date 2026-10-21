import Link from "next/link";
import { getChangeRequests } from "@/lib/db/admin-queries";
import { typeDef, typeLabel } from "@/lib/change-requests/types";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

type Filter = "open" | "completed" | "declined";

export default async function AdminChangeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Filter }>;
}) {
  const sp = await searchParams;
  const filter: Filter =
    sp.status === "completed" || sp.status === "declined" ? sp.status : "open";
  const items = await getChangeRequests(filter);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Change requests
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Change requests</h1>
        <p className="text-sm text-muted-foreground">
          Lender requests to update their details, W-9, emails or loan agreement
          information.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {(
          [
            ["open", "Open"],
            ["completed", "Completed"],
            ["declined", "Declined"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/change-requests?status=${value}`}
            className={`border-b-2 px-3 py-2 text-sm transition-colors ${
              filter === value
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No {filter} change requests.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Submitted</th>
                <th className="px-3 py-2.5 font-medium">Lender</th>
                <th className="px-3 py-2.5 font-medium">Request</th>
                <th className="px-3 py-2.5 font-medium">Entity</th>
                <th className="px-4 py-2.5 font-medium">Requested</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const def = typeDef(r.type);
                const summary =
                  (def?.fields ?? [])
                    .map((f) => r.details[f.key])
                    .filter(Boolean)
                    .join(", ") ||
                  r.message ||
                  "—";
                return (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5 tabular-nums">
                      <Link
                        href={`/admin/change-requests/${r.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {formatDate(r.created_at)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/admin/change-requests/${r.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.lender_name ?? r.lender_email ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{typeLabel(r.type)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.entity?.display_name ?? "—"}
                    </td>
                    <td className="max-w-[18rem] truncate px-4 py-2.5 text-muted-foreground">
                      {summary}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
