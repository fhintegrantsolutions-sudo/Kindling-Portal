// Display-level text normalization. Used at every write boundary (forms,
// server actions, import scripts) so the DB is canonical regardless of how
// data was typed.

// "FELIPE VAZQUEZ" / "felipe vazquez" → "Felipe Vazquez"
// Mixed-case input is left alone — admins legitimately type names like
// "McCleary", "JoLea", or "O'Brien" with embedded capitals that the naive
// lower-then-cap pass would mangle. We only normalize when the input is
// entirely uppercase or entirely lowercase, which is the typical
// data-entry mistake we're catching.
export function toProperCase(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.toString().trim();
  if (!trimmed) return "";
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  // Already mixed case → trust what was typed.
  if (hasUpper && hasLower) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s\-'\.])([a-z])/g, (_match, sep: string, ch: string) => {
      return sep + ch.toUpperCase();
    });
}

// "  Foo@BAR.com " → "foo@bar.com". Emails are always lowercased at the
// boundary so lookups by email are case-insensitive without callers
// having to remember to .toLowerCase() everywhere.
export function normalizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  return input.toString().trim().toLowerCase();
}

// RFC 5321's 256-octet path limit (angle brackets included) leaves 254
// characters for the address; nothing longer is deliverable.
const MAX_EMAIL_LENGTH = 254;

// local@label(.label)+ — domain labels exclude "." so each character has
// exactly one way to match, which keeps the check linear (no ReDoS).
const EMAIL_RE = /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/;

// Shape check shared by every email field. The length cap runs first so
// oversized input never reaches the regex.
export function isValidEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_RE.test(email);
}
