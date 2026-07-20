export function formatCurrency(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// "K26001 · Austin Fund III", or just "K26001" when the note has no title —
// so an empty title never leaves a dangling " · " separator.
export function formatNoteLabel(
  noteId: string,
  title: string | null | undefined,
): string {
  const t = (title ?? "").trim();
  return t ? `${noteId} · ${t}` : noteId;
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
