"use client";

import { useActionState, useState } from "react";
import {
  updatePaymentDetails,
  type UpdatePaymentDetailsState,
} from "@/lib/admin/payment-actions";
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

export type PaymentDetailsInput = {
  payment_id: string;
  note_uuid: string;
  note_label: string;
  payment_date: string;
  payment_method: string | null;
  check_number: string | null;
  wire_reference: string | null;
  notes: string | null;
};

export function PaymentDetailsButton({ payment }: { payment: PaymentDetailsInput }) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    payment.payment_method ||
    payment.check_number ||
    payment.wire_reference ||
    payment.notes;

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
            <SheetTitle>Payment details</SheetTitle>
            <SheetDescription>{payment.note_label}</SheetDescription>
          </SheetHeader>
          <PaymentDetailsForm
            payment={payment}
            onSaved={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function PaymentDetailsForm({
  payment,
  onSaved,
}: {
  payment: PaymentDetailsInput;
  onSaved: () => void;
}) {
  const action = updatePaymentDetails.bind(
    null,
    payment.payment_id,
    payment.note_uuid,
  );
  const [state, formAction, pending] = useActionState<
    UpdatePaymentDetailsState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.message) {
      // Slight delay so the user sees confirmation before close.
      setTimeout(onSaved, 400);
    }
    return result;
  }, undefined);
  const [method, setMethod] = useState(payment.payment_method ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="payment_date">Payment date</Label>
        <Input
          id="payment_date"
          name="payment_date"
          type="date"
          defaultValue={payment.payment_date}
        />
      </div>

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
            defaultValue={payment.check_number ?? ""}
          />
        </div>
      ) : null}

      {method === "wire" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="wire_reference">Wire reference</Label>
          <Input
            id="wire_reference"
            name="wire_reference"
            defaultValue={payment.wire_reference ?? ""}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={payment.notes ?? ""}
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
