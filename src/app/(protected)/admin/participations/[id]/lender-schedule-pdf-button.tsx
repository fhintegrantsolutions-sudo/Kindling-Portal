"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { getLenderSchedulePdfData } from "@/lib/admin/lender-schedule-actions";
import { downloadLenderSchedulePdf } from "@/app/(protected)/notes/[id]/download-schedule-button";
import { Button } from "@/components/ui/button";

// Downloads the exact amortization schedule PDF this lender sees on their
// note page.
export function LenderSchedulePdfButton({
  participationId,
  lenderLabel,
}: {
  participationId: string;
  lenderLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await getLenderSchedulePdfData(participationId);
      if (!res.data) {
        alert(res.error ?? "Couldn't load this lender's schedule.");
        return;
      }
      downloadLenderSchedulePdf(res.data);
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-label={`Download ${lenderLabel}'s schedule PDF`}
      title="Download the schedule PDF this lender sees"
      className="gap-1"
    >
      <Download className="size-3.5" />
      {pending ? "Preparing…" : "Lender schedule PDF"}
    </Button>
  );
}
