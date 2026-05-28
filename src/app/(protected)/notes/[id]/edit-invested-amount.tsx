"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import {
  updateMyInvestmentAmount,
  type UpdateInvestmentState,
} from "@/lib/registration/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";

// Read-mode renders inside its grid cell with a small Edit affordance.
// Edit-mode breaks out of the grid via the `editing` callback so the parent
// can render a wider form panel beneath the cards — gives the input + Save
// real estate without trying to cram everything into a 4-column stat slot.
export function EditInvestedAmount({
  participationId,
  invested,
  minInvestment,
  fundingReceived,
}: {
  participationId: string;
  invested: string;
  minInvestment: string | null;
  fundingReceived: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => Number(invested).toFixed(2));
  const boundAction = updateMyInvestmentAmount.bind(null, participationId);
  const [state, action, pending] = useActionState<
    UpdateInvestmentState | undefined,
    FormData
  >(boundAction, undefined);

  useEffect(() => {
    if (state?.message) setEditing(false);
  }, [state?.message]);

  // When the saved amount changes from the server (via revalidatePath after
  // a successful save), sync the draft so the next edit starts from the
  // canonical value rather than whatever was typed last.
  useEffect(() => {
    if (!editing) setDraft(Number(invested).toFixed(2));
  }, [invested, editing]);

  if (fundingReceived) {
    return (
      <span className="text-sm font-medium">{formatCurrency(invested)}</span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 text-left text-sm font-medium hover:text-primary"
        aria-label="Edit invested amount"
      >
        {formatCurrency(invested)}
        <Pencil className="size-3 text-muted-foreground transition-colors group-hover:text-primary" />
      </button>
    );
  }

  const min = minInvestment ? Number(minInvestment) : 0;

  return (
    <form
      action={action}
      className="col-span-2 flex flex-col gap-3 rounded-md border bg-muted/40 p-4 sm:col-span-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invested_amount">Invested amount</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="invested_amount"
            name="invested_amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={minInvestment ?? "0"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
            aria-invalid={
              Boolean(state?.fieldErrors?.invested_amount) || undefined
            }
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
        {min > 0 ? (
          <p className="text-xs text-muted-foreground">
            Minimum investment {formatCurrency(min)}.
          </p>
        ) : null}
        {state?.fieldErrors?.invested_amount ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.invested_amount}
          </p>
        ) : null}
        {state?.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
