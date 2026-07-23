import Link from "next/link";
import { CalendarClock, DollarSign, PieChart, TrendingUp } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import {
  getMyMonthlyCashflow,
  getMyParticipations,
  getMyTotalMonthlyPayment,
  getMyTotalsByEntity,
} from "@/lib/db/queries";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyCashflowChart } from "./monthly-cashflow-chart";
import { AnnualSummaryTable } from "@/components/annual-summary-table";
import { rollupByYear } from "@/lib/notes/annual-summary";

export default async function DashboardPage() {
  const [profile, participations, totalMonthly, monthlyCashflow, ctx, byEntity] =
    await Promise.all([
      getCurrentProfile(),
      getMyParticipations(),
      getMyTotalMonthlyPayment(),
      getMyMonthlyCashflow(),
      getCurrentEntityContext(),
      getMyTotalsByEntity(),
    ]);

  // Only in "All entities" mode, and only for logins that actually own more than
  // one entity — single-entity lenders see no breakdown at all.
  const showByEntity =
    ctx?.mode === "all" && ctx.entities.length > 1 && byEntity.length > 0;

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

  // Calendar-year rollup of projected principal + interest across all funded
  // notes. Pure aggregation of the monthly cashflow already computed above.
  const annual = rollupByYear(
    monthlyCashflow.map((m) => ({
      date: m.month,
      principal: m.principal,
      interest: m.interest,
    })),
  );
  const currentYear = new Date().getFullYear();

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

      {showByEntity ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By entity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {byEntity.map((e) => (
                <li
                  key={e.entity_id}
                  className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0 last:pb-0 first:pt-0"
                >
                  <p className="text-sm font-medium">{e.display_name}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(e.invested)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.positions} position{e.positions === 1 ? "" : "s"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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
        <>
          <MonthlyCashflowChart data={monthlyCashflow} />
          {annual.rows.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Annual summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  Projected principal and interest by calendar year across all
                  your funded notes.
                </p>
                <AnnualSummaryTable
                  summary={annual}
                  highlightYear={currentYear}
                />
              </CardContent>
            </Card>
          ) : null}
        </>
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
