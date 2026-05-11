"use client";

import { useActionState, useState } from "react";
import { Info } from "lucide-react";
import {
  submitLeadParticipationForm,
  type LeadFormState,
} from "@/lib/lead/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ENTITY_TYPES = [
  "Individual",
  "LLC",
  "Trust",
  "Corporation",
  "Partnership",
  "Other",
] as const;

export type LeadDefaults = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  min_investment: string | null;
};

export function SetupForm({
  token,
  defaults,
}: {
  token: string;
  defaults: LeadDefaults;
}) {
  const action = submitLeadParticipationForm.bind(null, token);
  const [state, formAction, pending] = useActionState<
    LeadFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const [entityChoice, setEntityChoice] = useState<string>("");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-5 text-sm">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          From your initial inquiry
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Readonly label="Name" value={`${defaults.first_name ?? ""} ${defaults.last_name ?? ""}`.trim()} />
          <Readonly label="Email" value={defaults.email} />
          <Readonly label="Phone" value={defaults.phone} />
        </div>
      </fieldset>

      <h2 className="text-sm font-semibold">Investment</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="investment_amount"
          label={
            defaults.min_investment
              ? `Amount (USD) — min $${Number(defaults.min_investment).toLocaleString()}`
              : "Amount (USD)"
          }
          type="number"
          step="0.01"
          min="0"
          error={fe.investment_amount}
        />
      </div>

      <h2 className="text-sm font-semibold">Legal information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="entity_type_choice">
            Entity type <span className="text-destructive">*</span>
          </Label>
          <select
            id="entity_type_choice"
            name="entity_type_choice"
            value={entityChoice}
            onChange={(e) => setEntityChoice(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-invalid={Boolean(fe.entity_type) || undefined}
          >
            <option value="">— select —</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {fe.entity_type ? (
            <p className="text-xs text-destructive">{fe.entity_type}</p>
          ) : null}
        </div>
        {entityChoice === "Other" ? (
          <Field
            name="entity_type_other"
            label="Specify entity type"
            error={fe.entity_type_other}
          />
        ) : (
          <div /> /* keeps the grid aligned */
        )}
        {entityChoice && entityChoice !== "Individual" ? (
          <Field
            name="business_name"
            label="Business / entity name"
            error={fe.business_name}
            className="sm:col-span-2"
          />
        ) : null}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="name_for_agreement" className="flex items-center gap-1.5">
            Exact name for the loan agreement{" "}
            <span className="text-destructive">*</span>
            <span
              title="This is the formal name used for documentation. Use the exact legal name (e.g. 'Jane Q. Doe Revocable Trust' or 'Acme Capital LLC')."
              className="inline-flex cursor-help text-muted-foreground"
            >
              <Info className="size-3.5" />
            </span>
          </Label>
          <Input
            id="name_for_agreement"
            name="name_for_agreement"
            aria-invalid={Boolean(fe.name_for_agreement) || undefined}
          />
          {fe.name_for_agreement ? (
            <p className="text-xs text-destructive">{fe.name_for_agreement}</p>
          ) : null}
        </div>
      </div>

      <h2 className="text-sm font-semibold">Mailing address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="mailing_address"
          label="Street"
          error={fe.mailing_address}
          className="sm:col-span-2"
        />
        <Field name="city" label="City" error={fe.city} />
        <Field name="state" label="State" error={fe.state} />
        <Field name="zip_code" label="ZIP" error={fe.zip_code} />
      </div>

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        After you submit, we&apos;ll follow up with wire / check / ACH
        instructions. We do <em>not</em> store any banking information in this
        portal.
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="acknowledge_lender" className="mt-1" />
          <span>
            I acknowledge that the information I&apos;m providing is accurate
            and that submission does not guarantee participation until funds
            clear.
          </span>
        </label>
        {fe.acknowledge_lender ? (
          <p className="text-xs text-destructive">{fe.acknowledge_lender}</p>
        ) : null}
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}

function Readonly({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  error,
  className,
  type,
  step,
  min,
}: {
  name: string;
  label: string;
  placeholder?: string;
  error?: string;
  className?: string;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={name}>
        {label} <span className="text-destructive">*</span>
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
