"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * The subset of a login the picker needs. Deliberately NOT the full
 * UserListItem — this is serialized to the client, so it carries only what is
 * shown (name, email, counts) plus created_at, which decides the default
 * survivor.
 */
export type MergeCandidate = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  entity_count: number;
  position_count: number;
  created_at: string;
};

export type PickerDuplicateGroup = {
  name: string;
  loginIds: string[];
};

function fullName(c: MergeCandidate): string {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Pick ANY two or more logins to merge — a name match is only a shortcut, never
 * the boundary. Search matches first name, last name, OR email so that a login
 * named after a trust/IRA custodian (whose profile name shares nothing with the
 * human) is still reachable by the email they share.
 *
 * Selection lives in plain useState, derived values in useMemo. No effects, no
 * refs: nothing here syncs state to state.
 */
export function MergePicker({
  candidates,
  duplicateGroups,
}: {
  candidates: MergeCandidate[];
  duplicateGroups: PickerDuplicateGroup[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // null = "no explicit choice yet", so the default (oldest) applies and keeps
  // applying as the selection changes.
  const [survivorId, setSurvivorId] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return candidates
      .filter((c) => {
        const hay = [c.first_name, c.last_name, c.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 50);
  }, [candidates, query]);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter((c): c is MergeCandidate => c !== undefined)
        // Oldest first — the default survivor reads at the top.
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [selectedIds, byId],
  );

  // Default survivor = oldest selected login. An explicit choice wins, but only
  // while that login is still selected.
  const effectiveSurvivorId =
    survivorId && selectedIds.includes(survivorId)
      ? survivorId
      : (selected[0]?.id ?? null);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const ready = selected.length >= 2 && effectiveSurvivorId !== null;

  let continueHref = "#";
  if (ready) {
    const params = new URLSearchParams();
    params.set("survivor", effectiveSurvivorId);
    for (const c of selected) {
      // The survivor is never also absorbed.
      if (c.id !== effectiveSurvivorId) params.append("absorbed", c.id);
    }
    continueHref = `/admin/users/merge?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="destructive">
        <AlertDescription>
          Merging is permanent for the absorbed login — that email will no longer
          be able to sign in. Only merge logins you have confirmed belong to the
          same person.
        </AlertDescription>
      </Alert>

      {duplicateGroups.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">
              Possible duplicate logins
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              A shortcut, not a limit — these logins merely share a name. Real
              duplicates often don&apos;t (a trust, an IRA custodian, a
              misspelling). Search below to pick any logins you like.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {duplicateGroups.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => {
                  setSelectedIds(g.loginIds);
                  setSurvivorId(null);
                }}
                className="rounded-full border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted"
              >
                {g.name}{" "}
                <span className="text-muted-foreground">
                  ({g.loginIds.length})
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find logins</CardTitle>
          <p className="text-sm text-muted-foreground">
            Search every login by first name, last name, or email. Tick two or
            more to merge them.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by first name, last name, or email…"
            aria-label="Search logins"
          />

          {query.trim() === "" ? (
            <p className="text-sm text-muted-foreground">
              {candidates.length} login(s) to search.
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No logins match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {fullName(c) || "—"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {c.email ?? "—"}
                        </span>
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {c.entity_count}{" "}
                        {c.entity_count === 1 ? "entity" : "entities"} ·{" "}
                        {c.position_count}{" "}
                        {c.position_count === 1 ? "position" : "positions"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Selected ({selected.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which login survives. It keeps its email and sign-in; the
            others are absorbed into it. Defaults to the oldest login.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing selected yet. Search above and tick two or more logins.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selected.map((c) => {
                const isSurvivor = c.id === effectiveSurvivorId;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                        isSurvivor
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="survivor"
                        className="size-4 shrink-0"
                        checked={isSurvivor}
                        onChange={() => setSurvivorId(c.id)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {fullName(c) || "—"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {c.email ?? "—"}
                        </span>
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {c.entity_count}{" "}
                          {c.entity_count === 1 ? "entity" : "entities"} ·{" "}
                          {c.position_count}{" "}
                          {c.position_count === 1 ? "position" : "positions"}
                        </span>
                        {isSurvivor ? (
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                            Survivor
                          </span>
                        ) : (
                          <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-destructive">
                            Absorbed
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            // The row is a <label> for the radio; don't let the
                            // remove click also pick a survivor.
                            e.preventDefault();
                            toggle(c.id);
                          }}
                          className="text-muted-foreground underline underline-offset-4 hover:no-underline"
                        >
                          Remove
                        </button>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {selected.length === 1 ? (
            <p className="text-sm text-muted-foreground">
              Select at least one more login to merge in.
            </p>
          ) : null}

          <div>
            {ready ? (
              <Link href={continueHref} className={buttonVariants()}>
                Continue — review {selected.length - 1} merge(s)
              </Link>
            ) : (
              <Button disabled>Continue</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
