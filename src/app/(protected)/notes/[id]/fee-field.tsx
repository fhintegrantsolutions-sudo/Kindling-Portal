"use client";

import { useState } from "react";
import { Info } from "lucide-react";

// "Fee(s) (one-time)" stat with an ⓘ toggle explaining how the fee is taken.
export function FeeField({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="About this fee"
          className="inline-flex hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </p>
      <p className="text-sm font-medium">{value}</p>
      {open ? (
        <p className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border bg-popover p-2 text-xs text-muted-foreground shadow-sm">
          One-time fee, taken from the interest of your first payment.
          {detail ? ` ${detail}` : ""}
        </p>
      ) : null}
    </div>
  );
}
