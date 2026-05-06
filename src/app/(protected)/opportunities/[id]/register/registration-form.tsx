"use client";

import { useActionState } from "react";
import {
  submitRegistration,
  type RegistrationFormState,
} from "@/lib/registration/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type RegistrationDefaults = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  entity_type: string | null;
  name_for_agreement: string | null;
  mailing_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

export function RegistrationForm({
  noteUuid,
  noteHumanId,
  defaults,
  minInvestment,
}: {
  noteUuid: string;
  noteHumanId: string;
  defaults: RegistrationDefaults;
  minInvestment: string | null;
}) {
  const action = submitRegistration.bind(null, noteUuid, noteHumanId);
  const [state, formAction, pending] = useActionState<
    RegistrationFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Section title="Your information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="first_name"
            label="First name"
            defaultValue={defaults.first_name}
            error={fe.first_name}
          />
          <Field
            name="last_name"
            label="Last name"
            defaultValue={defaults.last_name}
            error={fe.last_name}
          />
          <Field
            name="email"
            label="Email"
            type="email"
            defaultValue={defaults.email}
            error={fe.email}
          />
          <Field
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={defaults.phone}
            error={fe.phone}
          />
          <Field
            name="entity_type"
            label="Entity type"
            placeholder="Individual, LLC, Trust, etc."
            defaultValue={defaults.entity_type}
            error={fe.entity_type}
          />
          <Field
            name="name_for_agreement"
            label="Name on loan agreement"
            defaultValue={defaults.name_for_agreement}
            error={fe.name_for_agreement}
          />
        </div>
      </Section>

      <Section title="Mailing address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="mailing_address"
            label="Street"
            defaultValue={defaults.mailing_address}
            className="sm:col-span-2"
          />
          <Field name="city" label="City" defaultValue={defaults.city} />
          <Field name="state" label="State" defaultValue={defaults.state} />
          <Field name="zip_code" label="ZIP" defaultValue={defaults.zip_code} />
        </div>
      </Section>

      <Section title="Investment">
        <Field
          name="investment_amount"
          label={
            minInvestment
              ? `Investment amount (min $${Number(minInvestment).toLocaleString()})`
              : "Investment amount"
          }
          type="number"
          step="0.01"
          min="0"
          error={fe.investment_amount}
        />
      </Section>

      <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        After you submit, an admin will follow up with wire / check / ACH
        instructions for your funds. We do not store any banking details in
        the portal.
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="acknowledge_lender"
            className="mt-0.5"
          />
          <span>
            I acknowledge that I am a lender, that the information provided is
            accurate, and that submission does not guarantee participation
            until funds clear.
          </span>
        </label>
        {fe.acknowledge_lender ? (
          <p className="text-sm text-destructive">{fe.acknowledge_lender}</p>
        ) : null}
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit registration"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  error,
  className,
  step,
  min,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  step?: string;
  min?: string;
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
        step={step}
        min={min}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
