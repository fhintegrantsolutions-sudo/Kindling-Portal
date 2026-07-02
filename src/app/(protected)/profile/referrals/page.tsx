import { redirect } from "next/navigation";
import { getMyReferralCode, getMyReferrals } from "@/lib/db/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyLinkButton } from "./copy-link-button";

export default async function MyReferralsPage() {
  const code = await getMyReferralCode();
  if (!code?.is_active) {
    redirect("/profile");
  }

  const referrals = await getMyReferrals();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const link = `${appUrl}/request-access?ref=${code.code}`;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Share your referral link. New lenders who sign up using it will be
        tracked here.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your referral code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <code className="rounded-md border bg-muted px-3 py-1.5 text-base font-medium tracking-widest">
              {code.code}
            </code>
            <CopyLinkButton link={link} />
          </div>
          <p className="break-all text-xs text-muted-foreground">{link}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Your referrals ({referrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet.</p>
          ) : (
            referrals.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.referred_name ?? r.referred_email ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.referred_email ?? "no email"} · referred{" "}
                    {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span className="rounded-full border px-2 py-0.5">
                    {r.status.replace("_", " ")}
                  </span>
                  {r.first_investment_amount ? (
                    <span className="text-muted-foreground">
                      {formatCurrency(r.first_investment_amount)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
