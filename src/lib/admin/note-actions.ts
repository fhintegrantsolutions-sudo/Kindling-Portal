"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { addMonths, computeMonthlyPayment } from "@/lib/notes/schedule";
import { ensureNoteTags } from "@/lib/ghl/note-tags";

export type NoteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const STATUS_OPTIONS = ["Active", "Funded", "Closed"] as const;
const CLIENT_STATUS_OPTIONS = ["Available", "Closed"] as const;
const INTEREST_TYPE_OPTIONS = ["Amortized", "Interest only"] as const;

export async function createNote(
  _prev: NoteFormState | undefined,
  formData: FormData,
): Promise<NoteFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const insert = await buildInsert(fields, supabase);

  const { data, error } = await supabase
    .from("notes")
    .insert(insert)
    .select("id")
    .single();
  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return {
        fieldErrors: {
          note_id: "A note with this ID already exists",
        },
      };
    }
    return { error: error.message };
  }

  await syncVisibility(supabase, data.id as string, fields);

  // Best-effort: provision the note's GHL tags ("k26003" + "lead k26003") so
  // they exist in the tag library from the moment the note is created.
  await ensureNoteTags(fields.note_id);

  revalidatePath("/admin/notes");
  revalidatePath("/admin");
  redirect(`/admin/notes/${data.id}`);
}

export async function updateNote(
  noteUuid: string,
  _prev: NoteFormState | undefined,
  formData: FormData,
): Promise<NoteFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const update = await buildInsert(fields, supabase);

  const { error } = await supabase
    .from("notes")
    .update(update)
    .eq("id", noteUuid);
  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return {
        fieldErrors: { note_id: "A note with this ID already exists" },
      };
    }
    return { error: error.message };
  }

  await syncVisibility(supabase, noteUuid, fields);

  revalidatePath("/admin/notes");
  // Revalidate the whole note layout subtree (Overview + Settings/Schedule/
  // Bonuses tabs), not just the base page — otherwise the Settings form, which
  // lives at /admin/notes/[id]/settings, keeps serving a stale Router-Cache
  // snapshot after a save (e.g. an edited borrower appears to revert on nav).
  revalidatePath("/admin/notes/[id]", "layout");
  revalidatePath("/admin");
  return {};
}

/**
 * Archive a note's funding round (per-note, one-way). Stamps funding_archived_at
 * so the note's participations drop out of the active admin funding workflow.
 * Does NOT touch notes.status or any lender-facing view. Idempotent: re-archiving
 * an already-archived note is a no-op.
 */
export async function archiveNoteFunding(
  noteUuid: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({
      funding_archived_at: new Date().toISOString(),
      funding_archived_by: admin.id,
    })
    .eq("id", noteUuid)
    .is("funding_archived_at", null);
  if (error) return { error: error.message };

  revalidatePath("/admin/participations");
  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath(`/admin/notes/${noteUuid}/settings`);
  revalidatePath("/admin");
  return {};
}

/**
 * Reset and re-insert the note_visibility allowlist for this note.
 * - If is_private is false, we drop all visibility rows (the note is public).
 * - If is_private is true, the visibility list dictates which INVESTOR ENTITIES
 *   can see it. Existing participants always retain access via the RLS
 *   participations fallback, so we don't need to back-pop those.
 */
