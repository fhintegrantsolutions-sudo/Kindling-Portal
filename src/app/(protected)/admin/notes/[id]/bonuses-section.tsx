"use client";

import { useActionState, useState } from "react";
import {
  createBonus,
  deleteBonus,
  markBonusReceived,
  type BonusFormState,
} from "@/lib/admin/bonus-actions";
import { formatCurrency, formatDate } from "@/lib/format";
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
  hasProfitBonus,
}: {
  noteUuid: string;
  bonuses: AdminBonusRow[];
  hasProfitBonus: boolean;
}) {
  const action = createBonus.bind(null, noteUuid);
  const [state, formAction, pending] = useActionState<
    BonusFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const [status, setStatus] = useState<"requested" | "received">("received");
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
          Issue a <span className="font-medium">Request</span> to ask the
          borrower for a profit bonus, or <span className="font-medium">Receive</span>{" "}
          one in hand. Received bonuses distribute pro-rata to funded
          participants.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!hasProfitBonus ? (
          <Alert>
            <AlertDescription>
              Profit bonus is turned <span className="font-medium">off</span>{" "}
              for this note, so lenders won&apos;t see any bonuses here on their
              note page. Turn it on in{" "}
              <span className="font-medium">Settings → Profit bonus</span> to
              make this visible to them.
            </AlertDescription>
          </Alert>
        ) : null}
        <form
          action={formAction}
          key={state?.message ?? "form"}
          className="flex flex-col gap-3"
        >
          {/* Status as hidden input so the controlled radios submit correctly */}
          <input type="hidden" name="status" value={status} />
          <div className="flex gap-1 rounded-md border p-1 text-sm self-start">
            <button
              type="button"
              onClick={() => setStatus("requested")}
              className={`rounded px-3 py-1 transition-colors ${
                status === "requested"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Request
            </button>
            <button
              type="button"
              onClick={() => setStatus("received")}
              className={`rounded px-3 py-1 transition-colors ${
                status === "received"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Received
            </button>
          </div>

          <div
            className={
              status === "requested"
                ? "grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
                : "grid gap-3 sm:grid-cols-[1fr_1fr_1fr_2fr_auto] sm:items-end"
            }
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="paid_date">
                {status === "requested" ? "Request date *" : "Paid date *"}
              </Label>
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
              <Label htmlFor="gross_amount">
                {status === "requested" ? "Amount requested *" : "Gross *"}
              </Label>
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
            {status === "received" ? (
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
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : status === "requested"
                  ? "Record request"
                  : "Record received"}
            </Button>
          </div>
          {status === "received" && distributable !== null ? (
            <p className="text-xs text-muted-foreground">
              Distributable to lenders:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(distributable)}
              </span>
            </p>
          ) : null}
          {status === "requested" ? (
            <p className="text-xs text-muted-foreground">
              No payouts are generated yet. When the funds clear, click{" "}
              <span className="font-medium">Mark received</span> on the
              request to distribute.
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
  const isRequested = bonus.status === "requested";
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {formatCurrency(gross)} ·{" "}
              <span className="text-muted-foreground">{formatDate(bonus.paid_date)}</span>
            </p>
            <span
              className={
                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider " +
                (isRequested
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                  : "border-green-500/40 bg-green-500/10 text-green-700")
              }
            >
              {bonus.status}
            </span>
          </div>
          {isRequested ? (
            <p className="text-xs text-muted-foreground">
              Awaiting borrower payment — no payouts yet
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Retained {formatCurrency(retained)} · Distributed{" "}
              {formatCurrency(distributable)}
            </p>
          )}
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
          {isRequested ? (
            <MarkReceivedButton bonus={bonus} noteUuid={noteUuid} />
          ) : (
            <BonusDetailsButton
              bonus={{
                bonus_id: bonus.id,
                note_uuid: noteUuid,
                note_label: `Bonus on ${formatDate(bonus.paid_date)}`,
                payment_method: bonus.payment_method,
                check_number: bonus.check_number,
                wire_reference: bonus.wire_reference,
                notes: bonus.notes,
              }}
            />
          )}
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
      {!isRequested && bonus.payouts.length > 0 ? (
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
      ) : null}
    </div>
  );
}

function MarkReceivedButton({
  bonus,
  noteUuid,
}: {
  bonus: AdminBonusRow;
  noteUuid: string;
}) {
  const [open, setOpen] = useState(false);
  const action = markBonusReceived.bind(null, bonus.id, noteUuid);
  const [state, formAction, pending] = useActionState<
    BonusFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Mark received
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm"
      key={state?.message ?? "form"}
    >
      <p className="text-xs font-medium text-muted-foreground">
        Mark this request as received
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`pd-${bonus.id}`} className="text-xs">
            Paid date *
          </Label>
          <Input
            id={`pd-${bonus.id}`}
            name="paid_date"
            type="date"
            defaultValue={bonus.paid_date}
            aria-invalid={Boolean(fe.paid_date) || undefined}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`gross-${bonus.id}`} className="text-xs">
            Gross
          </Label>
          <Input
            id={`gross-${bonus.id}`}
            name="gross_amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={bonus.gross_amount}
            aria-invalid={Boolean(fe.gross_amount) || undefined}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`ret-${bonus.id}`} className="text-xs">
            Retained
          </Label>
          <Input
            id={`ret-${bonus.id}`}
            name="retained_amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            aria-invalid={Boolean(fe.retained_amount) || undefined}
          />
        </div>
      </div>
      {state?.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Confirm received"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
