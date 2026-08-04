import Link from "next/link";
import { notFound } from "next/navigation";
import { getReferralPartnerDetail } from "@/lib/db/admin-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_LABEL: Record<string, string> = {
  pending: "Invited",
  signed_up: "Signed up",
  qualified: "Qualified",
  invested: "Invested",
};

export default async function ReferralPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { partner, referrals, totalVolume } =
    await getReferralPartnerDetail(id);
  if (!partner) notFound();

  const invested = referrals.filter((r) => r.status === "invested").length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <Link
        href="/admin/referrals"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to referrals
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Referral partner
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {partner.name}
          </h1>
          <p className="text-sm text-muted-foreground">{partner.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {partner.code ? (
            <code className="rounded-md border bg-muted px-2 py-0.5 font-medium tracking-wider">
              {partner.code}
            </code>
          ) : null}
          <Link
            href={`/admin/users/${partner.user_id}`}
            className="underline-offset-4 hover:underline"
          >
            View user profile →
          </Link>
        </div>
      </header>

      <Card>
        <CardContent className="grid grid-cols-3 gap-4 py-6 text-sm">
          <Stat label="Referrals" value={String(referrals.length)} />
          <Stat label="Invested" value={String(invested)} />
          <Stat label="Volume referred" value={formatCurrency(totalVolume)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Referred lenders ({referrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No referrals recorded for this partner yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Lender</th>
                    <th className="py-2 pr-2 font-medium text-right">Invested</th>
                    <th className="py-2 pr-2 font-medium text-right">Status</th>
                    <th className="py-2 pr-2 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="py-2 pr-2">
                        {r.referred_user_id ? (
                          <Link
                            href={`/admin/users/${r.referred_user_id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {r.referred_name ?? r.referred_email ?? "—"}
                          </Link>
                        ) : (
                          <span className="font-medium">
                            {r.referred_name ?? r.referred_email ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {r.first_investment_amount
                          ? formatCurrency(r.first_investment_amount)
                          : "—"}
                      </td>
                      <td className="py-2 pr-2 text-right text-xs">
                        {STATUS_LABEL[r.status] ?? r.status}
                      </td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">
                        {r.first_investment_date
                          ? formatDate(r.first_investment_date)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
