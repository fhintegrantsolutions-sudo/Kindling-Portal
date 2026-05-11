"use client";

import { useActionState, useState } from "react";
import {
  addReferralPartner,
  type AddReferralPartnerState,
} from "@/lib/admin/referral-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Lender = { id: string; email: string; name: string | null };

export function AddPartnerForm({ lenders }: { lenders: Lender[] }) {
  const [state, formAction, pending] = useActionState<
    AddReferralPartnerState | undefined,
    FormData
  >(addReferralPartner, undefined);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const lc = search.trim().toLowerCase();
  const matches = !lc
    ? lenders.slice(0, 10)
    : lenders
        .filter(
          (l) =>
            (l.name ?? "").toLowerCase().includes(lc) ||
            l.email.toLowerCase().includes(lc),
        )
        .slice(0, 10);
  const selected = lenders.find((l) => l.id === selectedId);

  return (
    <form
      action={formAction}
      key={state?.message ?? "form"}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <h2 className="text-sm font-semibold">Add a referral partner</h2>
      <p className="text-xs text-muted-foreground">
        Flag a lender as a referral partner and generate a referral code in
        one step.
      </p>

      <input type="hidden" name="user_id" value={selectedId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="lender-search">Find a lender</Label>
        <Input
          id="lender-search"
          type="search"
          placeholder="Search by name or email…"
          value={selected ? `${selected.name ?? "—"} · ${selected.email}` : search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedId("");
          }}
        />
        {!selected && matches.length > 0 ? (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border bg-background p-1">
            {matches.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setSelectedId(l.id);
                  setSearch("");
                }}
                className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                <span>{l.name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">
                  {l.email}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending || !selectedId} size="sm">
          {pending ? "Adding…" : "Add as referral partner"}
        </Button>
      </div>
    </form>
  );
}
