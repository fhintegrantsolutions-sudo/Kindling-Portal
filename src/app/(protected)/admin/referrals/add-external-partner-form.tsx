"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  createExternalPartner,
  type CreateExternalPartnerState,
} from "@/lib/admin/referral-actions";
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
  SheetTrigger,
} from "@/components/ui/sheet";

export function AddExternalPartnerForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    CreateExternalPartnerState | undefined,
    FormData
  >(createExternalPartner, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state?.fieldErrors ?? {};

  // Close the sheet on successful save and reset the form for the next entry.
  useEffect(() => {
    if (state?.message) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state?.message]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm">
            <Plus className="size-3.5" />
            Add external partner
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Add an external partner</SheetTitle>
          <SheetDescription>
            Generates a referral code + sign-up link without creating a portal
            account. Convert to a full lender later if they invest.
          </SheetDescription>
        </SheetHeader>

        <form ref={formRef} action={action} className="flex flex-col gap-3">
          <Field
            name="first_name"
            label="First name"
            error={fe.first_name}
            required
          />
          <Field
            name="last_name"
            label="Last name"
            error={fe.last_name}
            required
          />
          <Field
            name="email"
            label="Email"
            type="email"
            error={fe.email}
            required
          />
          <Field
            name="phone"
            label="Phone"
            type="tel"
            error={fe.phone}
            required
          />
          <Field
            name="business_name"
            label="Business (optional)"
            error={fe.business_name}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Anything to remember about this partner…"
            />
          </div>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Adding…" : "Add external partner"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  name,
  label,
  type = "text",
  error,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
