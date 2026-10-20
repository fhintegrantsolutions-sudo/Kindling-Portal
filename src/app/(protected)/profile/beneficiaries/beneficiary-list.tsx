"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  saveBeneficiaryPercentages,
  type PercentagesState,
} from "@/lib/beneficiaries/actions";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeleteBeneficiaryButton } from "./delete-button";

export type BeneficiaryItem = {
  id: string;
  name: string;
  relation: string;
  percentage: number;
  type: string;
  dob: string | null;
  phone: string | null;
  address: string | null;
  ssn_last4: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Every beneficiary's percentage is editable on one screen with a single Save,
// so lenders can rebalance a group (e.g. 50/50 -> 40/60) in one step. Live
// totals show whether each group adds up; Save is enabled once they do.
export function BeneficiaryList({ items }: { items: BeneficiaryItem[] }) {
  const [pct, setPct] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((b) => [b.id, String(Number(b.percentage))])),
  );
  const [state, formAction, pending] = useActionState<
    PercentagesState | undefined,
    FormData
  >(saveBeneficiaryPercentages, undefined);

  // Within each group, highest original percentage first, then by name.
  const byRank = (a: BeneficiaryItem, b: BeneficiaryItem) =>
    b.percentage - a.percentage || a.name.localeCompare(b.name);
  const primary = items.filter((b) => b.type === "Primary").sort(byRank);
  const contingent = items.filter((b) => b.type === "Contingent").sort(byRank);

  const totalOf = (group: BeneficiaryItem[]) =>
    round2(group.reduce((s, b) => s + (Number(pct[b.id]) || 0), 0));
  const primaryTotal = totalOf(primary);
  const contingentTotal = totalOf(contingent);
  const primaryOk = primary.length === 0 || primaryTotal === 100;
  const contingentOk = contingentTotal === 0 || contingentTotal === 100;
  const allNumbers = items.every((b) => {
    const n = Number(pct[b.id]);
    return pct[b.id] !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
  });
  const changed = useMemo(
    () => items.some((b) => Number(pct[b.id]) !== Number(b.percentage)),
    [items, pct],
  );
  const canSave = primaryOk && contingentOk && allNumbers && changed;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Adjust percentages for everyone below, then click{" "}
        <strong className="text-foreground">Save percentages</strong> once.
        Primary beneficiaries must add up to 100%. Contingent beneficiaries must
        add up to 100% (or 0% if you have none).
      </p>

      <Group
        title="Primary beneficiaries"
        rows={primary}
        total={primaryTotal}
        ok={primaryOk}
        pct={pct}
        setPct={setPct}
      />
      {contingent.length > 0 ? (
        <Group
          title="Contingent beneficiaries"
          rows={contingent}
          total={contingentTotal}
          ok={contingentOk}
          pct={pct}
          setPct={setPct}
          allowZero
        />
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <p className="text-sm">
          Primary{" "}
          <span
            className={
              primaryOk ? "font-medium" : "font-medium text-destructive"
            }
          >
            {primaryTotal}%
          </span>
          {contingent.length > 0 ? (
            <>
              {" · "}Contingent{" "}
              <span
                className={
                  contingentOk ? "font-medium" : "font-medium text-destructive"
                }
              >
                {contingentTotal}%
              </span>
            </>
          ) : null}
        </p>
        <Button type="submit" disabled={!canSave || pending}>
          {pending ? "Saving…" : "Save percentages"}
        </Button>
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : state?.message && !changed ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

function Group({
  title,
  rows,
  total,
  ok,
  pct,
  setPct,
  allowZero = false,
}: {
  title: string;
  rows: BeneficiaryItem[];
  total: number;
  ok: boolean;
  pct: Record<string, string>;
  setPct: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  allowZero?: boolean;
}) {
  const remaining = round2(100 - total);
  return (
    <section className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          {title}
        </h2>
        <span
          className={
            ok
              ? "text-xs text-muted-foreground"
              : "text-xs font-medium text-destructive"
          }
        >
          Total {total}%
          {!ok
            ? remaining > 0
              ? ` · ${remaining}% left to assign`
              : ` · ${-remaining}% over`
            : ""}
          {allowZero && total === 0 ? " (none)" : ""}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">None yet.</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{b.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {b.relation}
                    </p>
                  </div>
                  <div className="relative w-28">
                    <Input
                      name={`pct_${b.id}`}
                      inputMode="decimal"
                      aria-label={`Percentage for ${b.name}`}
                      value={pct[b.id] ?? ""}
                      onChange={(e) =>
                        setPct((prev) => ({
                          ...prev,
                          [b.id]: e.target.value.replace(/[^0-9.]/g, ""),
                        }))
                      }
                      className="pr-7 text-right tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  {b.dob ? <span>DOB {formatDate(b.dob)}</span> : null}
                  {b.phone ? <span>{b.phone}</span> : null}
                  {b.ssn_last4 ? <span>SSN ••••{b.ssn_last4}</span> : null}
                  {b.address ? <span>{b.address}</span> : null}
                </div>
                <div className="flex gap-2">
                  <Link href={`/profile/beneficiaries/${b.id}`}>
                    <Button type="button" variant="outline" size="sm">
                      Edit details
                    </Button>
                  </Link>
                  <DeleteBeneficiaryButton id={b.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
