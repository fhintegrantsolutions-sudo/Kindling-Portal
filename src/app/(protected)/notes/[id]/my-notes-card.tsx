"use client";

import { useEffect, useRef, useState } from "react";
import { updateMyParticipationNotes } from "@/lib/notes/my-notes-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MyNotesCard({
  participationId,
  initial,
}: {
  participationId: string;
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

  // Debounced autosave; an in-flight guard queues the newest snapshot so saves
  // never overlap.
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
        const res = await updateMyParticipationNotes(participationId, snapshot);
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
  }, [value, participationId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My notes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Private to you — jot down anything you want to remember about this
          note. Only you can see these.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <textarea
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a private note…"
          className="w-full rounded-md border bg-background p-2 text-sm"
        />
        <div className="text-xs" aria-live="polite">
          {status === "error" ? (
            <span className="text-destructive">{error}</span>
          ) : status === "saving" ? (
            <span className="text-muted-foreground">Saving…</span>
          ) : status === "saved" ? (
            <span className="text-muted-foreground">Saved</span>
          ) : (
            <span className="invisible">placeholder</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
