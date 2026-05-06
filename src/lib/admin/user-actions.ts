"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { countAdmins } from "@/lib/db/admin-queries";

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "lender",
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  if (newRole !== "admin" && newRole !== "lender") {
    throw new Error(`Invalid role: ${newRole}`);
  }

  if (newRole === "lender") {
    // last-admin guard: refuse to remove the last admin
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (target?.role === "admin") {
      const totalAdmins = await countAdmins();
      if (totalAdmins <= 1) {
        throw new Error(
          "Cannot demote the last admin. Promote another user to admin first.",
        );
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
}
