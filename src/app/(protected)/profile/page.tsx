import { getCurrentProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  // Name/phone stay login-level (profiles). The mailing address now lives on the
  // login's primary investor entity — Phase 1 guarantees exactly one per login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: entity } = user
    ? await supabase
        .from("investor_entities")
        .select("address_street, address_city, address_state, address_zip")
        .eq("owner_user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium">{profile?.email}</span>
      </p>
      <ProfileForm
        defaults={{
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          phone: profile?.phone ?? null,
          address_street: entity?.address_street ?? null,
          address_city: entity?.address_city ?? null,
          address_state: entity?.address_state ?? null,
          address_zip: entity?.address_zip ?? null,
        }}
      />
    </div>
  );
}
