"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import {
  mergeLogins,
  type MergePreview,
  type MergeSummary,
} from "@/lib/admin/merge-actions";
import { formatCurrency } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM = "MERGE";

/**
 * The confirm step. Everything shown here comes from the server-computed
 * preview; the server re-derives it before it writes, so this component can
 * only ever ARM the merge, never define it.
 *
 * No effects, no refs: `confirm` and `result` are plain state, set from user
 * events / the action's return value.
 */
export function MergeForm({ preview }: { preview: MergePreview }) {
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<MergeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const absorbedIds = preview.absorbed.map((a) => a.id);
  const armed = confirm.trim() === CONFIRM && !pending;

  function onMerge() {
    setError(null);
    startTransition(async () => {
      const res = await mergeLogins(preview.survivor.id, absorbedIds, confirm);
      if (res.error) setError(res.error);
      else if (res.summary) setResult(res.summary);
    });
  }

  if (result) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-6">
        <p className="text-sm font-medium">Merge complete</p>
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          <li>
            {result.entitiesMoved} entity/entities moved to{" "}
            {preview.survivor.email ?? preview.survivor.id}
          </li>
          <li>
            {result.positionsMoved} position(s),{" "}
            {formatCurrency(result.investedMoved)} invested — moved intact
          </li>
          <li>{result.demoted} primary entity/entities demoted</li>
          {result.renamed.map((r) => (
            <li key={`${r.from}->${r.to}`}>
              Renamed &ldquo;{r.from}&rdquo; → &ldquo;{r.to}&rdquo;
            </li>
          ))}
          {Object.entries(result.rowsRepointed).map(([table, n]) => (
            <li key={table}>
              {table}: {n} row(s) re-pointed to the survivor
            </li>
          ))}
          {result.visibilityDuplicatesDropped > 0 ? (
            <li>
              {result.visibilityDuplicatesDropped} duplicate note-visibility
              grant(s) dropped (the survivor already had access)
            </li>
          ) : null}
          <li>
            referral codes: {result.referralCodesMoved} moved
            {result.referralCodesLeftBehind > 0
              ? `, ${result.referralCodesLeftBehind} LEFT on the absorbed login (conflict)`
              : ""}
            ; {result.referralsMoved} referral(s) moved
          </li>
          <li>
            {result.bannedUserIds.length} login(s) banned — they can no longer
            sign in.
          </li>
        </ul>
        {result.warnings.length > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </section>
    );
  }

  return (
    <>
      {preview.warnings.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <div>
          <p className="text-sm font-medium">What will move</p>
          <p className="text-xs text-muted-foreground">
            {preview.survivor.name ?? "—"} ({preview.survivor.email ?? "—"})
            currently owns {preview.survivor.entityCount} entity/entities and
            will end up with{" "}
            {preview.survivor.entityCount + preview.totals.entities}.
          </p>
        </div>

        {preview.absorbed.map((a) => (
          <div key={a.id} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{a.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{a.email ?? "—"}</p>
            </div>

            {a.entities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No entities — nothing to move from this login.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {a.entities.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{e.display_name}</span>
                      {e.newDisplayName !== e.display_name ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                          renamed → {e.newDisplayName}
                        </span>
                      ) : null}
                      {e.willDemote ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                          primary → secondary
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">
                      {e.positions} position(s) ·{" "}
                      {formatCurrency(e.invested)} invested — they travel with
                      the entity
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {a.referralCodes > 0 ? (
              <p className="text-xs text-muted-foreground">
                {a.referralCodes} referral code(s) on this login.
              </p>
            ) : null}
          </div>
        ))}

        <p className="text-sm">
          Total: <strong>{preview.totals.entities}</strong> entity/entities,{" "}
          <strong>{preview.totals.positions}</strong> position(s),{" "}
          <strong>{formatCurrency(preview.totals.invested)}</strong> invested.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <p className="text-sm font-medium">This cannot be undone</p>
        <ul className="list-disc pl-4 text-sm text-muted-foreground">
          <li>
            <strong>
              The absorbed login&apos;s email will no longer be able to sign in.
            </strong>{" "}
            {preview.absorbed.map((a) => a.email ?? a.id).join(", ")} will be
            banned (never deleted — their history is kept).
          </li>
          <li>
            Positions are not copied — they move. Afterwards they are visible
            only under {preview.survivor.email ?? "the survivor"}.
          </li>
        </ul>

        <div className="flex flex-col gap-2">
          <Label htmlFor="merge-confirm">
            Type {CONFIRM} to confirm
          </Label>
          <Input
            id="merge-confirm"
            value={confirm}
            autoComplete="off"
            placeholder={CONFIRM}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          variant="destructive"
          disabled={!armed}
          onClick={onMerge}
          className="w-fit"
        >
          {pending ? "Merging…" : "Merge logins"}
        </Button>
      </section>
    </>
  );
}
