import { readFileSync } from "node:fs";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

export function getFirestoreClient() {
  const keyPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "firebase-service-account.json";
  const absPath = path.isAbsolute(keyPath)
    ? keyPath
    : path.join(process.cwd(), keyPath);
  const credentials = JSON.parse(readFileSync(absPath, "utf-8"));

  if (getApps().length === 0) {
    initializeApp({ credential: cert(credentials) });
  }
  return getFirestore();
}

/**
 * Service-role Supabase client. Bypasses RLS — required for migration writes.
 * NEVER use in user-facing code.
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
