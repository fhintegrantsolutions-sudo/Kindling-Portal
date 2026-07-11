import Link from "next/link";
import { notFound } from "next/navigation";
import { getBeneficiaryById } from "@/lib/db/queries";
import { BeneficiaryForm } from "../beneficiary-form";

export default async function EditBeneficiaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const b = await getBeneficiaryById(id);
  if (!b) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/profile/beneficiaries"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to beneficiaries
      </Link>
      <h2 className="text-lg font-semibold tracking-tight">Edit {b.name}</h2>
      <BeneficiaryForm
        beneficiaryId={b.id}
        defaults={{
          name: b.name,
          relation: b.relation,
          percentage: b.percentage,
          type: b.type,
          dob: b.dob,
          phone: b.phone,
          address: b.address,
          ssn_last4: b.ssn_last4,
        }}
      />
    </div>
  );
}
