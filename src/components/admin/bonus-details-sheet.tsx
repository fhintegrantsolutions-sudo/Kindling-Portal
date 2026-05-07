"use client";

import { useActionState, useState } from "react";
import {
  updateBonusDetails,
  type UpdateBonusDetailsState,
} from "@/lib/admin/bonus-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type BonusDetailsInput = {
  bonus_id: string;
  note_uuid: string;
  note_label: string;
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  notes: string | null;
};

export function BonusDetailsButton({ bonus }: { bonus: BonusDetailsInput }) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    bonus.payment_method ||
    bonus.check_number ||
    bonus.wire_reference ||
    bonus.notes;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 px-2 text-xs"
      >
        {hasDetails ? "Edit details" : "Add details"}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Bonus details</SheetTitle>
            <SheetDescription>{bonus.note_label}</SheetDescription>
          </SheetHeader>
          <BonusDetailsForm bonus={bonus} onSaved={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function BonusDetailsForm({
  bonus,
  onSaved,
}: {
  bonus: BonusDetailsInput;
  onSaved: () => void;
}) {
  const action = updateBonusDetails.bind(null, bonus.bonus_id, bonus.note_uuid);
  const [state, formAction, pending] = useActionState<
    UpdateBonusDetailsState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.message) setTimeout(onSaved, 400);
    return result;
  }, undefined);
  const [method, setMethod] = useState(bonus.payment_method ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="payment_method">Method</Label>
        <select
          id="payment_method"
          name="payment_method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">—</option>
          <option value="check">Check</option>
          <option value="wire">Wire</option>
          <option value="ach">ACH</option>
          <option value="other">Other</option>
        </select>
      </div>

      {method === "check" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="check_number">Check number</Label>
          <Input
            id="check_number"
            name="check_number"
            defaultValue={bonus.check_number ?? ""}
          />
        </div>
      ) : null}

      {method === "wire" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="wire_reference">Wire reference</Label>
          <Input
            id="wire_reference"
            name="wire_reference"
            defaultValue={bonus.wire_reference ?? ""}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={bonus.notes ?? ""}
          placeholder="Optional"
        />
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

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
