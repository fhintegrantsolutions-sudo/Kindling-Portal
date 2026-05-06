"use client";

import { useActionState } from "react";
import {
  createBorrower,
  updateBorrower,
  type BorrowerFormState,
} from "@/lib/admin/borrower-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BorrowerDefaults = {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  tax_id: string | null;
  business_type: string | null;
  notes: string | null;
};

export function BorrowerForm({
  borrowerId,
  defaults,
}: {
  borrowerId?: string;
  defaults: BorrowerDefaults;
}) {
  const action = borrowerId
    ? updateBorrower.bind(null, borrowerId)
    : createBorrower;
  const [state, formAction, pending] = useActionState<
    BorrowerFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Section title="Business">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="business_name"
            label="Business name"
            defaultValue={defaults.business_name}
            error={fe.business_name}
            required
          />
          <Field
            name="business_type"
            label="Business type"
            placeholder="LLC, Corp, etc."
            defaultValue={defaults.business_type}
          />
          <Field
            name="tax_id"
            label="Tax ID"
            placeholder="EIN"
            defaultValue={defaults.tax_id}
          />
        </div>
      </Section>

      <Section title="Primary contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="contact_name"
            label="Contact name"
            defaultValue={defaults.contact_name}
            error={fe.contact_name}
            required
          />
          <Field
            name="email"
            label="Email"
            type="email"
            defaultValue={defaults.email}
            error={fe.email}
            required
          />
          <Field
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={defaults.phone}
            error={fe.phone}
            required
          />
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="address"
            label="Street"
            defaultValue={defaults.address}
            className="sm:col-span-2"
          />
          <Field name="city" label="City" defaultValue={defaults.city} />
          <Field name="state" label="State" defaultValue={defaults.state} />
          <Field name="zip_code" label="ZIP" defaultValue={defaults.zip_code} />
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaults.notes ?? undefined}
          placeholder="Internal admin notes about this borrower"
          className="w-full rounded-md border bg-background p-2 text-sm"
        />
      </Section>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : borrowerId
              ? "Save changes"
              : "Create borrower"}
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
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
