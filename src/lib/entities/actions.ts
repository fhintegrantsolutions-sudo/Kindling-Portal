"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ALL_ENTITIES, CURRENT_ENTITY_COOKIE } from "@/lib/entities/context";

// Set the lender's current entity context. Accepts a concrete entity id or the
// literal "all". Validates OWNERSHIP server-side — a caller can never select an
// entity they don't own (RLS is the backstop, but reject early and loudly).
export async function setCurrentEntity(value: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  if (value !== ALL_ENTITIES) {
    const { data } = await supabase
      .from("investor_entities")
      .select("id")
      .eq("id", value)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!data) throw new Error("Unknown entity");
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ENTITY_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Every lender surface is entity-scoped, so bust them all.
  revalidatePath("/", "layout");
}
