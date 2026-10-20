import Link from "next/link";
import { getMyBeneficiaries } from "@/lib/db/queries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { BeneficiaryList } from "./beneficiary-list";
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
        Beneficiaries are set per entity. Choose an entity from the switcher at
        the top of the left-hand menu to view or edit them.{" "}
        <Link
          href="/help/beneficiaries"
          className="font-medium text-foreground underline underline-offset-4"
        >
          How to set up beneficiaries
        </Link>
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
          passing.{" "}
          <Link
            href="/help/beneficiaries"
            className="font-medium text-foreground underline underline-offset-4"
          >
            How to set up beneficiaries
          </Link>
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
        <BeneficiaryList
          // Remount when the set of beneficiaries changes (add/delete) so the
          // editable percentages start from the saved values.
          key={beneficiaries.map((b) => b.id).join(",")}
          items={beneficiaries.map((b) => ({
            id: b.id,
            name: b.name,
            relation: b.relation,
            percentage: Number(b.percentage),
            type: b.type,
            dob: b.dob,
            phone: b.phone,
            address: b.address,
            ssn_last4: b.ssn_last4,
          }))}
        />
      )}
    </div>
  );
}
