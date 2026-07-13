"use client";

import { useActionState } from "react";
import { copyBeneficiariesFromEntity } from "@/lib/entities/copy-beneficiaries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type CopyState = { error?: string; message?: string } | undefined;

// Shown only when the login owns 2+ entities AND the selected entity has no
// beneficiaries yet — a shortcut so the same people don't get re-typed per entity.
export function CopyBeneficiariesFromEntity({
  sources,
}: {
  sources: { id: string; display_name: string }[];
}) {
  const [state, formAction, pending] = useActionState<CopyState, FormData>(
    async (_prev, formData) =>
      copyBeneficiariesFromEntity(
        String(formData.get("source_entity_id") ?? ""),
      ),
    undefined,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4"
    >
      <div>
        <Label htmlFor="source_entity_id">Copy from another entity</Label>
        <p className="text-xs text-muted-foreground">
          Copies that entity&apos;s beneficiaries here so you don&apos;t have to
          re-enter them.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          id="source_entity_id"
          name="source_entity_id"
          required
          defaultValue=""
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Select an entity…
          </option>
          {sources.map((e) => (
            <option key={e.id} value={e.id}>
              {e.display_name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Copying…" : "Copy beneficiaries"}
        </Button>
      </div>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
