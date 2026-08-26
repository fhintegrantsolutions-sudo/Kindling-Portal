"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink } from "lucide-react";
import {
  updateProfile,
  type ProfileFormState,
} from "@/lib/profile/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { StateSelect } from "@/components/state-select";
import { ZipInput } from "@/components/zip-input";

type ProfileDefaults = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

export function ProfileForm({
  defaults,
}: {
  defaults: ProfileDefaults;
}) {
  const [state, action, pending] = useActionState<
    ProfileFormState | undefined,
    FormData
  >(updateProfile, undefined);

  // React 19 auto-resets a form after its Server Action resolves, which
  // restores each input's `defaultValue`. We re-key the form on the current
  // server-side defaults so it remounts with the just-saved values rather
  // than the originals — otherwise the form would appear to "forget" the
  // save on next render.
  const formKey = JSON.stringify(defaults);

  return (
    <form action={action} key={formKey} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          name="first_name"
          label="First name"
          defaultValue={defaults.first_name}
          disabled
          hint="Contact us to change your legal name."
        />
        <FieldInput
          name="last_name"
          label="Last name"
          defaultValue={defaults.last_name}
          disabled
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <PhoneInput name="phone" defaultValue={defaults.phone} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium">Mailing address</h2>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          W-9 forms are issued digitally. If a physical copy ever needs to be
          mailed, please provide your mailing address below.
        </p>
        <div className="flex flex-col gap-4">
          <FieldInput
            name="address_street"
            label="Street"
            defaultValue={defaults.address_street}
          />
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <FieldInput
              name="address_city"
              label="City"
              defaultValue={defaults.address_city}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="address_state">State</Label>
              <StateSelect
                name="address_state"
                defaultValue={defaults.address_state}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address_zip">ZIP</Label>
              <ZipInput
                name="address_zip"
                defaultValue={defaults.address_zip}
              />
            </div>
          </div>
        </div>
      </section>

      {state?.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {state?.addressChanged ? <W9Prompt key={state.savedAt} /> : null}
    </form>
  );
}

// Rendered (freshly, via key on savedAt) only after a save that changed the
// mailing address; opens itself so the lender is prompted to review their W-9.
function W9Prompt() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg transition data-ending-style:opacity-0 data-starting-style:opacity-0">
          <Dialog.Title className="font-serif text-lg font-bold tracking-tight">
            Update your W-9?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Your mailing address was updated. If this reflects a change of
            address, your W-9 on file may also need to be updated so your tax
            reporting stays accurate.
          </Dialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close className={buttonVariants({ variant: "outline" })}>
              Not now
            </Dialog.Close>
            <a
              href="https://www.kindling.network/forms"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
              onClick={() => setOpen(false)}
            >
              Update W-9
              <ExternalLink className="ml-2 size-4" />
            </a>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FieldInput({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  className,
  disabled,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        disabled={disabled}
        className={
          disabled ? "cursor-not-allowed bg-muted/40 text-muted-foreground" : undefined
        }
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
