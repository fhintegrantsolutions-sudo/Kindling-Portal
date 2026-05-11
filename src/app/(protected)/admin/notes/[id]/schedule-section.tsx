"use client";

import { useTransition } from "react";
import {
  recordScheduledPayment,
  unrecordScheduledPayment,
} from "@/lib/admin/payment-actions";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentDetailsButton } from "@/components/admin/payment-details-sheet";
import type { ScheduleRow } from "@/lib/notes/schedule";

export type ReceivedPayment = {
  payment_id: string;
  payment_number: number;
  recorded_date: string;
  principal_amount: string;
  interest_amount: string;
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  notes: string | null;
};

export function ScheduleSection({
  noteUuid,
  schedule,
  scheduleError,
  received,
}: {
  noteUuid: string;
  schedule: ScheduleRow[] | null;
  scheduleError: string | null;
  received: ReceivedPayment[];
}) {
  const receivedByNumber = new Map(received.map((r) => [r.payment_number, r]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment schedule</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generated from the note&apos;s principal, rate, term, interest type,
          and first payment date. Check a row to record receipt.
        </p>
      </CardHeader>
      <CardContent>
        {!schedule ? (
          <p className="text-sm text-muted-foreground">
            {scheduleError ??
              "Add principal, rate, term, and first payment date above to generate the schedule."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Due</th>
                  <th className="py-2 pr-2 font-medium text-right">Principal</th>
                  <th className="py-2 pr-2 font-medium text-right">Interest</th>
                  <th className="py-2 pr-2 font-medium text-right">Balance</th>
                  <th className="py-2 pr-2 font-medium text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => {
                  const r = receivedByNumber.get(row.payment_number);
                  return (
                    <ScheduleRowItem
                      key={row.payment_number}
                      noteUuid={noteUuid}
                      row={row}
                      received={r}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleRowItem({
  noteUuid,
  row,
  received,
}: {
  noteUuid: string;
  row: ScheduleRow;
  received: ReceivedPayment | undefined;
}) {
  const [pending, startTransition] = useTransition();
  const isReceived = Boolean(received);

  const toggle = () => {
    startTransition(async () => {
      try {
        if (isReceived) {
          await unrecordScheduledPayment(noteUuid, row.payment_number);
        } else {
          await recordScheduledPayment(noteUuid, row.payment_number);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to update";
        alert(msg);
      }
    });
  };

  return (
    <tr
      className={`border-b last:border-b-0 ${
        isReceived ? "bg-muted/40" : ""
      }`}
    >
      <td className="py-2 pr-2 text-muted-foreground">{row.payment_number}</td>
      <td className="py-2 pr-2">{row.due_date}</td>
      <td className="py-2 pr-2 text-right tabular-nums">
        {formatCurrency(row.principal_amount)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums">
        {formatCurrency(row.interest_amount)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
        {formatCurrency(row.ending_balance)}
      </td>
      <td className="py-2 pr-2">
        <div className="flex items-center justify-end gap-3">
          <label className="flex w-28 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isReceived}
              onChange={toggle}
              disabled={pending}
              className="size-4 rounded border-muted-foreground/40"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {isReceived ? received?.recorded_date : ""}
            </span>
          </label>
          <div className="w-24 text-right">
            {isReceived && received ? (
              <PaymentDetailsButton
                payment={{
                  payment_id: received.payment_id,
                  note_uuid: noteUuid,
                  note_label: `Payment #${row.payment_number}`,
                  payment_date: received.recorded_date,
                  payment_method: received.payment_method,
                  check_number: received.check_number,
                  wire_reference: received.wire_reference,
                  notes: received.notes,
                }}
              />
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}
