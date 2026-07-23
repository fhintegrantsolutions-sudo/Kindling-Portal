# Per-lender note documents (loan agreements)

## Goal

Let an admin attach documents (the executed loan agreement, amendments, etc.) to
an individual lender's participation, and let that lender download them from
their portal. Agreements differ per lender because each invests a different
amount, so documents attach to a **participation**, not to the note.

## Key decisions (approved 2026-07-23)

- **Scope:** per-lender — documents attach to a `participation` (one lender's
  position on one note, held by one entity).
- **Count:** multiple documents per participation.
- **Download access:** the holding lender may download **only after that
  participation's funding has cleared** (`funding_cleared = true`).
- **File type / size:** PDF only, 25 MB max (defaults; easy to widen later).
- **Uploader:** admin only.

## Data model

### Storage

A **private** Supabase Storage bucket `participation-documents` (no public
read). Object path: `{participation_id}/{uuid}.pdf`. Keying by participation id
makes RLS/ownership checks and cascade cleanup straightforward.

### Table `participation_documents`

| column | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| participation_id | uuid | FK → participations(id) ON DELETE CASCADE |
| file_path | text | storage object path |
| file_name | text | original filename, for display/download |
| content_type | text | e.g. `application/pdf` |
| size_bytes | bigint | for display |
| uploaded_by | uuid | FK → profiles(id) |
| created_at | timestamptz | default now() |

Index on `participation_id`.

## Access control (defense in depth)

RLS on `participation_documents` **and** a server-side re-check on every
download — never trust the client.

- **Admin** (`is_admin()` helper already used elsewhere): full select/insert/delete.
- **Lender SELECT:** row's participation is held by one of the caller's entities
  (`auth_owns_entity(...)` via a join to `participations.entity_id`) **and** that
  participation's `funding_cleared = true`.
- **Storage bucket:** private. Downloads are served through short-lived signed
  URLs (~60 s) minted by a server action that independently re-verifies
  ownership + cleared before signing. A leaked URL dies in a minute and nothing
  is world-readable.

Mirror the existing staging-first migration workflow: trial the whole migration
(table + RLS + bucket) on `kindling-staging` via `scripts/verify/apply-staging-sql.ts`,
then hand the titled SQL to the user to run on the real project by hand.

## Server / query layer (`src/lib/documents/…`)

- `listParticipationDocuments(participationId)` — admin + lender reads (RLS scopes
  lender to their own cleared participations).
- `uploadParticipationDocument(participationId, formData)` — **admin action**:
  validate PDF + size, upload via service-role client, insert row, revalidate.
- `deleteParticipationDocument(documentId)` — **admin action**: remove storage
  object + row.
- `getDocumentDownloadUrl(documentId)` — mint a 60 s signed URL after
  re-checking: caller is admin, OR caller owns the participation's entity AND it
  is `funding_cleared`.

## UI

### Admin — `admin/participations/[id]` "Documents" card

List existing documents (name, size, uploaded date) with a Delete button, plus a
PDF file input + Upload button. Uses the admin actions above.

### Lender — `notes/[id]` "Documents" section

Rendered **only when `participation.funding_cleared`**. Lists the lender's
documents with a Download button that calls `getDocumentDownloadUrl` and opens
the signed URL. If not cleared, the section is hidden entirely (no empty state
implying a missing file).

## Verification

- Staging: apply migration, confirm table + policies + bucket exist.
- Throwaway `tsx` check: as a non-owning / not-cleared lender, `SELECT` returns
  nothing and `getDocumentDownloadUrl` refuses; as the owning cleared lender it
  succeeds; as admin all operations succeed.
- `tsc --noEmit`, `eslint src` (hold the 8-problem baseline), `next build`.
- Manual: upload a PDF against a cleared participation, download it as that
  lender; confirm a non-cleared lender sees no Documents section.

## Out of scope (YAGNI)

- Versioning / revision history.
- E-signature or in-app signing.
- Non-PDF types, per-file custom expiry.
- Bulk upload across a note's participations (upload is one-per-participation).
- Lender self-upload (admin uploads only).
