"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import {
  convertPartnerToLender,
  deleteExternalPartner,
  updateExternalPartner,
  type UpdateExternalPartnerState,
} from "@/lib/admin/referral-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  code: string;
  notes: string | null;
  link: string;
  convertedUserId: string | null;
};

export function ExternalPartnerRow(props: Props) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <EditForm {...props} onDone={() => setEditing(false)} />;
  }
  return <ViewRow {...props} onEdit={() => setEditing(true)} />;
}

function ViewRow({
  id,
  firstName,
  lastName,
  email,
  phone,
  businessName,
  code,
  notes,
  link,
  convertedUserId,
  onEdit,
}: Props & { onEdit: () => void }) {
  const name = `${firstName} ${lastName ?? ""}`.trim();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const onConvert = () => {
    if (!confirm(`Convert ${name} to a lender? This creates a portal account.`))
      return;
    setError(null);
    startTransition(async () => {
      try {
        await convertPartnerToLender(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const onDelete = () => {
    if (!confirm(`Delete ${name} and their referral code? This cannot be undone.`))
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteExternalPartner(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{name}</CardTitle>
            {businessName ? (
              <p className="text-sm font-medium text-muted-foreground">
                {businessName}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {email ?? "no email"}
              {phone ? ` · ${phone}` : ""}
            </p>
          </div>
          <code className="rounded-md border bg-muted px-2 py-0.5 text-xs font-medium tracking-wider">
            {code}
          </code>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 truncate rounded-md border bg-background px-2 py-1 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            {copied ? (
              <>
                <Check className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy link
              </>
            )}
          </Button>
        </div>
        {notes ? (
          <p className="text-xs text-muted-foreground">{notes}</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {convertedUserId ? (
            <Link
              href={`/admin/users/${convertedUserId}`}
              className="text-xs text-muted-foreground underline"
            >
              Converted to lender →
            </Link>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={pending}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onConvert}
                disabled={pending || !email}
                title={!email ? "Add an email before converting" : undefined}
              >
                {pending ? "Working…" : "Convert to lender"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditForm({
  id,
  firstName,
  lastName,
  email,
  phone,
  businessName,
  code,
  notes,
  onDone,
}: Props & { onDone: () => void }) {
  const boundAction = updateExternalPartner.bind(null, id);
  const [state, action, pending] = useActionState<
    UpdateExternalPartnerState | undefined,
    FormData
  >(boundAction, undefined);
  const fe = state?.fieldErrors ?? {};

  // Successful save flips back to view mode. revalidatePath in the action
  // refreshes the data, so the parent re-renders with the new values.
  useEffect(() => {
    if (state?.message) onDone();
  }, [state?.message, onDone]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">Edit partner</CardTitle>
          <code className="rounded-md border bg-muted px-2 py-0.5 text-xs font-medium tracking-wider">
            {code}
          </code>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <EditField
              name="first_name"
              label="First name"
              defaultValue={firstName}
              error={fe.first_name}
              required
            />
            <EditField
              name="last_name"
              label="Last name"
              defaultValue={lastName ?? ""}
              error={fe.last_name}
              required
            />
            <EditField
              name="email"
              label="Email"
              type="email"
              defaultValue={email ?? ""}
              error={fe.email}
              required
            />
            <EditField
              name="phone"
              label="Phone"
              type="tel"
              defaultValue={phone ?? ""}
              error={fe.phone}
              required
            />
            <EditField
              name="business_name"
              label="Business (optional)"
              defaultValue={businessName ?? ""}
              error={fe.business_name}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`notes-${id}`}>Notes</Label>
            <textarea
              id={`notes-${id}`}
              name="notes"
              rows={2}
              defaultValue={notes ?? ""}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </div>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDone}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditField({
  name,
  label,
  type = "text",
  defaultValue,
  error,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
