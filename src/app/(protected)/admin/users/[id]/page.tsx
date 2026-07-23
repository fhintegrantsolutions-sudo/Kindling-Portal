import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUserById,
  countAdmins,
  getReferralCodeByUserId,
  getEntitiesForUser,
  getAdminUserNeighbors,
  type UserDetail,
} from "@/lib/db/admin-queries";
import { verifySession } from "@/lib/dal";
import { formatCurrency, formatDate, formatNoteLabel } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntitiesPanel } from "./entities-panel";
import { ReferralsPanel } from "./referrals-panel";
import { RoleChange } from "./role-change";
import { UserSiblingNav } from "./user-sibling-nav";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getUserById(id);
  if (!detail) notFound();

  const session = await verifySession();
  const [adminCount, referralCode, entities, neighbors] = await Promise.all([
    countAdmins(),
    getReferralCodeByUserId(id),
    getEntitiesForUser(id),
    getAdminUserNeighbors(id),
  ]);
  const isSelf = session.userId === detail.profile.id;
  const isLastAdmin =
    detail.profile.role === "admin" && adminCount <= 1;

  const p = detail.profile;

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

  // A single login can own several legally-separate entities, so group the
  // participations under each entity and subtotal per group — a blended
  // whole-login monthly (kept above in the summary) isn't a real payee.
  // Insertion order follows detail.participations (created_at DESC), so the
  // entity of the newest participation heads the list.
  const entityGroups: {
    key: string;
    name: string;
    invested: number;
    monthly: number;
    rows: typeof detail.participations;
  }[] = [];
  const groupIndex = new Map<string, number>();
  for (const row of detail.participations) {
    const key = row.entity?.id ?? "__none__";
    let i = groupIndex.get(key);
    if (i === undefined) {
      i = entityGroups.length;
      groupIndex.set(key, i);
      entityGroups.push({
        key,
        name: row.entity?.display_name ?? "No entity",
        invested: 0,
        monthly: 0,
        rows: [],
      });
    }
    entityGroups[i].invested += Number(row.invested_amount ?? 0);
    entityGroups[i].monthly += row.monthly_payment ?? 0;
    entityGroups[i].rows.push(row);
  }

  // Beneficiary designations are per-entity, and within an entity Primary and
  // Contingent are separate classes that EACH total 100% — so we group by
  // entity, then split each entity into its two classes with their own totals.
  // Order: primary entity first (then entities A-Z); within an entity, Primary
  // class before Contingent; within a class, beneficiaries A-Z by name.
  const primaryEntityId = entities.find((e) => e.is_primary)?.id ?? null;
  type BenClass = { total: number; rows: typeof detail.beneficiaries };
  const beneficiaryGroups = new Map<
    string,
    { name: string; isPrimary: boolean; primary: BenClass; contingent: BenClass }
  >();
  for (const b of detail.beneficiaries) {
    const key = b.entity?.id ?? "__none__";
    let group = beneficiaryGroups.get(key);
    if (!group) {
      group = {
        name: b.entity?.display_name ?? "No entity",
        isPrimary: key === primaryEntityId,
        primary: { total: 0, rows: [] },
        contingent: { total: 0, rows: [] },
      };
      beneficiaryGroups.set(key, group);
    }
    const cls = b.type === "Contingent" ? group.contingent : group.primary;
    cls.total += Number(b.percentage ?? 0);
    cls.rows.push(b);
  }
  const byName = (a: (typeof detail.beneficiaries)[number], b: typeof a) =>
    a.name.localeCompare(b.name);
  const orderedBenGroups = [...beneficiaryGroups.entries()]
    .map(([key, g]) => {
      g.primary.rows.sort(byName);
      g.contingent.rows.sort(byName);
      return { key, ...g };
    })
    .sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) ||
        a.name.localeCompare(b.name),
    );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to users
        </Link>
        <UserSiblingNav prev={neighbors.prev} next={neighbors.next} />
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
          </h1>
          <p className="text-sm text-muted-foreground">{p.email}</p>
          <p className="text-xs text-muted-foreground">
            {p.phone ?? "No phone"} · Joined {formatDate(p.created_at)}
          </p>
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

      <EntitiesPanel userId={p.id} entities={entities} />

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
        <CardContent className="flex flex-col gap-5">
          {detail.participations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No participations.</p>
          ) : (
            entityGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4 border-b pb-1">
                  <h3 className="text-sm font-semibold">{group.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(group.invested)}
                    {group.monthly > 0
                      ? ` · ${formatCurrency(group.monthly)}/mo`
                      : ""}
                  </p>
                </div>
                {group.rows.map((row) => {
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
                          {row.note
                            ? formatNoteLabel(row.note.note_id, row.note.title)
                            : "—"}
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
                })}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Beneficiaries ({detail.beneficiaries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {detail.beneficiaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No beneficiaries.</p>
          ) : (
            orderedBenGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  {group.name}
                  {group.isPrimary ? (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                      Primary entity
                    </span>
                  ) : null}
                </h3>
                <BeneficiaryClass
                  label="Primary"
                  total={group.primary.total}
                  rows={group.primary.rows}
                />
                {group.contingent.rows.length > 0 ? (
                  <BeneficiaryClass
                    label="Contingent"
                    total={group.contingent.total}
                    rows={group.contingent.rows}
                  />
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ReferralsPanel userId={p.id} referralCode={referralCode} />

      <RoleChange
        userId={p.id}
        currentRole={p.role}
        isSelf={isSelf}
        isLastAdmin={isLastAdmin}
      />
    </div>
  );
}

// One beneficiary class (Primary or Contingent) within an entity, with its own
// 100% total — shown red when it doesn't add up.
function BeneficiaryClass({
  label,
  total,
  rows,
}: {
  label: string;
  total: number;
  rows: UserDetail["beneficiaries"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 border-b pb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={
            Math.round(total) === 100
              ? "text-xs text-muted-foreground"
              : "text-xs text-destructive"
          }
        >
          {total}%
        </p>
      </div>
      {rows.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.relation}</p>
          </div>
          <span className="rounded-full border px-2 py-0.5 text-xs">
            {b.percentage}%
          </span>
        </div>
      ))}
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
