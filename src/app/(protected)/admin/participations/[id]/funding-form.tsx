"use client";

import { useEffect, useRef, useState } from "react";
import { saveFundingStatus } from "@/lib/admin/funding-actions";
import {
  normalizeFundingValues,
  requiresDeposit,
  type FundingValues,
} from "@/lib/admin/funding-stages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function FundingForm({
  participationId,
  defaults,
}: {
  participationId: string;
  defaults: FundingValues;
}) {
  const [values, setValues] = useState<FundingValues>(defaults);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const firstRender = useRef(true);
  const inFlight = useRef(false);
  const pending = useRef<FundingValues | null>(null);

  // Debounced autosave. The effect re-runs whenever `values` changes, so the
  // snapshot it saves is always the latest — no render-time refs needed. An
  // in-flight guard queues the newest snapshot so saves never overlap.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const handle = setTimeout(() => {
      const run = async (snapshot: FundingValues) => {
        if (inFlight.current) {
          pending.current = snapshot;
          return;
        }
        inFlight.current = true;
        const res = await saveFundingStatus(participationId, snapshot);
        inFlight.current = false;
        if (res?.error) {
          setError(res.error);
          setStatus("error");
        } else {
          setError(null);
          setStatus("saved");
        }
        const next = pending.current;
        pending.current = null;
        if (next) void run(next);
      };
      void run(values);
    }, 1000);
    return () => clearTimeout(handle);
  }, [values, participationId]);

  function change(patch: Partial<FundingValues>) {
    setValues((prev) =>
      normalizeFundingValues({ ...prev, ...patch }, todayLocal()),
    );
  }

  const dep = requiresDeposit(values.funding_type);
  const receivedComplete =
    values.funding_received && !!values.funding_received_date;
  const depositedComplete =
    values.funding_deposited && !!values.funding_deposited_date;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Method</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="funding_type">Funding type</Label>
          <select
            id="funding_type"
            value={values.funding_type ?? ""}
            onChange={(e) => change({ funding_type: e.target.value || null })}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">—</option>
            <option value="wire">Wire</option>
            <option value="check">Check</option>
            <option value="ach">ACH</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Check number"
            value={values.funding_check_number}
            onChange={(v) => change({ funding_check_number: v })}
          />
          <TextField
            label="Wire reference"
            value={values.funding_wire_reference_number}
            onChange={(v) => change({ funding_wire_reference_number: v })}
          />
        </div>
        <TextField
          label="Other (describe)"
          value={values.funding_other_type_description}
          onChange={(v) => change({ funding_other_type_description: v })}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Stages</legend>
        <Stage
          label="Funding received"
          checked={values.funding_received}
          date={values.funding_received_date}
          disabled={false}
          onToggle={(c) => change({ funding_received: c })}
          onDate={(d) => change({ funding_received_date: d })}
        />
        {dep ? (
          <Stage
            label="Funding deposited"
            checked={values.funding_deposited}
            date={values.funding_deposited_date}
            disabled={!receivedComplete}
            onToggle={(c) => change({ funding_deposited: c })}
            onDate={(d) => change({ funding_deposited_date: d })}
          />
        ) : null}
        <Stage
          label="Funding cleared"
          checked={values.funding_cleared}
          date={values.funding_cleared_date}
          disabled={dep ? !depositedComplete : !receivedComplete}
          onToggle={(c) => change({ funding_cleared: c })}
          onDate={(d) => change({ funding_cleared_date: d })}
        />
      </fieldset>

      <fieldset className="rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Notes</legend>
        <textarea
          rows={3}
          value={values.funding_notes ?? ""}
          onChange={(e) => change({ funding_notes: e.target.value })}
          className="mt-2 w-full rounded-md border bg-background p-2 text-sm"
        />
      </fieldset>

      <div className="text-sm" aria-live="polite">
        {status === "error" ? (
          <span className="text-destructive">{error}</span>
        ) : status === "saving" ? (
          <span className="text-muted-foreground">Saving…</span>
        ) : status === "saved" ? (
          <span className="text-muted-foreground">All changes saved</span>
        ) : (
          <span className="invisible">placeholder</span>
        )}
      </div>
    </div>
  );
}

function Stage({
  label,
  checked,
  date,
  disabled,
  onToggle,
  onDate,
}: {
  label: string;
  checked: boolean;
  date: string | null;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
  onDate: (date: string | null) => void;
}) {
  return (
    <div
      className={
        "flex flex-wrap items-center gap-4" + (disabled ? " opacity-50" : "")
      }
    >
      <label className="flex w-44 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {label}
      </label>
      <Input
        type="date"
        value={date ?? ""}
        disabled={disabled}
        onChange={(e) => onDate(e.target.value || null)}
        className="w-44"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
