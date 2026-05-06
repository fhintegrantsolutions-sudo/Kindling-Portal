"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/lib/admin/user-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RoleChange({
  userId,
  currentRole,
  isSelf,
  isLastAdmin,
}: {
  userId: string;
  currentRole: "admin" | "lender";
  isSelf: boolean;
  isLastAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const promote = () => {
    if (!confirm("Promote this user to admin?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateUserRole(userId, "admin");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update role");
      }
    });
  };

  const demote = () => {
    const confirmText = isSelf
      ? "Demote yourself to lender? You will lose admin access on the next page load."
      : "Demote this user to lender?";
    if (!confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateUserRole(userId, "lender");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update role");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Role</p>
          <p className="text-xs text-muted-foreground">
            Current: <span className="font-medium">{currentRole}</span>
          </p>
        </div>
        {currentRole === "lender" ? (
          <Button type="button" disabled={pending} onClick={promote}>
            {pending ? "Working…" : "Promote to admin"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending || isLastAdmin}
            onClick={demote}
          >
            {pending ? "Working…" : "Demote to lender"}
          </Button>
        )}
      </div>
      {currentRole === "admin" && isLastAdmin ? (
        <p className="text-xs text-muted-foreground">
          This is the last admin in the system. Promote another user to admin
          before demoting this one.
        </p>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
