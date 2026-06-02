import Link from "next/link";
import {
  Archive,
  Banknote,
  CheckCircle2,
  CircleDashed,
  Hourglass,
  Layers,
  UserPlus,
} from "lucide-react";
import { getParticipations } from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FilterValue =
  | "all"
  | "awaiting_funding"
  | "received"
  | "deposited"
  | "cleared"
  | "awaiting_invite"
  | "archived";

export default async function AdminParticipationsPage({
  searchParams,
}: {
  searchParams: Promise<{ funding?: FilterValue }>;
}) {
  const sp = await searchParams;
  const filter = sp.funding ?? "all";
  const allParticipations = await getParticipations();

  const isArchived = (p: {
    note: { funding_archived_at: string | null } | null;
  }) => p.note?.funding_archived_at != null;

  // Active workflow excludes archived notes entirely; the Archived filter shows
  // only those.
  const active = allParticipations.filter((p) => !isArchived(p));
  const archived = allParticipations.filter(isArchived);

  const matchesStage = (p: {
    funding_received: boolean;
    funding_deposited: boolean;
    funding_cleared: boolean;
    user_id: string | null;
  }): boolean => {
    switch (filter) {
      case "awaiting_funding":
        return !p.funding_received;
      case "received":
        return (
          p.funding_received && !p.funding_deposited && !p.funding_cleared
        );
      case "deposited":
        return p.funding_deposited && !p.funding_cleared;
      case "cleared":
        return p.funding_cleared;
      case "awaiting_invite":
        return p.funding_cleared && p.user_id === null;
      case "archived":
        return false;
      case "all":
      default:
        return true;
    }
  };

  const byLender = (
    a: { lender_name: string | null; lender_email: string | null },
    b: { lender_name: string | null; lender_email: string | null },
  ) => {
    const an = (a.lender_name ?? a.lender_email ?? "~").toLowerCase();
    const bn = (b.lender_name ?? b.lender_email ?? "~").toLowerCase();
    return an.localeCompare(bn);
  };

  // Archived view: sort by note_id then lender so same-note rows group together.
  // Active views: filter by funding stage, sort by lender.
  const participations =
    filter === "archived"
      ? [...archived].sort((a, b) => {
          const noteCmp = (a.note?.note_id ?? "~").localeCompare(
            b.note?.note_id ?? "~",
          );
          return noteCmp !== 0 ? noteCmp : byLender(a, b);
        })
      : active.filter(matchesStage).sort(byLender);

  const counts = {
    all: active.length,
    awaiting_funding: active.filter((p) => !p.funding_received).length,
    received: active.filter(
      (p) => p.funding_received && !p.funding_deposited && !p.funding_cleared,
    ).length,
    deposited: active.filter(
      (p) => p.funding_deposited && !p.funding_cleared,
    ).length,
    cleared: active.filter((p) => p.funding_cleared).length,
    awaiting_invite: active.filter(
      (p) => p.funding_cleared && p.user_id === null,
    ).length,
    archived: archived.length,
  };

  const clearedInvested = active
    .filter((p) => p.funding_cleared)
    .reduce((sum, p) => sum + Number(p.invested_amount), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Admin · Participations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Funding workflow
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <Stat
          label="All"
          value={String(counts.all)}
          subtitle={`${formatCurrency(clearedInvested)} cleared`}
          icon={<Layers className="size-4" />}
          href="/admin/participations"
          active={filter === "all"}
        />
        <Stat
          label="Awaiting funding"
          value={String(counts.awaiting_funding)}
          icon={<Hourglass className="size-4" />}
          href="/admin/participations?funding=awaiting_funding"
          active={filter === "awaiting_funding"}
        />
        <Stat
          label="Received"
          value={String(counts.received)}
          icon={<Banknote className="size-4" />}
          href="/admin/participations?funding=received"
          active={filter === "received"}
        />
        <Stat
          label="Deposited"
          value={String(counts.deposited)}
          icon={<CircleDashed className="size-4" />}
          href="/admin/participations?funding=deposited"
          active={filter === "deposited"}
        />
        <Stat
          label="Cleared"
          value={String(counts.cleared)}
          icon={<CheckCircle2 className="size-4" />}
          href="/admin/participations?funding=cleared"
          active={filter === "cleared"}
        />
        <Stat
          label="Awaiting invite"
          value={String(counts.awaiting_invite)}
          icon={<UserPlus className="size-4" />}
          href="/admin/participations?funding=awaiting_invite"
          active={filter === "awaiting_invite"}
        />
        <Stat
          label="Archived"
          value={String(counts.archived)}
          icon={<Archive className="size-4" />}
          href="/admin/participations?funding=archived"
          active={filter === "archived"}
        />
      </section>

      {participations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No participations match this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {participations.map((p) => (
            <Link
              key={p.id}
              href={`/admin/participations/${p.id}`}
              className="block rounded-lg transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p.note?.note_id} ·{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                        {p.note?.funding_archived_at
                          ? ` · Archived ${new Date(
                              p.note.funding_archived_at,
                            ).toLocaleDateString()}`
                          : ""}
                      </p>
                      <CardTitle>{p.note?.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.lender_name ?? p.lender_email ?? "—"}
                      </p>
                      {p.business_name ? (
                        <p className="text-xs text-muted-foreground">
                          {p.business_name}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <LeadSourceBadge isNewLead={p.user_id === null} />
                      <FundingBadge p={p} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field
                    label="Invested"
                    value={formatCurrency(p.invested_amount)}
                  />
                  <Field
                    label="Funding type"
                    value={titleCase(p.funding_type)}
                  />
                  <Field label="Status" value={p.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadSourceBadge({ isNewLead }: { isNewLead: boolean }) {
  return isNewLead ? (
    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
      New lead
    </span>
  ) : (
    <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
      Returning lender
    </span>
  );
}

function FundingBadge({
  p,
}: {
  p: {
    funding_received: boolean;
    funding_deposited: boolean;
    funding_cleared: boolean;
    user_id: string | null;
  };
}) {
  if (p.funding_cleared && p.user_id === null) {
    return (
      <span className="rounded-full border px-2 py-0.5">Awaiting invite</span>
    );
  }
  const label = p.funding_cleared
    ? "Cleared"
    : p.funding_deposited
      ? "Deposited"
      : p.funding_received
        ? "Received"
        : "Awaiting funding";
  return <span className="rounded-full border px-2 py-0.5">{label}</span>;
}

function Stat({
  label,
  value,
  subtitle,
  icon,
  href,
  active,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card
        className={`flex h-full flex-col transition-colors hover:bg-muted/40 ${
          active ? "ring-2 ring-primary" : ""
        }`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className="shrink-0 text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent className="mt-auto">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p
            className={`mt-1 text-xs text-muted-foreground tabular-nums ${
              subtitle ? "" : "invisible"
            }`}
          >
            {subtitle ?? "—"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function titleCase(value: string | null): string {
  if (!value) return "—";
  // ACH stays uppercase; everything else becomes Sentence-case.
  if (value.toLowerCase() === "ach") return "ACH";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
