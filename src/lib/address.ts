// US state list + address normalization, shared by client inputs and server
// actions so state / ZIP are standardized the same way everywhere.

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const BY_CODE = new Set(US_STATES.map((s) => s.code));
const BY_NAME = new Map(US_STATES.map((s) => [s.name.toLowerCase(), s.code]));

/** 2-letter USPS code for a code or full state name; "" if unrecognized. */
export function normalizeState(raw: string | null | undefined): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  const up = v.toUpperCase();
  if (BY_CODE.has(up)) return up;
  return BY_NAME.get(v.toLowerCase()) ?? "";
}

/** True when empty or a recognized US state. */
export function isValidState(raw: string | null | undefined): boolean {
  const v = String(raw ?? "").trim();
  return v === "" || normalizeState(v) !== "";
}

/** Digits of a ZIP (up to 9). */
export function zipDigits(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 9);
}

/** Format as XXXXX or XXXXX-XXXX (partial digits pass through). */
export function formatZip(raw: string | null | undefined): string {
  const d = zipDigits(raw);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Valid when empty, exactly 5 digits, or 9 digits (ZIP+4). */
export function isValidZip(raw: string | null | undefined): boolean {
  const len = zipDigits(raw).length;
  return len === 0 || len === 5 || len === 9;
}
