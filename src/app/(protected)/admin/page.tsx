import Link from "next/link";
import {
  ClipboardList,
  DollarSign,
  Inbox,
  PieChart,
  TrendingUp,
} from "lucide-react";
import { getAdminStats } from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label="Pending registrations"
          value={String(stats.pendingRegistrations)}
          icon={<ClipboardList className="size-4" />}
          href={
            stats.pendingRegistrations > 0
              ? "/admin/registrations"
              : undefined
          }
        />
        <Stat
          label="Active participations"
          value={String(stats.activeParticipations)}
          icon={<TrendingUp className="size-4" />}
        />
        <Stat
          label="Total invested"
          value={formatCurrency(stats.totalInvested)}
          icon={<DollarSign className="size-4" />}
        />
        <Stat
          label="Active notes"
          value={String(stats.activeNotes)}
          icon={<PieChart className="size-4" />}
        />
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
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <Card className={href ? "transition-colors hover:bg-muted/40" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
