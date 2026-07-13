import { getCurrentEntityIdentity } from "@/lib/entities/context";
import { Label } from "@/components/ui/label";

export default async function LoanAgreementPage() {
  // These details live on the investor entity (admin-managed) and are specific
  // to ONE entity, so this tab follows the entity switcher. In "all" mode there
  // is no single set of paperwork to show.
  const entity = await getCurrentEntityIdentity();

  if (!entity) {
    return (
      <p className="text-sm text-muted-foreground">
        Loan agreement details are specific to one entity. Choose an entity from
        the switcher to see its details.
      </p>
    );
  }

  const entityType = entity.entity_type;
  const businessName = entity.business_name;
  const loanAgreementTitle = entity.loan_agreement_title;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{entity.display_name}</h2>
      <p className="text-sm text-muted-foreground">
        These details appear on your loan agreements and can&apos;t be changed
        here. To update them, email{" "}
        <a
          href="mailto:info@kindling.network"
          className="underline underline-offset-4"
        >
          info@kindling.network
        </a>
        .
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadonlyField label="Entity type" value={entityType} />
        {entityType && entityType !== "Individual" ? (
          <ReadonlyField label="Business / entity name" value={businessName} />
        ) : null}
        <ReadonlyField label="Loan agreement title" value={loanAgreementTitle} />
      </div>
    </div>
  );
}

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
