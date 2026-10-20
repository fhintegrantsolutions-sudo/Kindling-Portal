"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NoteInterestRow } from "@/lib/db/admin-queries";

// Lenders who flagged interest in this note before funding opened.
export function InterestSection({
  noteId,
  interestOpensOn,
  rows,
}: {
  noteId: string;
  interestOpensOn: string | null;
  rows: NoteInterestRow[];
}) {
  const total = rows.reduce((s, r) => s + (r.estimated_amount ?? 0), 0);

  const downloadCsv = () => {
    const header = ["Lender", "Email", "Entity", "Estimated amount", "Date"];
    const body = rows.map((r) => [
      r.lender_name ?? "",
      r.lender_email ?? "",
      r.entity_name ?? "",
      r.estimated_amount !== null ? r.estimated_amount.toFixed(2) : "",
      formatDate(r.created_at),
    ]);
    const csv = [header, ...body]
      .map((cells) =>
        cells
          .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteId}-interested-lenders.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card id="interest">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Interested lenders</CardTitle>
            <p className="text-sm text-muted-foreground">
              {rows.length > 0
                ? `${rows.length} interested${total > 0 ? ` · ${formatCurrency(total)} estimated` : ""}`
                : interestOpensOn
                  ? `Lenders can flag interest starting ${formatDate(interestOpensOn)}.`
                  : "No interest recorded."}
            </p>
          </div>
          {rows.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
              Download CSV
            </Button>
          ) : null}
        </div>
      </CardHeader>
      {rows.length > 0 ? (
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {r.lender_name ?? r.lender_email ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[r.entity_name, r.lender_email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {r.estimated_amount !== null
                      ? formatCurrency(r.estimated_amount)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
