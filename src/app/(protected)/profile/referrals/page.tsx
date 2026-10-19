import { redirect } from "next/navigation";
import { getMyReferralCode } from "@/lib/db/queries";
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const link = `${appUrl}/request-access?ref=${code.code}`;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Share your referral link with anyone who&apos;d like to request
        access.
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
    </div>
  );
}
