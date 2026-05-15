import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  DollarSign,
  Hourglass,
  Inbox,
  PieChart,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/dal";
import { getAdminStats, getUsersByState } from "@/lib/db/admin-queries";
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
  const [stats, statesData] = await Promise.all([
    getAdminStats(),
    getUsersByState(),
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
        <h2 className="text-sm font-medium">Participations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Awaiting funding"
            value={String(stats.participationsAwaitingFunding)}
            icon={<Hourglass className="size-4" />}
            href="/admin/participations?funding=awaiting_funding"
          />
          <Stat
            label="Received"
            value={String(stats.participationsReceived)}
            icon={<Banknote className="size-4" />}
            href="/admin/participations?funding=received"
          />
          <Stat
            label="Deposited"
            value={String(stats.participationsDeposited)}
            icon={<CircleDashed className="size-4" />}
            href="/admin/participations?funding=deposited"
          />
          <Stat
            label="Cleared"
            value={String(stats.participationsCleared)}
            icon={<CheckCircle2 className="size-4" />}
            href="/admin/participations?funding=cleared"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Portfolio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            label="Users"
            value={String(stats.totalUsers)}
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

