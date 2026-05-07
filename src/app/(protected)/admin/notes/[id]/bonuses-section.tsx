"use client";

import { useActionState } from "react";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit bonuses</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recorded when paid. Distributed pro-rata to funded participants at
          the time of entry.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form
          action={formAction}
          key={state?.message ?? "form"}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
        >
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
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={Boolean(fe.amount) || undefined}
            />
            {fe.amount ? (
              <p className="text-xs text-destructive">{fe.amount}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Optional" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record bonus"}
          </Button>
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
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {formatCurrency(bonus.amount)} ·{" "}
            <span className="text-muted-foreground">{bonus.paid_date}</span>
          </p>
          {bonus.notes ? (
            <p className="text-sm text-muted-foreground">{bonus.notes}</p>
          ) : null}
        </div>
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
