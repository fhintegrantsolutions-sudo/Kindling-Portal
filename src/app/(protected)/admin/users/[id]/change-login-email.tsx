"use client";

import { useState, useTransition } from "react";
import { changeLoginEmail, type ChangeEmailState } from "@/lib/admin/user-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangeLoginEmail({
  userId,
  currentEmail,
}: {
  userId: string;
  currentEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ChangeEmailState | undefined>();
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    const next = String(formData.get("email") ?? "").trim();
    if (
      !confirm(
        `Change this user's login email to "${next}"?\n\nThey'll sign in with the new address and their existing password.`,
      )
    ) {
      return;
    }
    setState(undefined);
    startTransition(async () => {
      const res = await changeLoginEmail(userId, undefined, formData);
      setState(res);
      if (res.message) setOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Login email</p>
          <p className="text-xs text-muted-foreground">
            Current: <span className="font-medium">{currentEmail ?? "—"}</span>
          </p>
        </div>
        {open ? null : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setState(undefined);
              setOpen(true);
            }}
          >
            Change login email
          </Button>
        )}
      </div>

      {open ? (
        <form action={submit} className="flex flex-col gap-3">
          <Input
            name="email"
            type="email"
            required
            placeholder="new.email@example.com"
            defaultValue=""
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Updates the login only — the password is unchanged, and entity
            correspondence emails are left as-is.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

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
    </div>
  );
}
