import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const CURRENT_ENTITY_COOKIE = "current_entity";
export const ALL_ENTITIES = "all";

export type EntitySummary = {
  id: string;
  display_name: string;
  is_primary: boolean;
};

export type EntityContext = {
  mode: "all" | "one";
  currentEntityId: string | null; // null in "all" mode
  entityIds: string[]; // all owned in "all"; [currentEntityId] in "one"
  entities: EntitySummary[]; // every entity this login owns
};

// Resolve the logged-in user's entity context from the current_entity cookie.
// ALWAYS validates ownership — the cookie is never trusted. In Phase 1 each login
// owns exactly one entity, so this reliably yields that single entity.
export async function getCurrentEntityContext(): Promise<EntityContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("investor_entities")
    .select("id, display_name, is_primary")
    .eq("owner_user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });

  const entities = (rows ?? []) as EntitySummary[];
  if (entities.length === 0) {
    return { mode: "one", currentEntityId: null, entityIds: [], entities: [] };
  }

  const allIds = entities.map((e) => e.id);
  const cookieStore = await cookies();
  const raw = cookieStore.get(CURRENT_ENTITY_COOKIE)?.value ?? null;

  if (raw === ALL_ENTITIES) {
    return { mode: "all", currentEntityId: null, entityIds: allIds, entities };
  }

  // Only honor the cookie if it names an entity this user actually owns.
  const chosen =
    raw && allIds.includes(raw)
      ? raw
      : (entities.find((e) => e.is_primary)?.id ?? entities[0].id);

  return { mode: "one", currentEntityId: chosen, entityIds: [chosen], entities };
}

export type EntityIdentity = {
  entity_type: string | null;
  business_name: string | null;
  loan_agreement_title: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

// Entity identity (type / agreement title / mailing address) for the logged-in
// user's PRIMARY entity. These fields live on investor_entities, never on
// profiles. Phase 1: exactly one primary entity per login.
export async function getPrimaryEntityIdentity(): Promise<EntityIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("investor_entities")
    .select(
      "entity_type, business_name, loan_agreement_title, address_street, address_city, address_state, address_zip",
    )
    .eq("owner_user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  return (data ?? null) as EntityIdentity | null;
}

// Identity of the CURRENTLY SELECTED entity. In "all" mode there is no single
// identity (paperwork is per-entity), so this returns null and callers must ask
// the user to pick an entity.
export async function getCurrentEntityIdentity(): Promise<
  (EntityIdentity & { id: string; display_name: string }) | null
> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.mode === "all" || !ctx.currentEntityId) return null;

  const { data } = await supabase
    .from("investor_entities")
    .select(
      "id, display_name, entity_type, business_name, loan_agreement_title, address_street, address_city, address_state, address_zip",
    )
    .eq("id", ctx.currentEntityId)
    .maybeSingle();

  return (data ?? null) as
    | (EntityIdentity & { id: string; display_name: string })
    | null;
}

// The concrete entity to use for a WRITE (registration/paperwork). Never "all".
export async function getWriteEntityId(): Promise<string | null> {
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entities.length === 0) return null;
  if (ctx.mode === "one") return ctx.currentEntityId;
  return ctx.entities.find((e) => e.is_primary)?.id ?? ctx.entities[0].id;
}
