"use client";

import { useActionState } from "react";
import {
  approveChangeRequest,
  declineChangeRequest,
  type ResolveState,
} from "@/lib/admin/change-request-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ResolveForm({
  id,
  autoApply,
}: {
  id: string;
  autoApply: boolean;
}) {
  const [approveState, approve, approving] = useActionState<
    ResolveState | undefined,
    FormData
  >(approveChangeRequest.bind(null, id), undefined);
  const [declineState, decline, declining] = useActionState<
    ResolveState | undefined,
    FormData
  >(declineChangeRequest.bind(null, id), undefined);
  const state = approveState ?? declineState;

  return (
    <form className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin_note">Note (optional, shown to the lender)</Label>
        <textarea
          id="admin_note"
          name="admin_note"
          rows={2}
          className="w-full rounded-md border bg-background p-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          formAction={approve}
          disabled={approving || declining}
          onClick={(e) => {
            if (
              autoApply &&
              !confirm("Apply this change to the lender's record and complete the request?")
            )
              e.preventDefault();
          }}
        >
          {approving
            ? "Saving…"
            : autoApply
              ? "Approve & apply"
              : "Mark complete"}
        </Button>
        <Button
          type="submit"
          variant="outline"
          formAction={decline}
          disabled={approving || declining}
          onClick={(e) => {
            if (!confirm("Decline this request?")) e.preventDefault();
          }}
        >
          {declining ? "…" : "Decline"}
        </Button>
      </div>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : state?.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
