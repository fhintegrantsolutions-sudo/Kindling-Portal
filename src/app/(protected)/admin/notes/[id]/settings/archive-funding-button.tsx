"use client";

import { useState, useTransition } from "react";
import { archiveNoteFunding } from "@/lib/admin/note-actions";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ArchiveFundingButton({
  noteId,
  archivedAt,
  warnings,
}: {
  noteId: string;
  archivedAt: string | null;
  warnings: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (archivedAt) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-muted bg-muted/30 p-6">
        <p className="text-sm font-medium">Funding archived</p>
        <p className="text-xs text-muted-foreground">
          ✓ Archived {formatDate(archivedAt)}. This note no
          longer appears in the active funding workflow. Its records remain in
          the &ldquo;Archived&rdquo; filter and on this page.
        </p>
      </div>
    );
  }

  const archive = () => {
    const message =
      warnings.length > 0
        ? `Archive this note's funding round?\n\n${warnings
            .map((w) => `• ${w}`)
            .join(
              "\n",
            )}\n\nArchiving is one-way and removes it from the active funding workflow. Continue?`
        : "Archive this note's funding round? This is one-way and removes it from the active funding workflow.";
    if (!confirm(message)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await archiveNoteFunding(noteId);
        if (result?.error) setError(result.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to archive");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Archive funding workflow</p>
          <p className="text-xs text-muted-foreground">
            Removes this note from the active admin funding workflow once it is
            fully funded and live. One-way; does not change the note&apos;s
            status or any lender view.
          </p>
          {warnings.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-600">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={archive}
        >
          {pending ? "Working…" : "Archive funding"}
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
