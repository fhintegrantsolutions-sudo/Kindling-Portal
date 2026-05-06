"use client";

import { useActionState } from "react";
import {
  updateProfile,
  type ProfileFormState,
} from "@/lib/profile/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileDefaults = {
  name: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  entity_type: string | null;
  loan_agreement_title: string | null;
};

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, action, pending] = useActionState<
    ProfileFormState | undefined,
    FormData
  >(updateProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <FieldInput name="name" label="Full name" defaultValue={defaults.name} />
        <FieldInput name="phone" label="Phone" defaultValue={defaults.phone} type="tel" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Mailing address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput
            name="address_street"
            label="Street"
            defaultValue={defaults.address_street}
            className="sm:col-span-2"
          />
          <FieldInput
            name="address_city"
            label="City"
            defaultValue={defaults.address_city}
          />
          <FieldInput
            name="address_state"
            label="State"
            defaultValue={defaults.address_state}
          />
          <FieldInput
            name="address_zip"
            label="ZIP"
            defaultValue={defaults.address_zip}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          name="entity_type"
          label="Entity type"
          defaultValue={defaults.entity_type}
          placeholder="Individual, LLC, Trust, etc."
        />
        <FieldInput
          name="loan_agreement_title"
          label="Loan agreement title"
          defaultValue={defaults.loan_agreement_title}
        />
      </section>

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
          {pending ? "Saving…" : "Save changes"}
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
  className,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}
