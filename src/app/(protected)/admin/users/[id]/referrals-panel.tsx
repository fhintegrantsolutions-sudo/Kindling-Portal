"use client";

import { useState, useTransition } from "react";
import {
  createReferralCode,
  setReferralCodeActive,
} from "@/lib/admin/referral-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ReferralCode = {
  id: string;
  code: string;
  is_active: boolean;
  total_referrals: number;
  signed_up_referrals: number;
  invested_referrals: number;
};

export function ReferralsPanel({
  userId,
  referralCode,
}: {
  userId: string;
  referralCode: ReferralCode | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const enable = () => {
    if (
      !confirm(
        "Enable referrals for this user? A unique code will be generated.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await createReferralCode(userId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to enable referrals");
      }
    });
  };

  const setActive = (next: boolean) => {
    if (!referralCode) return;
    if (
      !confirm(
        next ? "Re-enable referrals for this user?" : "Disable referrals for this user?",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await setReferralCodeActive(referralCode.id, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update");
      }
    });
  };

  if (!referralCode) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Referrals</p>
            <p className="text-xs text-muted-foreground">
              Referrals not enabled for this user.
            </p>
          </div>
          <Button type="button" disabled={pending} onClick={enable}>
            {pending ? "Working…" : "Enable referrals"}
          </Button>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Referrals</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded-md border bg-muted px-2 py-0.5 text-xs font-medium tracking-wider">
              {referralCode.code}
            </code>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                referralCode.is_active ? "" : "text-muted-foreground"
              }`}
            >
              {referralCode.is_active ? "Active" : "Disabled"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {referralCode.total_referrals} total ·{" "}
            {referralCode.signed_up_referrals} signed up ·{" "}
            {referralCode.invested_referrals} invested
          </p>
        </div>
        {referralCode.is_active ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setActive(false)}
          >
            {pending ? "Working…" : "Disable"}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending}
            onClick={() => setActive(true)}
          >
            {pending ? "Working…" : "Re-enable"}
          </Button>
        )}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
