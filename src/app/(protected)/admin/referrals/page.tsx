import Link from "next/link";
import {
  getAllReferralCodes,
  getExternalReferralPartners,
} from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddExternalPartnerForm } from "./add-external-partner-form";
import { ExternalPartnerRow } from "./external-partner-row";

export default async function AdminReferralsPage() {
  const [codes, externals] = await Promise.all([
    getAllReferralCodes(),
    getExternalReferralPartners(),
  ]);
  const byName = (a: string | null, b: string | null) =>
    (a ?? "~").localeCompare(b ?? "~", undefined, { sensitivity: "base" });
  const sortedCodes = [...codes].sort((a, b) => byName(a.user_name, b.user_name));
  const active = sortedCodes.filter((c) => c.is_active);
  const disabled = sortedCodes.filter((c) => !c.is_active);

  const sortedExternals = [...externals].sort((a, b) => {
    const an = `${a.first_name} ${a.last_name ?? ""}`.trim();
    const bn = `${b.first_name} ${b.last_name ?? ""}`.trim();
    return byName(an, bn);
  });
  const externalPending = sortedExternals.filter((e) => !e.converted_user_id);
  const externalConverted = sortedExternals.filter((e) => e.converted_user_id);

  // Public origin used to build sharable referral links. Falls back to a
  // relative path if the env var is missing — the form's ?ref= handler reads
  // the param either way.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Referrals
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Lenders and external partners who refer new sign-ups via a unique
          code. Enable referrals on an existing lender from their user page.
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

      <section className="flex flex-col gap-3 border-t pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">External partners</h2>
            <p className="text-xs text-muted-foreground">
              People who refer but don&apos;t hold a portal account. Convert
              them to a lender later if they decide to invest.
            </p>
          </div>
          <AddExternalPartnerForm />
        </div>
      </section>

      <ExternalSection
        title={`External — Active (${externalPending.length})`}
        partners={externalPending}
        appUrl={appUrl}
        empty="No external partners yet."
      />
      {externalConverted.length > 0 ? (
        <ExternalSection
          title={`External — Converted (${externalConverted.length})`}
          partners={externalConverted}
          appUrl={appUrl}
          empty="None converted yet."
        />
      ) : null}
    </div>
  );
}

function ExternalSection({
  title,
  partners,
  appUrl,
  empty,
}: {
  title: string;
  partners: Awaited<ReturnType<typeof getExternalReferralPartners>>;
  appUrl: string;
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {partners.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">{empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {partners.map((p) => {
            const link = `${appUrl}/request-access?ref=${p.referral_code}`;
            return (
              <ExternalPartnerRow
                key={p.id}
                id={p.id}
                firstName={p.first_name}
                lastName={p.last_name}
                email={p.email}
                phone={p.phone}
                businessName={p.business_name}
                code={p.referral_code}
                notes={p.notes}
                link={link}
                convertedUserId={p.converted_user_id}
              />
            );
          })}
        </div>
      )}
    </section>
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
              href={`/admin/referrals/${c.user_id}`}
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
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="Total" value={String(c.total_referrals)} />
                    <Field
                      label="Signed up"
                      value={String(c.signed_up_referrals)}
                    />
                    <Field
                      label="Invested"
                      value={String(c.invested_referrals)}
                    />
                    <Field
                      label="Volume"
                      value={formatCurrency(c.total_volume)}
                    />
                  </div>
                  {c.referred_names.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {c.referred_names.map((name, i) => (
                        <span
                          key={`${name}-${i}`}
                          className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}
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
