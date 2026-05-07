"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  recordScheduledPayment,
  unrecordScheduledPayment,
} from "@/lib/admin/payment-actions";
import { formatCurrency } from "@/lib/format";
import { PaymentDetailsButton } from "@/components/admin/payment-details-sheet";
import type { LedgerRow } from "@/lib/db/admin-queries";

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scheduled payments due this month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
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
          {rows.map((row) => (
            <Row key={`${row.note_uuid}:${row.payment_number}`} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: LedgerRow }) {
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
      <td className="py-2 pr-2">{row.due_date}</td>
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
      <td className="py-2 pr-2 text-right">
        {formatCurrency(row.principal_amount)}
      </td>
      <td className="py-2 pr-2 text-right">
        {formatCurrency(row.interest_amount)}
      </td>
      <td className="py-2 pr-2 text-right font-medium">
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
              {isReceived ? row.received_date : ""}
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
