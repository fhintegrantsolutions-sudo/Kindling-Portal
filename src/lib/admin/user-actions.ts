"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal";
import { countAdmins } from "@/lib/db/admin-queries";
import { normalizeEmail, toProperCase } from "@/lib/text";

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "lender",
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  if (newRole !== "admin" && newRole !== "lender") {
    throw new Error(`Invalid role: ${newRole}`);
  }

  if (newRole !== "admin") {
    // last-admin guard: refuse to strip the last full admin. Applies any
    // time the new role isn't 'admin' (lender, or a scoped admin variant).
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

// Create a single user manually — used for one-off admin invites without
// running the CSV import script. The auth user is created with a random
// temporary password; pass send_invite=true to fire Supabase's password-reset
// email so the recipient can pick their own. The profile is hydrated from the
// form's name/phone in the same call so the user record is usable immediately.
export type CreateUserState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export async function createUser(
  _prev: CreateUserState | undefined,
  formData: FormData,
): Promise<CreateUserState> {
  await requireAdmin();

  const first_name = toProperCase(String(formData.get("first_name") ?? ""));
  const last_name = toProperCase(String(formData.get("last_name") ?? ""));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "admin");
  const send_invite = formData.get("send_invite") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!first_name) fieldErrors.first_name = "Required";
  if (!last_name) fieldErrors.last_name = "Required";
  if (!email) fieldErrors.email = "Required";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    fieldErrors.email = "Enter a valid email";
  if (role !== "admin" && role !== "lender" && role !== "participations_admin")
    fieldErrors.role = "Invalid role";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const admin = createAdminClient();

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { created_manually: true },
  });
  if (cErr || !created.user) {
    const msg = cErr?.message ?? "Could not create auth user";
    if (msg.toLowerCase().includes("already")) {
      return { fieldErrors: { email: "A user with this email already exists." } };
    }
    return { error: msg };
  }
  const userId = created.user.id;

  // Trigger auto-creates the profile row; hydrate the fields the form gave us.
  const { error: pErr } = await admin
    .from("profiles")
    .update({ first_name, last_name, phone, role })
    .eq("id", userId);
  if (pErr) return { error: `Profile hydrate failed: ${pErr.message}` };

  if (send_invite) {
    const { error: invErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (invErr) {
      revalidatePath("/admin/users");
      return {
        message: `Created, but invite email failed: ${invErr.message}`,
      };
    }
  }

  revalidatePath("/admin/users");
  return {
    message: send_invite
      ? `Created ${email} — invite email sent.`
      : `Created ${email}.`,
  };
}

function randomPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  return Array.from(
    { length: 32 },
    () => chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}
