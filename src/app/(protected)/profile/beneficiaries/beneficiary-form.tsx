"use client";

import { useActionState } from "react";
import {
  createBeneficiary,
  updateBeneficiary,
  type BeneficiaryFormState,
} from "@/lib/beneficiaries/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BeneficiaryDefaults = {
  name: string | null;
  relation: string | null;
  percentage: number | null;
  type: string | null;
  dob: string | null;
  phone: string | null;
  address: string | null;
};

export function BeneficiaryForm({
  beneficiaryId,
  defaults,
}: {
  beneficiaryId?: string;
  defaults: BeneficiaryDefaults;
}) {
  const action = beneficiaryId
    ? updateBeneficiary.bind(null, beneficiaryId)
    : createBeneficiary;
  const [state, formAction, pending] = useActionState<
    BeneficiaryFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          name="name"
          label="Name"
          defaultValue={defaults.name}
          error={fe.name}
        />
        <FieldInput
          name="relation"
          label="Relation"
          placeholder="Spouse, Child, Sibling, etc."
          defaultValue={defaults.relation}
          error={fe.relation}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue={defaults.type ?? "Primary"}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="Primary">Primary</option>
            <option value="Contingent">Contingent</option>
          </select>
          {fe.type ? (
            <p className="text-xs text-destructive">{fe.type}</p>
          ) : null}
        </div>
        <FieldInput
          name="percentage"
          label="Percentage"
          type="number"
          min="0"
          max="100"
          defaultValue={
            defaults.percentage !== null && defaults.percentage !== undefined
              ? String(defaults.percentage)
              : null
          }
          error={fe.percentage}
        />
      </div>

      <h2 className="text-sm font-semibold">Optional details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          name="dob"
          label="Date of birth"
          type="date"
          defaultValue={defaults.dob}
        />
        <FieldInput
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={defaults.phone}
        />
        <FieldInput
          name="address"
          label="Address"
          defaultValue={defaults.address}
          className="sm:col-span-2"
        />
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : beneficiaryId
              ? "Save changes"
              : "Add beneficiary"}
        </Button>
      </div>
    </form>
  );
}

function FieldInput({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  error,
  className,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        min={min}
        max={max}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
