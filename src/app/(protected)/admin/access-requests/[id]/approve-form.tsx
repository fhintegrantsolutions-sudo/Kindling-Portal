"use client";

import { useActionState, useTransition } from "react";
import {
  approveAccessRequest,
  rejectAccessRequest,
  type ApproveFormState,
} from "@/lib/admin/access-request-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CopyLink } from "./copy-link";

type Note = { id: string; note_id: string; title: string };

export function ApproveForm({
  id,
  notes,
}: {
  id: string;
  notes: Note[];
}) {
  const action = approveAccessRequest.bind(null, id);
  const [state, formAction, pending] = useActionState<
    ApproveFormState | undefined,
    FormData
  >(action, undefined);
  const fe = state?.fieldErrors ?? {};

  const [rejectPending, startRejectTransition] = useTransition();
  const reject = () => {
    if (!confirm("Reject this access request?")) return;
    startRejectTransition(async () => {
      try {
        await rejectAccessRequest(id);
      } catch {
        // surfaced via reload — keep simple
      }
    });
  };

  if (state?.setupUrl) {
    return <CopyLink url={state.setupUrl} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pick the note this lead is interested in, then approve. We&apos;ll
        generate a setup link for you to email the lead — they enter their
        own investment amount + legal info on that form.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note_id">Note</Label>
        <select
          id="note_id"
          name="note_id"
          defaultValue=""
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">— select —</option>
          {notes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.note_id} · {n.title}
            </option>
          ))}
        </select>
        {fe.note_id ? (
          <p className="text-xs text-destructive">{fe.note_id}</p>
        ) : null}
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || rejectPending}>
          {pending ? "Approving…" : "Approve & generate setup link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || rejectPending}
          onClick={reject}
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
