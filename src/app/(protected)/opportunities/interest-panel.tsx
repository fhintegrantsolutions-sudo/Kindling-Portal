"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveNoteInterest,
  withdrawNoteInterest,
  type InterestActionState,
} from "@/lib/interest/actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Entity = { id: string; display_name: string };
type Interest = { entity_id: string; estimated_amount: number | null };

// "I'm interested" for the next note, shown during the 30-day interest window.
// Multi-entity lenders pick which entity; each entity's interest is separate.
export function InterestPanel({
  noteUuid,
  noteId,
  entities,
  defaultEntityId,
  interests,
}: {
  noteUuid: string;
  noteId: string;
  entities: Entity[];
  defaultEntityId: string | null;
  interests: Interest[];
}) {
  const multiEntity = entities.length > 1;
  const [entityId, setEntityId] = useState(
    defaultEntityId ?? (multiEntity ? "" : (entities[0]?.id ?? "")),
  );
  const [state, formAction, pending] = useActionState<
    InterestActionState | undefined,
    FormData
  >(saveNoteInterest.bind(null, noteUuid), undefined);
  const [withdrawing, startWithdraw] = useTransition();
  const [withdrawMsg, setWithdrawMsg] = useState<InterestActionState | null>(
    null,
  );

  const current = interests.find((i) => i.entity_id === entityId) ?? null;
  const nameOf = (id: string) =>
    entities.find((e) => e.id === id)?.display_name ?? "your entity";

  const withdraw = () => {
    if (!entityId) return;
    setWithdrawMsg(null);
    startWithdraw(async () => {
      setWithdrawMsg(await withdrawNoteInterest(noteUuid, entityId));
    });
  };

  return (
    <div className="flex w-full flex-col gap-3 border-t pt-4">
      {interests.length > 0 ? (
        <p className="text-sm">
          <span className="font-medium text-primary">You&apos;re interested</span>{" "}
          in {noteId}
          {multiEntity
            ? ` (${interests.map((i) => nameOf(i.entity_id)).join(", ")})`
            : ""}
          {interests.length === 1 && interests[0].estimated_amount
            ? ` · about ${formatCurrency(interests[0].estimated_amount)}`
            : ""}
          . We&apos;ll let you know when funding opens.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Planning to participate in {noteId}? Let us know — no commitment.
        </p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        {multiEntity ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interest_entity" className="text-xs">
              Entity
            </Label>
            <select
              id="interest_entity"
              name="entity_id"
              value={entityId}
              onChange={(e) => {
                setEntityId(e.target.value);
                setWithdrawMsg(null);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">— choose —</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.display_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="entity_id" value={entityId} />
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="interest_amount" className="text-xs">
            Estimated amount (optional)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              key={`${entityId}-${current?.estimated_amount ?? ""}`}
              id="interest_amount"
              name="estimated_amount"
              inputMode="decimal"
              defaultValue={
                current?.estimated_amount
                  ? current.estimated_amount.toLocaleString("en-US")
                  : ""
              }
              className="w-40 pl-7"
            />
          </div>
        </div>
        <Button type="submit" disabled={pending || !entityId}>
          {pending
            ? "Saving…"
            : current
              ? "Update interest"
              : "I'm interested"}
        </Button>
        {current ? (
          <Button
            type="button"
            variant="ghost"
            onClick={withdraw}
            disabled={withdrawing}
          >
            {withdrawing ? "…" : "Withdraw"}
          </Button>
        ) : null}
      </form>
      {(withdrawMsg ?? state)?.error ? (
        <p className="text-xs text-destructive">
          {(withdrawMsg ?? state)?.error}
        </p>
      ) : (withdrawMsg ?? state)?.message ? (
        <p className="text-xs text-muted-foreground">
          {(withdrawMsg ?? state)?.message}
        </p>
      ) : null}
    </div>
  );
}
