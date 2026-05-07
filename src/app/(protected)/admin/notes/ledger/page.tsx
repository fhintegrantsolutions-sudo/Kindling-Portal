import Link from "next/link";
import {
  getBorrowersForPicker,
  getLedgerForMonth,
} from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LedgerTable } from "./ledger-table";
import { LedgerFilters } from "./ledger-filters";

export default async function PaymentLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; borrower?: string }>;
}) {
  const { month, borrower } = await searchParams;
  const yearMonth = isValidYearMonth(month) ? month! : currentYearMonth();
  const borrowerId = borrower && borrower !== "" ? borrower : null;
  const [rows, borrowers] = await Promise.all([
    getLedgerForMonth(yearMonth, borrowerId),
    getBorrowersForPicker(),
  ]);

  const totals = rows.reduce(
    (acc, r) => {
      const total = r.principal_amount + r.interest_amount;
      acc.scheduled += total;
      if (r.received_date !== null) acc.received += total;
      return acc;
    },
    { scheduled: 0, received: 0 },
  );

  const prev = shiftMonth(yearMonth, -1);
  const next = shiftMonth(yearMonth, 1);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Admin · Notes
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Every scheduled payment due this month across all notes. Check a
            row when the borrower&apos;s payment arrives — it auto-records on
            that note&apos;s schedule.
          </p>
        </div>
        <Link
          href="/admin/notes"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to notes
        </Link>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>{formatYearMonth(yearMonth)}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <LedgerFilters
                basePath="/admin/notes/ledger"
                month={yearMonth}
                borrowerId={borrowerId}
                borrowers={borrowers}
              />
              <Link
                href={ledgerHref(prev, borrowerId)}
                className="rounded-md border px-3 py-1 hover:bg-muted/40"
              >
                ← {formatYearMonth(prev)}
              </Link>
              <Link
                href={ledgerHref(next, borrowerId)}
                className="rounded-md border px-3 py-1 hover:bg-muted/40"
              >
                {formatYearMonth(next)} →
              </Link>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            <Stat
              label="Scheduled"
              value={formatCurrency(totals.scheduled)}
            />
            <Stat
              label="Received"
              value={formatCurrency(totals.received)}
            />
            <Stat
              label="Outstanding"
              value={formatCurrency(totals.scheduled - totals.received)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <LedgerTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-medium">{value}</p>
    </div>
  );
}

function ledgerHref(yearMonth: string, borrowerId: string | null) {
  const qs = new URLSearchParams({ month: yearMonth });
  if (borrowerId) qs.set("borrower", borrowerId);
  return `/admin/notes/ledger?${qs.toString()}`;
}

function isValidYearMonth(s: string | undefined): s is string {
  return Boolean(s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s));
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map((s) => parseInt(s, 10));
  const target = new Date(y, m - 1 + delta, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}

function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map((s) => parseInt(s, 10));
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}
