import Link from "next/link";
import { getAllReferralCodes } from "@/lib/db/admin-queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminReferralsPage() {
  const codes = await getAllReferralCodes();
  const active = codes.filter((c) => c.is_active);
  const disabled = codes.filter((c) => !c.is_active);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Referrals
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Lenders who can refer new sign-ups via a unique code.
        </p>
      </header>

      <Section
        title={`Active (${active.length})`}
        codes={active}
        empty="No active referrers yet."
      />
      {disabled.length > 0 ? (
        <Section
          title={`Disabled (${disabled.length})`}
          codes={disabled}
          empty="No disabled referrers."
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  codes,
  empty,
}: {
  title: string;
  codes: Awaited<ReturnType<typeof getAllReferralCodes>>;
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {codes.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">{empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {codes.map((c) => (
            <Link
              key={c.id}
              href={`/admin/users/${c.user_id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{c.user_name ?? "—"}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {c.user_email}
                      </p>
                    </div>
                    <code className="rounded-md border bg-muted px-2 py-0.5 text-xs font-medium tracking-wider">
                      {c.code}
                    </code>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
                  <Field label="Total" value={String(c.total_referrals)} />
                  <Field
                    label="Signed up"
                    value={String(c.signed_up_referrals)}
                  />
                  <Field
                    label="Invested"
                    value={String(c.invested_referrals)}
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
