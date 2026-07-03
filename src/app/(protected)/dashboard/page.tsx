import Link from "next/link";
import { CalendarClock, DollarSign, PieChart, TrendingUp } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import {
  getMyMonthlyCashflow,
  getMyParticipations,
  getMyTotalMonthlyPayment,
} from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyCashflowChart } from "./monthly-cashflow-chart";

export default async function DashboardPage() {
  const [profile, participations, totalMonthly, monthlyCashflow] =
    await Promise.all([
      getCurrentProfile(),
      getMyParticipations(),
      getMyTotalMonthlyPayment(),
      getMyMonthlyCashflow(),
    ]);

  // "Active" = the row is Active AND the funding has cleared — un-cleared
  // participations are still pending and shouldn't count as deployed capital.
  const active = participations.filter(
    (p) => p.status === "Active" && p.funding_cleared,
  );
  const totalInvested = active.reduce(
    (sum, p) => sum + Number(p.invested_amount ?? 0),
    0,
  );
  const noteCount = new Set(active.map((p) => p.note_id)).size;

  const firstName = profile?.first_name ?? "there";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your portfolio at a glance.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total invested"
          value={formatCurrency(totalInvested)}
          icon={<DollarSign className="size-4" />}
        />
        <Stat
          label="Monthly payment"
          value={totalMonthly > 0 ? formatCurrency(totalMonthly) : "—"}
          icon={<CalendarClock className="size-4" />}
        />
        <Stat
          label="Active notes"
          value={String(noteCount)}
          icon={<PieChart className="size-4" />}
        />
        <Stat
          label="Active participations"
          value={String(active.length)}
          icon={<TrendingUp className="size-4" />}
        />
      </section>

      {participations.length === 0 ? (
        <section className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any participations yet. Browse{" "}
            <Link href="/opportunities" className="font-medium underline">
              opportunities
            </Link>{" "}
            to get started.
          </p>
        </section>
      ) : (
        <MonthlyCashflowChart data={monthlyCashflow} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
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
}
