import { formatCurrency } from "@/lib/format";
import type { AnnualSummary } from "@/lib/notes/annual-summary";

export type YearStatus = "Paid" | "In progress" | "Upcoming";

// Calendar-year principal/interest table shared by the per-note and dashboard
// views. Pass `statusByYear` to add a right-hand status column (per-note only);
// omit it for a plain projection (dashboard). `highlightYear` subtly marks the
// current calendar year.
export function AnnualSummaryTable({
  summary,
  statusByYear,
  highlightYear,
}: {
  summary: AnnualSummary;
  statusByYear?: Map<number, YearStatus>;
  highlightYear?: number;
}) {
  const showStatus = statusByYear !== undefined;
  const statusClass: Record<YearStatus, string> = {
    Paid: "text-green-700",
    "In progress": "text-amber-600",
    Upcoming: "text-muted-foreground",
  };

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="min-w-full whitespace-nowrap text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-2 font-medium">Year</th>
            <th className="py-2 pr-2 font-medium text-right">Principal</th>
            <th className="py-2 pr-2 font-medium text-right">Interest</th>
            <th className="py-2 pr-2 font-medium text-right">Total</th>
            {showStatus ? (
              <th className="py-2 pr-2 font-medium text-right">Status</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((r) => (
            <tr
              key={r.year}
              className={`border-b last:border-b-0 ${
                r.year === highlightYear ? "bg-muted/40" : ""
              }`}
            >
              <td className="py-2 pr-2 tabular-nums">{r.year}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {formatCurrency(r.principal)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {formatCurrency(r.interest)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums font-medium">
                {formatCurrency(r.total)}
              </td>
              {showStatus ? (
                <td className="py-2 pr-2 text-right text-xs">
                  <span className={statusClass[statusByYear.get(r.year) ?? "Upcoming"]}>
                    {statusByYear.get(r.year) ?? "Upcoming"}
                  </span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="py-2 pr-2">Total</td>
            <td className="py-2 pr-2 text-right tabular-nums">
              {formatCurrency(summary.totals.principal)}
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">
              {formatCurrency(summary.totals.interest)}
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">
              {formatCurrency(summary.totals.total)}
            </td>
            {showStatus ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
