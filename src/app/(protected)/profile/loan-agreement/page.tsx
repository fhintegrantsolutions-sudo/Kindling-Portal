import { createClient } from "@/lib/supabase/server";
import { Label } from "@/components/ui/label";

export default async function LoanAgreementPage() {
  // These details live on the investor entity (admin-managed). Phase 1: exactly
  // one primary entity per login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: entity } = user
    ? await supabase
        .from("investor_entities")
        .select("entity_type, business_name, loan_agreement_title")
        .eq("owner_user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle()
    : { data: null };

  const entityType = entity?.entity_type ?? null;
  const businessName = (entity?.business_name as string | null) ?? null;
  const loanAgreementTitle = entity?.loan_agreement_title ?? null;

  return (
    <div className="flex flex-col gap-4">
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
