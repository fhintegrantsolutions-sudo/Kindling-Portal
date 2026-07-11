"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  submitAccessRequest,
  type AccessRequestFormState,
} from "@/lib/access-requests/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RequestAccessForm() {
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Capture ?ref=CODE on first render; persist to localStorage so a user
  // who navigates away and comes back keeps the credit. Read from either
  // the URL or localStorage.
  useEffect(() => {
    const fromUrl = searchParams.get("ref");
    if (fromUrl) {
      setReferralCode(fromUrl);
      try {
        localStorage.setItem("kindling_ref", fromUrl);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const stored = localStorage.getItem("kindling_ref");
      if (stored) setReferralCode(stored);
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  const [state, action, pending] = useActionState<
    AccessRequestFormState | undefined,
    FormData
  >(submitAccessRequest, undefined);
  const fe = state?.fieldErrors ?? {};

  if (state?.success) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" />
        <h2 className="font-serif text-2xl font-bold">Request submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks — we&apos;ll be in touch within a few business days.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {referralCode ? (
        <input type="hidden" name="referral_code" value={referralCode} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message (optional)</Label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full rounded-md border bg-background p-2 text-sm"
          placeholder="Anything you'd like us to know?"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Are you a CoSpark member? *</Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="is_tcc_member" value="yes" required />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="is_tcc_member" value="no" required />
            No
          </label>
        </div>
        {fe.is_tcc_member ? (
          <p className="text-xs text-destructive">{fe.is_tcc_member}</p>
        ) : null}
      </div>

      {referralCode ? (
        <p className="text-xs text-muted-foreground">
          Referred by code <span className="font-mono">{referralCode}</span>
        </p>
      ) : null}

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Request access"}
        </Button>
      </div>
    </form>
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
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
