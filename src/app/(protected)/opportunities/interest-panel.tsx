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

type Entity = { id: string; display_name: string };
type Interest = { entity_id: string; estimated_amount: number | null };

// "I'm interested" for the next note, shown during the 30-day interest window.
// Every entity the lender owns gets its own row, so several entities can each
// register interest (with their own optional estimated amount).
export function InterestPanel({
  noteUuid,
  noteId,
  entities,
  interests,
}: {
  noteUuid: string;
  noteId: string;
  entities: Entity[];
  interests: Interest[];
}) {
  const multiEntity = entities.length > 1;
  return (
    <div className="flex w-full flex-col gap-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        {interests.length > 0
          ? `Thanks — we'll let you know when ${noteId} funding opens.`
          : `Planning to participate in ${noteId}? Let us know — no commitment.`}
        {multiEntity ? " Each of your entities can register interest." : ""}
      </p>
      <div className="flex flex-col gap-2">
        {entities.map((e) => (
          <EntityInterestRow
            key={e.id}
            noteUuid={noteUuid}
            entity={e}
            showName={multiEntity}
            current={interests.find((i) => i.entity_id === e.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function EntityInterestRow({
  noteUuid,
  entity,
  showName,
  current,
}: {
  noteUuid: string;
  entity: Entity;
  showName: boolean;
  current: Interest | null;
}) {
  const [state, formAction, pending] = useActionState<
    InterestActionState | undefined,
    FormData
  >(saveNoteInterest.bind(null, noteUuid), undefined);
  const [withdrawing, startWithdraw] = useTransition();
  const [withdrawMsg, setWithdrawMsg] = useState<InterestActionState | null>(
    null,
  );
  const msg = withdrawMsg ?? state;

  const withdraw = () => {
    setWithdrawMsg(null);
    startWithdraw(async () => {
      setWithdrawMsg(await withdrawNoteInterest(noteUuid, entity.id));
    });
  };

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3 rounded-md border bg-background/60 p-3"
    >
      <input type="hidden" name="entity_id" value={entity.id} />
      {showName ? (
        <div className="min-w-[10rem] flex-1">
          <p className="text-sm font-medium">{entity.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {current
              ? `Interested${current.estimated_amount ? ` · about ${formatCurrency(current.estimated_amount)}` : ""}`
              : "Not yet"}
          </p>
        </div>
      ) : current ? (
        <p className="min-w-[10rem] flex-1 text-sm">
          <span className="font-medium text-primary">You&apos;re interested</span>
          {current.estimated_amount
            ? ` · about ${formatCurrency(current.estimated_amount)}`
            : ""}
        </p>
      ) : null}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          key={`${entity.id}-${current?.estimated_amount ?? ""}`}
          name="estimated_amount"
          inputMode="decimal"
          placeholder="Amount (optional)"
          aria-label={`Estimated amount for ${entity.display_name} (optional)`}
          defaultValue={
            current?.estimated_amount
              ? current.estimated_amount.toLocaleString("en-US")
              : ""
          }
          className="w-44 pl-7"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : current ? "Update" : "I'm interested"}
      </Button>
      {current ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={withdraw}
          disabled={withdrawing}
        >
          {withdrawing ? "…" : "Withdraw"}
        </Button>
      ) : null}
      {msg?.error ? (
        <p className="w-full text-xs text-destructive">{msg.error}</p>
      ) : msg?.message ? (
        <p className="w-full text-xs text-muted-foreground">{msg.message}</p>
      ) : null}
    </form>
  );
}
