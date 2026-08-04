"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal";
import { countAdmins } from "@/lib/db/admin-queries";
import { normalizeEmail, toProperCase } from "@/lib/text";

export type DeleteUserState = { error?: string };

// Delete a login (auth user + profile + its empty entities). Guarded: never
// yourself, never the last admin, and never a user who still holds
// participations — participations.user_id is ON DELETE SET NULL, so deleting
// such a user would silently ORPHAN their positions instead of blocking.
// Dependents that reference an entity_id (beneficiaries, registrations,
// documents) are cleared first so the entity cascade can't hit a restrict.
export async function deleteUser(userId: string): Promise<DeleteUserState> {
  const me = await requireAdmin();
  if (userId === me.id) {
    return { error: "You can't delete your own account." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "User not found." };

  if (target.role === "admin") {
    const totalAdmins = await countAdmins();
    if (totalAdmins <= 1) {
      return { error: "Can't delete the last admin." };
    }
  }

  const { count: partCount } = await admin
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((partCount ?? 0) > 0) {
    return {
      error: `This user still holds ${partCount} participation(s). Reassign or remove them before deleting.`,
    };
  }

  // Clear entity-referencing children before the entity cascade runs.
  await admin.from("beneficiaries").delete().eq("user_id", userId);
  await admin.from("note_registrations").delete().eq("user_id", userId);
  await admin.from("documents").delete().eq("user_id", userId);
  await admin.from("investor_entities").delete().eq("owner_user_id", userId);

  // Deleting the auth user cascades the profile (and referral_codes, etc.).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return {};
}

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

export type ChangeEmailState = { error?: string; message?: string };

// Change a user's LOGIN email (Supabase auth) and keep profiles.email in sync.
// email_confirm:true marks it verified so the new address works immediately —
// the password is untouched, so the user signs in with the new email + their
// existing password. The entity correspondence emails are a separate field and
// are left alone.
export async function changeLoginEmail(
  userId: string,
  _prev: ChangeEmailState | undefined,
  formData: FormData,
): Promise<ChangeEmailState> {
  await requireAdmin();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Enter an email address." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Enter a valid email address." };

  const admin = createAdminClient();

  // Reject if the target user isn't found, or the address is unchanged.
  const { data: current } = await admin.auth.admin.getUserById(userId);
  if (!current?.user) return { error: "User not found." };
  if ((current.user.email ?? "").toLowerCase() === email) {
    return { error: "That's already this user's login email." };
  }

  // Friendly pre-check for a collision (auth would also reject, less clearly).
  const { data: clash } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .neq("id", userId)
    .maybeSingle();
  if (clash) {
    return { error: "Another account already uses that email." };
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });
  if (authErr) {
    const msg = authErr.message;
    return {
      error: msg.toLowerCase().includes("already")
        ? "Another account already uses that email."
        : `Could not update login email: ${msg}`,
    };
  }

  const { error: pErr } = await admin
    .from("profiles")
    .update({ email })
    .eq("id", userId);
  if (pErr) {
    return {
      error: `Login email changed, but the profile record didn't sync: ${pErr.message}`,
    };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { message: `Login email changed to ${email}.` };
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
