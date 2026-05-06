# Firestore → Postgres migration

A one-off script that ports the legacy Firestore data into the new Supabase Postgres schema. Run it once, verify, send password-reset emails, retire the legacy app.

## What it does

Migrates these collections (in FK dependency order):

```
users               → auth.users + public.profiles
borrowers           → public.borrowers
notes               → public.notes              (FK borrower)
note_registrations  → public.note_registrations (FK note + user)
participations      → public.participations     (FK note + user, funding_status flattened)
payments            → public.payments           (FK participation)
beneficiaries       → public.beneficiaries      (FK user)
documents           → public.documents          (FK user)
participation_documents → public.participation_documents (FK participation)
access_requests     → public.access_requests
referral_codes      → public.referral_codes     (FK user)
referrals           → public.referrals          (FK referrer + referred user)
```

**Skipped intentionally:** `activities`, `audit_logs` (history-only, low value to reconstruct), `setup_tokens`/`sessions`/`password_reset_tokens`/`email_verification_tokens` (Supabase Auth replaces).

## Prerequisites (one-time)

### 1. Generate a fresh Firebase service-account key

The old key was deleted. Generate a new one:

1. [Firebase Console](https://console.firebase.google.com) → your `kindling-portal` project
2. ⚙️ → **Project settings** → **Service accounts**
3. **Generate new private key** → confirm → save as `firebase-service-account.json` in the **repo root**
4. Verify it's gitignored (`.gitignore` has `firebase-service-account*.json`)

### 2. Install the migration deps

If you haven't already (already in `package.json` as devDependencies):

```bash
npm install
```

### 3. Verify env

`.env.local` must have:

```
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The script also looks for `FIREBASE_SERVICE_ACCOUNT_PATH` (optional, defaults to `firebase-service-account.json` in the project root).

## Run it

### Dry run (always do this first)

Connects to both Firestore and Supabase, prints the source counts, exits without writing:

```bash
npx tsx scripts/migrate-from-firestore --dry-run
```

You should see something like:

```
Source counts (Firestore):
  users                    123
  borrowers                12
  notes                    34
  ...
```

If counts look right, proceed.

### Live run (will write to Postgres)

⚠️ **First time, on an empty / dev database:**

```bash
npx tsx scripts/migrate-from-firestore --truncate
```

The `--truncate` flag wipes all domain tables before inserting. **It does NOT touch `auth.users` or `profiles`** — for users, the script's logic is "create if email doesn't exist, otherwise update the existing profile." If you want a fully fresh user list, delete users from the Supabase dashboard first.

⚠️ **To send password-reset emails immediately after migration:**

```bash
npx tsx scripts/migrate-from-firestore --truncate --send-resets
```

This calls `auth.admin.generateLink({ type: "recovery" })` for each migrated user, which queues a Supabase password-reset email. **Be aware of Supabase's free-tier email rate limit (4/hour on the default sender).** If you have more than a handful of users, batch this manually after the migration via your own email pipeline (Phase 6 part 3 — Resend) instead.

### What the script prints

For each collection: how many were created/inserted/skipped. Skips are logged with the reason (e.g. `unknown userId`, `missing email`). Save the output of each run.

## Post-migration verification

1. **Counts match.** In Supabase SQL editor, run:
   ```sql
   select 'profiles' t, count(*) from profiles
   union all select 'borrowers', count(*) from borrowers
   union all select 'notes', count(*) from notes
   union all select 'note_registrations', count(*) from note_registrations
   union all select 'participations', count(*) from participations
   union all select 'payments', count(*) from payments
   union all select 'beneficiaries', count(*) from beneficiaries
   union all select 'documents', count(*) from documents
   union all select 'participation_documents', count(*) from participation_documents
   union all select 'access_requests', count(*) from access_requests
   union all select 'referral_codes', count(*) from referral_codes
   union all select 'referrals', count(*) from referrals;
   ```
   Compare to the Firestore counts the script printed.

2. **Spot-check 5-10 users.** Pick a few users from the legacy app, find them in `/admin/users`, click into the detail page, verify their participations / registrations / beneficiaries match.

3. **Spot-check a few notes.** `/opportunities` should list current available notes; `/admin/participations` should show all participations.

4. **Authenticate as a migrated user.** They'll need to use the password-reset link (or click "Forgot password?" on /login). Once logged in, they should see their portfolio on `/notes`.

## Re-running

The script is **not idempotent without `--truncate`**. If you re-run without truncating, you'll insert duplicates (Postgres won't reject on most tables since there are few unique constraints). Always re-truncate before a re-run, or delete the rows you want to retry.

For users specifically, the script is idempotent — if a user with that email already exists in Supabase, it updates the profile in place rather than creating a duplicate auth user.

## Common failures

- **"Could not find the file"** → service-account JSON path is wrong; check `FIREBASE_SERVICE_ACCOUNT_PATH` or that `firebase-service-account.json` exists at the repo root.
- **"NEXT_PUBLIC_SUPABASE_URL must be set"** → `.env.local` is missing — script reads via `dotenv`.
- **"email rate limit exceeded"** → Supabase free-tier email limiter. Drop `--send-resets` and send recovery emails through your own pipeline (Resend, Phase 6 part 3).
- **"duplicate key value violates unique constraint 'notes_note_id_key'"** → a note with that human ID already exists. Truncate first or remove the offending row.
- **`unknown userId` / `unknown noteId` skips** → Firestore data references an entity that wasn't successfully migrated earlier in the run. Look at the earlier section's output to see which user/note failed; fix the source data and re-run.

## What's NOT migrated by this script

- **File contents.** Documents have `file_url` pointing at Firebase Storage — the actual files stay in Firebase. Migrating Storage to Supabase Storage is a separate task (Phase 5 part 2).
- **Activities feed and audit logs.** Skipped by design.
- **Passwords.** Supabase doesn't accept legacy bcrypt hashes; users set new passwords via the reset flow.
