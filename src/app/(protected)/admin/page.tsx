import Link from "next/link";
import {
  ClipboardList,
  DollarSign,
  Inbox,
  PieChart,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/dal";
import {
  getAdminStats,
  getLatestNoteParticipations,
  getUsersByState,
  getUserCounts,
} from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserHeatMap } from "@/components/admin/user-heat-map";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [stats, statesData, userCounts, latestNote] = await Promise.all([
    getAdminStats(),
    getUsersByState(),
    getUserCounts(),
    getLatestNoteParticipations(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Leads</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Pending access requests"
            value={String(stats.pendingAccessRequests)}
            icon={<Inbox className="size-4" />}
            href={
              stats.pendingAccessRequests > 0
                ? "/admin/access-requests"
                : undefined
            }
          />
          <Stat
            label="Awaiting lead submission"
            value={String(stats.awaitingLeadSubmission)}
            icon={<ClipboardList className="size-4" />}
            href={
              stats.awaitingLeadSubmission > 0
                ? "/admin/access-requests"
                : undefined
            }
          />
          <Stat
            label="Converted"
            value={String(stats.convertedLeads)}
            icon={<UserCheck className="size-4" />}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Current note funding</h2>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
            Admin only
          </span>
        </div>
        {latestNote ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Note</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Awaiting
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Received
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Deposited
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Cleared</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Invested
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2.5 font-medium">
                    <Link
                      href={`/admin/notes/${latestNote.noteUuid}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {latestNote.noteId}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {latestNote.status}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {latestNote.awaiting || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {latestNote.received || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {latestNote.deposited || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {latestNote.cleared || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                    {latestNote.total}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCurrency(latestNote.clearedInvested)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No open note — every note&apos;s funding round has been archived.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Portfolio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            label="Lenders"
            value={String(userCounts.byPosition)}
            icon={<Users className="size-4" />}
            href="/admin/users"
          />
          <Stat
            label="Active participations"
            value={String(stats.activeParticipations)}
            icon={<TrendingUp className="size-4" />}
            href="/admin/participations"
          />
          <Stat
            label="Total invested"
            value={formatCurrency(stats.totalInvested)}
            icon={<DollarSign className="size-4" />}
            className="lg:col-span-2"
          />
          <Stat
            label="Active notes"
            value={String(stats.activeNotes)}
            subtitle={`${stats.activeNotesPublic} public · ${stats.activeNotesPrivate} private`}
            icon={<PieChart className="size-4" />}
            href="/admin/notes"
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-sm font-medium">Quick actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/access-requests"
            className="text-sm font-medium underline underline-offset-4"
          >
            Review access requests →
          </Link>
          <Link
            href="/admin/registrations"
            className="text-sm font-medium underline underline-offset-4"
          >
            Review pending registrations →
          </Link>
          <Link
            href="/admin/notes/ledger"
            className="text-sm font-medium underline underline-offset-4"
          >
            Payment ledger →
          </Link>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lenders by state</CardTitle>
          <p className="text-sm text-muted-foreground">
            Unique lenders mapped by mailing-address state. Hover a state to
            see its count.
          </p>
        </CardHeader>
        <CardContent>
          <UserHeatMap rows={statesData} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  subtitle,
  icon,
  href,
  className,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <Card
      className={
        "flex h-full flex-col" +
        (href ? " transition-colors hover:bg-muted/40" : "")
      }
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="shrink-0 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p
          className={`mt-1 text-xs text-muted-foreground tabular-nums ${
            subtitle ? "" : "invisible"
          }`}
        >
          {subtitle ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className={`block h-full ${className ?? ""}`}>
      {inner}
    </Link>
  ) : (
    <div className={`h-full ${className ?? ""}`}>{inner}</div>
  );
}

