"use client";

import { useActionState } from "react";
import {
  updateFundingStatus,
  type FundingFormState,
} from "@/lib/admin/funding-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FundingDefaults = {
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  funding_type: string | null;
  funding_received_date: string | null;
  funding_deposited_date: string | null;
  funding_cleared_date: string | null;
  funding_check_number: string | null;
  funding_wire_reference_number: string | null;
  funding_other_type_description: string | null;
  funding_notes: string | null;
};

export function FundingForm({
  participationId,
  defaults,
}: {
  participationId: string;
  defaults: FundingDefaults;
}) {
  const action = updateFundingStatus.bind(null, participationId);
  const [state, formAction, pending] = useActionState<
    FundingFormState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Stages</legend>
        <Stage
          name="funding_received"
          label="Funding received"
          dateName="funding_received_date"
          defaultChecked={defaults.funding_received}
          defaultDate={defaults.funding_received_date}
        />
        <Stage
          name="funding_deposited"
          label="Funding deposited"
          dateName="funding_deposited_date"
          defaultChecked={defaults.funding_deposited}
          defaultDate={defaults.funding_deposited_date}
        />
        <Stage
          name="funding_cleared"
          label="Funding cleared"
          dateName="funding_cleared_date"
          defaultChecked={defaults.funding_cleared}
          defaultDate={defaults.funding_cleared_date}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Method</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="funding_type">Funding type</Label>
          <select
            id="funding_type"
            name="funding_type"
            defaultValue={defaults.funding_type ?? ""}
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
          <Field
            name="funding_check_number"
            label="Check number"
            defaultValue={defaults.funding_check_number}
          />
          <Field
            name="funding_wire_reference_number"
            label="Wire reference"
            defaultValue={defaults.funding_wire_reference_number}
          />
        </div>
        <Field
          name="funding_other_type_description"
          label="Other (describe)"
          defaultValue={defaults.funding_other_type_description}
        />
      </fieldset>

      <fieldset className="rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Notes</legend>
        <textarea
          name="funding_notes"
          rows={3}
          defaultValue={defaults.funding_notes ?? ""}
          className="mt-2 w-full rounded-md border bg-background p-2 text-sm"
        />
      </fieldset>

      {state?.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save funding status"}
        </Button>
      </div>
    </form>
  );
}

function Stage({
  name,
  label,
  dateName,
  defaultChecked,
  defaultDate,
}: {
  name: string;
  label: string;
  dateName: string;
  defaultChecked: boolean;
  defaultDate: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
        />
        {label}
      </label>
      <Input
        type="date"
        name={dateName}
        defaultValue={defaultDate ?? undefined}
        className="w-44"
      />
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? undefined} />
    </div>
  );
}
