"use client";

import { useState, useTransition } from "react";
import { inviteLenderForParticipation } from "@/lib/admin/participation-invite-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function InviteButton({
  participationId,
  disabled,
  disabledReason,
}: {
  participationId: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const invite = () => {
    if (
      !confirm(
        "Send the invite email and create the lender's portal account? This is the point of no return for this prospect.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await inviteLenderForParticipation(participationId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to invite");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Invite lender</p>
          <p className="text-xs text-muted-foreground">
            Creates a Supabase auth user, sends a Supabase invite email, and
            backfills this participation with the new user&apos;s id.
          </p>
          {disabled && disabledReason ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {disabledReason}
            </p>
          ) : null}
        </div>
        <Button type="button" disabled={disabled || pending} onClick={invite}>
          {pending ? "Working…" : "Invite lender"}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
