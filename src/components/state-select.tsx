import { US_STATES, normalizeState } from "@/lib/address";
import { cn } from "@/lib/utils";

// US state dropdown. Submits the 2-letter USPS code under `name`; preselects
// from a code or a legacy full-name value via normalizeState.
export function StateSelect({
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
  return (
    <select
      id={id ?? name}
      name={name}
      defaultValue={normalizeState(defaultValue)}
      required={required}
      aria-invalid={ariaInvalid || undefined}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className,
      )}
    >
      <option value="">State</option>
      {US_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
