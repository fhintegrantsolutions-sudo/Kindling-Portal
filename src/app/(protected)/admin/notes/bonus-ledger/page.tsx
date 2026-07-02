import Link from "next/link";
import {
  getBonusLedgerForMonth,
  getBorrowersForPicker,
} from "@/lib/db/admin-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LedgerFilters } from "../ledger/ledger-filters";
import { BonusDetailsButton } from "@/components/admin/bonus-details-sheet";

export default async function BonusLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; borrower?: string }>;
}) {
  const { month, borrower } = await searchParams;
  const yearMonth = isValidYearMonth(month) ? month! : currentYearMonth();
  const borrowerId = borrower && borrower !== "" ? borrower : null;
  const [rows, borrowers] = await Promise.all([
    getBonusLedgerForMonth(yearMonth, borrowerId),
    getBorrowersForPicker(),
  ]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += Number(r.gross_amount);
      acc.retained += Number(r.retained_amount);
      return acc;
    },
    { gross: 0, retained: 0 },
  );
  const distributed = totals.gross - totals.retained;

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
            Profit bonus ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Bonuses recorded this month across all notes. Filter by borrower
            to send a per-borrower statement.
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
                basePath="/admin/notes/bonus-ledger"
                month={yearMonth}
                borrowerId={borrowerId}
                borrowers={borrowers}
              />
              <Link
                href={href(prev, borrowerId)}
                className="rounded-md border px-3 py-1 hover:bg-muted/40"
              >
                ← {formatYearMonth(prev)}
              </Link>
              <Link
                href={href(next, borrowerId)}
                className="rounded-md border px-3 py-1 hover:bg-muted/40"
              >
                {formatYearMonth(next)} →
              </Link>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            <Stat label="Gross" value={formatCurrency(totals.gross)} />
            <Stat label="Retained" value={formatCurrency(totals.retained)} />
            <Stat label="Distributed" value={formatCurrency(distributed)} />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bonuses recorded this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Paid</th>
                    <th className="py-2 pr-2 font-medium">Borrower</th>
                    <th className="py-2 pr-2 font-medium">Note</th>
                    <th className="py-2 pr-2 font-medium text-right">Gross</th>
                    <th className="py-2 pr-2 font-medium text-right">
                      Retained
                    </th>
                    <th className="py-2 pr-2 font-medium text-right">
                      Distributed
                    </th>
                    <th className="py-2 pr-2 font-medium">Method</th>
                    <th className="py-2 pr-2 font-medium">Reference</th>
                    <th className="py-2 pr-2 font-medium">Notes</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const dist =
                      Number(r.gross_amount) - Number(r.retained_amount);
                    return (
                      <tr
                        key={r.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 pr-2">{formatDate(r.paid_date)}</td>
                        <td className="py-2 pr-2">
                          {r.borrower_name ?? "—"}
                        </td>
                        <td className="py-2 pr-2">
                          <Link
                            href={`/admin/notes/${r.note_uuid}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {r.note_id}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.note_title}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatCurrency(r.gross_amount)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatCurrency(r.retained_amount)}
                        </td>
                        <td className="py-2 pr-2 text-right font-medium">
                          {formatCurrency(dist)}
                        </td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {r.payment_method ?? ""}
                        </td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {r.check_number ?? r.wire_reference ?? ""}
                        </td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {r.notes ?? ""}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <BonusDetailsButton
                            bonus={{
                              bonus_id: r.id,
                              note_uuid: r.note_uuid,
                              note_label: `${r.note_id} · bonus on ${formatDate(r.paid_date)}`,
                              payment_method: r.payment_method,
                              check_number: r.check_number,
                              wire_reference: r.wire_reference,
                              notes: r.notes,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

function href(yearMonth: string, borrowerId: string | null) {
  const qs = new URLSearchParams({ month: yearMonth });
  if (borrowerId) qs.set("borrower", borrowerId);
  return `/admin/notes/bonus-ledger?${qs.toString()}`;
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
