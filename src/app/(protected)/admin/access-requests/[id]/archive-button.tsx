"use client";

import { useState, useTransition } from "react";
import { setAccessRequestArchived } from "@/lib/admin/access-request-actions";
import { Button } from "@/components/ui/button";

export function ArchiveButton({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (
      !archived &&
      !confirm(
        "Archive this request? It will be hidden from the working tabs. You can restore it from the Archived tab.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setAccessRequestArchived(id, !archived);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={archived ? "outline" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={pending}
        onClick={run}
      >
        {pending ? "…" : archived ? "Restore" : "Archive"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
