import Link from "next/link";
import { BeneficiaryForm } from "../beneficiary-form";

export default function NewBeneficiaryPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/profile/beneficiaries"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to beneficiaries
      </Link>
      <h2 className="text-lg font-semibold tracking-tight">Add beneficiary</h2>
      <BeneficiaryForm
        defaults={{
          name: null,
          relation: null,
          percentage: null,
          type: "Primary",
          dob: null,
          phone: null,
          address: null,
          ssn_last4: null,
        }}
      />
    </div>
  );
}
