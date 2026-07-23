import Link from "next/link";
import { getMyBeneficiaries } from "@/lib/db/queries";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { DeleteBeneficiaryButton } from "./delete-button";
import { CopyBeneficiariesFromEntity } from "./copy-from-entity";

export default async function BeneficiariesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const ctx = await getCurrentEntityContext();

  // Beneficiaries are per-entity (the 100% rule is per-entity, and "Add" needs a
  // concrete target), so an "all entities" list would be meaningless.
  if (ctx?.mode === "all") {
    return (
      <p className="text-sm text-muted-foreground">
        Beneficiaries are set per entity. Choose an entity from the switcher to
        view or edit them.
      </p>
    );
  }

  const beneficiaries = await getMyBeneficiaries();
  const currentEntity =
    ctx?.entities.find((e) => e.id === ctx.currentEntityId) ?? null;
  const otherEntities = (ctx?.entities ?? []).filter(
    (e) => e.id !== ctx?.currentEntityId,
  );
  const showCopy = otherEntities.length > 0 && beneficiaries.length === 0;

  // Within each group, highest percentage first, then alphabetical by name.
  const byRank = (a: (typeof beneficiaries)[number], b: typeof a) =>
    b.percentage - a.percentage || a.name.localeCompare(b.name);
  const primary = beneficiaries
    .filter((b) => b.type === "Primary")
    .sort(byRank);
  const contingent = beneficiaries
    .filter((b) => b.type === "Contingent")
    .sort(byRank);

  const primaryTotal = primary.reduce((sum, b) => sum + b.percentage, 0);
  const contingentTotal = contingent.reduce((sum, b) => sum + b.percentage, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          People who inherit{" "}
          {currentEntity ? (
            <span className="font-medium text-foreground">
              {currentEntity.display_name}
            </span>
          ) : (
            "your"
          )}
          {currentEntity ? "’s" : ""} participation in the event of your
          passing.
        </p>
        <Link href="/profile/beneficiaries/new">
          <Button>Add beneficiary</Button>
        </Link>
      </div>

      {saved === "1" ? (
        <Alert>
          <AlertDescription>Beneficiary saved.</AlertDescription>
        </Alert>
      ) : null}

      {primaryTotal !== 0 && primaryTotal !== 100 ? (
        <Alert variant="destructive">
          <AlertDescription>
            Primary beneficiaries currently total {primaryTotal}%. They should
            sum to 100%.
          </AlertDescription>
        </Alert>
      ) : null}
      {contingentTotal !== 0 && contingentTotal !== 100 ? (
        <Alert variant="destructive">
          <AlertDescription>
            Contingent beneficiaries currently total {contingentTotal}%. They
            should sum to 100% (or 0% if you have none).
          </AlertDescription>
        </Alert>
      ) : null}

      {showCopy ? (
        <CopyBeneficiariesFromEntity sources={otherEntities} />
      ) : null}

      {beneficiaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No beneficiaries yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <BeneficiaryGroup
            title="Primary beneficiaries"
            total={primaryTotal}
            beneficiaries={primary}
          />
          {contingent.length > 0 ? (
            <BeneficiaryGroup
              title="Contingent beneficiaries"
              total={contingentTotal}
              beneficiaries={contingent}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

// One boxed section per beneficiary class, so Primary and Contingent read as
// distinct groups rather than a single run of cards.
function BeneficiaryGroup({
  title,
  total,
  beneficiaries,
}: {
  title: string;
  total: number;
  beneficiaries: Awaited<ReturnType<typeof getMyBeneficiaries>>;
}) {
  return (
    <section className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          {title}
        </h2>
        <span
          className={
            total === 100
              ? "text-xs text-muted-foreground"
              : "text-xs font-medium text-destructive"
          }
        >
          {total}%
        </span>
      </div>
      <div className="grid gap-3">
        {beneficiaries.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{b.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{b.relation}</p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs">
                  {b.percentage}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {b.dob ? <span>DOB {formatDate(b.dob)}</span> : null}
                {b.phone ? <span>{b.phone}</span> : null}
                {b.ssn_last4 ? <span>SSN ••••{b.ssn_last4}</span> : null}
                {b.address ? <span>{b.address}</span> : null}
              </div>
              <div className="flex gap-2">
                <Link href={`/profile/beneficiaries/${b.id}`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <DeleteBeneficiaryButton id={b.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

