"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Principal = return of the lender's own capital (neutral dark grey);
// interest = their earnings (brand orange). Distinguished by lightness + hue.
const PRINCIPAL_COLOR = "#334155";
const INTEREST_COLOR = "#ef5d22";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtMonth(m: string): string {
  const [y, mm] = m.split("-");
  return `${MONTH_NAMES[Number(mm) - 1] ?? mm} ${y}`;
}

export type MonthlyPoint = {
  month: string; // "YYYY-MM"
  principal: number;
  interest: number;
};

// Monthly cash-flow chart: one bar per calendar month, stacked into the
// principal + interest scheduled to be received that month across all the
// lender's funded notes. Click a bar for its month + principal/interest split.
// Current calendar month as "YYYY-MM". Computed at render — the selection is a
// cosmetic default, and the whole app already sets suppressHydrationWarning, so
// a rare month-boundary/timezone difference between server and client is benign.
function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyCashflowChart({ data }: { data: MonthlyPoint[] }) {
  const currentMonth = thisMonth();
  // Default the selection to the current month so its split shows on load,
  // instead of waiting for a click. Falls back to no selection if the schedule
  // doesn't cover the current month (all notes matured, or none paying yet).
  const [selected, setSelected] = useState<string | null>(
    data.some((d) => d.month === currentMonth) ? currentMonth : null,
  );
  const currentRef = useRef<HTMLButtonElement>(null);

  // Bring the current month into view on mount (the timeline scrolls
  // horizontally and the current month is usually mid-range). inline:"center"
  // centers it in the scroll container; block:"nearest" avoids a vertical page
  // jump. DOM-only, so it doesn't trip the set-state-in-effect lint.
  useEffect(() => {
    currentRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, []);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projected monthly income</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your scheduled principal and interest by month will appear here once
            a note funds.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.principal + d.interest), 1);
  const totalPrincipal = data.reduce((s, d) => s + d.principal, 0);
  const totalInterest = data.reduce((s, d) => s + d.interest, 0);
  const selectedPoint = data.find((d) => d.month === selected) ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Projected monthly income</CardTitle>
          <p className="text-sm text-muted-foreground">
            Principal and interest scheduled to you each month. Click a bar for
            its split.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Swatch
            color={PRINCIPAL_COLOR}
            label="Principal"
            value={formatCurrency(totalPrincipal)}
          />
          <Swatch
            color={INTEREST_COLOR}
            label="Interest"
            value={formatCurrency(totalInterest)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-[3px]">
            {data.map((d) => {
              const total = d.principal + d.interest;
              // Cap the tallest bar at 92% so there's headroom for the
              // selection outline (the scroll container clips vertically).
              const totalHeightPct = (total / maxTotal) * 92;
              const principalFrac = total > 0 ? d.principal / total : 0;
              const isJan = d.month.endsWith("-01");
              const isSelected = d.month === selected;
              return (
                <button
                  key={d.month}
                  ref={d.month === currentMonth ? currentRef : undefined}
                  type="button"
                  onClick={() => setSelected(d.month)}
                  aria-label={`${fmtMonth(d.month)}: ${formatCurrency(total)}`}
                  aria-pressed={isSelected}
                  className="group flex w-3 shrink-0 cursor-pointer flex-col items-center focus:outline-none"
                >
                  <div className="relative flex h-56 w-full flex-col justify-end">
                    {isSelected ? (
                      <div
                        className="pointer-events-none absolute left-1/2 z-10 size-2 -translate-x-1/2 rounded-full bg-foreground shadow-sm ring-2 ring-card"
                        style={{ bottom: `calc(${totalHeightPct}% + 5px)` }}
                        aria-hidden
                      />
                    ) : null}
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-md group-hover:block">
                      <p className="font-medium">{fmtMonth(d.month)}</p>
                      <p className="text-muted-foreground tabular-nums">
                        {formatCurrency(d.principal)} principal
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        {formatCurrency(d.interest)} interest
                      </p>
                      <p className="mt-0.5 tabular-nums">
                        {formatCurrency(total)} total
                      </p>
                    </div>
                    <div
                      className={
                        "flex w-full flex-col justify-end rounded-[3px] " +
                        (isSelected
                          ? "outline outline-2 outline-offset-2 outline-foreground/60"
                          : "outline-none")
                      }
                      style={{ height: `${totalHeightPct}%` }}
                    >
                      <div
                        className="w-full rounded-t-[3px]"
                        style={{
                          height: `${(1 - principalFrac) * 100}%`,
                          backgroundColor: INTEREST_COLOR,
                        }}
                      />
                      <div
                        className="w-full"
                        style={{
                          height: `${principalFrac * 100}%`,
                          backgroundColor: PRINCIPAL_COLOR,
                          marginTop: "2px",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className={
                      "mt-1 h-3 w-full text-center text-[9px] leading-3 " +
                      (isSelected
                        ? "font-medium text-foreground"
                        : "text-muted-foreground")
                    }
                  >
                    {isJan ? d.month.slice(0, 4) : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 min-h-[2.75rem] rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {selectedPoint ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="font-medium">
                {fmtMonth(selectedPoint.month)}
              </span>
              <Swatch
                color={PRINCIPAL_COLOR}
                label="Principal"
                value={formatCurrency(selectedPoint.principal)}
              />
              <Swatch
                color={INTEREST_COLOR}
                label="Interest"
                value={formatCurrency(selectedPoint.interest)}
              />
              <span className="text-muted-foreground">
                Total{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(
                    selectedPoint.principal + selectedPoint.interest,
                  )}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              Click a bar to see that month&apos;s principal / interest split.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Swatch({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
}
