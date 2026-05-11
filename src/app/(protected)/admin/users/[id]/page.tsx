import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUserById,
  countAdmins,
  getReferralCodeByUserId,
} from "@/lib/db/admin-queries";
import { verifySession } from "@/lib/dal";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReferralsPanel } from "./referrals-panel";
import { RoleChange } from "./role-change";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getUserById(id);
  if (!detail) notFound();

  const session = await verifySession();
  const [adminCount, referralCode] = await Promise.all([
    countAdmins(),
    getReferralCodeByUserId(id),
  ]);
  const isSelf = session.userId === detail.profile.id;
  const isLastAdmin =
    detail.profile.role === "admin" && adminCount <= 1;

  const p = detail.profile;
  const fullAddress = [
    p.address_street,
    p.address_city,
    p.address_state,
    p.address_zip,
  ]
    .filter(Boolean)
    .join(", ");

  // Investment stats. detail.participations is ordered created_at DESC
  // (newest first) — so head=last note invested, tail=first note invested.
  // Count unique notes since a lender could in theory hold multiple
  // participations on the same note.
  const totalInvested = detail.participations.reduce(
    (sum, row) => sum + Number(row.invested_amount ?? 0),
    0,
  );
  const totalMonthly = detail.participations.reduce(
    (sum, row) => sum + (row.monthly_payment ?? 0),
    0,
  );
  const uniqueNoteIds = new Set(
    detail.participations
      .map((r) => r.note?.note_id)
      .filter((x): x is string => Boolean(x)),
  );
  const firstNote = detail.participations[detail.participations.length - 1]?.note ?? null;
  const lastNote = detail.participations[0]?.note ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to users
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
          </h1>
          <p className="text-sm text-muted-foreground">{p.email}</p>
          {isSelf ? (
            <p className="mt-1 text-xs text-muted-foreground">
              (this is you)
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span className="rounded-full border px-3 py-1">{p.role}</span>
          {(p as { is_referral_partner?: boolean }).is_referral_partner ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
              Referral partner
            </span>
          ) : null}
        </div>
      </header>

      <RoleChange
        userId={p.id}
        currentRole={p.role}
        isSelf={isSelf}
        isLastAdmin={isLastAdmin}
      />

      <ReferralsPanel userId={p.id} referralCode={referralCode} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Phone" value={p.phone ?? "—"} />
          <Field label="Entity type" value={p.entity_type ?? "—"} />
          <Field
            label="Loan agreement title"
            value={p.loan_agreement_title ?? "—"}
          />
          <Field
            label="Address"
            value={fullAddress || "—"}
            className="sm:col-span-3"
          />
          <Field
            label="Joined"
            value={new Date(p.created_at).toLocaleDateString()}
          />
        </CardContent>
      </Card>

      {detail.participations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investment summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Field
              label="Total invested"
              value={formatCurrency(totalInvested)}
            />
            <Field
              label="Monthly payment"
              value={
                totalMonthly > 0 ? formatCurrency(totalMonthly) : "—"
              }
            />
            <Field
              label={`Notes (${uniqueNoteIds.size})`}
              value={String(uniqueNoteIds.size)}
            />
            <Field
              label="First note"
              value={firstNote?.note_id ?? "—"}
            />
            <Field
              label="Latest note"
              value={lastNote?.note_id ?? "—"}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Participations ({detail.participations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {detail.participations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No participations.</p>
          ) : (
            detail.participations.map((row) => {
              const label = row.funding_cleared
                ? "Cleared"
                : row.funding_deposited
                  ? "Deposited"
                  : row.funding_received
                    ? "Received"
                    : "Awaiting funding";
              return (
                <Link
                  key={row.id}
                  href={`/admin/participations/${row.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">
                      {row.note?.note_id} · {row.note?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(row.invested_amount)} · {label} ·{" "}
                      {row.status}
                      {row.monthly_payment !== null
                        ? ` · ${formatCurrency(row.monthly_payment)}/mo`
                        : ""}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Beneficiaries ({detail.beneficiaries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {detail.beneficiaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No beneficiaries.</p>
          ) : (
            detail.beneficiaries.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.relation} · {b.type}
                  </p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs">
                  {b.percentage}%
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
