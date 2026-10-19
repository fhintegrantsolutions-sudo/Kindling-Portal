"use client";

import { useState, useTransition } from "react";
import { setParticipationInvestedAmount } from "@/lib/admin/funding-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function fmtUsd(s: string | null): string {
  if (s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// "300000" -> "300,000.00"; leaves unparseable input as typed.
function formatMoney(value: string): string {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AmountReceivedEditor({
  participationId,
  investedAmount,
  submittedAmount,
}: {
  participationId: string;
  investedAmount: string;
  submittedAmount: string | null;
}) {
  const [value, setValue] = useState(formatMoney(investedAmount));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setParticipationInvestedAmount(
        participationId,
        value.replace(/,/g, ""),
      );
      if (!res?.error) setValue((v) => formatMoney(v));
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Amount received</CardTitle>
        <span className="text-xs text-muted-foreground">
          Submitted {fmtUsd(submittedAmount)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="amount_received">
              Actual amount received (USD)
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="amount_received"
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  // Allow digits, comma, and one decimal point.
                  setValue(e.target.value.replace(/[^0-9.,]/g, ""));
                  setSaved(false);
                }}
                onBlur={() => setValue((v) => formatMoney(v))}
                className="pl-7"
              />
            </div>
          </div>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        {saved ? (
          <p className="text-xs text-muted-foreground">Saved.</p>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
