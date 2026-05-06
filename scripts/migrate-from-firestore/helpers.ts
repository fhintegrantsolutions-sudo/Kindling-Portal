import type { Timestamp } from "firebase-admin/firestore";

/**
 * Maps Firestore document IDs to the new Postgres UUIDs assigned during
 * migration. Different domains kept in separate maps so a stray collision
 * in source IDs across collections doesn't get confused.
 */
export class IdMap {
  private maps = new Map<string, Map<string, string>>();

  set(domain: string, firestoreId: string, supabaseUuid: string): void {
    if (!this.maps.has(domain)) this.maps.set(domain, new Map());
    this.maps.get(domain)!.set(firestoreId, supabaseUuid);
  }

  get(domain: string, firestoreId: string | undefined | null): string | null {
    if (!firestoreId) return null;
    return this.maps.get(domain)?.get(firestoreId) ?? null;
  }

  size(domain: string): number {
    return this.maps.get(domain)?.size ?? 0;
  }
}

/** Firestore Timestamp / Date / ISO string → ISO string (or null). */
export function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  // Firestore Timestamp duck-type
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  return null;
}

/** ISO string → YYYY-MM-DD for Postgres `date` columns (or null). */
export function toDateOnly(value: unknown): string | null {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

/** Trim a string; return null if empty. */
export function strOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/** Convert "5000.00" / 5000 / null → numeric string for Postgres `numeric`. */
export function numericOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return null;
  return n.toString();
}

/** Insert in batches to avoid Supabase request size limits. */
export async function batchInsert<T>(
  table: string,
  rows: T[],
  insertFn: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>,
  batchSize = 250,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await insertFn(chunk);
    if (error) {
      throw new Error(
        `[${table}] batch ${i}-${i + chunk.length} failed: ${error.message}`,
      );
    }
  }
}
