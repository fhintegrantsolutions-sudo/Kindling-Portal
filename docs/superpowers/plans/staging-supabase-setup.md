# Staging Supabase project

A permanent, disposable copy of the **kindling-portal** schema used to trial every
migration (and RLS change) before it touches the real database. It holds no real
data — if it gets wrecked, rebuild it from the schema bundle in two minutes.

Project: **kindling-staging** (ref `sxudsqavlsefmoaomabz`)

## One-time setup

1. Create a Supabase project named `kindling-staging` (defaults are fine:
   Data API on, auto-expose on, automatic-RLS **off** — our migrations enable RLS
   explicitly per table).
2. Build the schema bundle from the repo's migrations, in filename order:

   ```bash
   for f in $(ls supabase/migrations/*.sql | sort); do
     echo "-- $(basename $f)"; cat "$f"; echo;
   done > /tmp/kindling-portal-schema-bundle.sql
   ```

   Paste the contents into the **kindling-staging** SQL editor and Run. (Supabase
   warns about "destructive operations" — expected for schema DDL against an empty
   DB. Confirm the project selector says *kindling-staging* before running.)
3. Create `.env.staging` in the repo root (gitignored via `.env*`):

   ```
   STAGING_SUPABASE_URL=https://<ref>.supabase.co
   STAGING_ANON_KEY=<anon public key>
   STAGING_SERVICE_ROLE_KEY=<service_role key>
   STAGING_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
   ```

   Keys: Settings → API. Connection string: Settings → Database → URI.

## Applying SQL to staging

`scripts/verify/apply-staging-sql.ts` applies a migration file (or inline SQL) to
staging over a direct Postgres connection, so migrations can be iterated without
hand-pasting.

```bash
npx tsx scripts/verify/apply-staging-sql.ts supabase/migrations/<file>.sql
npx tsx scripts/verify/apply-staging-sql.ts --sql "select 1"
```

It **refuses to run** if `STAGING_DB_URL` is unset, or if the URL contains the real
project's ref (read from `.env.local`). Production is never applied by script.

## The rule

- **Staging:** applied automatically by the script above; iterate freely.
- **Real (kindling-portal):** applied **by hand** in the Supabase SQL editor, only
  after the same SQL is green on staging. A human gates every production change.

## Verification scripts

- `scripts/verify/entity-reconciliation.ts` — post-migration data reconciliation.
- `scripts/verify/entity-rls-isolation.ts` — RLS entity-isolation harness.

Run against staging with `VERIFY_ENV=.env.staging`, against real with
`VERIFY_ENV=.env.local`.