async function syncVisibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteUuid: string,
  fields: Fields,
) {
  const { error: delErr } = await supabase
    .from("note_visibility")
    .delete()
    .eq("note_id", noteUuid);
  if (delErr) {
    throw new Error(`Failed to reset visibility: ${delErr.message}`);
  }
  if (!fields.is_private || fields.visible_entity_ids.length === 0) return;

  // Visibility is granted PER ENTITY — write exactly what admin chose. (This
  // used to map each user to their PRIMARY entity, which made it impossible to
  // invite a non-primary entity to a private note.) Validate the submitted ids
  // against the table; never trust the form.
  const { data: valid, error: valErr } = await supabase
    .from("investor_entities")
    .select("id, owner_user_id")
    .in("id", fields.visible_entity_ids);
  if (valErr) {
    throw new Error(`Failed to resolve entities: ${valErr.message}`);
  }

  const found = new Map(
    (valid ?? []).map((e) => [e.id as string, e.owner_user_id as string]),
  );
  const missing = fields.visible_entity_ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Cannot grant visibility: ${missing.length} unknown entity id(s).`,
    );
  }

  const rows = fields.visible_entity_ids.map((entity_id) => ({
    note_id: noteUuid,
    entity_id,
    user_id: found.get(entity_id)!, // still dual-written until the cleanup pass
  }));
  const { error: insertErr } = await supabase
    .from("note_visibility")
    .insert(rows);
  if (insertErr) {
    throw new Error(`Failed to set visibility: ${insertErr.message}`);
  }
}

// ---------------------------------------------------------------------------

type Fields = ReturnType<typeof parseFields>;

function parseFields(formData: FormData) {
  return {
    note_id: text(formData, "note_id"),
    title: text(formData, "title"),
    borrower_id: text(formData, "borrower_id") || null,
    project_type: text(formData, "project_type"),
    type: text(formData, "type") || "note",
    interest_type: text(formData, "interest_type") || "Amortized",
    is_private: formData.get("is_private") === "on",
    has_profit_bonus: formData.get("has_profit_bonus") === "on",
    visible_entity_ids: formData.getAll("visible_entity_ids").map(String),
    principal: money(formData, "principal"),
    rate: text(formData, "rate"),
    term_months: text(formData, "term_months"),
    min_investment: text(formData, "min_investment") || null,
    target_raise: text(formData, "target_raise") || null,
    contract_date: text(formData, "contract_date") || null,
    first_payment_date: text(formData, "first_payment_date") || null,
    maturity_date: text(formData, "maturity_date") || null,
    funding_start_date: text(formData, "funding_start_date") || null,
    funding_end_date: text(formData, "funding_end_date") || null,
    description: text(formData, "description") || null,
    admin_notes: text(formData, "admin_notes") || null,
    status: text(formData, "status") || "Active",
    client_status: text(formData, "client_status") || "Available",
  };
}

function validate(fields: Fields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.note_id) errors.note_id = "Required";
  if (!fields.project_type) errors.project_type = "Required";

  if (fields.principal !== null) {
    const principal = Number(fields.principal);
    if (!Number.isFinite(principal) || principal <= 0)
      errors.principal = "Must be greater than zero";
  }

  const rate = Number(fields.rate);
  if (!fields.rate) errors.rate = "Required";
  else if (!Number.isFinite(rate) || rate <= 0)
    errors.rate = "Must be greater than zero";

  const term = Number(fields.term_months);
  if (!fields.term_months) errors.term_months = "Required";
  else if (!Number.isInteger(term) || term <= 0)
    errors.term_months = "Must be a positive integer";

  if (!(STATUS_OPTIONS as readonly string[]).includes(fields.status)) {
    errors.status = "Invalid";
  }
  if (
    !(CLIENT_STATUS_OPTIONS as readonly string[]).includes(fields.client_status)
  ) {
    errors.client_status = "Invalid";
  }
  if (
    !(INTEREST_TYPE_OPTIONS as readonly string[]).includes(fields.interest_type)
  ) {
    errors.interest_type = "Invalid";
  }

  return errors;
}

async function buildInsert(
  fields: Fields,
  _supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const monthly = computeMonthlyPayment({
    principal: fields.principal !== null ? Number(fields.principal) : null,
    annualRatePct: fields.rate !== "" ? Number(fields.rate) : null,
    termMonths:
      fields.term_months !== "" ? parseInt(fields.term_months, 10) : null,
    interestType: fields.interest_type,
  });

  return {
    note_id: fields.note_id,
    borrower_id: fields.borrower_id,
    title: fields.title,
    principal: fields.principal,
    rate: fields.rate,
    term_months: parseInt(fields.term_months, 10),
    project_type: fields.project_type,
    type: fields.type,
    interest_type: fields.interest_type,
    is_private: fields.is_private,
    has_profit_bonus: fields.has_profit_bonus,
    monthly_payment: monthly !== null ? String(monthly) : null,
    contract_date: fields.contract_date,
    first_payment_date: fields.first_payment_date,
    maturity_date: deriveMaturity(fields.first_payment_date, fields.term_months),
    funding_start_date: fields.funding_start_date,
    funding_end_date: fields.funding_end_date,
    min_investment: fields.min_investment,
    target_raise: fields.target_raise,
    description: fields.description,
    admin_notes: fields.admin_notes,
    status: fields.status,
    client_status: fields.client_status,
  };
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Strip commas from money inputs (the principal field uses type="text" so
// admins can type "100,000"). Returns null when the cleaned value is empty.
function money(formData: FormData, key: string): string | null {
  const cleaned = String(formData.get(key) ?? "")
    .trim()
    .replace(/,/g, "");
  return cleaned.length > 0 ? cleaned : null;
}

// Maturity is the date of the final payment: first_payment_date + (term - 1)
// months. Returns null if either input is missing or invalid so the column
// stays unset until the admin fills the prerequisites.
function deriveMaturity(
  firstPaymentDate: string | null,
  termMonthsStr: string,
): string | null {
  if (!firstPaymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDate))
    return null;
  const term = parseInt(termMonthsStr, 10);
  if (!Number.isInteger(term) || term <= 0) return null;
  return addMonths(firstPaymentDate, term - 1);
}
