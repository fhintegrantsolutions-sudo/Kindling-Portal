"use client";

import { useState, useTransition } from "react";
import { setAccessRequestCoSparkMember } from "@/lib/admin/access-request-actions";
import { Button } from "@/components/ui/button";

export function CoSparkToggle({
  requestId,
  isMember,
}: {
  requestId: string;
  isMember: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (value: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await setAccessRequestCoSparkMember(requestId, value);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground">CoSpark member?</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm font-medium">{isMember ? "Yes" : "No"}</span>
        {isMember ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={pending}
            onClick={() => set(false)}
          >
            {pending ? "…" : "Set No"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={pending}
            onClick={() => set(true)}
          >
            {pending ? "…" : "Mark as member"}
          </Button>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
