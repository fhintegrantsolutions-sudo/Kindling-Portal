"use client";

import { useActionState, useState } from "react";
import {
  createBonus,
  deleteBonus,
  type BonusFormState,
} from "@/lib/admin/bonus-actions";
import { formatCurrency } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BonusDetailsButton } from "@/components/admin/bonus-details-sheet";
import type { AdminBonusRow } from "@/lib/db/admin-queries";

export function BonusesSection({
  noteUuid,
  bonuses,
}: {
  noteUuid: string;
  bonuses: AdminBonusRow[];
}) {
  const action = createBonus.bind(null, noteUuid);
  const [state, formAction, pending] = useActionState<
    BonusFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const [grossStr, setGrossStr] = useState("");
  const [retainedStr, setRetainedStr] = useState("");

  const gross = grossStr === "" ? null : Number(grossStr);
  const retained = retainedStr === "" ? 0 : Number(retainedStr);
  const distributable =
    gross !== null && Number.isFinite(gross) && Number.isFinite(retained)
      ? Math.max(0, Math.round((gross - retained) * 100) / 100)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit bonuses</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record the gross amount received from the borrower. Optionally
          retain a portion for operational expenses; the remainder is
          distributed pro-rata to funded participants.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form
          action={formAction}
          key={state?.message ?? "form"}
          className="flex flex-col gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_2fr_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="paid_date">Paid date *</Label>
              <Input
                id="paid_date"
                name="paid_date"
                type="date"
                aria-invalid={Boolean(fe.paid_date) || undefined}
              />
              {fe.paid_date ? (
                <p className="text-xs text-destructive">{fe.paid_date}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gross_amount">Gross *</Label>
              <Input
                id="gross_amount"
                name="gross_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={grossStr}
                onChange={(e) => setGrossStr(e.target.value)}
                aria-invalid={Boolean(fe.gross_amount) || undefined}
              />
              {fe.gross_amount ? (
                <p className="text-xs text-destructive">{fe.gross_amount}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="retained_amount">Retained for ops</Label>
              <Input
                id="retained_amount"
                name="retained_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={retainedStr}
                onChange={(e) => setRetainedStr(e.target.value)}
                aria-invalid={Boolean(fe.retained_amount) || undefined}
              />
              {fe.retained_amount ? (
                <p className="text-xs text-destructive">{fe.retained_amount}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Recording…" : "Record bonus"}
            </Button>
          </div>
          {distributable !== null ? (
            <p className="text-xs text-muted-foreground">
              Distributable to lenders:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(distributable)}
              </span>
            </p>
          ) : null}
        </form>

        {state?.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {state?.message ? (
          <Alert>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {bonuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bonuses recorded yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {bonuses.map((b) => (
              <BonusRow key={b.id} bonus={b} noteUuid={noteUuid} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BonusRow({
  bonus,
  noteUuid,
}: {
  bonus: AdminBonusRow;
  noteUuid: string;
}) {
  const gross = Number(bonus.gross_amount);
  const retained = Number(bonus.retained_amount);
  const distributable = Math.round((gross - retained) * 100) / 100;
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {formatCurrency(gross)} ·{" "}
            <span className="text-muted-foreground">{bonus.paid_date}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Retained {formatCurrency(retained)} · Distributed{" "}
            {formatCurrency(distributable)}
          </p>
          {bonus.payment_method ? (
            <p className="text-xs text-muted-foreground">
              {bonus.payment_method}
              {bonus.check_number ? ` · #${bonus.check_number}` : ""}
              {bonus.wire_reference ? ` · ${bonus.wire_reference}` : ""}
            </p>
          ) : null}
          {bonus.notes ? (
            <p className="mt-1 text-sm text-muted-foreground">{bonus.notes}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <BonusDetailsButton
            bonus={{
              bonus_id: bonus.id,
              note_uuid: noteUuid,
              note_label: `Bonus on ${bonus.paid_date}`,
              payment_method: bonus.payment_method,
              check_number: bonus.check_number,
              wire_reference: bonus.wire_reference,
              notes: bonus.notes,
            }}
          />
          <form action={deleteBonus.bind(null, bonus.id, noteUuid)}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-destructive"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>
      <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
        {bonus.payouts.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-sm bg-muted/40 px-2 py-1"
          >
            <span className="truncate">
              {p.lender_name ?? p.lender_email ?? p.participation_id.slice(0, 8)}
            </span>
            <span className="font-medium">{formatCurrency(p.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
