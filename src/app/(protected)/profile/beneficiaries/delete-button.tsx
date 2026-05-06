"use client";

import { useTransition } from "react";
import { deleteBeneficiary } from "@/lib/beneficiaries/actions";
import { Button } from "@/components/ui/button";

export function DeleteBeneficiaryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this beneficiary?")) return;
        startTransition(() => {
          deleteBeneficiary(id);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
