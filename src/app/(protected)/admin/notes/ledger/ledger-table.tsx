"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  recordScheduledPayment,
  unrecordScheduledPayment,
} from "@/lib/admin/payment-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PaymentDetailsButton } from "@/components/admin/payment-details-sheet";
import type { LedgerRow } from "@/lib/db/admin-queries";

export function LedgerTable({
  rows,
  monthLabel,
}: {
  rows: LedgerRow[];
  monthLabel: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allKeys = useMemo(
    () => rows.map((r) => `${r.note_uuid}:${r.payment_number}`),
    [rows],
  );
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allKeys));
  };
  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scheduled payments due this month.
      </p>
    );
  }

  const exportSelected = () => {
    const keys = selected.size > 0 ? selected : new Set(allKeys);
    const exportRows = rows.filter((r) =>
      keys.has(`${r.note_uuid}:${r.payment_number}`),
    );
    downloadCsv(exportRows, monthLabel);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {selected.size > 0
            ? `${selected.size} of ${rows.length} selected`
            : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportSelected}
        >
          {selected.size > 0 ? "Download selected (CSV)" : "Download all (CSV)"}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-2 font-medium">
                <input
                  type="checkbox"
                  className="size-4 rounded border-muted-foreground/40"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="py-2 pr-2 font-medium">Due</th>
              <th className="py-2 pr-2 font-medium">Borrower</th>
              <th className="py-2 pr-2 font-medium">Note</th>
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium text-right">Principal</th>
              <th className="py-2 pr-2 font-medium text-right">Interest</th>
              <th className="py-2 pr-2 font-medium text-right">Total</th>
              <th className="py-2 pr-2 font-medium text-right">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = `${row.note_uuid}:${row.payment_number}`;
              return (
                <Row
                  key={key}
                  row={row}
                  selected={selected.has(key)}
                  onToggleSelect={() => toggleRow(key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  selected,
  onToggleSelect,
}: {
  row: LedgerRow;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isReceived = row.received_date !== null;
  const total = row.principal_amount + row.interest_amount;
  const disabled = !isReceived && !row.has_funded_participants;

  const toggle = () => {
    startTransition(async () => {
      try {
        if (isReceived) {
          await unrecordScheduledPayment(row.note_uuid, row.payment_number);
        } else {
          await recordScheduledPayment(row.note_uuid, row.payment_number);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to update";
        alert(msg);
      }
    });
  };

  return (
    <tr className={`border-b last:border-b-0 ${isReceived ? "bg-muted/40" : ""}`}>
      <td className="py-2 pr-2">
        <input
          type="checkbox"
          className="size-4 rounded border-muted-foreground/40"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${row.note_id} payment #${row.payment_number}`}
        />
      </td>
      <td className="py-2 pr-2">{formatDate(row.due_date)}</td>
      <td className="py-2 pr-2">{row.borrower_name ?? "—"}</td>
      <td className="py-2 pr-2">
        <Link
          href={`/admin/notes/${row.note_uuid}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {row.note_id}
        </Link>
        <span className="ml-2 text-xs text-muted-foreground">
          {row.note_title}
        </span>
      </td>
      <td className="py-2 pr-2 text-muted-foreground">{row.payment_number}</td>
      <td className="py-2 pr-2 text-right tabular-nums">
        {formatCurrency(row.principal_amount)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums">
        {formatCurrency(row.interest_amount)}
      </td>
      <td className="py-2 pr-2 text-right font-medium tabular-nums">
        {formatCurrency(total)}
      </td>
      <td className="py-2 pr-2 text-right">
        <div className="inline-flex items-center justify-end gap-2">
          <label
            className={`inline-flex items-center gap-2 ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
            title={
              disabled
                ? "No funded participants on this note yet"
                : isReceived
                  ? "Click to unmark received"
                  : "Click to mark received"
            }
          >
            <input
              type="checkbox"
              checked={isReceived}
              onChange={toggle}
              disabled={pending || disabled}
              className="size-4 rounded border-muted-foreground/40"
            />
            <span className="text-xs text-muted-foreground">
              {isReceived ? formatDate(row.received_date) : ""}
            </span>
          </label>
          {isReceived && row.payment_id ? (
            <PaymentDetailsButton
              payment={{
                payment_id: row.payment_id,
                note_uuid: row.note_uuid,
                note_label: `${row.note_id} · payment #${row.payment_number}`,
                payment_date: row.received_date ?? row.due_date,
                payment_method: row.payment_method,
                check_number: row.check_number,
                wire_reference: row.wire_reference,
                notes: row.payment_notes,
              }}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function downloadCsv(rows: LedgerRow[], monthLabel: string) {
  const header = [
    "Due",
    "Borrower",
    "Note ID",
    "Note title",
    "Payment #",
    "Principal",
    "Interest",
    "Total",
    "Status",
    "Received date",
    "Method",
    "Check #",
    "Wire reference",
    "Notes",
  ];
  const body = rows.map((r) => {
    const total = r.principal_amount + r.interest_amount;
    const status = r.received_date ? "Received" : "Scheduled";
    return [
      r.due_date,
      r.borrower_name ?? "",
      r.note_id,
      r.note_title,
      String(r.payment_number),
      r.principal_amount.toFixed(2),
      r.interest_amount.toFixed(2),
      total.toFixed(2),
      status,
      r.received_date ?? "",
      r.payment_method ?? "",
      r.check_number ?? "",
      r.wire_reference ?? "",
      r.payment_notes ?? "",
    ];
  });

  const csv = [header, ...body].map(toCsvRow).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = `payment-ledger-${slug(monthLabel)}.csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsvRow(cells: string[]): string {
  return cells
    .map((c) => {
      const needsQuotes = /[",\n]/.test(c);
      const escaped = c.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
