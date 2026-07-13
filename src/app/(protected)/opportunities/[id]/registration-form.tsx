"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  submitRegistration,
  type RegistrationFormState,
} from "@/lib/registration/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Login-level details (from profiles). Entity-level details ride on
// RegistrationEntity, because they change with the entity the lender picks.
export type RegistrationProfileSummary = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type RegistrationEntity = {
  id: string;
  display_name: string;
  entity_type: string | null;
  business_name: string | null;
  loan_agreement_title: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

function formatAddress(entity: RegistrationEntity | null): string | null {
  if (!entity) return null;
  return (
    [
      entity.address_street,
      entity.address_city,
      entity.address_state,
      entity.address_zip,
    ]
      .filter(Boolean)
      .join(", ") || null
  );
}

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
  entities: RegistrationEntity[];
  currentEntityId: string | null;
}) {
  const action = submitRegistration.bind(null, noteUuid, noteHumanId);
  const [state, formAction, pending] = useActionState<
    RegistrationFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  const multiEntity = entities.length > 1;
  // "all" mode has no current entity, so a multi-entity lender starts on the
  // empty option and must choose. A single-entity lender is always pre-selected.
  const initialEntityId =
    currentEntityId && entities.some((e) => e.id === currentEntityId)
      ? currentEntityId
      : (entities.length === 1 ? entities[0].id : "");

  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId);
  const selected =
    entities.find((e) => e.id === selectedEntityId) ?? null;

  // Everything on the loan agreement comes from the SELECTED entity, so the
  // summary and this warning track the dropdown without a reload. Entity type is
  // the hard gate (as it always has been); the agreement title falls back to the
  // lender's name and the address is filled in downstream, so neither blocks.
  const missing: string[] = [];
  if (selected && !selected.entity_type) missing.push("entity type");

  const entityPicker = multiEntity ? (
    <section className="flex flex-col gap-2">
      <Label htmlFor="entity_id">Which entity is investing?</Label>
      <select
        id="entity_id"
        name="entity_id"
        required
        value={selectedEntityId}
        onChange={(e) => setSelectedEntityId(e.target.value)}
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
  );

  // The selected entity can't sign paperwork until its details are filled in.
  // Show the picker (so they can switch to a complete entity) but nothing else.
  if (missing.length > 0) {
    return (
      <div className="flex flex-col gap-6">
        {entityPicker}
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              {multiEntity
                ? `${selected?.display_name} is missing: ${missing.join(", ")}.`
                : `Your profile is missing: ${missing.join(", ")}.`}{" "}
              Complete it before registering.
            </span>
            <Link href="/profile">
              <Button size="sm">Complete profile</Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {entityPicker}

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
          <SummaryField
            label="Entity type"
            value={selected?.entity_type ?? null}
          />
          <SummaryField
            label="Name on loan agreement"
            value={selected?.loan_agreement_title ?? profile.full_name}
          />
          <SummaryField
            label="Mailing address"
            value={formatAddress(selected)}
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
