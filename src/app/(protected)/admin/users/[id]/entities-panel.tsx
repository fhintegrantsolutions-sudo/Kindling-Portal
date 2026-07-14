"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  createEntity,
  updateEntity,
  setPrimaryEntity,
  deleteEntity,
  type EntityFormState,
} from "@/lib/admin/entity-actions";
import type { AdminEntity } from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function EntitiesPanel({
  userId,
  entities,
}: {
  userId: string;
  entities: AdminEntity[];
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            Investor entities ({entities.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Every login has exactly one primary entity. Positions are held by
            entities, not by the login.
          </p>
        </div>
        <AddEntityForm userId={userId} />
      </div>

      {entities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entities yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entities.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              onlyEntity={entities.length === 1}
              onError={setError}
            />
          ))}
        </div>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function EntityRow({
  entity,
  onlyEntity,
  onError,
}: {
  entity: AdminEntity;
  onlyEntity: boolean;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  // The server re-checks every guard; this only pre-disables the button and
  // surfaces the reason before the admin clicks.
  const deleteBlockedReason = entity.is_primary
    ? "Make another entity primary first."
    : onlyEntity
      ? "This is the owner's only entity."
      : entity.positions > 0
        ? `Holds ${entity.positions} position(s).`
        : null;

  const makePrimary = () => {
    if (!confirm(`Make "${entity.display_name}" the primary entity?`)) return;
    onError(null);
    startTransition(async () => {
      const res = await setPrimaryEntity(entity.id);
      if (res.error) onError(res.error);
    });
  };

  const remove = () => {
    if (!confirm(`Delete "${entity.display_name}"? This cannot be undone.`))
      return;
    onError(null);
    startTransition(async () => {
      const res = await deleteEntity(entity.id);
      if (res.error) onError(res.error);
    });
  };

  const meta = [entity.entity_type, entity.loan_agreement_title]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border px-3 py-2 text-sm">
      <div>
        <p className="flex items-center gap-2 font-medium">
          {entity.display_name}
          {entity.is_primary ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Primary
            </span>
          ) : null}
        </p>
        {meta ? (
          <p className="text-xs text-muted-foreground">{meta}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {entity.positions} position(s) · {formatCurrency(entity.invested)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <EditEntityForm entity={entity} />
          {entity.is_primary ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={makePrimary}
            >
              {pending ? "Working…" : "Make primary"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || deleteBlockedReason !== null}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
        {deleteBlockedReason ? (
          <p className="text-xs text-muted-foreground">
            Cannot delete: {deleteBlockedReason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AddEntityForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, submit } = useEntityForm(
    (formData) => createEntity(userId, undefined, formData),
    () => {
      formRef.current?.reset();
      setOpen(false);
    },
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm">
            <Plus className="size-3.5" />
            Add entity
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Add an investor entity</SheetTitle>
          <SheetDescription>
            The first entity for a login becomes its primary. Additional
            entities are added as non-primary.
          </SheetDescription>
        </SheetHeader>
        <EntityFields
          formRef={formRef}
          action={submit}
          state={state}
          pending={pending}
          submitLabel="Add entity"
          pendingLabel="Adding…"
          onCancel={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Form plumbing shared by the add + edit sheets. We drive the action from a
 * transition rather than useActionState so the sheet can close on success
 * without a setState-in-effect (banned by the React Compiler lint).
 */
function useEntityForm(
  run: (formData: FormData) => Promise<EntityFormState>,
  onSuccess: () => void,
) {
  const [state, setState] = useState<EntityFormState | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await run(formData);
      setState(result);
      if (result.message) onSuccess();
    });
  };

  return { state, pending, submit };
}

function EditEntityForm({ entity }: { entity: AdminEntity }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useEntityForm(
    (formData) => updateEntity(entity.id, undefined, formData),
    () => setOpen(false),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            Edit
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Edit {entity.display_name}</SheetTitle>
          <SheetDescription>
            Primary status is changed from the entity list, not here.
          </SheetDescription>
        </SheetHeader>
        <EntityFields
          action={submit}
          state={state}
          pending={pending}
          entity={entity}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          onCancel={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function EntityFields({
  formRef,
  action,
  state,
  pending,
  entity,
  submitLabel,
  pendingLabel,
  onCancel,
}: {
  formRef?: React.RefObject<HTMLFormElement | null>;
  action: (formData: FormData) => void;
  state: EntityFormState | undefined;
  pending: boolean;
  entity?: AdminEntity;
  submitLabel: string;
  pendingLabel: string;
  onCancel: () => void;
}) {
  const fe = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <Field
        name="display_name"
        label="Display name"
        required
        error={fe.display_name}
        defaultValue={entity?.display_name}
      />
      <Field
        name="entity_type"
        label="Entity type (optional)"
        error={fe.entity_type}
        defaultValue={entity?.entity_type ?? ""}
      />
      <Field
        name="business_name"
        label="Business name (optional)"
        error={fe.business_name}
        defaultValue={entity?.business_name ?? ""}
      />
      <Field
        name="loan_agreement_title"
        label="Loan agreement title (optional)"
        error={fe.loan_agreement_title}
        defaultValue={entity?.loan_agreement_title ?? ""}
      />
      <Field
        name="address_street"
        label="Street (optional)"
        defaultValue={entity?.address_street ?? ""}
      />
      <Field
        name="address_city"
        label="City (optional)"
        defaultValue={entity?.address_city ?? ""}
      />
      <Field
        name="address_state"
        label="State (optional)"
        defaultValue={entity?.address_state ?? ""}
      />
      <Field
        name="address_zip"
        label="ZIP (optional)"
        defaultValue={entity?.address_zip ?? ""}
      />

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
