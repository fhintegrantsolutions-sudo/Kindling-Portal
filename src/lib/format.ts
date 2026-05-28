export function formatCurrency(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return `${n}%`;
}

// Render a YYYY-MM-DD date string as MM/DD/YYYY. We parse with a regex rather
// than `new Date(...)` so the value doesn't shift across timezones — note
// dates (maturity, funding window, etc.) are stored as calendar dates with
// no time component and should render the same day everywhere.
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : value;
}
