"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  submitRegistration,
  type RegistrationFormState,
} from "@/lib/registration/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type RegistrationProfileSummary = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  entity_type: string | null;
  name_for_agreement: string | null;
  mailing_address: string | null;
};

export type RegistrationEntityOption = { id: string; display_name: string };

export function RegistrationForm({
  noteUuid,
  noteHumanId,
  profile,
  minInvestment,
  entities,
  currentEntityId,
}: {
  noteUuid: string;
  noteHumanId: string;
  profile: RegistrationProfileSummary;
  minInvestment: string | null;
  entities: RegistrationEntityOption[];
  currentEntityId: string | null;
}) {
  const action = submitRegistration.bind(null, noteUuid, noteHumanId);
  const [state, formAction, pending] = useActionState<
    RegistrationFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  const multiEntity = entities.length > 1;
  const defaultEntityId =
    currentEntityId && entities.some((e) => e.id === currentEntityId)
      ? currentEntityId
      : "";

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {multiEntity ? (
        <section className="flex flex-col gap-2">
          <Label htmlFor="entity_id">Which entity is investing?</Label>
          <select
            id="entity_id"
            name="entity_id"
            required
            defaultValue={defaultEntityId}
            aria-invalid={Boolean(fe.entity_id) || undefined}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:max-w-sm"
          >
            <option value="" disabled>
              Select an entity…
            </option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.display_name}
              </option>
            ))}
          </select>
          {fe.entity_id ? (
            <p className="text-xs text-destructive">{fe.entity_id}</p>
          ) : null}
        </section>
      ) : (
        <input type="hidden" name="entity_id" value={entities[0]?.id ?? ""} />
      )}

      <section className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold">Your details</h2>
          <Link
            href="/profile"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Edit profile
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Pulled from your profile. We use these for the loan agreement.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <SummaryField label="Name" value={profile.full_name} />
          <SummaryField label="Email" value={profile.email} />
          <SummaryField label="Phone" value={profile.phone} />
          <SummaryField label="Entity type" value={profile.entity_type} />
          <SummaryField
            label="Name on loan agreement"
            value={profile.name_for_agreement}
          />
          <SummaryField
            label="Mailing address"
            value={profile.mailing_address}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="investment_amount">
          {minInvestment
            ? `Investment amount (min $${Number(minInvestment).toLocaleString()})`
            : "Investment amount"}
        </Label>
        <Input
          id="investment_amount"
          name="investment_amount"
          type="number"
          step="0.01"
          min={minInvestment ?? "0"}
          aria-invalid={Boolean(fe.investment_amount) || undefined}
        />
        {fe.investment_amount ? (
          <p className="text-xs text-destructive">{fe.investment_amount}</p>
        ) : null}
      </section>

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

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}
