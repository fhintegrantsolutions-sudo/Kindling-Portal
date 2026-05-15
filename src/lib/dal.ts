import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { userId: user.id, email: user.email ?? null };
});

export const getCurrentProfile = cache(async () => {
  const { userId } = await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data;
});

export const requireAdmin = cache(async () => {
  const profile = await getCurrentProfile();
  if (profile?.role === "admin") return profile;
  // A scoped admin (currently just participations_admin) lands inside the
  // admin shell, just not on the same page. Send them somewhere usable
  // rather than bouncing them to the lender dashboard which they can't see.
  if (profile?.role === "participations_admin") {
    redirect("/admin/participations");
  }
  redirect("/dashboard");
});

// Used by routes/actions that the scoped `participations_admin` role is
// allowed to touch: viewing and updating participations + reading the tables
// referenced on those pages. Full admins still pass.
export const requireParticipationsAccess = cache(async () => {
  const profile = await getCurrentProfile();
  if (profile?.role === "admin" || profile?.role === "participations_admin") {
    return profile;
  }
  redirect("/dashboard");
});
