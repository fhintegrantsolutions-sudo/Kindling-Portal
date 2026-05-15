"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  createUser,
  type CreateUserState,
} from "@/lib/admin/user-actions";
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

export function CreateUserSheet() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    CreateUserState | undefined,
    FormData
  >(createUser, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state?.fieldErrors ?? {};

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
            Create user
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Create user</SheetTitle>
          <SheetDescription>
            Adds an auth account and profile in one step. Use this for one-off
            admin invites; bulk lender imports still go through the CSV script.
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
          <Field name="phone" label="Phone (optional)" type="tel" error={fe.phone} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              name="role"
              defaultValue="admin"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="admin">Admin (full access)</option>
              <option value="participations_admin">
                Participations admin (view & edit participations only)
              </option>
              <option value="lender">Lender</option>
            </select>
            {fe.role ? (
              <p className="text-xs text-destructive">{fe.role}</p>
            ) : null}
          </div>

          <label className="flex items-start gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              name="send_invite"
              defaultChecked
              className="mt-0.5"
            />
            <span className="flex flex-col">
              <span>Send password-reset email so they can set their own.</span>
              <span className="text-xs text-muted-foreground">
                Supabase free tier limits invite emails to 4/hour.
              </span>
            </span>
          </label>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Creating…" : "Create user"}
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
