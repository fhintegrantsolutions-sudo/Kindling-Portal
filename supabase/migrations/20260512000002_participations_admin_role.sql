-- Step 1 of the scoped-admin rollout. ALTER TYPE ADD VALUE must commit before
-- the new value can be referenced anywhere, so the helper function + RLS
-- policies are in the follow-up migration.

alter type public.user_role add value if not exists 'participations_admin';
