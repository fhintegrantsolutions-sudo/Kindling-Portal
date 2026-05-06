"use client";

import { useTransition } from "react";
import {
  approveRegistration,
  rejectRegistration,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

export function DecisionButtons({ registrationId }: { registrationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Approve this registration and create a participation?"))
            return;
          startTransition(() => {
            approveRegistration(registrationId);
          });
        }}
      >
        {pending ? "Working…" : "Approve"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!confirm("Reject this registration?")) return;
          startTransition(() => {
            rejectRegistration(registrationId);
          });
        }}
      >
        Reject
      </Button>
    </div>
  );
}
