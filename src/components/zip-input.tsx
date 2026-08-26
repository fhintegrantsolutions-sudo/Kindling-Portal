"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatZip } from "@/lib/address";

// ZIP field: digits only, auto-formats to XXXXX (or XXXXX-XXXX for ZIP+4).
export function ZipInput({
  name,
  id,
  defaultValue,
  required,
  ariaInvalid,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(() => formatZip(defaultValue ?? ""));
  return (
    <Input
      id={id ?? name}
      name={name}
      inputMode="numeric"
      autoComplete="postal-code"
      value={value}
      onChange={(e) => setValue(formatZip(e.target.value))}
      placeholder="12345"
      required={required}
      aria-invalid={ariaInvalid || undefined}
      className={className}
    />
  );
}
