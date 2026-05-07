"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { computeMonthlyPayment } from "@/lib/notes/schedule";

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
  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/admin");
  return {};
}

/**
 * Reset and re-insert the note_visibility allowlist for this note.
 * - If is_private is false, we drop all visibility rows (the note is public).
 * - If is_private is true, the visibility list dictates who can see it.
 *   Existing participants always retain access via the RLS participations
 *   fallback, so we don't need to back-pop those.
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
  if (!fields.is_private || fields.visible_user_ids.length === 0) return;

  const rows = fields.visible_user_ids.map((user_id) => ({
    note_id: noteUuid,
    user_id,
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
    new_borrower_name: text(formData, "new_borrower_name") || null,
    project_type: text(formData, "project_type"),
    type: text(formData, "type") || "note",
    interest_type: text(formData, "interest_type") || "Amortized",
    is_private: formData.get("is_private") === "on",
    visible_user_ids: formData.getAll("visible_user_ids").map(String),
    principal: text(formData, "principal") || null,
    rate: text(formData, "rate"),
    term_months: text(formData, "term_months"),
    min_investment: text(formData, "min_investment") || null,
    target_raise: text(formData, "target_raise") || null,
    contract_date: text(formData, "contract_date") || null,
    first_payment_date: text(formData, "first_payment_date") || null,
    maturity_date: text(formData, "maturity_date") || null,
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
  if (!fields.title) errors.title = "Required";
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
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  // Resolve borrower: explicit id > new name > null. If a name is given,
  // create the borrower row inline (with placeholder contact).
  let borrowerId: string | null = fields.borrower_id;
  if (!borrowerId && fields.new_borrower_name) {
    const { data, error } = await supabase
      .from("borrowers")
      .insert({
        business_name: fields.new_borrower_name,
        first_name: "—",
        email: "—",
        phone: "—",
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(`Failed to create borrower: ${error.message}`);
    }
    borrowerId = data.id as string;
  }

  const monthly = computeMonthlyPayment({
    principal: fields.principal !== null ? Number(fields.principal) : null,
    annualRatePct: fields.rate !== "" ? Number(fields.rate) : null,
    termMonths:
      fields.term_months !== "" ? parseInt(fields.term_months, 10) : null,
    interestType: fields.interest_type,
  });

  return {
    note_id: fields.note_id,
    borrower_id: borrowerId,
    title: fields.title,
    principal: fields.principal,
    rate: fields.rate,
    term_months: parseInt(fields.term_months, 10),
    project_type: fields.project_type,
    type: fields.type,
    interest_type: fields.interest_type,
    is_private: fields.is_private,
    monthly_payment: monthly !== null ? String(monthly) : null,
    contract_date: fields.contract_date,
    first_payment_date: fields.first_payment_date,
    maturity_date: fields.maturity_date,
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
