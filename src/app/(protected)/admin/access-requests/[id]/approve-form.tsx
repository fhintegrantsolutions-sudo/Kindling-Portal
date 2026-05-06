"use client";

import { useActionState, useTransition } from "react";
import {
  approveAccessRequest,
  rejectAccessRequest,
  type ApproveFormState,
} from "@/lib/admin/access-request-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pick a note and amount, then approve. This creates a participation
        in awaiting-funding state. The lender gets an invite email when funds
        clear.
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="investment_amount">Investment amount (USD)</Label>
        <Input
          id="investment_amount"
          name="investment_amount"
          type="number"
          step="0.01"
          min="0"
          aria-invalid={Boolean(fe.investment_amount) || undefined}
        />
        {fe.investment_amount ? (
          <p className="text-xs text-destructive">{fe.investment_amount}</p>
        ) : null}
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || rejectPending}>
          {pending ? "Approving…" : "Approve & create participation"}
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
