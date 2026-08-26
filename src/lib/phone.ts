// US phone formatting + validation, shared by the client phone input and the
// server actions that persist it — so a number is standardized the same way
// whether it's typed in the browser or posted directly.

/** Strip to digits, drop a leading US country code, cap at 10 digits. */
export function phoneDigits(raw: string | null | undefined): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.slice(0, 10);
}

/** Progressive US format, for as-you-type and display: (XXX) XXX-XXXX. */
export function formatPhone(raw: string | null | undefined): string {
  const d = phoneDigits(raw);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** A complete US number is exactly 10 digits. */
export function isCompletePhone(raw: string | null | undefined): boolean {
  return phoneDigits(raw).length === 10;
}
