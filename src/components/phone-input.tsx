"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";

// Phone field that auto-formats to (XXX) XXX-XXXX as the user types, accepts
// digits only, and caps at a 10-digit US number. Submits the formatted value
// under `name`; the server action normalizes/validates it again.
export function PhoneInput({
  name,
  id,
  defaultValue,
  placeholder = "(555) 123-4567",
  required,
  disabled,
  ariaInvalid,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(() => formatPhone(defaultValue ?? ""));
  return (
    <Input
      id={id ?? name}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-invalid={ariaInvalid || undefined}
      className={className}
    />
  );
}
