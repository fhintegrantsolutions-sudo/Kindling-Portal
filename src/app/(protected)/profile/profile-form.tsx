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
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  entity_type: string | null;
  business_name: string | null;
  loan_agreement_title: string | null;
};

export function ProfileForm({
  defaults,
}: {
  defaults: ProfileDefaults;
}) {
  const [state, action, pending] = useActionState<
    ProfileFormState | undefined,
    FormData
  >(updateProfile, undefined);

  // React 19 auto-resets a form after its Server Action resolves, which
  // restores each input's `defaultValue`. We re-key the form on the current
  // server-side defaults so it remounts with the just-saved values rather
  // than the originals — otherwise the form would appear to "forget" the
  // save on next render.
  const formKey = JSON.stringify(defaults);

  return (
    <form action={action} key={formKey} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          name="first_name"
          label="First name"
          defaultValue={defaults.first_name}
        />
        <FieldInput
          name="last_name"
          label="Last name"
          defaultValue={defaults.last_name}
        />
        <FieldInput name="phone" label="Phone" defaultValue={defaults.phone} type="tel" />
      </section>

      <section>
        <h2 className="text-sm font-medium">Mailing address</h2>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          W-9 forms are issued digitally. If a physical copy ever needs to be
          mailed, please provide your mailing address below.
        </p>
        <div className="flex flex-col gap-4">
          <FieldInput
            name="address_street"
            label="Street"
            defaultValue={defaults.address_street}
          />
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
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
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Loan agreement details</h2>
        <p className="text-xs text-muted-foreground">
          These appear on your loan agreements and can&apos;t be changed
          here. To update, email{" "}
          <a
            href="mailto:info@kindling.network"
            className="underline underline-offset-4"
          >
            info@kindling.network
          </a>
          .
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField
            label="Entity type"
            value={defaults.entity_type}
          />
          {defaults.entity_type && defaults.entity_type !== "Individual" ? (
            <ReadonlyField
              label="Business / entity name"
              value={defaults.business_name}
            />
          ) : null}
          <ReadonlyField
            label="Loan agreement title"
            value={defaults.loan_agreement_title}
          />
        </div>
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

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
    </div>
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
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
      />
    </div>
  );
}
