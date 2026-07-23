"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentProfile,
  requireParticipationsAccess,
} from "@/lib/dal";

const BUCKET = "participation-documents";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Supabase types a to-one embed as an array; normalize to a single object.
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export type ParticipationDocument = {
  id: string;
  type: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
};

export type DocumentActionState = { error?: string; message?: string };

// Admin/manager: list documents for a participation (service-role read).
export async function listParticipationDocuments(
  participationId: string,
): Promise<ParticipationDocument[]> {
  await requireParticipationsAccess();
  const admin = createAdminClient();
  const { data } = await admin
    .from("participation_documents")
    .select("id, type, file_name, size_bytes, created_at")
    .eq("participation_id", participationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ParticipationDocument[];
}

// Admin/manager: upload a PDF against a participation.
export async function uploadParticipationDocument(
  participationId: string,
  _prev: DocumentActionState | undefined,
  formData: FormData,
): Promise<DocumentActionState> {
  const profile = await requireParticipationsAccess();
  const admin = createAdminClient();

  const type = String(formData.get("type") ?? "").trim() || "Loan agreement";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF to upload." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "File is larger than 25 MB." };
  }

  // Confirm the participation exists (and grab its note for revalidation).
  const { data: part } = await admin
    .from("participations")
    .select("id, note:notes ( note_id )")
    .eq("id", participationId)
    .maybeSingle();
  if (!part) return { error: "Participation not found." };
  const partNoteId = one<{ note_id: string }>(
    (part as { note: unknown }).note as never,
  )?.note_id;

  const path = `${participationId}/${crypto.randomUUID()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });
  if (upErr) return { error: upErr.message };

  const { error: insErr } = await admin.from("participation_documents").insert({
    participation_id: participationId,
    type,
    file_name: file.name,
    file_url: path,
    size_bytes: file.size,
    uploaded_by: profile?.id ?? null,
  });
  if (insErr) {
    // Roll back the orphaned object so storage and the table can't drift.
    await admin.storage.from(BUCKET).remove([path]);
    return { error: insErr.message };
  }

  revalidatePath(`/admin/participations/${participationId}`);
  if (partNoteId) revalidatePath(`/notes/${partNoteId}`);
  return { message: "Document uploaded." };
}

// Admin/manager: delete a document (object + row).
export async function deleteParticipationDocument(
  documentId: string,
): Promise<DocumentActionState> {
  await requireParticipationsAccess();
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("participation_documents")
    .select(
      "id, file_url, participation_id, participation:participations ( note:notes ( note_id ) )",
    )
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Document not found." };

  await admin.storage.from(BUCKET).remove([doc.file_url as string]);
  const { error } = await admin
    .from("participation_documents")
    .delete()
    .eq("id", documentId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/participations/${doc.participation_id as string}`);
  const part = one<{ note: unknown }>(
    (doc as { participation: unknown }).participation as never,
  );
  const noteId = one<{ note_id: string }>(part?.note as never)?.note_id;
  if (noteId) revalidatePath(`/notes/${noteId}`);
  return { message: "Document deleted." };
}

// Mint a short-lived signed URL. Re-checks authorization server-side every
// time: admins/managers always; a lender only for a participation their entity
// owns AND whose funding has cleared. The bucket is private, so this is the
// only path to the bytes.
export async function getDocumentDownloadUrl(
  documentId: string,
): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("participation_documents")
    .select("file_url, participation:participations ( entity_id, funding_cleared )")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Document not found." };

  const isManager =
    profile.role === "admin" || profile.role === "participations_admin";

  if (!isManager) {
    const part = one<{ entity_id: string | null; funding_cleared: boolean }>(
      (doc as { participation: unknown }).participation as never,
    );
    if (!part?.funding_cleared || !part.entity_id) {
      return { error: "Not available." };
    }
    const { data: owned } = await admin
      .from("investor_entities")
      .select("id")
      .eq("id", part.entity_id)
      .eq("owner_user_id", profile.id)
      .maybeSingle();
    if (!owned) return { error: "Not available." };
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_url as string, 60);
  if (error || !data) return { error: error?.message ?? "Could not sign URL." };
  return { url: data.signedUrl };
}
