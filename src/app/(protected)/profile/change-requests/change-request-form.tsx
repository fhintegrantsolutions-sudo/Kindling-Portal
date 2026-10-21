"use client";

import { useActionState, useState } from "react";
import {
  submitChangeRequest,
  type ChangeRequestFormState,
} from "@/lib/change-requests/actions";
import { CHANGE_REQUEST_TYPES, typeDef } from "@/lib/change-requests/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Entity = { id: string; display_name: string };

export function ChangeRequestForm({
  entities,
  defaultEntityId,
  initialType,
}: {
  entities: Entity[];
  defaultEntityId: string | null;
  initialType?: string;
}) {
  const [type, setType] = useState(initialType ?? "");
  const [state, action, pending] = useActionState<
    ChangeRequestFormState | undefined,
    FormData
  >(submitChangeRequest, undefined);
  const def = typeDef(type);
  const fe = state?.fieldErrors ?? {};
  const select = "h-9 rounded-md border bg-background px-3 text-sm";

  if (state?.message) {
    return (
      <Alert>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">What would you like to change?</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={select}
        >
          <option value="">— choose —</option>
          {CHANGE_REQUEST_TYPES.filter((t) => t.lenderSelectable !== false).map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
        {fe.type ? <p className="text-xs text-destructive">{fe.type}</p> : null}
      </div>

      {def?.needsEntity ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="entity_id">Which entity?</Label>
          <select
            id="entity_id"
            name="entity_id"
            defaultValue={
              defaultEntityId ?? (entities.length === 1 ? entities[0].id : "")
            }
            className={select}
          >
            <option value="">— choose —</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.display_name}
              </option>
            ))}
          </select>
          {fe.entity_id ? (
            <p className="text-xs text-destructive">{fe.entity_id}</p>
          ) : null}
        </div>
      ) : null}

      {def?.help ? (
        <p className="text-sm text-muted-foreground">{def.help}</p>
      ) : null}

      {def ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {def.fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-2">
              <Label htmlFor={f.key}>
                {f.label}
                {f.required ? " *" : ""}
              </Label>
              {f.type === "select" ? (
                <select id={f.key} name={f.key} defaultValue="" className={select}>
                  <option value="">— choose —</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={f.key}
                  name={f.key}
                  type={f.type === "email" ? "email" : "text"}
                  placeholder={f.placeholder}
                  aria-invalid={Boolean(fe[f.key]) || undefined}
                />
              )}
              {fe[f.key] ? (
                <p className="text-xs text-destructive">{fe[f.key]}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {def ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="message">
            {def.fields.length === 0 ? "Details *" : "Message (optional)"}
          </Label>
          <textarea
            id="message"
            name="message"
            rows={3}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
          {fe.message ? (
            <p className="text-xs text-destructive">{fe.message}</p>
          ) : null}
        </div>
      ) : null}

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {def ? (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
