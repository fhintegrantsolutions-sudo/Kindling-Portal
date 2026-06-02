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

export function AmountReceivedEditor({
  participationId,
  investedAmount,
  submittedAmount,
}: {
  participationId: string;
  investedAmount: string;
  submittedAmount: string | null;
}) {
  const [value, setValue] = useState(investedAmount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setParticipationInvestedAmount(participationId, value);
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
            <Input
              id="amount_received"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
              }}
            />
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
