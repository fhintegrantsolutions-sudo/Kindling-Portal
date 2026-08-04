"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/admin/user-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DeleteUser({
  userId,
  userLabel,
  isSelf,
  isLastAdmin,
  participationCount,
}: {
  userId: string;
  userLabel: string;
  isSelf: boolean;
  isLastAdmin: boolean;
  participationCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blockedReason = isSelf
    ? "You can't delete your own account."
    : isLastAdmin
      ? "This is the last admin — promote another admin first."
      : participationCount > 0
        ? `Holds ${participationCount} participation(s) — reassign or remove them first.`
        : null;

  const remove = () => {
    if (
      !confirm(
        `Permanently delete ${userLabel}?\n\nThis removes the login, profile, and its empty entities. This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res.error) {
        setError(res.error);
      } else {
        router.push("/admin/users");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-destructive">Delete user</p>
          <p className="text-xs text-muted-foreground">
            Permanently remove this login and its entities. Only possible when
            the user holds no participations.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
          disabled={pending || blockedReason !== null}
          onClick={remove}
        >
          {pending ? "Deleting…" : "Delete user"}
        </Button>
      </div>
      {blockedReason ? (
        <p className="text-xs text-muted-foreground">Can’t delete: {blockedReason}</p>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
