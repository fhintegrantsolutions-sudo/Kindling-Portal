"use client";

import { useEffect, useRef, useState } from "react";
import { updateNoteAdminNotes } from "@/lib/admin/note-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdminNotesCard({
  noteUuid,
  initial,
}: {
  noteUuid: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const firstRender = useRef(true);
  const inFlight = useRef(false);
  const pending = useRef<string | null>(null);

  // Debounced autosave, mirroring the participation funding form: the effect
  // re-runs on every change, an in-flight guard queues the newest snapshot so
  // saves never overlap.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const handle = setTimeout(() => {
      const run = async (snapshot: string) => {
        if (inFlight.current) {
          pending.current = snapshot;
          return;
        }
        inFlight.current = true;
        const res = await updateNoteAdminNotes(noteUuid, snapshot);
        inFlight.current = false;
        if (res?.error) {
          setError(res.error);
          setStatus("error");
        } else {
          setError(null);
          setStatus("saved");
        }
        const next = pending.current;
        pending.current = null;
        if (next !== null) void run(next);
      };
      void run(value);
    }, 1000);
    return () => clearTimeout(handle);
  }, [value, noteUuid]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Notes</CardTitle>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
            Admin only
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Internal — not visible to the lender.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <textarea
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add internal notes about this note…"
          className="w-full rounded-md border bg-background p-2 text-sm"
        />
        <div className="text-xs" aria-live="polite">
          {status === "error" ? (
            <span className="text-destructive">{error}</span>
          ) : status === "saving" ? (
            <span className="text-muted-foreground">Saving…</span>
          ) : status === "saved" ? (
            <span className="text-muted-foreground">All changes saved</span>
          ) : (
            <span className="invisible">placeholder</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
